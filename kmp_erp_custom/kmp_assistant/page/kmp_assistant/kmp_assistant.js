frappe.pages['kmp-assistant'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'KMP Assistant — Admin Dashboard',
        single_column: true
    });

    const TABS = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'settings',  icon: '⚙️', label: 'Settings' },
        { id: 'history',   icon: '💬', label: 'Chat History' },
        { id: 'feedback',  icon: '👍', label: 'Feedback' },
        { id: 'knowledge', icon: '📝', label: 'Knowledge Base' },
        { id: 'tools',     icon: '🔧', label: 'Tools' },
    ];

    const API = 'kmp_erp_custom.kmp_assistant.api';

    // Build shell
    let tabsHtml = TABS.map((t, i) =>
        `<div class="kmp-tab${i===0?' active':''}" data-tab="${t.id}">${t.icon} ${t.label}</div>`
    ).join('');
    let contentsHtml = TABS.map((t, i) =>
        `<div class="kmp-tab-content${i===0?' active':''}" id="tab-${t.id}"></div>`
    ).join('');

    page.main.html(`
        <div class="kmp-dashboard">
            <div class="kmp-tabs">${tabsHtml}</div>
            ${contentsHtml}
        </div>
    `);

    // Tab switching
    page.main.find('.kmp-tab').on('click', function() {
        const tabId = $(this).data('tab');
        page.main.find('.kmp-tab').removeClass('active');
        $(this).addClass('active');
        page.main.find('.kmp-tab-content').removeClass('active');
        page.main.find(`#tab-${tabId}`).addClass('active');
        loaders[tabId]();
    });

    // =====================================================================
    // TAB 1: Dashboard
    // =====================================================================
    function loadDashboard() {
        const $el = $('#tab-dashboard').html('<div class="kmp-loading">⏳ Loading...</div>');
        frappe.call({
            method: `${API}.get_dashboard_stats`,
            callback(r) {
                const d = r.message;
                const total_fb = (d.feedback_positive||0) + (d.feedback_negative||0);
                const pos_pct = total_fb ? Math.round(d.feedback_positive / total_fb * 100) : 0;
                const neg_pct = total_fb ? 100 - pos_pct : 0;

                let recentRows = (d.recent_sessions||[]).map(s => `
                    <tr>
                        <td>${frappe.utils.escape_html(s.user||'')}</td>
                        <td>${s.message_count||0}</td>
                        <td>${frappe.utils.escape_html(s.preview||'-')}</td>
                        <td>${frappe.datetime.prettyDate(s.modified)}</td>
                    </tr>
                `).join('') || '<tr><td colspan="4" class="text-center text-muted">No sessions yet</td></tr>';

                $el.html(`
                    <div class="kmp-stats">
                        <div class="kmp-stat-card">
                            <span class="stat-icon">💬</span>
                            <div class="stat-label">Total Chats</div>
                            <div class="stat-value">${d.total_sessions||0}</div>
                        </div>
                        <div class="kmp-stat-card">
                            <span class="stat-icon">📨</span>
                            <div class="stat-label">Total Messages</div>
                            <div class="stat-value">${d.total_messages||0}</div>
                        </div>
                        <div class="kmp-stat-card">
                            <span class="stat-icon">👥</span>
                            <div class="stat-label">Active Today</div>
                            <div class="stat-value">${d.active_users_today||0}</div>
                        </div>
                        <div class="kmp-stat-card">
                            <span class="stat-icon">⭐</span>
                            <div class="stat-label">Feedback Score</div>
                            <div class="stat-value">${total_fb ? pos_pct+'%' : 'N/A'}</div>
                        </div>
                    </div>

                    <div class="kmp-table-card">
                        <div class="card-header">
                            Feedback Summary
                        </div>
                        <div style="padding:16px;">
                            <div style="display:flex;gap:20px;margin-bottom:8px;">
                                <span>👍 ${d.feedback_positive||0}</span>
                                <span>👎 ${d.feedback_negative||0}</span>
                                <span class="text-muted">Total: ${total_fb}</span>
                            </div>
                            ${total_fb ? `
                            <div class="kmp-feedback-bar">
                                <div class="positive" style="width:${pos_pct}%"></div>
                                <div class="negative" style="width:${neg_pct}%"></div>
                            </div>` : '<div class="text-muted">No feedback yet</div>'}
                        </div>
                    </div>

                    <div class="kmp-table-card">
                        <div class="card-header">Recent Chats (Last 20)</div>
                        <table>
                            <thead><tr><th>User</th><th>Messages</th><th>Preview</th><th>Last Active</th></tr></thead>
                            <tbody>${recentRows}</tbody>
                        </table>
                    </div>
                `);
            }
        });
    }

    // =====================================================================
    // TAB 2: Settings
    // =====================================================================
    function loadSettings() {
        const $el = $('#tab-settings').html('<div class="kmp-loading">⏳ Loading...</div>');
        frappe.call({
            method: `${API}.get_settings`,
            callback(r) {
                const s = r.message;
                $el.html(`
                    <div class="kmp-settings-form">
                        <div class="form-group">
                            <label>Bot Name</label>
                            <input type="text" class="form-control" id="set-bot-name" value="${frappe.utils.escape_html(s.bot_name||'')}">
                        </div>
                        <div class="form-group">
                            <label>AI Model</label>
                            <select class="form-control" id="set-model">
                                <option value="gpt-4o" ${s.ai_model==='gpt-4o'?'selected':''}>gpt-4o</option>
                                <option value="gpt-4o-mini" ${s.ai_model==='gpt-4o-mini'?'selected':''}>gpt-4o-mini</option>
                                <option value="gpt-3.5-turbo" ${s.ai_model==='gpt-3.5-turbo'?'selected':''}>gpt-3.5-turbo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Temperature</label>
                            <div class="kmp-slider-wrap">
                                <input type="range" min="0" max="1" step="0.05" value="${s.temperature}" id="set-temp">
                                <span class="slider-val" id="set-temp-val">${s.temperature}</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>System Prompt</label>
                            <textarea class="form-control" id="set-prompt">${frappe.utils.escape_html(s.system_prompt||'')}</textarea>
                        </div>
                        <button class="btn-kmp" id="save-settings">💾 Save Settings</button>
                        <span id="settings-status" style="margin-left:12px;"></span>
                    </div>
                `);
                $('#set-temp').on('input', function() { $('#set-temp-val').text(this.value); });
                $('#save-settings').on('click', function() {
                    const btn = $(this).prop('disabled', true).text('Saving...');
                    frappe.call({
                        method: `${API}.save_settings`,
                        args: {
                            bot_name: $('#set-bot-name').val(),
                            ai_model: $('#set-model').val(),
                            temperature: $('#set-temp').val(),
                            system_prompt: $('#set-prompt').val(),
                        },
                        callback() {
                            $('#settings-status').html('<span style="color:green">✅ Saved!</span>');
                            setTimeout(() => $('#settings-status').html(''), 3000);
                        },
                        always() { btn.prop('disabled', false).text('💾 Save Settings'); }
                    });
                });
            }
        });
    }

    // =====================================================================
    // TAB 3: Chat History
    // =====================================================================
    let historyPage = 0;
    const historyLimit = 20;

    function loadHistory() {
        const $el = $('#tab-history');
        $el.html(`
            <div class="kmp-search-bar">
                <input type="text" class="form-control" id="history-search" placeholder="🔍 Search by user...">
                <button class="btn-kmp-outline" id="history-search-btn">Search</button>
            </div>
            <div id="history-table"></div>
            <div id="history-detail"></div>
        `);
        $('#history-search-btn').on('click', () => { historyPage = 0; fetchHistory(); });
        $('#history-search').on('keypress', (e) => { if(e.which===13){ historyPage=0; fetchHistory(); }});
        fetchHistory();
    }

    function fetchHistory() {
        const search = $('#history-search').val() || '';
        const $table = $('#history-table').html('<div class="kmp-loading">⏳ Loading...</div>');
        $('#history-detail').html('');
        frappe.call({
            method: `${API}.get_all_sessions`,
            args: { limit: historyLimit, offset: historyPage * historyLimit, search },
            callback(r) {
                const d = r.message;
                const total = d.total || 0;
                let rows = (d.sessions||[]).map(s => `
                    <tr class="clickable" data-id="${s.name}">
                        <td>${frappe.utils.escape_html(s.user||'')}</td>
                        <td>${s.message_count||0}</td>
                        <td><span class="kmp-badge active">${s.status||'Active'}</span></td>
                        <td>${frappe.datetime.str_to_user(s.creation)}</td>
                        <td>${frappe.datetime.prettyDate(s.modified)}</td>
                        <td><button class="btn-danger-sm del-session" data-id="${s.name}">🗑</button></td>
                    </tr>
                `).join('') || '<tr><td colspan="6" class="text-center text-muted">No sessions</td></tr>';

                const pages = Math.ceil(total / historyLimit);
                $table.html(`
                    <div class="kmp-table-card">
                        <div class="card-header">Chat Sessions <span class="text-muted" style="font-weight:normal;font-size:12px;">(${total} total)</span></div>
                        <table>
                            <thead><tr><th>User</th><th>Msgs</th><th>Status</th><th>Created</th><th>Last Active</th><th></th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                        ${pages > 1 ? `
                        <div class="kmp-pagination">
                            <button class="btn-kmp-outline" id="hist-prev" ${historyPage===0?'disabled':''}>← Prev</button>
                            <span>Page ${historyPage+1} / ${pages}</span>
                            <button class="btn-kmp-outline" id="hist-next" ${historyPage>=pages-1?'disabled':''}>Next →</button>
                        </div>` : ''}
                    </div>
                `);
                $table.find('tr.clickable').on('click', function(e) {
                    if($(e.target).hasClass('del-session')) return;
                    showSessionDetail($(this).data('id'));
                });
                $table.find('.del-session').on('click', function(e) {
                    e.stopPropagation();
                    const id = $(this).data('id');
                    frappe.confirm('Delete this session?', () => {
                        frappe.call({ method: `${API}.delete_session`, args: {session_id: id}, callback() { fetchHistory(); }});
                    });
                });
                $('#hist-prev').on('click', () => { historyPage--; fetchHistory(); });
                $('#hist-next').on('click', () => { historyPage++; fetchHistory(); });
            }
        });
    }

    function showSessionDetail(sessionId) {
        const $det = $('#history-detail').html('<div class="kmp-loading">⏳ Loading conversation...</div>');
        frappe.call({
            method: `${API}.get_session_detail`,
            args: { session_id: sessionId },
            callback(r) {
                const d = r.message;
                let msgs = (d.messages||[]).map(m => `
                    <div class="kmp-msg-bubble ${m.role}" style="display:flex;flex-direction:column;align-items:${m.role==='user'?'flex-end':'flex-start'};">
                        <div class="kmp-msg-bubble ${m.role}">${frappe.utils.escape_html(m.content)}</div>
                    </div>
                `).join('') || '<div class="text-muted">No messages</div>';
                $det.html(`
                    <div class="kmp-detail-panel">
                        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                            <strong>Session: ${d.name} — ${frappe.utils.escape_html(d.user)}</strong>
                            <button class="btn-kmp-outline" onclick="$('#history-detail').html('')">✕ Close</button>
                        </div>
                        <div style="max-height:400px;overflow-y:auto;">${msgs}</div>
                    </div>
                `);
            }
        });
    }

    // =====================================================================
    // TAB 4: Feedback
    // =====================================================================
    let fbPage = 0;
    const fbLimit = 20;

    function loadFeedback() {
        const $el = $('#tab-feedback');
        $el.html(`
            <div class="kmp-search-bar">
                <select class="form-control" id="fb-filter" style="max-width:200px;">
                    <option value="">All Feedback</option>
                    <option value="positive">👍 Positive</option>
                    <option value="negative">👎 Negative</option>
                </select>
            </div>
            <div id="fb-table"></div>
        `);
        $('#fb-filter').on('change', () => { fbPage = 0; fetchFeedback(); });
        fetchFeedback();
    }

    function fetchFeedback() {
        const filter = $('#fb-filter').val() || null;
        const $table = $('#fb-table').html('<div class="kmp-loading">⏳ Loading...</div>');
        frappe.call({
            method: `${API}.get_all_feedback`,
            args: { limit: fbLimit, offset: fbPage * fbLimit, rating_filter: filter },
            callback(r) {
                const d = r.message;
                const total = d.total || 0;
                let rows = (d.feedback||[]).map(f => `
                    <tr>
                        <td>${frappe.datetime.str_to_user(f.creation)}</td>
                        <td>${frappe.utils.escape_html(f.user||'')}</td>
                        <td><a href="#" class="fb-view-session" data-id="${f.session}">${f.session}</a></td>
                        <td><span class="kmp-badge ${f.rating}">${f.rating==='positive'?'👍':'👎'} ${f.rating}</span></td>
                        <td>${frappe.utils.escape_html(f.comment||'-')}</td>
                    </tr>
                `).join('') || '<tr><td colspan="5" class="text-center text-muted">No feedback</td></tr>';

                const pages = Math.ceil(total / fbLimit);
                $table.html(`
                    <div class="kmp-table-card">
                        <div class="card-header">Feedback <span class="text-muted" style="font-weight:normal;font-size:12px;">(${total} total)</span></div>
                        <table>
                            <thead><tr><th>Date</th><th>User</th><th>Session</th><th>Rating</th><th>Comment</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                        ${pages > 1 ? `
                        <div class="kmp-pagination">
                            <button class="btn-kmp-outline" id="fb-prev" ${fbPage===0?'disabled':''}>← Prev</button>
                            <span>Page ${fbPage+1} / ${pages}</span>
                            <button class="btn-kmp-outline" id="fb-next" ${fbPage>=pages-1?'disabled':''}>Next →</button>
                        </div>` : ''}
                    </div>
                    <div id="fb-detail"></div>
                `);
                $table.find('.fb-view-session').on('click', function(e) {
                    e.preventDefault();
                    const sid = $(this).data('id');
                    frappe.call({
                        method: `${API}.get_session_detail`,
                        args: { session_id: sid },
                        callback(r2) {
                            const dd = r2.message;
                            let msgs = (dd.messages||[]).map(m => `
                                <div style="text-align:${m.role==='user'?'right':'left'};margin-bottom:6px;">
                                    <div class="kmp-msg-bubble ${m.role}" style="display:inline-block;">${frappe.utils.escape_html(m.content)}</div>
                                </div>
                            `).join('');
                            $('#fb-detail').html(`
                                <div class="kmp-detail-panel">
                                    <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                                        <strong>Session: ${dd.name}</strong>
                                        <button class="btn-kmp-outline" onclick="$('#fb-detail').html('')">✕ Close</button>
                                    </div>
                                    <div style="max-height:300px;overflow-y:auto;">${msgs}</div>
                                </div>
                            `);
                        }
                    });
                });
                $('#fb-prev').on('click', () => { fbPage--; fetchFeedback(); });
                $('#fb-next').on('click', () => { fbPage++; fetchFeedback(); });
            }
        });
    }

    // =====================================================================
    // TAB 5: Knowledge Base
    // =====================================================================
    function loadKnowledge() {
        const $el = $('#tab-knowledge');
        $el.html(`
            <div class="kmp-kb-form" id="kb-form">
                <h5 style="margin-bottom:12px;">➕ Add New Entry</h5>
                <div class="form-row">
                    <div class="form-group"><label>Question</label><input type="text" class="form-control" id="kb-q"></div>
                    <div class="form-group"><label>Category</label><input type="text" class="form-control" id="kb-cat" placeholder="e.g. General, HR, IT"></div>
                </div>
                <div class="form-group"><label>Answer</label><textarea class="form-control" id="kb-a" rows="3"></textarea></div>
                <button class="btn-kmp" id="kb-add">➕ Add Entry</button>
                <span id="kb-status" style="margin-left:12px;"></span>
            </div>
            <div id="kb-table"></div>
        `);
        $('#kb-add').on('click', function() {
            const q = $('#kb-q').val().trim();
            const a = $('#kb-a').val().trim();
            const c = $('#kb-cat').val().trim();
            if(!q || !a) { frappe.show_alert({message:'Question and Answer required', indicator:'red'}); return; }
            frappe.call({
                method: `${API}.add_knowledge_entry`,
                args: { question: q, answer: a, category: c },
                callback() {
                    $('#kb-q, #kb-a, #kb-cat').val('');
                    frappe.show_alert({message:'Entry added!', indicator:'green'});
                    fetchKnowledge();
                }
            });
        });
        fetchKnowledge();
    }

    function fetchKnowledge() {
        const $table = $('#kb-table').html('<div class="kmp-loading">⏳ Loading...</div>');
        frappe.call({
            method: `${API}.get_knowledge_entries`,
            callback(r) {
                const entries = r.message || [];
                let rows = entries.map(e => `
                    <tr>
                        <td>${frappe.utils.escape_html(e.question)}</td>
                        <td>${frappe.utils.escape_html((e.answer||'').substring(0,80))}${(e.answer||'').length>80?'...':''}</td>
                        <td>${frappe.utils.escape_html(e.category||'-')}</td>
                        <td>
                            <label style="cursor:pointer;">
                                <input type="checkbox" class="kb-toggle" data-name="${e.name}" ${e.is_active?'checked':''}>
                                ${e.is_active ? '<span class="kmp-badge positive">Active</span>' : '<span class="kmp-badge negative">Inactive</span>'}
                            </label>
                        </td>
                        <td><button class="btn-danger-sm kb-del" data-name="${e.name}">🗑</button></td>
                    </tr>
                `).join('') || '<tr><td colspan="5" class="text-center text-muted">No knowledge entries</td></tr>';

                $table.html(`
                    <div class="kmp-table-card">
                        <div class="card-header">Knowledge Entries <span class="text-muted" style="font-weight:normal;font-size:12px;">(${entries.length})</span></div>
                        <table>
                            <thead><tr><th>Question</th><th>Answer</th><th>Category</th><th>Status</th><th></th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                `);
                $table.find('.kb-toggle').on('change', function() {
                    frappe.call({
                        method: `${API}.update_knowledge_entry`,
                        args: { name: $(this).data('name'), is_active: this.checked ? 1 : 0 },
                        callback() { fetchKnowledge(); }
                    });
                });
                $table.find('.kb-del').on('click', function() {
                    const name = $(this).data('name');
                    frappe.confirm('Delete this entry?', () => {
                        frappe.call({ method: `${API}.delete_knowledge_entry`, args: {name}, callback() { fetchKnowledge(); }});
                    });
                });
            }
        });
    }

    // =====================================================================
    // TAB 6: Tools
    // =====================================================================
    function loadTools() {
        const $el = $('#tab-tools').html('<div class="kmp-loading">⏳ Loading tools...</div>');
        // Load settings to get tools_config
        frappe.call({
            method: `${API}.get_settings`,
            callback(r) {
                const s = r.message;
                let toolsConfig = {};
                try { toolsConfig = JSON.parse(s.tools_config || '{}'); } catch(e) {}

                // Known tools from helper definitions (we'll list common ones)
                const knownTools = [
                    { name: 'search_bom', desc: 'ค้นหาสูตรตำรับ (Bill of Materials)' },
                    { name: 'check_stock', desc: 'เช็คสต็อกสินค้า' },
                    { name: 'search_sales_order', desc: 'ค้นหา Sales Order' },
                    { name: 'search_purchase_order', desc: 'ค้นหา Purchase Order' },
                    { name: 'search_customer', desc: 'ค้นหาข้อมูลลูกค้า' },
                    { name: 'search_supplier', desc: 'ค้นหาข้อมูล Supplier' },
                    { name: 'search_item', desc: 'ค้นหา Item' },
                    { name: 'get_system_info', desc: 'ข้อมูลระบบ ERPNext' },
                    { name: 'get_recent_activity', desc: 'กิจกรรมล่าสุดในระบบ' },
                ];

                let toolItems = knownTools.map(t => {
                    const enabled = toolsConfig[t.name] !== false; // default enabled
                    return `
                    <div class="kmp-tool-item">
                        <div class="tool-info">
                            <h4>${t.name}</h4>
                            <p>${t.desc}</p>
                        </div>
                        <div>
                            <label class="switch" style="cursor:pointer;">
                                <input type="checkbox" class="tool-toggle" data-name="${t.name}" ${enabled?'checked':''}>
                                <span>${enabled ? '✅ Enabled' : '❌ Disabled'}</span>
                            </label>
                        </div>
                    </div>`;
                }).join('');

                $el.html(`
                    <div class="kmp-table-card">
                        <div class="card-header">Available Tools</div>
                        ${toolItems}
                    </div>
                    <button class="btn-kmp" id="save-tools">💾 Save Tools Config</button>
                    <span id="tools-status" style="margin-left:12px;"></span>
                `);

                $el.find('.tool-toggle').on('change', function() {
                    const lbl = $(this).next('span');
                    lbl.text(this.checked ? '✅ Enabled' : '❌ Disabled');
                });

                $('#save-tools').on('click', function() {
                    const config = {};
                    $el.find('.tool-toggle').each(function() {
                        config[$(this).data('name')] = this.checked;
                    });
                    frappe.call({
                        method: `${API}.save_settings`,
                        args: { tools_config: JSON.stringify(config) },
                        callback() {
                            $('#tools-status').html('<span style="color:green">✅ Saved!</span>');
                            setTimeout(() => $('#tools-status').html(''), 3000);
                        }
                    });
                });
            }
        });
    }

    // Loader map
    const loaders = {
        dashboard: loadDashboard,
        settings: loadSettings,
        history: loadHistory,
        feedback: loadFeedback,
        knowledge: loadKnowledge,
        tools: loadTools,
    };

    // Load default tab
    loadDashboard();
};
