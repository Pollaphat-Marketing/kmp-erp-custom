"""
KMP Assistant - Helper functions for querying ERPNext data
"""
import frappe
from frappe.utils import flt, nowdate, getdate


def search_bom(query: str, limit: int = 10) -> list[dict]:
    """ค้นหาสูตรตำรับ (Bill of Materials)"""
    filters = {"docstatus": 1}
    or_filters = {
        "name": ["like", f"%{query}%"],
        "item": ["like", f"%{query}%"],
        "item_name": ["like", f"%{query}%"],
    }
    boms = frappe.get_list(
        "BOM",
        filters=filters,
        or_filters=or_filters,
        fields=["name", "item", "item_name", "quantity", "total_cost", "is_active", "is_default"],
        limit_page_length=limit,
        order_by="modified desc",
    )
    for bom in boms:
        bom["items"] = frappe.get_all(
            "BOM Item",
            filters={"parent": bom["name"]},
            fields=["item_code", "item_name", "qty", "rate", "amount"],
        )
    return boms


def check_stock(item_code: str = None, warehouse: str = None, query: str = None, limit: int = 10) -> list[dict]:
    """เช็คสต็อกสินค้า"""
    filters = {}
    if item_code:
        filters["item_code"] = item_code
    if warehouse:
        filters["warehouse"] = warehouse

    or_filters = {}
    if query:
        or_filters = {
            "item_code": ["like", f"%{query}%"],
            "item_name": ["like", f"%{query}%"],
        }

    return frappe.get_list(
        "Bin",
        filters=filters,
        or_filters=or_filters if or_filters else None,
        fields=["item_code", "item_name", "warehouse", "actual_qty", "reserved_qty", "ordered_qty", "projected_qty"],
        limit_page_length=limit,
        order_by="actual_qty desc",
    )


def get_order_status(
    order_type: str = "Sales Order",
    order_name: str = None,
    customer: str = None,
    supplier: str = None,
    status: str = None,
    query: str = None,
    limit: int = 10,
) -> list[dict]:
    """ดูสถานะออเดอร์"""
    dt = order_type if order_type in ("Sales Order", "Purchase Order") else "Sales Order"

    filters = {"docstatus": ["!=", 2]}
    if order_name:
        filters["name"] = ["like", f"%{order_name}%"]
    if status:
        filters["status"] = status
    if customer and dt == "Sales Order":
        filters["customer"] = ["like", f"%{customer}%"]
    if supplier and dt == "Purchase Order":
        filters["supplier"] = ["like", f"%{supplier}%"]

    or_filters = {}
    if query:
        or_filters["name"] = ["like", f"%{query}%"]
        if dt == "Sales Order":
            or_filters["customer"] = ["like", f"%{query}%"]
            or_filters["customer_name"] = ["like", f"%{query}%"]
        else:
            or_filters["supplier"] = ["like", f"%{query}%"]
            or_filters["supplier_name"] = ["like", f"%{query}%"]

    common_fields = ["name", "status", "transaction_date", "grand_total", "currency"]
    if dt == "Sales Order":
        fields = common_fields + ["customer", "customer_name", "delivery_date", "per_delivered", "per_billed"]
    else:
        fields = common_fields + ["supplier", "supplier_name", "schedule_date", "per_received", "per_billed"]

    return frappe.get_list(
        dt,
        filters=filters,
        or_filters=or_filters if or_filters else None,
        fields=fields,
        limit_page_length=limit,
        order_by="modified desc",
    )


def search_customer_supplier(query: str, doc_type: str = None, limit: int = 10) -> list[dict]:
    """ค้นหาข้อมูลลูกค้า/Supplier"""
    results = []
    types_to_search = []

    if doc_type in ("Customer", None):
        types_to_search.append(("Customer", ["name", "customer_name", "customer_group", "territory", "mobile_no", "email_id"]))
    if doc_type in ("Supplier", None):
        types_to_search.append(("Supplier", ["name", "supplier_name", "supplier_group", "country", "mobile_no", "email_id"]))

    for dt, fields in types_to_search:
        name_field = "customer_name" if dt == "Customer" else "supplier_name"
        items = frappe.get_list(
            dt,
            or_filters={
                "name": ["like", f"%{query}%"],
                name_field: ["like", f"%{query}%"],
            },
            fields=fields,
            limit_page_length=limit,
        )
        for item in items:
            item["_doctype"] = dt
        results.extend(items)

    return results


def search_erp_general(query: str, doc_types: list = None, limit: int = 10) -> dict:
    """ค้นหาข้อมูลทั่วไปจากหลาย DocType"""
    if doc_types is None:
        doc_types = ["Item", "Item Group", "Warehouse", "Customer", "Supplier"]

    results = {}

    search_configs = {
        "Item": {
            "fields": ["name", "item_name", "item_group", "stock_uom", "description"],
            "or_filters": {"name": ["like", f"%{query}%"], "item_name": ["like", f"%{query}%"], "description": ["like", f"%{query}%"]},
        },
        "Item Group": {
            "fields": ["name", "parent_item_group", "is_group"],
            "or_filters": {"name": ["like", f"%{query}%"]},
        },
        "Warehouse": {
            "fields": ["name", "warehouse_name", "company", "is_group"],
            "or_filters": {"name": ["like", f"%{query}%"], "warehouse_name": ["like", f"%{query}%"]},
        },
        "Customer": {
            "fields": ["name", "customer_name", "customer_group", "territory"],
            "or_filters": {"name": ["like", f"%{query}%"], "customer_name": ["like", f"%{query}%"]},
        },
        "Supplier": {
            "fields": ["name", "supplier_name", "supplier_group", "country"],
            "or_filters": {"name": ["like", f"%{query}%"], "supplier_name": ["like", f"%{query}%"]},
        },
    }

    for dt in doc_types:
        if dt not in search_configs:
            continue
        cfg = search_configs[dt]
        try:
            data = frappe.get_list(
                dt,
                or_filters=cfg["or_filters"],
                fields=cfg["fields"],
                limit_page_length=limit,
            )
            results[dt] = data
        except Exception:
            results[dt] = []

    return results


def get_system_info() -> dict:
    """ดึงข้อมูลระบบ ERPNext"""
    info = {}

    # Company
    companies = frappe.get_all("Company", fields=["name", "company_name", "default_currency", "country"])
    info["companies"] = companies

    # Fiscal Year
    try:
        fiscal_years = frappe.get_all(
            "Fiscal Year",
            filters={"disabled": 0},
            fields=["name", "year_start_date", "year_end_date"],
            order_by="year_start_date desc",
            limit_page_length=3,
        )
        info["fiscal_years"] = fiscal_years
    except Exception:
        info["fiscal_years"] = []

    # Counts
    for dt in ["Item", "Customer", "Supplier", "Sales Order", "Purchase Order", "BOM"]:
        try:
            info[f"{dt.lower().replace(' ', '_')}_count"] = frappe.db.count(dt)
        except Exception:
            info[f"{dt.lower().replace(' ', '_')}_count"] = 0

    return info


def get_recent_activity(limit: int = 10) -> dict:
    """ดึงกิจกรรมล่าสุดในระบบ"""
    activity = {}

    doc_types = [
        ("Sales Order", ["name", "customer", "grand_total", "status", "modified"]),
        ("Purchase Order", ["name", "supplier", "grand_total", "status", "modified"]),
        ("Stock Entry", ["name", "stock_entry_type", "posting_date", "modified"]),
        ("Item", ["name", "item_name", "creation", "modified"]),
    ]

    for dt, fields in doc_types:
        try:
            data = frappe.get_list(
                dt,
                fields=fields,
                order_by="modified desc",
                limit_page_length=limit,
            )
            activity[dt] = data
        except Exception:
            activity[dt] = []

    return activity


# Map function names for OpenAI function calling
TOOL_FUNCTIONS = {
    "search_bom": search_bom,
    "check_stock": check_stock,
    "get_order_status": get_order_status,
    "search_customer_supplier": search_customer_supplier,
    "search_erp_general": search_erp_general,
    "get_system_info": get_system_info,
    "get_recent_activity": get_recent_activity,
}

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_bom",
            "description": "ค้นหาสูตรตำรับ (Bill of Materials / BOM) จาก ERPNext ใช้เมื่อต้องการดูสูตร ส่วนประกอบ วัตถุดิบ",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "คำค้นหา: ชื่อสินค้า, รหัส BOM, หรือรหัสสินค้า"},
                    "limit": {"type": "integer", "description": "จำนวนผลลัพธ์สูงสุด", "default": 10},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_stock",
            "description": "เช็คจำนวนสต็อกสินค้าในคลัง ใช้เมื่อต้องการรู้จำนวนคงเหลือ สินค้าในคลัง",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_code": {"type": "string", "description": "รหัสสินค้า"},
                    "warehouse": {"type": "string", "description": "ชื่อคลังสินค้า"},
                    "query": {"type": "string", "description": "คำค้นหาสินค้า"},
                    "limit": {"type": "integer", "description": "จำนวนผลลัพธ์สูงสุด", "default": 10},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_order_status",
            "description": "ดูสถานะออเดอร์ ใบสั่งซื้อ ใบสั่งขาย (Sales Order / Purchase Order)",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_type": {"type": "string", "enum": ["Sales Order", "Purchase Order"], "description": "ประเภทออเดอร์"},
                    "order_name": {"type": "string", "description": "เลขที่ออเดอร์"},
                    "customer": {"type": "string", "description": "ชื่อลูกค้า (สำหรับ Sales Order)"},
                    "supplier": {"type": "string", "description": "ชื่อ Supplier (สำหรับ Purchase Order)"},
                    "status": {"type": "string", "description": "สถานะ เช่น Draft, To Deliver and Bill, Completed"},
                    "query": {"type": "string", "description": "คำค้นหาทั่วไป"},
                    "limit": {"type": "integer", "description": "จำนวนผลลัพธ์สูงสุด", "default": 10},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_customer_supplier",
            "description": "ค้นหาข้อมูลลูกค้า (Customer) หรือผู้จำหน่าย (Supplier)",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "ชื่อลูกค้า/Supplier ที่ต้องการค้นหา"},
                    "doc_type": {"type": "string", "enum": ["Customer", "Supplier"], "description": "ประเภท"},
                    "limit": {"type": "integer", "description": "จำนวนผลลัพธ์สูงสุด", "default": 10},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_erp_general",
            "description": "ค้นหาข้อมูลทั่วไปจากหลาย DocType พร้อมกัน เช่น Item, Item Group, Warehouse, Customer, Supplier ใช้เมื่อต้องการค้นหากว้างๆ",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "คำค้นหา"},
                    "doc_types": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "รายการ DocType ที่ต้องการค้น เช่น ['Item', 'Customer'] ถ้าไม่ระบุจะค้นทั้งหมด",
                    },
                    "limit": {"type": "integer", "description": "จำนวนผลลัพธ์สูงสุดต่อ DocType", "default": 10},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_system_info",
            "description": "ดึงข้อมูลระบบ ERPNext เช่น ชื่อบริษัท, ปีบัญชี, จำนวนข้อมูลในระบบ ใช้เมื่อต้องการรู้สถานะระบบ",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_activity",
            "description": "ดึงกิจกรรมล่าสุดในระบบ เช่น ออเดอร์ล่าสุด, สินค้าที่เพิ่งเพิ่ม, Stock Entry ล่าสุด",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "จำนวนผลลัพธ์สูงสุด", "default": 10},
                },
            },
        },
    },
]
