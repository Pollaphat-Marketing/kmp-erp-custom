frappe.pages['kmp-assistant'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'KMP Assistant',
        single_column: true
    });

    page.main.html(`
        <div id="kmp-chat-container" style="max-width: 800px; margin: 0 auto;">
            <div id="kmp-chat-messages" style="
                height: 500px;
                overflow-y: auto;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                background: var(--card-bg);
            ">
                <div class="text-muted text-center" style="margin-top: 200px;">
                    <i class="fa fa-robot" style="font-size: 48px;"></i>
                    <p style="margin-top: 12px; font-size: 16px;">สวัสดีครับ! ผม KMP Assistant</p>
                    <p>ถามเรื่องสูตรตำรับ สต็อก ออเดอร์ หรือข้อมูลลูกค้าได้เลยครับ</p>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <input id="kmp-chat-input" type="text" class="form-control"
                    placeholder="พิมพ์ข้อความ... เช่น เช็คสต็อกสินค้า A001"
                    style="flex: 1; border-radius: 8px;">
                <button id="kmp-chat-send" class="btn btn-primary" style="border-radius: 8px; padding: 8px 24px;">
                    <i class="fa fa-paper-plane"></i> ส่ง
                </button>
            </div>
        </div>
    `);

    let sessionId = null;
    let isFirstMessage = true;
    const $messages = $('#kmp-chat-messages');
    const $input = $('#kmp-chat-input');
    const $send = $('#kmp-chat-send');

    function appendMessage(role, content) {
        if (isFirstMessage) {
            $messages.html('');
            isFirstMessage = false;
        }
        const isUser = role === 'user';
        const align = isUser ? 'flex-end' : 'flex-start';
        const bg = isUser ? 'var(--primary)' : 'var(--bg-light-gray)';
        const color = isUser ? 'white' : 'var(--text-color)';
        const label = isUser ? 'คุณ' : '🤖 KMP Assistant';

        const html = `
            <div style="display: flex; justify-content: ${align}; margin-bottom: 12px;">
                <div style="max-width: 75%; background: ${bg}; color: ${color};
                    padding: 10px 16px; border-radius: 12px;">
                    <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">${label}</div>
                    <div style="white-space: pre-wrap;">${frappe.utils.xss_sanitise(content)}</div>
                </div>
            </div>`;
        $messages.append(html);
        $messages.scrollTop($messages[0].scrollHeight);
    }

    function sendMessage() {
        const message = $input.val().trim();
        if (!message) return;

        appendMessage('user', message);
        $input.val('').prop('disabled', true);
        $send.prop('disabled', true);

        // Show typing indicator
        const typingId = 'typing-' + Date.now();
        $messages.append(`
            <div id="${typingId}" style="display: flex; justify-content: flex-start; margin-bottom: 12px;">
                <div style="background: var(--bg-light-gray); padding: 10px 16px; border-radius: 12px;">
                    <span class="text-muted">🤖 กำลังคิด...</span>
                </div>
            </div>`);
        $messages.scrollTop($messages[0].scrollHeight);

        frappe.call({
            method: 'kmp_erp_custom.kmp_assistant.api.chat',
            args: { message: message, session_id: sessionId },
            callback: function(r) {
                $(`#${typingId}`).remove();
                if (r.message) {
                    sessionId = r.message.session_id;
                    appendMessage('assistant', r.message.response);
                }
            },
            error: function() {
                $(`#${typingId}`).remove();
                appendMessage('assistant', 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            },
            always: function() {
                $input.prop('disabled', false).focus();
                $send.prop('disabled', false);
            }
        });
    }

    $send.on('click', sendMessage);
    $input.on('keypress', function(e) {
        if (e.which === 13) sendMessage();
    });
    $input.focus();
};
