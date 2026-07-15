(async () => {
    // --- SICHERHEITS-CHECK FÜR LOCALSTORAGE & WINDOW ---
    const safeLocalStorage = (() => {
        try {
            if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
                return window.localStorage;
            }
        } catch (e) {
            // Falls der Zugriff im Browser blockiert ist
        }

        // Fallback: In-Memory-Objekt, falls localStorage fehlt
        const memoryStorage = {};
        return {
            getItem: (key) => (key in memoryStorage ? memoryStorage[key] : null),
            setItem: (key, value) => { memoryStorage[key] = String(value); },
            removeItem: (key) => { delete memoryStorage[key]; },
            clear: () => { for (const key in memoryStorage) { delete memoryStorage[key]; } },
            key: (index) => Object.keys(memoryStorage)[index] || null,
            get length() { return Object.keys(memoryStorage).length; }
        };
    })();

    if (typeof document === 'undefined' || document.getElementById("discord-quest-gui")) return;

    // --- EINSTELLUNGEN SPEICHERN & LADEN ---
    let activeTheme = safeLocalStorage.getItem('dq_theme') || 'glass'; // Standardmäßig Liquid Glass
    let customAccentColor = safeLocalStorage.getItem('dq_accent_color') || '#5865f2'; // Standard lila Akzent
    let webhookUrl = safeLocalStorage.getItem('dq_webhook_url') || '';

    const style = document.createElement('style');
    style.id = "dq-theme-styles";
    style.innerHTML = `
        :root {
            --dq-bg: #1e1f22;
            --dq-header-bg: linear-gradient(135deg, #2b2d31, #1e1f22);
            --dq-text: #dbdee1;
            --dq-text-muted: #949ba4;
            --dq-panel-bg: #111214;
            --dq-cat-bg: #2b2d31;
            --dq-accent: #5865f2;
            --dq-accent-hover: #4752c4;
            --dq-btn-gradient: linear-gradient(135deg, #747fe3, #5865f2);
            --dq-btn-hover-gradient: linear-gradient(135deg, #8a96f5, #4752c4);
            --dq-border: rgba(255,255,255,0.05);
            --dq-shadow: 0 12px 32px rgba(0,0,0,0.5);
            --dq-backdrop: none;
        }

        .theme-glass {
            --dq-bg: rgba(30, 31, 34, 0.45);
            --dq-header-bg: rgba(43, 45, 49, 0.35);
            --dq-text: #ffffff;
            --dq-text-muted: rgba(255, 255, 255, 0.6);
            --dq-panel-bg: rgba(0, 0, 0, 0.3);
            --dq-cat-bg: rgba(255, 255, 255, 0.05);
            --dq-border: rgba(255, 255, 255, 0.12);
            --dq-shadow: 0 16px 40px rgba(0,0,0,0.4);
            --dq-backdrop: blur(16px) saturate(180%);
        }

        #dq-gui { 
            position:fixed; top:50px; right:50px; width:390px; 
            background: var(--dq-bg); color: var(--dq-text); 
            border-radius:14px; box-shadow: var(--dq-shadow); 
            z-index:999999; font-family:"gg sans","Segoe UI",sans-serif; 
            display:flex; flex-direction:column; 
            border:1px solid var(--dq-border); overflow:hidden;
            backdrop-filter: var(--dq-backdrop);
            -webkit-backdrop-filter: var(--dq-backdrop);
            transition: background 0.3s, border 0.3s, box-shadow 0.3s;
        }

        /* Lila schimmernder rotierender Glow im Hintergrund */
        .theme-glass::before {
            content: '';
            position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
            background: radial-gradient(circle, rgba(88, 101, 242, 0.15) 0%, transparent 60%);
            z-index: -1; animation: liquid-spin 12s infinite linear; pointer-events: none;
        }
        @keyframes liquid-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        #dq-header { background: var(--dq-header-bg); padding:14px 18px; font-weight:600; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--dq-border); cursor:grab; user-select:none; }
        .dq-header-icons { display: flex; align-items: center; gap: 12px; }
        .dq-icon-btn { opacity: 0.7; cursor:pointer; color: var(--dq-text-muted); font-size:16px; padding:4px; transition:color 0.2s, transform 0.1s; display: flex; align-items: center; justify-content: center; }
        .dq-icon-btn:hover { color: var(--dq-text); transform: scale(1.1); }
        #dq-close:hover { color:#fa777c !important; }
        
        #dq-body { padding:18px; display:flex; flex-direction:column; gap:14px; }
        
        #dq-editor { background: var(--dq-panel-bg); border: 1px solid var(--dq-border); border-radius: 10px; padding: 12px; display: none; flex-direction: column; gap: 10px; }
        .dq-editor-title { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: var(--dq-text-muted); margin-bottom: 4px; }
        .dq-theme-grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
        .dq-theme-opt { background: var(--dq-cat-bg); border: 1px solid var(--dq-border); color: var(--dq-text); padding: 8px; border-radius: 6px; cursor: pointer; text-align: center; font-size: 12px; font-weight: 500; transition: all 0.2s; }
        .dq-theme-opt:hover { border-color: var(--dq-accent); }
        .dq-theme-opt.active { background: var(--dq-accent); color: #fff; border-color: var(--dq-accent); }
        
        .dq-btn { background: var(--dq-btn-gradient); color:white; border:none; padding:11px; border-radius:6px; cursor:pointer; font-weight:600; width:100%; transition:all 0.2s ease-in-out; box-shadow:0 2px 4px rgba(0,0,0,0.15); }
        .dq-btn:hover { background: var(--dq-btn-hover-gradient); transform:translateY(-1px); } 
        .dq-btn.dq-stop { background: linear-gradient(135deg, #ff7376, #ed4245) !important; }
        .dq-btn:disabled { background: var(--dq-cat-bg) !important; cursor:not-allowed; color: var(--dq-text-muted) !important; box-shadow:none; border:1px solid var(--dq-border); }
        
        #dq-list, #dq-logs { background: var(--dq-panel-bg); padding:10px; border-radius:8px; font-size:13px; }
        #dq-list { max-height:180px; overflow-y:auto; display:flex; flex-direction:column; gap:6px; border:1px solid var(--dq-border); }
        
        #dq-logs { height:110px; overflow-y:auto; word-wrap:break-word; font-family:"Consolas",monospace; color: var(--dq-accent); line-height:1.4; opacity: 0.95; border:1px solid var(--dq-accent); transition: border-color 0.3s, color 0.3s; }
        
        .dq-cat { margin-bottom:4px; background: var(--dq-cat-bg); border-radius:6px; padding:6px; border:1px solid var(--dq-border); }
        .dq-cat-items { padding:6px 6px 4px 22px; display:flex; flex-direction:column; gap:6px; border-top:1px solid var(--dq-border); margin-top:4px; }
        .dq-cb-lbl { display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; user-select:none; transition:color 0.2s; }
        .dq-cb-lbl:hover { color: var(--dq-text); }
        .dq-cb-lbl input { cursor:pointer; accent-color: var(--dq-accent); width:15px; height:15px; border-radius:4px; }

        /* Webhook Input Styling */
        .dq-input { background: var(--dq-bg); border: 1px solid var(--dq-border); color: var(--dq-text); padding: 8px; border-radius: 6px; font-size: 12px; width: 100%; box-sizing: border-box; outline: none; transition: border-color 0.2s; }
        .dq-input:focus { border-color: var(--dq-accent); }
        
        .dq-progress-inner { height:100%; background: var(--dq-accent); transition:width 0.3s ease; }
        
        #dq-list::-webkit-scrollbar, #dq-logs::-webkit-scrollbar { width:6px; }
        #dq-list::-webkit-scrollbar-track, #dq-logs::-webkit-scrollbar-track { background:transparent; }
        #dq-list::-webkit-scrollbar-thumb, #dq-logs::-webkit-scrollbar-thumb { background: var(--dq-cat-bg); border-radius:4px; }
        
        #dq-support-modal { display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(4px); z-index:1000000; border-radius:14px; align-items:center; justify-content:center; padding:20px; box-sizing:border-box; }
        .dq-modal-content { background: var(--dq-bg); border: 1px solid var(--dq-border); border-radius:12px; padding:20px; width:100%; max-width:320px; text-align:center; box-shadow: var(--dq-shadow); display:flex; flex-direction:column; gap:12px; position:relative; }
        .dq-modal-address { background: var(--dq-panel-bg); border: 1px solid var(--dq-border); padding:10px; border-radius:6px; font-family:monospace; font-size:11px; word-break:break-all; color: var(--dq-text); margin: 6px 0; }
    `;
    document.head.appendChild(style);

    const gui = document.createElement('div');
    gui.id = "discord-quest-gui";
    gui.innerHTML = `
        <div id="dq-gui" class="${activeTheme !== 'dark' ? 'theme-' + activeTheme : ''}">
            <!-- Support Modal Overlay -->
            <div id="dq-support-modal">
                <div class="dq-modal-content">
                    <span style="font-size:24px;">❤️</span>
                    <h3 style="margin:0; font-size:16px;">Support the Creator</h3>
                    <p style="margin:0; font-size:12px; color: var(--dq-text-muted);">Deine Spende hilft mir, das Script stabil und up-to-date zu halten.</p>
                    <div style="text-align:left; font-size:11px; font-weight:bold; color: var(--dq-text-muted); margin-bottom:-6px;">ETH / ERC-20 ADRESSE:</div>
                    <div class="dq-modal-address" id="dq-wallet-addr">0x0828dE5F5FDB4f93453d3067a90529B304df9993</div>
                    <button class="dq-btn" id="dq-copy-btn">Adresse kopieren</button>
                    <button class="dq-btn" style="background:transparent; border:1px solid var(--dq-border); color: var(--dq-text); box-shadow:none;" id="dq-close-modal">Zurück</button>
                </div>
            </div>

            <!-- Header -->
            <div id="dq-header">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-size:14px; letter-spacing:0.3px;">✨ Aether Quest Harvester</span>
                    <span style="font-size:10px; color: var(--dq-text-muted); font-weight:normal; margin-top:2px; text-transform:uppercase; letter-spacing:0.5px;">v1.2 • Premium</span>
                </div>
                <div class="dq-header-icons">
                    <span class="dq-icon-btn" id="dq-heart-btn" title="Support">❤️</span>
                    <span class="dq-icon-btn" id="dq-paint-btn" title="Design Editor">🎨</span>
                    <span id="dq-close" class="dq-icon-btn" title="Schließen">✕</span>
                </div>
            </div>
            
            <!-- Body -->
            <div id="dq-body">
                <!-- Design Editor Drawer -->
                <div id="dq-editor">
                    <div class="dq-editor-title">Theme wählen</div>
                    <div class="dq-theme-grid">
                        <div class="dq-theme-opt" data-theme="glass">Liquid Glass</div>
                    </div>
                    <div id="dq-custom-color-sec" style="display:flex; align-items:center; justify-content:space-between; margin-top:4px; padding-top:8px; border-top:1px solid var(--dq-border);">
                        <span style="font-size:12px; font-weight:500;">Custom Accent Color</span>
                        <input type="color" id="dq-accent-picker" style="border:none; padding:0; width:30px; height:24px; border-radius:4px; cursor:pointer; background:none;">
                    </div>
                    <!-- Webhook Settings -->
                    <div style="display:flex; flex-direction:column; gap:5px; margin-top:4px; padding-top:8px; border-top:1px solid var(--dq-border);">
                        <span style="font-size:12px; font-weight:500; color: var(--dq-text-muted);">DISCORD WEBHOOK URL</span>
                        <input type="text" id="dq-webhook-input" class="dq-input" placeholder="https://discord.com/api/webhooks/..." value="${webhookUrl}">
                    </div>
                </div>

                <div id="dq-status" style="font-size:13px; font-weight:500; color: var(--dq-text-muted);">Suche nach Missionen...</div>
                <div id="dq-global-progress" style="display:none; background: var(--dq-panel-bg); height:6px; border-radius:3px; margin-bottom:2px; overflow:hidden; border:1px solid var(--dq-border);">
                    <div id="dq-global-bar" style="width:0%; height:100%; background:linear-gradient(90deg, var(--dq-accent), #a370f7); transition:width 0.3s ease;"></div>
                </div>
                
                <div id="dq-list"></div>
                <button id="dq-start" class="dq-btn" disabled>Initialisiere...</button>
                <div id="dq-logs"></div>
            </div>
        </div>
    `;
    document.body.appendChild(gui);

    const logsEl = document.getElementById('dq-logs');
    const questListEl = document.getElementById('dq-list');
    const statusEl = document.getElementById('dq-status');
    const startBtn = document.getElementById('dq-start');
    const guiContainer = gui.firstElementChild;

    // --- ACCENT FARBE AKTUALISIEREN & SPEICHERN ---
    const updateAccent = (hex, save = true) => {
        customAccentColor = hex;
        if (save) {
            safeLocalStorage.setItem('dq_accent_color', hex);
        }
        const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
        const darkHex = `rgba(${Math.max(0, r-30)}, ${Math.max(0, g-30)}, ${Math.max(0, b-30)}, 1)`;
        
        document.documentElement.style.setProperty('--dq-accent', hex);
        document.documentElement.style.setProperty('--dq-btn-gradient', `linear-gradient(135deg, ${hex}dd, ${hex})`);
        document.documentElement.style.setProperty('--dq-btn-hover-gradient', `linear-gradient(135deg, ${hex}, ${darkHex})`);
    };

    // --- INITIALES THEME LADEN ---
    guiContainer.className = '';
    guiContainer.classList.add(`theme-${activeTheme}`);
    safeLocalStorage.setItem('dq_theme', activeTheme);

    const activeOpt = document.querySelector(`.dq-theme-opt[data-theme="${activeTheme}"]`);
    if (activeOpt) activeOpt.classList.add('active');
    document.getElementById('dq-accent-picker').value = customAccentColor;
    updateAccent(customAccentColor, false);

    // --- INTERAKTIONEN IM DESIGN EDITOR ---
    document.querySelectorAll('.dq-theme-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.dq-theme-opt').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            guiContainer.className = '';
            const theme = opt.dataset.theme;
            activeTheme = theme;
            safeLocalStorage.setItem('dq_theme', theme);

            guiContainer.classList.add(`theme-${theme}`);
            
            const defaultColor = '#5865f2';
            updateAccent(defaultColor);
            document.getElementById('dq-accent-picker').value = defaultColor;
        });
    });

    document.getElementById('dq-accent-picker').addEventListener('input', (e) => {
        updateAccent(e.target.value);
    });

    // Webhook URL Eingabe speichern
    document.getElementById('dq-webhook-input').addEventListener('input', (e) => {
        webhookUrl = e.target.value.trim();
        safeLocalStorage.setItem('dq_webhook_url', webhookUrl);
    });

    document.getElementById('dq-paint-btn').addEventListener('click', () => {
        const editor = document.getElementById('dq-editor');
        editor.style.display = editor.style.display === 'flex' ? 'none' : 'flex';
    });

    // --- WEBHOOK FUNKTION (Fix für CORS-Fehler mit 'no-cors') ---
    async function sendWebhookNotification(questName, status = "Abgeschlossen") {
        if (!webhookUrl) return; 

        const payload = {
            embeds: [{
                title: "💎 Quest Harvester Update",
                color: parseInt(customAccentColor.replace("#", ""), 16),
                fields: [
                    { name: "Quest Name", value: `\`${questName}\``, inline: true },
                    { name: "Status", value: `🟢 ${status}`, inline: true },
                    { name: "Aktion", value: `\`Bitte manuell im Discord-Inventar einlösen!\``, inline: false }
                ],
                footer: { text: "Aether Quest Harvester • Premium" },
                timestamp: new Date().toISOString()
            }]
        };

        try {
            // "no-cors" umgeht die restriktive CORS Policy von Discord-Webhooks im Client-Kontext
            await fetch(webhookUrl, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            log(`Webhook gesendet für: ${questName}`, "success");
        } catch (e) {
            log("Fehler beim Senden des Webhooks.", "error");
        }
    }

    const modal = document.getElementById('dq-support-modal');
    document.getElementById('dq-heart-btn').addEventListener('click', () => modal.style.display = 'flex');
    document.getElementById('dq-close-modal').addEventListener('click', () => modal.style.display = 'none');
    
    document.getElementById('dq-copy-btn').addEventListener('click', () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText("0x0828dE5F5FDB4f93453d3067a90529B304df9993").then(() => {
                const btn = document.getElementById('dq-copy-btn');
                btn.textContent = "Kopiert! ❤️";
                btn.style.background = "linear-gradient(135deg, #57f287, #23a55a)";
                setTimeout(() => {
                    btn.textContent = "Adresse kopieren";
                    btn.style.background = "var(--dq-btn-gradient)";
                }, 2500);
            });
        } else {
            log("Zwischenablage nicht verfügbar.", "warn");
        }
    });

    let isDragging = false, startX, startY, initX, initY;
    const header = document.getElementById('dq-header');
    header.addEventListener('mousedown', e => {
        if (e.target.closest('.dq-header-icons')) return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = guiContainer.getBoundingClientRect();
        initX = rect.left; initY = rect.top; header.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        guiContainer.style.left = `${initX + (e.clientX - startX)}px`;
        guiContainer.style.top = `${initY + (e.clientY - startY)}px`;
        guiContainer.style.right = 'auto'; 
    });
    document.addEventListener('mouseup', () => { isDragging = false; header.style.cursor = 'grab'; });
    document.getElementById('dq-close').addEventListener('click', () => { gui.remove(); style.remove(); });

    function log(msg, type = "info") {
        const div = document.createElement('div');
        if (type === 'error') div.style.color = '#f23f43';
        else if (type === 'warn') div.style.color = '#f0b232';
        else if (type === 'success') div.style.color = '#23a55a';
        
        div.style.marginBottom = '2px';
        div.textContent = `[${new Date().toLocaleTimeString('de-DE', {hour12:false})}] ${msg}`;
        logsEl.appendChild(div);
        logsEl.scrollTop = logsEl.scrollHeight;
    }

    const wp = window.webpackChunkdiscord_app?.push([[Symbol()], {}, r => r]);
    window.webpackChunkdiscord_app?.pop();
    if (!wp || !wp.c) return log("Webpack Fehler.", "error");

    const findStore = (filter) => {
        for (const k in wp.c) {
            const e = wp.c[k]?.exports; if (!e) continue;
            try {
                if (filter(e)) return e; if (e.default && filter(e.default)) return e.default;
                if (e.Z && filter(e.Z)) return e.Z; if (e.A && filter(e.A)) return e.A;
                if (e.Ay && filter(e.Ay)) return e.Ay; if (e.Bo && filter(e.Bo)) return e.Bo;
                if (typeof e === 'object') for (const v of Object.values(e)) if (v && filter(v)) return v;
            } catch (err) {} 
        }
        return null;
    };

    const isReal = x => { try { return typeof x?.proxy_test === 'undefined'; } catch (e) { return false; } };
    const QuestsStore = findStore(x => x?.quests instanceof Map);
    const RunningGameStore = findStore(x => isReal(x) && typeof x?.getRunningGames === 'function');
    const ApplicationStreamingStore = findStore(x => isReal(x) && typeof x?.getStreamerActiveStreamMetadata === 'function');
    const ChannelStore = findStore(x => isReal(x) && typeof x?.getAllThreadsForParent === 'function');
    const GuildChannelStore = findStore(x => isReal(x) && typeof x?.getAllGuilds === 'function');
    const FluxDispatcher = findStore(x => isReal(x) && typeof x?.flushWaitQueue === 'function' && typeof x?.dispatch === 'function');
    
    const api = findStore(x => {
        if (!isReal(x) || typeof x === 'function') return false; 
        if (typeof x.get !== 'function' || typeof x.post !== 'function') return false;
        if (typeof x.end === 'function') return false; 
        return true;
    });

    if (!QuestsStore || !api || !FluxDispatcher) return log("Stores fehlen. Lade Discord neu (Strg+R).", "error");

    const origGetGames = RunningGameStore.getRunningGames;
    const origGetPID = RunningGameStore.getGameForPID;
    const origGetMetadata = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
    
    let fakeGames = [], fakeStreams = [];
    let cachedOrigGames = null;
    let cachedResult = [];
    let fakeGamesCount = -1;
    
    RunningGameStore.getRunningGames = function() {
        const orig = origGetGames.call(this) || [];
        if (orig !== cachedOrigGames || fakeGames.length !== fakeGamesCount) {
            cachedOrigGames = orig;
            fakeGamesCount = fakeGames.length;
            cachedResult = [...orig.filter(g => !fakeGames.some(f => f.id === g.id)), ...fakeGames];
        }
        return cachedResult;
    };
    
    RunningGameStore.getGameForPID = function(p) {
        return fakeGames.find(g => g.pid === p) || origGetPID.call(this, p);
    };
    
    ApplicationStreamingStore.getStreamerActiveStreamMetadata = function() {
        return fakeStreams.length > 0 ? fakeStreams[0] : origGetMetadata.call(this);
    };

    const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
    const categoryNames = { "ORBS": "🔮 Orbs & Gems", "AVATAR": "🖼️ Avatardekorationen", "INGAME": "🎮 Ingame-Belohnungen" };
    
    const getQuestCategory = q => {
        const s = JSON.stringify({ r1: q.config?.rewards, r2: q.config?.reward }).toLowerCase();
        if (s.includes("orb") || s.includes("gem") || s.includes("currency")) return "ORBS";
        if (s.includes("avatar") || s.includes("decoration") || s.includes("profile_effect")) return "AVATAR";
        return "INGAME"; 
    };

    let quests = Array.from(QuestsStore.quests.values() || []).filter(x => {
        try {
            if (x.userStatus?.completedAt || (new Date(x.config?.expiresAt).getTime() < Date.now())) return false;
            const t = x.config?.taskConfig ?? x.config?.taskConfigV2?.tasks ?? {};
            return supportedTasks.some(y => Object.keys(t).includes(y));
        } catch (e) { return false; }
    });

    if (quests.length === 0) {
        log("Keine neuen Missionen zum Farmen gefunden!", "warn"); statusEl.textContent = "Alle verfügbaren Missionen beendet.";
    } else {
        log(`${quests.length} Missionen geladen.`, "success");
        statusEl.textContent = "Wähle Missionen zur Abarbeitung aus.";
        startBtn.textContent = "Ausgewählte starten"; startBtn.disabled = false;
        
        const byCat = {};
        quests.forEach(q => { const c = getQuestCategory(q); if (!byCat[c]) byCat[c] = []; byCat[c].push(q); });

        let html = `
            <div style="border-bottom:1px solid var(--dq-border); padding-bottom:8px; margin-bottom:4px;" class="dq-cb-lbl">
                <input type="checkbox" id="dq-select-all" checked>
                <label for="dq-select-all" style="cursor:pointer; font-weight:bold; color: var(--dq-text);">🏆 Alle Missionen auswählen</label>
            </div>
        `;

        Object.keys(byCat).forEach(cat => {
            html += `
                <div class="dq-cat">
                    <div style="padding:4px;" class="dq-cb-lbl">
                        <input type="checkbox" class="dq-cat-cb" data-cat="${cat}" checked>
                        <label style="font-weight:600; color: var(--dq-text);">${categoryNames[cat]} <span style="color: var(--dq-text-muted); font-weight:normal; font-size:11px;">(${byCat[cat].length})</span></label>
                    </div>
                    <div class="dq-cat-items">
            `;
            byCat[cat].forEach(q => {
                const name = q.config?.messages?.questName ?? q.config?.application?.name ?? "Mission";
                html += `
                    <label class="dq-cb-lbl" style="align-items:flex-start; padding:2px 0;">
                        <input type="checkbox" class="dq-quest-cb" data-cat="${cat}" value="${q.id}" checked style="margin-top:2px;">
                        <div style="flex:1; display:flex; flex-direction:column;">
                            <span style="font-size:12px; color: var(--dq-text-muted);">${name}</span>
                            <div style="display:none; background: var(--dq-panel-bg); height:4px; border-radius:2px; margin-top:5px; overflow:hidden; width:95%;" id="prog-cont-${q.id}">
                                <div id="prog-bar-${q.id}" class="dq-progress-inner" style="width:0%;"></div>
                            </div>
                        </div>
                    </label>
                `;
            });
            html += `</div></div>`;
        });
        questListEl.innerHTML = html;
        
        const selAll = document.getElementById('dq-select-all');
        const catCbs = document.querySelectorAll('.dq-cat-cb'), qCbs = document.querySelectorAll('.dq-quest-cb');
        const updateSel = () => {
            selAll.checked = Array.from(qCbs).every(c => c.checked);
            selAll.indeterminate = Array.from(qCbs).some(c => c.checked) && !selAll.checked;
        };
        selAll.addEventListener('change', e => { catCbs.forEach(c => c.checked = e.target.checked); qCbs.forEach(c => c.checked = e.target.checked); });
        catCbs.forEach(cb => cb.addEventListener('change', e => {
            document.querySelectorAll(`.dq-quest-cb[data-cat="${e.target.dataset.cat}"]`).forEach(c => c.checked = e.target.checked); updateSel();
        }));
        qCbs.forEach(cb => cb.addEventListener('change', e => {
            const cCat = document.querySelector(`.dq-cat-cb[data-cat="${e.target.dataset.cat}"]`);
            const cQs = Array.from(document.querySelectorAll(`.dq-quest-cb[data-cat="${e.target.dataset.cat}"]`));
            cCat.checked = cQs.every(c => c.checked); cCat.indeterminate = cQs.some(c => c.checked) && !cCat.checked; updateSel();
        }));
    }

    let isRunning = false;
    const updateProg = (id, cur, tot) => {
        const bar = document.getElementById(`prog-bar-${id}`);
        const cont = document.getElementById(`prog-cont-${id}`);
        if (cont && cont.style.display === 'none') cont.style.display = 'block';
        if (bar) {
            const p = Math.min(100, Math.floor((cur / tot) * 100));
            bar.style.width = `${p}%`; if (p >= 100) bar.style.background = '#23a55a';
        }
    };

    startBtn.addEventListener('click', async () => {
        if (isRunning) {
            isRunning = false;
            startBtn.textContent = "Ausgewählte starten";
            startBtn.classList.remove('dq-stop');
            log("Farming manuell gestoppt.", "warn");
            statusEl.textContent = "Gestoppt.";
        } else {
            const selectedChecked = Array.from(document.querySelectorAll('.dq-quest-cb:checked')).map(cb => cb.value);
            if (selectedChecked.length === 0) return log("Keine Quests ausgewählt!", "warn");

            isRunning = true;
            startBtn.textContent = "Farming stoppen";
            startBtn.classList.add('dq-stop');
            statusEl.textContent = "Multi-Farming läuft...";
            log(`Parallel-Farming für ${selectedChecked.length} Missionen gestartet...`, "success");

            const activePromises = selectedChecked.map(qId => {
                const activeQuest = quests.find(q => q.id === qId);
                return activeQuest ? startQuest(activeQuest) : Promise.resolve();
            });

            await Promise.all(activePromises);

            if (isRunning) {
                isRunning = false;
                startBtn.textContent = "Ausgewählte starten";
                startBtn.classList.remove('dq-stop');
                statusEl.textContent = "Alle Quests gleichzeitig fertig!";
                log("Paralleles Farming beendet.", "success");
            }
        }
    });

    async function startQuest(quest) {
        const qName = quest.config?.messages?.questName ?? quest.config?.application?.name ?? "Mission";
        
        if (!quest.userStatus?.enrolledAt) {
            try { 
                await api.post({ url: `/quests/${quest.id}/enroll`, body: { location: 2 }, trackedActionData: { properties: {} } }); 
                await new Promise(r => setTimeout(r, 1000)); 
            } catch (e) {
                log(`[${qName}] Nimm die Quest bitte kurz manuell im Discord-Menü an!`, "warn");
            }
        }

        const pid = Math.floor(Math.random() * 30000) + 1000;
        const appId = quest.config?.application?.id;
        const tasks = quest.config?.taskConfig ?? quest.config?.taskConfigV2?.tasks ?? {};
        const tName = supportedTasks.find(x => tasks[x] != null);

        if (!tName) {
            log(`[${qName}] Kein unterstützter Task-Typ.`, "warn"); return;
        }
        const secReq = tasks[tName].target ?? 900;
        let secDone = quest.userStatus?.progress?.[tName]?.value ?? 0;

        log(`[${qName}] Gestartet!`); updateProg(quest.id, secDone, secReq);

        if (tName === "WATCH_VIDEO" || tName === "WATCH_VIDEO_ON_MOBILE") {
            while (secDone < secReq && isRunning) {
                const rem = Math.min(7, secReq - secDone); await new Promise(r => setTimeout(r, rem * 1000));
                secDone = Math.min(secReq, secDone + 7); updateProg(quest.id, secDone, secReq);
                try {
                    const res = await api.post({ 
                        url: `/quests/${quest.id}/video-progress`, 
                        body: { timestamp: secDone + Math.random() },
                        trackedActionData: { properties: {} } 
                    });
                    if (res?.body?.completed_at) break;
                } catch(err) {
                    log(`[${qName}] Verbindungsfehler beim Video-Stream.`, "error");
                    break;
                }
            }
        } else {
            const isStream = tName === "STREAM_ON_DESKTOP";
            const appName = quest.config?.application?.name ?? "Spiel";
            
            const fakeG = { id: appId, name: appName, killed: false, isDiskGame: true, executable: "game.exe", cmdLine: "", pid: pid, start: Date.now() };
            fakeGames.push(fakeG);

            let channelId = null;
            if (isStream) {
                const guild = GuildChannelStore.getAllGuilds();
                const guildId = Object.keys(guild)[0];
                if (guildId) {
                    const channels = ChannelStore.getChannels(guildId);
                    const voice = channels.VOCAL?.find(c => c.channel.isVoice());
                    if (voice) channelId = voice.channel.id;
                }
                
                if (!channelId) {
                    log(`[${qName}] Für Stream-Quests musst du dich in einem Voice-Channel befinden!`, "warn");
                    fakeGames = fakeGames.filter(g => g.pid !== pid);
                    return;
                }

                fakeStreams.push({
                    pid: pid,
                    sourceId: `window:${pid}`,
                    sourceName: appName,
                    applicationName: appName,
                    channelId: channelId,
                    soundShareEnabled: true
                });

                FluxDispatcher.dispatch({
                    type: "STREAM_START",
                    streamType: 1,
                    guildId: guildId,
                    channelId: channelId,
                    pid: pid
                });
            }

            while (secDone < secReq && isRunning) {
                const step = 30;
                await new Promise(r => setTimeout(r, step * 1000));
                if (!isRunning) break;

                try {
                    const res = await api.post({
                        url: `/quests/${quest.id}/heartbeat`,
                        body: { progress: secDone + step },
                        trackedActionData: { properties: {} }
                    });
                    
                    secDone = res.body?.user_status?.progress?.[tName]?.value ?? (secDone + step);
                    updateProg(quest.id, secDone, secReq);

                    if (res.body?.user_status?.completed_at) {
                        break;
                    }
                } catch (e) {
                    log(`[${qName}] Heartbeat-Fehler. Versuche es gleich erneut...`, "warn");
                }
            }

            fakeGames = fakeGames.filter(g => g.pid !== pid);
            if (isStream) {
                fakeStreams = fakeStreams.filter(s => s.pid !== pid);
                FluxDispatcher.dispatch({ type: "STREAM_STOP" });
            }
        }

        if (secDone >= secReq) {
            log(`[${qName}] Abgeschlossen!`, "success");
            // Sende den Webhook (CORS-Fehler behoben)
            sendWebhookNotification(qName, "Abgeschlossen");
        }
    }
})();
