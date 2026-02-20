# KMP ERP Custom App

Custom Frappe/ERPNext application for KMP Manufacturing ERP.

## Modules

| Module | Description |
|--------|-------------|
| **KMP Manufacturing** | สูตรตำรับ, QC Checklist, Batch Record, Yield Analysis |
| **KMP Assistant** | AI Chatbot - ค้นหาสูตร, สต็อก, สถานะออเดอร์ |
| **KMP Integration** | Line Notification, Shopee/Lazada, ระบบบัญชี |

## Installation

```bash
# On ERPNext server (VPS)
cd /opt/erpnext
docker compose exec backend bash

cd /home/frappe/frappe-bench
bench get-app https://github.com/Pollaphat-Marketing/kmp-erp-custom.git
bench --site kmp-erp.pollaphat.co.th install-app kmp_erp_custom
bench --site kmp-erp.pollaphat.co.th migrate
```

## Development

```bash
# Clone locally
git clone https://github.com/Pollaphat-Marketing/kmp-erp-custom.git

# Make changes, commit, push
git add . && git commit -m "feat: ..." && git push

# Deploy to VPS
ssh root@145.79.11.24
cd /opt/erpnext
docker compose exec backend bash -c "cd /home/frappe/frappe-bench && bench get-app --overwrite https://github.com/Pollaphat-Marketing/kmp-erp-custom.git && bench --site kmp-erp.pollaphat.co.th migrate"
```

## Tech Stack

- **Framework:** Frappe v15 / ERPNext v15
- **AI:** OpenAI API (GPT-4)
- **Server:** VPS Hostinger (Docker)
- **URL:** https://kmp-erp.pollaphat.co.th
