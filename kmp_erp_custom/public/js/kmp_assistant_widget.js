// KMP Assistant - Floating Chat Widget
// แสดงทุกหน้าของ ERPNext

(function() {
    'use strict';

    // สร้าง Widget เมื่อ DOM พร้อม
    frappe.ready(function() {
        if (document.getElementById('kmp-assistant-widget')) return;
        createWidget();
    });

    // เรียกอีกครั้งเมื่อ page change (SPA)
    $(document).on('page-change', function() {
        if (!document.getElementById('kmp-assistant-widget')) {
            createWidget();
        }
    });

    let chatOpen = false;
    let sessionName = null;
    let isLoading = false;

    function createWidget() {
        // Floating Button
        const widget = document.createElement('div');
        widget.id = 'kmp-assistant-widget';
        widget.innerHTML = `
            <div id="kmp-chat-btn" title="KMP Assistant">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                    <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                </svg>
            </div>
            <div id="kmp-chat-panel" style="display:none;">
                <div id="kmp-chat-header">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                        <span style="font-weight:600;font-size:14px;">KMP Assistant</span>
                    </div>
                    <div style="display:flex;gap:4px;">
                        <button id="kmp-chat-new" title="สนทนาใหม่">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        </button>
                        <button id="kmp-chat-close" title="ปิด">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </button>
                    </div>
                </div>
                <div id="kmp-chat-messages">
                    <div class="kmp-msg kmp-msg-bot">
                        <div class="kmp-msg-content">สวัสดีครับ! ผมเป็น KMP Assistant 🤖<br>ถามเรื่องสูตรตำรับ, สต็อก, ออเดอร์ หรือข้อมูลลูกค้าได้เลยครับ</div>
                    </div>
                </div>
                <div id="kmp-chat-input-area">
                    <textarea id="kmp-chat-input" placeholder="พิมพ์ข้อความ..." rows="1"></textarea>
                    <button id="kmp-chat-send" title="ส่ง">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(widget);

        // Events
        document.getElementById('kmp-chat-btn').addEventListener('click', toggleChat);
        document.getElementById('kmp-chat-close').addEventListener('click', toggleChat);
        document.getElementById('kmp-chat-send').addEventListener('click', sendMessage);
        document.getElementById('kmp-chat-new').addEventListener('click', newSession);

        const input = document.getElementById('kmp-chat-input');
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        // Auto-resize textarea
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });
    }

    function toggleChat() {
        chatOpen = !chatOpen;
        const panel = document.getElementById('kmp-chat-panel');
        const btn = document.getElementById('kmp-chat-btn');
        panel.style.display = chatOpen ? 'flex' : 'none';
        btn.style.display = chatOpen ? 'none' : 'flex';
        if (chatOpen) {
            document.getElementById('kmp-chat-input').focus();
        }
    }

    function newSession() {
        sessionName = null;
        const messages = document.getElementById('kmp-chat-messages');
        messages.innerHTML = `
            <div class="kmp-msg kmp-msg-bot">
                <div class="kmp-msg-content">สวัสดีครับ! เริ่มสนทนาใหม่ 🤖<br>ถามอะไรได้เลยครับ</div>
            </div>
        `;
    }

    function addMessage(content, isUser) {
        const messages = document.getElementById('kmp-chat-messages');
        const div = document.createElement('div');
        div.className = `kmp-msg ${isUser ? 'kmp-msg-user' : 'kmp-msg-bot'}`;
        div.innerHTML = `<div class="kmp-msg-content">${escapeHtml(content).replace(/\n/g, '<br>')}</div>`;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    function addLoadingMessage() {
        const messages = document.getElementById('kmp-chat-messages');
        const div = document.createElement('div');
        div.className = 'kmp-msg kmp-msg-bot';
        div.id = 'kmp-loading-msg';
        div.innerHTML = '<div class="kmp-msg-content"><span class="kmp-typing">กำลังคิด<span>.</span><span>.</span><span>.</span></span></div>';
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function removeLoadingMessage() {
        const el = document.getElementById('kmp-loading-msg');
        if (el) el.remove();
    }

    async function sendMessage() {
        if (isLoading) return;
        const input = document.getElementById('kmp-chat-input');
        const message = input.value.trim();
        if (!message) return;

        input.value = '';
        input.style.height = 'auto';
        addMessage(message, true);

        isLoading = true;
        document.getElementById('kmp-chat-send').disabled = true;
        addLoadingMessage();

        try {
            const response = await frappe.call({
                method: 'kmp_erp_custom.kmp_assistant.api.chat',
                args: {
                    message: message,
                    session_name: sessionName
                },
                async: true
            });

            removeLoadingMessage();

            if (response && response.message) {
                const data = response.message;
                sessionName = data.session_name || sessionName;
                addMessage(data.reply || 'ขออภัยครับ ไม่สามารถตอบได้ในขณะนี้', false);
            } else {
                addMessage('ขออภัยครับ เกิดข้อผิดพลาด กรุณาลองใหม่', false);
            }
        } catch (err) {
            removeLoadingMessage();
            console.error('KMP Assistant Error:', err);
            addMessage('ขออภัยครับ เกิดข้อผิดพลาด: ' + (err.message || 'กรุณาลองใหม่'), false);
        }

        isLoading = false;
        document.getElementById('kmp-chat-send').disabled = false;
        input.focus();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
