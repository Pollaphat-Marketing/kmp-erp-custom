"""
KMP Assistant - API endpoint for AI Chatbot
"""
import json
import frappe
from frappe import _
from frappe.utils import nowdate, getdate, cint, flt
import openai

from kmp_erp_custom.kmp_assistant.helpers import TOOL_DEFINITIONS, TOOL_FUNCTIONS

DEFAULT_SYSTEM_PROMPT = """คุณคือ KMP Assistant ผู้ช่วย AI ของบริษัท KMP (Pollaphat Marketing)
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

# Keep old reference for backwards compat
SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT


# ---------------------------------------------------------------------------
# Settings helpers
# ---------------------------------------------------------------------------

def _get_settings_doc():
    """Get KMP Assistant Settings or None"""
    try:
        if frappe.db.exists("DocType", "KMP Assistant Settings"):
            return frappe.get_single("KMP Assistant Settings")
    except Exception:
        pass
    return None


def _get_system_prompt():
    doc = _get_settings_doc()
    prompt = (doc.system_prompt if doc and doc.system_prompt else DEFAULT_SYSTEM_PROMPT)
    # Append knowledge base entries
    entries = frappe.get_all(
        "KMP Knowledge Entry",
        filters={"is_active": 1},
        fields=["question", "answer", "category"],
        ignore_permissions=True,
    ) if frappe.db.exists("DocType", "KMP Knowledge Entry") else []
    if entries:
        prompt += "\n\n--- ฐานความรู้เพิ่มเติม ---\n"
        for e in entries:
            cat = f" [{e['category']}]" if e.get("category") else ""
            prompt += f"\nQ{cat}: {e['question']}\nA: {e['answer']}\n"
    return prompt


def _get_model():
    doc = _get_settings_doc()
    if doc and doc.ai_model:
        return doc.ai_model
    return frappe.conf.get("openai_model", "gpt-4o")


def _get_temperature():
    doc = _get_settings_doc()
    if doc and doc.temperature is not None and doc.temperature != 0:
        return flt(doc.temperature)
    return 0.3


def _get_openai_client():
    api_key = frappe.conf.get("openai_api_key")
    if not api_key:
        doc = _get_settings_doc()
        if doc:
            api_key = doc.get("api_key") if doc.meta.has_field("api_key") else None
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
    messages = [{"role": "system", "content": _get_system_prompt()}]
    for msg in session.messages:
        messages.append({"role": msg.role, "content": msg.content})
    return messages


# ---------------------------------------------------------------------------
# Existing chat APIs (keep intact for widget)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def chat(message: str, session_id: str = None):
    if not message or not message.strip():
        frappe.throw(_("Message cannot be empty"))

    session = _get_or_create_session(session_id, frappe.session.user)
    _add_message(session, "user", message.strip())

    client = _get_openai_client()
    messages = _build_messages(session)
    model = _get_model()
    temperature = _get_temperature()

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=temperature,
        )
    except Exception as e:
        frappe.log_error(f"OpenAI API Error: {str(e)}", "KMP Assistant")
        frappe.throw(_("ไม่สามารถเชื่อมต่อ AI ได้ กรุณาลองใหม่อีกครั้ง"))

    response_message = response.choices[0].message
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
            model=model,
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=temperature,
        )
        response_message = response.choices[0].message

    assistant_reply = response_message.content or "ขออภัย ไม่สามารถตอบได้ในขณะนี้"
    _add_message(session, "assistant", assistant_reply)
    return {"session_id": session.name, "response": assistant_reply}


@frappe.whitelist()
def get_session_history(session_id: str):
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
    sessions = frappe.get_list(
        "KMP Chat Session",
        filters={"user": frappe.session.user},
        fields=["name", "user", "status", "creation", "modified"],
        order_by="modified desc",
        limit_page_length=limit,
    )
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


# ---------------------------------------------------------------------------
# Dashboard APIs
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_dashboard_stats():
    total_sessions = frappe.db.count("KMP Chat Session")
    total_messages = frappe.db.count("KMP Chat Message")

    today = nowdate()
    active_users_today = frappe.db.sql(
        """SELECT COUNT(DISTINCT user) FROM `tabKMP Chat Session`
           WHERE DATE(modified) = %s""",
        today,
    )[0][0] or 0

    feedback_positive = frappe.db.count("KMP Chat Feedback", {"rating": "positive"})
    feedback_negative = frappe.db.count("KMP Chat Feedback", {"rating": "negative"})

    recent_sessions = frappe.db.sql("""
        SELECT s.name, s.user, s.status, s.creation, s.modified,
            (SELECT COUNT(*) FROM `tabKMP Chat Message` m WHERE m.parent = s.name) as message_count,
            (SELECT m2.content FROM `tabKMP Chat Message` m2
             WHERE m2.parent = s.name AND m2.role = 'user'
             ORDER BY m2.idx ASC LIMIT 1) as preview
        FROM `tabKMP Chat Session` s
        ORDER BY s.modified DESC
        LIMIT 20
    """, as_dict=True)

    for s in recent_sessions:
        if s.get("preview"):
            s["preview"] = s["preview"][:80]

    return {
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "active_users_today": active_users_today,
        "feedback_positive": feedback_positive,
        "feedback_negative": feedback_negative,
        "recent_sessions": recent_sessions,
    }


# ---------------------------------------------------------------------------
# Settings APIs
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_settings():
    doc = _get_settings_doc()
    if not doc:
        return {
            "bot_name": "KMP Assistant",
            "system_prompt": DEFAULT_SYSTEM_PROMPT,
            "ai_model": "gpt-4o",
            "temperature": 0.3,
            "tools_config": "{}",
        }
    return {
        "bot_name": doc.bot_name or "KMP Assistant",
        "system_prompt": doc.system_prompt or DEFAULT_SYSTEM_PROMPT,
        "ai_model": doc.ai_model or "gpt-4o",
        "temperature": flt(doc.temperature) or 0.3,
        "tools_config": doc.tools_config or "{}",
    }


@frappe.whitelist()
def save_settings(**kwargs):
    kwargs.pop("cmd", None)
    if not frappe.db.exists("DocType", "KMP Assistant Settings"):
        frappe.throw("KMP Assistant Settings DocType not found. Please run bench migrate.")

    doc = frappe.get_single("KMP Assistant Settings")
    for key in ("bot_name", "system_prompt", "ai_model", "temperature", "tools_config"):
        if key in kwargs:
            val = kwargs[key]
            if key == "temperature":
                val = flt(val)
            doc.set(key, val)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Chat History (Admin) APIs
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_all_sessions(limit=20, offset=0, search=None):
    limit = cint(limit)
    offset = cint(offset)
    conditions = ""
    params = []
    if search:
        conditions = "WHERE s.user LIKE %s"
        params.append(f"%{search}%")

    total = frappe.db.sql(
        f"SELECT COUNT(*) FROM `tabKMP Chat Session` s {conditions}",
        params,
    )[0][0]

    params_q = params + [limit, offset]
    sessions = frappe.db.sql(f"""
        SELECT s.name, s.user, s.status, s.creation, s.modified,
            (SELECT COUNT(*) FROM `tabKMP Chat Message` m WHERE m.parent = s.name) as message_count,
            (SELECT m2.content FROM `tabKMP Chat Message` m2
             WHERE m2.parent = s.name AND m2.role = 'user'
             ORDER BY m2.idx ASC LIMIT 1) as preview
        FROM `tabKMP Chat Session` s
        {conditions}
        ORDER BY s.modified DESC
        LIMIT %s OFFSET %s
    """, params_q, as_dict=True)

    for s in sessions:
        if s.get("preview"):
            s["preview"] = s["preview"][:80]

    return {"total": total, "sessions": sessions}


@frappe.whitelist()
def get_session_detail(session_id):
    session = frappe.get_doc("KMP Chat Session", session_id)
    return {
        "name": session.name,
        "user": session.user,
        "status": session.status,
        "creation": str(session.creation),
        "modified": str(session.modified),
        "messages": [
            {"role": m.role, "content": m.content, "creation": str(m.creation)}
            for m in session.messages
        ],
    }


@frappe.whitelist()
def delete_session(session_id):
    frappe.delete_doc("KMP Chat Session", session_id, ignore_permissions=True)
    frappe.db.commit()
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Feedback APIs
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_all_feedback(limit=20, offset=0, rating_filter=None):
    limit = cint(limit)
    offset = cint(offset)
    filters = {}
    if rating_filter and rating_filter in ("positive", "negative"):
        filters["rating"] = rating_filter

    total = frappe.db.count("KMP Chat Feedback", filters)
    feedback = frappe.get_list(
        "KMP Chat Feedback",
        filters=filters,
        fields=["name", "session", "user", "rating", "comment", "message_index", "creation"],
        order_by="creation desc",
        limit_page_length=limit,
        start=offset,
        ignore_permissions=True,
    )
    return {"total": total, "feedback": feedback}


# ---------------------------------------------------------------------------
# Knowledge Base APIs
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_knowledge_entries():
    entries = frappe.get_list(
        "KMP Knowledge Entry",
        fields=["name", "question", "answer", "category", "is_active", "creation", "modified"],
        order_by="creation desc",
        limit_page_length=0,
        ignore_permissions=True,
    )
    return entries


@frappe.whitelist()
def add_knowledge_entry(question, answer, category=None):
    doc = frappe.new_doc("KMP Knowledge Entry")
    doc.question = question
    doc.answer = answer
    doc.category = category or ""
    doc.is_active = 1
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "ok", "name": doc.name}


@frappe.whitelist()
def update_knowledge_entry(name, **kwargs):
    kwargs.pop("cmd", None)
    doc = frappe.get_doc("KMP Knowledge Entry", name)
    for key in ("question", "answer", "category", "is_active"):
        if key in kwargs:
            val = kwargs[key]
            if key == "is_active":
                val = cint(val)
            doc.set(key, val)
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"status": "ok"}


@frappe.whitelist()
def delete_knowledge_entry(name):
    frappe.delete_doc("KMP Knowledge Entry", name, ignore_permissions=True)
    frappe.db.commit()
    return {"status": "ok"}
