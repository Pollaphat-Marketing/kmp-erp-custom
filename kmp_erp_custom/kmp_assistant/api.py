"""
KMP Assistant - API endpoint for AI Chatbot
"""
import json
import frappe
from frappe import _
import openai

from kmp_erp_custom.kmp_assistant.helpers import TOOL_DEFINITIONS, TOOL_FUNCTIONS

SYSTEM_PROMPT = """คุณคือ KMP Assistant ผู้ช่วย AI ของบริษัท KMP (Pollaphat Marketing)
คุณช่วยพนักงานได้หลายเรื่อง ทั้งการสนทนาทั่วไปและการค้นหาข้อมูลในระบบ ERPNext

ความสามารถของคุณ:
1. สนทนาทั่วไป - ทักทาย ตอบคำถาม ให้คำแนะนำ
2. ค้นหาข้อมูลในระบบ ERPNext:
   - สูตรตำรับ (BOM / Bill of Materials)
   - สต็อกสินค้า (Stock / Inventory)
   - สถานะออเดอร์ (Sales Order / Purchase Order)
   - ข้อมูลลูกค้าและ Supplier
   - ค้นหาข้อมูลทั่วไป (Item, Item Group, Warehouse, Company)
   - ข้อมูลระบบ (Company, Fiscal Year, Modules)
   - กิจกรรมล่าสุดในระบบ

กฎ:
1. ตอบเป็นภาษาไทยเสมอ ยกเว้นชื่อเฉพาะ/รหัสที่เป็นภาษาอังกฤษ
2. ใช้ tools ที่มีเพื่อดึงข้อมูลจริงจากระบบ อย่าเดาข้อมูล
3. แสดงผลเป็นตารางหรือรายการที่อ่านง่าย
4. ถ้าไม่พบข้อมูล ให้แจ้งอย่างสุภาพว่าระบบยังไม่มีข้อมูลดังกล่าว
5. สำหรับการสนทนาทั่วไป (ทักทาย, ถามเกี่ยวกับ KMP, ขอความช่วยเหลือ) ให้ตอบได้เลยโดยไม่ต้องใช้ tools
6. เมื่อมีคนทักทาย ให้ตอบทักทายกลับอย่างเป็นมิตร และแนะนำว่าคุณช่วยอะไรได้บ้าง
7. ถ้าระบบยังไม่มีข้อมูล (เช่น ยังไม่มี Item, Customer) ให้แจ้งว่าระบบยังว่างอยู่ แนะนำให้เพิ่มข้อมูลก่อน
"""


def _get_openai_client():
    api_key = frappe.conf.get("openai_api_key") or frappe.db.get_single_value("KMP Assistant Settings", "api_key") if frappe.db.exists("DocType", "KMP Assistant Settings") else frappe.conf.get("openai_api_key")
    if not api_key:
        frappe.throw(_("OpenAI API Key not configured. Please set 'openai_api_key' in site_config.json"))
    return openai.OpenAI(api_key=api_key)


def _get_or_create_session(session_id: str = None, user: str = None) -> "Document":
    if session_id:
        try:
            session = frappe.get_doc("KMP Chat Session", session_id)
            return session
        except frappe.DoesNotExistError:
            pass

    session = frappe.new_doc("KMP Chat Session")
    session.user = user or frappe.session.user
    session.status = "Active"
    session.insert(ignore_permissions=True)
    frappe.db.commit()
    return session


def _add_message(session, role: str, content: str):
    session.append("messages", {
        "role": role,
        "content": content,
    })
    session.save(ignore_permissions=True)
    frappe.db.commit()


def _build_messages(session) -> list[dict]:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in session.messages:
        messages.append({"role": msg.role, "content": msg.content})
    return messages


@frappe.whitelist()
def chat(message: str, session_id: str = None):
    """
    Main chat endpoint.
    Args:
        message: User's message
        session_id: Existing session ID (optional)
    Returns:
        dict with session_id and response
    """
    if not message or not message.strip():
        frappe.throw(_("Message cannot be empty"))

    session = _get_or_create_session(session_id, frappe.session.user)
    _add_message(session, "user", message.strip())

    client = _get_openai_client()
    messages = _build_messages(session)

    # Call OpenAI with tools
    try:
        response = client.chat.completions.create(
            model=frappe.conf.get("openai_model", "gpt-4o"),
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.3,
        )
    except Exception as e:
        frappe.log_error(f"OpenAI API Error: {str(e)}", "KMP Assistant")
        frappe.throw(_("ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่อีกครั้ง"))

    response_message = response.choices[0].message

    # Handle tool calls (loop for multi-step)
    max_iterations = 5
    iteration = 0
    while response_message.tool_calls and iteration < max_iterations:
        iteration += 1
        messages.append(response_message)

        for tool_call in response_message.tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)

            if fn_name in TOOL_FUNCTIONS:
                try:
                    result = TOOL_FUNCTIONS[fn_name](**fn_args)
                    tool_result = json.dumps(result, ensure_ascii=False, default=str)
                except Exception as e:
                    tool_result = json.dumps({"error": str(e)}, ensure_ascii=False)
            else:
                tool_result = json.dumps({"error": f"Unknown function: {fn_name}"})

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": tool_result,
            })

        response = client.chat.completions.create(
            model=frappe.conf.get("openai_model", "gpt-4o"),
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.3,
        )
        response_message = response.choices[0].message

    assistant_reply = response_message.content or "ขออภัย ไม่สามารถตอบได้ในขณะนี้"
    _add_message(session, "assistant", assistant_reply)

    return {
        "session_id": session.name,
        "response": assistant_reply,
    }


@frappe.whitelist()
def get_session_history(session_id: str):
    """Get chat history for a session"""
    session = frappe.get_doc("KMP Chat Session", session_id)
    return {
        "session_id": session.name,
        "messages": [
            {"role": m.role, "content": m.content, "timestamp": str(m.creation)}
            for m in session.messages
        ],
    }


@frappe.whitelist()
def get_my_sessions(limit: int = 20):
    """Get current user's chat sessions"""
    sessions = frappe.get_list(
        "KMP Chat Session",
        filters={"user": frappe.session.user},
        fields=["name", "user", "status", "creation", "modified"],
        order_by="modified desc",
        limit_page_length=limit,
    )
    # Add first message preview for each session
    for s in sessions:
        first_msg = frappe.get_all(
            "KMP Chat Message",
            filters={"parent": s["name"], "role": "user"},
            fields=["content"],
            order_by="idx asc",
            limit_page_length=1,
        )
        s["preview"] = first_msg[0]["content"][:50] if first_msg else "สนทนาใหม่"
    return sessions


@frappe.whitelist()
def submit_feedback(session_id: str, message_index: int, rating: str, comment: str = None):
    """Submit feedback for a bot message"""
    if rating not in ("positive", "negative"):
        frappe.throw(_("Rating must be 'positive' or 'negative'"))

    feedback = frappe.new_doc("KMP Chat Feedback")
    feedback.session = session_id
    feedback.message_index = int(message_index)
    feedback.rating = rating
    feedback.comment = comment
    feedback.user = frappe.session.user
    feedback.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "ok", "name": feedback.name}
