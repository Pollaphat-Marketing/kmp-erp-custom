// KMP Assistant - Floating Chat Widget v2
// Bug fixes + Chat History + Feedback System

(function() {
    'use strict';

    function injectStyles() {
        if (document.getElementById('kmp-assistant-styles')) return;
        const style = document.createElement('style');
        style.id = 'kmp-assistant-styles';
        style.textContent = `
#kmp-assistant-widget{position:fixed;bottom:24px;right:24px;z-index:9999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
#kmp-chat-btn{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#FF5B04,#e04800);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(255,91,4,0.4);transition:all .3s ease}
#kmp-chat-btn:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(255,91,4,0.5)}
#kmp-chat-panel{width:380px;height:520px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.15);flex-direction:column;overflow:hidden;animation:kmp-slide-up .3s ease}
@keyframes kmp-slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
#kmp-chat-header{background:linear-gradient(135deg,#075056,#0a6b73);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center}
#kmp-chat-header button{background:rgba(255,255,255,0.15);border:none;border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s;color:#fff;font-size:14px}
#kmp-chat-header button:hover{background:rgba(255,255,255,0.3)}
#kmp-chat-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#f7f8fa}
.kmp-msg{display:flex;flex-direction:column;max-width:85%}.kmp-msg-user{align-self:flex-end}.kmp-msg-bot{align-self:flex-start}
.kmp-msg-content{padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;word-wrap:break-word}
.kmp-msg-user .kmp-msg-content{background:linear-gradient(135deg,#FF5B04,#e04800);color:#fff;border-bottom-right-radius:4px}
.kmp-msg-bot .kmp-msg-content{background:#fff;color:#333;border:1px solid #e5e7eb;border-bottom-left-radius:4px}
.kmp-typing span{animation:kmp-blink 1.4s infinite;font-weight:bold}.kmp-typing span:nth-child(2){animation-delay:.2s}.kmp-typing span:nth-child(3){animation-delay:.4s}
@keyframes kmp-blink{0%,20%{opacity:0}50%{opacity:1}100%{opacity:0}}
#kmp-chat-input-area{padding:12px 16px;background:#fff;border-top:1px solid #e5e7eb;display:flex;gap:8px;align-items:flex-end}
#kmp-chat-input{flex:1;border:1px solid #d1d5db;border-radius:10px;padding:8px 12px;font-size:13px;resize:none;outline:none;max-height:100px;font-family:inherit;line-height:1.4}
#kmp-chat-input:focus{border-color:#FF5B04;box-shadow:0 0 0 2px rgba(255,91,4,0.1)}
#kmp-chat-send{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#FF5B04,#e04800);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .2s}
#kmp-chat-send:hover{transform:scale(1.05)}#kmp-chat-send:disabled{opacity:.5;cursor:not-allowed}
#kmp-chat-messages::-webkit-scrollbar{width:4px}#kmp-chat-messages::-webkit-scrollbar-track{background:transparent}#kmp-chat-messages::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:4px}
.kmp-feedback{display:flex;gap:4px;margin-top:4px}
.kmp-feedback button{background:none;border:1px solid #e5e7eb;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:12px;transition:all .2s;color:#888}
.kmp-feedback button:hover{background:#f0f0f0}
.kmp-feedback button.kmp-fb-active-pos{background:#d4edda;border-color:#28a745;color:#28a745}
.kmp-feedback button.kmp-fb-active-neg{background:#f8d7da;border-color:#dc3545;color:#dc3545}
#kmp-history-panel{position:absolute;top:0;left:0;right:0;bottom:0;background:#fff;display:flex;flex-direction:column;z-index:10}
#kmp-history-panel .kmp-hist-header{background:linear-gradient(135deg,#075056,#0a6b73);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center}
#kmp-history-panel .kmp-hist-header button{background:rgba(255,255,255,0.15);border:none;border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:14px}
#kmp-history-panel .kmp-hist-list{flex:1;overflow-y:auto;padding:8px}
.kmp-hist-item{padding:10px 12px;border-bottom:1px solid #f0f0f0;cursor:pointer;transition:background .2s}
.kmp-hist-item:hover{background:#f7f8fa}
.kmp-hist-item .kmp-hist-preview{font-size:13px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kmp-hist-item .kmp-hist-date{font-size:11px;color:#999;margin-top:2px}
.kmp-comment-overlay{position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:20}
.kmp-comment-box{background:#fff;border-radius:12px;padding:20px;width:300px;box-shadow:0 4px 20px rgba(0,0,0,0.2)}
.kmp-comment-box textarea{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:8px;font-size:13px;resize:none;outline:none;font-family:inherit;margin:8px 0}
.kmp-comment-box .kmp-comment-actions{display:flex;gap:8px;justify-content:flex-end}
.kmp-comment-box button{padding:6px 14px;border-radius:6px;border:none;cursor:pointer;font-size:13px}
.kmp-comment-box .kmp-btn-cancel{background:#f0f0f0;color:#333}
.kmp-comment-box .kmp-btn-submit{background:#FF5B04;color:#fff}
@media(max-width:480px){#kmp-chat-panel{width:calc(100vw - 32px);height:calc(100vh - 100px)}}
        `;
        document.head.appendChild(style);
    }

    $(document).ready(function() {
        if (document.getElementById('kmp-assistant-widget')) return;
        injectStyles();
        createWidget();
    });

    let chatOpen = false;
    let sessionName = localStorage.getItem('kmp_session_id') || null;
    let isLoading = false;
    let botMessageIndex = 0;

    function saveSession() {
        if (sessionName) {
            localStorage.setItem('kmp_session_id', sessionName);
        }
    }

    function createWidget() {
        const widget = document.createElement('div');
        widget.id = 'kmp-assistant-widget';
        widget.innerHTML = `
            <div id="kmp-chat-btn" title="KMP Assistant">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                    <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                </svg>
            </div>
            <div id="kmp-chat-panel" style="display:none;position:relative;">
                <div id="kmp-chat-header">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                        <span style="font-weight:600;font-size:14px;">KMP Assistant</span>
                    </div>
                    <div style="display:flex;gap:4px;">
                        <button id="kmp-chat-history" title="ประวัติสนทนา">📋</button>
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

        document.getElementById('kmp-chat-btn').addEventListener('click', toggleChat);
        document.getElementById('kmp-chat-close').addEventListener('click', toggleChat);
        document.getElementById('kmp-chat-send').addEventListener('click', sendMessage);
        document.getElementById('kmp-chat-new').addEventListener('click', newSession);
        document.getElementById('kmp-chat-history').addEventListener('click', showHistory);

        const input = document.getElementById('kmp-chat-input');
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });

        // If we have a stored session, load it
        if (sessionName) {
            loadSession(sessionName);
        }
    }

    function toggleChat() {
        chatOpen = !chatOpen;
        const panel = document.getElementById('kmp-chat-panel');
        const btn = document.getElementById('kmp-chat-btn');
        panel.style.display = chatOpen ? 'flex' : 'none';
        btn.style.display = chatOpen ? 'none' : 'flex';
        if (chatOpen) document.getElementById('kmp-chat-input').focus();
    }

    function newSession() {
        sessionName = null;
        botMessageIndex = 0;
        localStorage.removeItem('kmp_session_id');
        const messages = document.getElementById('kmp-chat-messages');
        messages.innerHTML = `
            <div class="kmp-msg kmp-msg-bot">
                <div class="kmp-msg-content">สวัสดีครับ! เริ่มสนทนาใหม่ 🤖<br>ถามอะไรได้เลยครับ</div>
            </div>
        `;
    }

    function addMessage(content, isUser, msgIndex) {
        const messages = document.getElementById('kmp-chat-messages');
        const div = document.createElement('div');
        div.className = `kmp-msg ${isUser ? 'kmp-msg-user' : 'kmp-msg-bot'}`;

        let html = `<div class="kmp-msg-content">${escapeHtml(content).replace(/\n/g, '<br>')}</div>`;

        if (!isUser && msgIndex !== undefined) {
            html += `
                <div class="kmp-feedback" data-msg-index="${msgIndex}">
                    <button class="kmp-fb-pos" onclick="window._kmpFeedback(${msgIndex}, 'positive', this)" title="ดี">👍</button>
                    <button class="kmp-fb-neg" onclick="window._kmpFeedback(${msgIndex}, 'negative', this)" title="ไม่ดี">👎</button>
                </div>
            `;
        }

        div.innerHTML = html;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    // Global feedback handler
    window._kmpFeedback = function(msgIndex, rating, btn) {
        if (!sessionName) return;

        if (rating === 'negative') {
            showCommentPopup(msgIndex, rating);
            return;
        }

        submitFeedback(msgIndex, rating, null, btn);
    };

    function submitFeedback(msgIndex, rating, comment, btn) {
        frappe.call({
            method: 'kmp_erp_custom.kmp_assistant.api.submit_feedback',
            args: { session_id: sessionName, message_index: msgIndex, rating: rating, comment: comment || '' },
            callback: function() {
                if (btn) {
                    const parent = btn.closest('.kmp-feedback');
                    parent.querySelectorAll('button').forEach(b => b.className = b.className.replace(/kmp-fb-active-\w+/g, '').trim());
                    btn.classList.add(rating === 'positive' ? 'kmp-fb-active-pos' : 'kmp-fb-active-neg');
                }
            }
        });
    }

    function showCommentPopup(msgIndex, rating) {
        const panel = document.getElementById('kmp-chat-panel');
        const overlay = document.createElement('div');
        overlay.className = 'kmp-comment-overlay';
        overlay.innerHTML = `
            <div class="kmp-comment-box">
                <div style="font-size:14px;font-weight:600;">💬 บอกเราเพิ่มเติม</div>
                <textarea id="kmp-fb-comment" rows="3" placeholder="อะไรที่ควรปรับปรุง?"></textarea>
                <div class="kmp-comment-actions">
                    <button class="kmp-btn-cancel" id="kmp-fb-cancel">ข้าม</button>
                    <button class="kmp-btn-submit" id="kmp-fb-submit">ส่ง</button>
                </div>
            </div>
        `;
        panel.appendChild(overlay);

        overlay.querySelector('#kmp-fb-cancel').addEventListener('click', function() {
            submitFeedback(msgIndex, rating, null, null);
            overlay.remove();
        });
        overlay.querySelector('#kmp-fb-submit').addEventListener('click', function() {
            const comment = overlay.querySelector('#kmp-fb-comment').value;
            submitFeedback(msgIndex, rating, comment, null);
            overlay.remove();
        });
    }

    function showHistory() {
        const panel = document.getElementById('kmp-chat-panel');
        // Remove existing history panel
        const existing = panel.querySelector('#kmp-history-panel');
        if (existing) { existing.remove(); return; }

        const histPanel = document.createElement('div');
        histPanel.id = 'kmp-history-panel';
        histPanel.innerHTML = `
            <div class="kmp-hist-header">
                <span style="font-weight:600;font-size:14px;">📋 ประวัติสนทนา</span>
                <button id="kmp-hist-back" title="กลับ">✕</button>
            </div>
            <div class="kmp-hist-list"><div style="padding:20px;text-align:center;color:#999;">กำลังโหลด...</div></div>
        `;
        panel.appendChild(histPanel);

        histPanel.querySelector('#kmp-hist-back').addEventListener('click', function() {
            histPanel.remove();
        });

        frappe.call({
            method: 'kmp_erp_custom.kmp_assistant.api.get_my_sessions',
            args: { limit: 20 },
            callback: function(r) {
                const list = histPanel.querySelector('.kmp-hist-list');
                if (!r.message || r.message.length === 0) {
                    list.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">ยังไม่มีประวัติสนทนา</div>';
                    return;
                }
                list.innerHTML = '';
                r.message.forEach(function(s) {
                    const item = document.createElement('div');
                    item.className = 'kmp-hist-item';
                    const date = new Date(s.modified);
                    const dateStr = date.toLocaleDateString('th-TH') + ' ' + date.toLocaleTimeString('th-TH', {hour:'2-digit',minute:'2-digit'});
                    item.innerHTML = `<div class="kmp-hist-preview">${escapeHtml(s.preview || 'สนทนา')}</div><div class="kmp-hist-date">${dateStr}</div>`;
                    item.addEventListener('click', function() {
                        loadSession(s.name);
                        histPanel.remove();
                    });
                    list.appendChild(item);
                });
            }
        });
    }

    function loadSession(sid) {
        frappe.call({
            method: 'kmp_erp_custom.kmp_assistant.api.get_session_history',
            args: { session_id: sid },
            callback: function(r) {
                if (!r.message) return;
                sessionName = r.message.session_id;
                saveSession();
                botMessageIndex = 0;
                const messages = document.getElementById('kmp-chat-messages');
                messages.innerHTML = '';
                r.message.messages.forEach(function(m) {
                    if (m.role === 'system') return;
                    const isUser = m.role === 'user';
                    if (!isUser) botMessageIndex++;
                    addMessage(m.content, isUser, isUser ? undefined : botMessageIndex);
                });
                if (r.message.messages.length === 0) {
                    messages.innerHTML = '<div class="kmp-msg kmp-msg-bot"><div class="kmp-msg-content">สวัสดีครับ! ถามอะไรได้เลยครับ 🤖</div></div>';
                }
            }
        });
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
                    session_id: sessionName
                },
                async: true
            });

            removeLoadingMessage();

            if (response && response.message) {
                const data = response.message;
                sessionName = data.session_id || sessionName;
                saveSession();
                botMessageIndex++;
                addMessage(data.response || 'ขออภัยครับ ไม่สามารถตอบได้ในขณะนี้', false, botMessageIndex);
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
