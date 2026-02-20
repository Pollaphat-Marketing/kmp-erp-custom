import frappe
from frappe.model.document import Document


class KMPChatSession(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
