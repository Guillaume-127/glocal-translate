document.addEventListener('DOMContentLoaded', () => {
    // Navigation Tabs Elements
    const tabTranslate = document.getElementById('tab-translate');
    const tabEnhancer = document.getElementById('tab-enhancer');
    const viewTranslate = document.getElementById('view-translate');
    const viewEnhancer = document.getElementById('view-enhancer');

    // Translation View Elements
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const charCount = document.getElementById('char-count');
    const swapBtn = document.getElementById('swap-lang-btn');
    const copyBtn = document.getElementById('copy-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    const suggestionBox = document.getElementById('suggestion-box');
    const suggestionTextElement = document.getElementById('suggestion-text');
    const acceptSuggestionBtn = document.getElementById('accept-suggestion-btn');

    // Correction Elements
    const correctionBox = document.getElementById('correction-box');
    const correctionText = document.getElementById('correction-text');
    const applyCorrectionBtn = document.getElementById('apply-correction-btn');

    // Prompt Enhancer View Elements
    const enhancerInput = document.getElementById('enhancer-input');
    const enhancerOutput = document.getElementById('enhancer-output');
    const enhancerType = document.getElementById('enhancer-type');
    const enhanceBtn = document.getElementById('enhance-btn');
    const copyEnhancerBtn = document.getElementById('copy-enhancer-btn');
    const enhancerLoading = document.getElementById('enhancer-loading');

    // Console Modal Elements
    const consoleBtn = document.getElementById('console-btn');
    const consoleModal = document.getElementById('console-modal');
    const closeConsoleBtn = document.getElementById('close-console-btn');
    const consoleBackdrop = document.querySelector('.console-backdrop');
    const consoleLogsText = document.getElementById('console-logs-text');
    const consoleStatusInfo = document.getElementById('console-status-info');
    const clearLogsBtn = document.getElementById('clear-logs-btn');

    // History Modal Elements
    const historyBtn = document.getElementById('history-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyBackdrop = document.getElementById('history-backdrop');
    const historyModalTitle = document.getElementById('history-modal-title');
    const disableHistoryCheckbox = document.getElementById('disable-history-checkbox');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyListBody = document.getElementById('history-list-body');

    let translateTimeout;
    let suggestTimeout;
    let correctionTimeout;
    let logsInterval;
    let currentSuggestion = "";
    let suggestedCorrection = "";

    // Heartbeat & Auto-Shutdown on Tab Close
    setInterval(async () => {
        try {
            await fetch('/api/heartbeat', { method: 'POST' });
        } catch (e) {
            // Server shutting down
        }
    }, 4000);

    fetch('/api/heartbeat', { method: 'POST' }).catch(() => {});

    window.addEventListener('beforeunload', () => {
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/shutdown');
        } else {
            fetch('/api/shutdown', { method: 'POST', keepalive: true }).catch(() => {});
        }
    });

    // Console Modal Logic
    consoleBtn.addEventListener('click', () => {
        consoleModal.classList.remove('hidden');
        fetchLogs();
        logsInterval = setInterval(fetchLogs, 2000);
    });

    closeConsoleBtn.addEventListener('click', closeConsole);
    consoleBackdrop.addEventListener('click', closeConsole);

    function closeConsole() {
        consoleModal.classList.add('hidden');
        clearInterval(logsInterval);
    }

    clearLogsBtn.addEventListener('click', () => {
        consoleLogsText.textContent = "Logs effacés.";
    });

    async function fetchLogs() {
        try {
            const response = await fetch('/api/logs');
            if (!response.ok) return;

            const data = await response.json();
            if (data.logs && data.logs.length > 0) {
                consoleLogsText.textContent = data.logs.join('\n');
            } else {
                consoleLogsText.textContent = "Aucun log serveur pour le moment.";
            }

            const body = document.getElementById('console-logs-body');
            if (body) {
                body.scrollTop = body.scrollHeight;
            }

            if (consoleStatusInfo) {
                const statusStr = data.model_loaded 
                    ? "🟢 Statut Modèle : Chargé en RAM" 
                    : `🟡 Statut Modèle : Déchargé de la RAM (Inactif depuis ${data.idle_seconds}s)`;
                consoleStatusInfo.textContent = statusStr;
            }
        } catch (err) {
            consoleLogsText.textContent = "Erreur de récupération des logs du serveur.";
        }
    }

    // Local History System (Stored 100% in Browser localStorage)
    function isHistoryDisabled() {
        return localStorage.getItem('glocal_history_disabled') === 'true';
    }

    disableHistoryCheckbox.checked = isHistoryDisabled();

    disableHistoryCheckbox.addEventListener('change', (e) => {
        localStorage.setItem('glocal_history_disabled', e.target.checked);
    });

    historyBtn.addEventListener('click', () => {
        renderHistory();
        historyModal.classList.remove('hidden');
    });

    closeHistoryBtn.addEventListener('click', closeHistory);
    historyBackdrop.addEventListener('click', closeHistory);

    function closeHistory() {
        historyModal.classList.add('hidden');
    }

    clearHistoryBtn.addEventListener('click', () => {
        const isTranslate = !viewTranslate.classList.contains('hidden');
        const modeLabel = isTranslate ? "des traductions" : "des prompts";
        if (confirm(`Voulez-vous vraiment supprimer définitivement l'historique local ${modeLabel} ?`)) {
            if (isTranslate) {
                localStorage.removeItem('glocal_history_translate');
            } else {
                localStorage.removeItem('glocal_history_enhancer');
            }
            renderHistory();
        }
    });

    function saveTranslateHistory(source, target, sLang, tLang) {
        if (isHistoryDisabled() || !source.trim() || !target.trim()) return;
        let list = JSON.parse(localStorage.getItem('glocal_history_translate') || '[]');
        // Don't save identical consecutive entry
        if (list.length > 0 && list[0].source === source.trim() && list[0].target === target.trim()) return;

        list.unshift({
            id: Date.now(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString(),
            source: source.trim(),
            target: target.trim(),
            sourceLang: sLang,
            targetLang: tLang
        });
        if (list.length > 50) list.pop();
        localStorage.setItem('glocal_history_translate', JSON.stringify(list));
    }

    function saveEnhancerHistory(input, output, type) {
        if (isHistoryDisabled() || !input.trim() || !output.trim()) return;
        let list = JSON.parse(localStorage.getItem('glocal_history_enhancer') || '[]');
        if (list.length > 0 && list[0].input === input.trim() && list[0].output === output.trim()) return;

        list.unshift({
            id: Date.now(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString(),
            input: input.trim(),
            output: output.trim(),
            type: type
        });
        if (list.length > 50) list.pop();
        localStorage.setItem('glocal_history_enhancer', JSON.stringify(list));
    }

    function renderHistory() {
        const isTranslate = !viewTranslate.classList.contains('hidden');
        historyListBody.innerHTML = '';

        if (isTranslate) {
            historyModalTitle.textContent = "Historique des Traductions";
            const list = JSON.parse(localStorage.getItem('glocal_history_translate') || '[]');
            if (list.length === 0) {
                historyListBody.innerHTML = `<div class="history-empty">Aucune traduction enregistrée dans l'historique local.</div>`;
                return;
            }

            list.forEach(item => {
                const el = document.createElement('div');
                el.className = 'history-item';
                el.innerHTML = `
                    <div class="history-item-header">
                        <span class="history-item-tag">🌐 ${item.sourceLang} ➔ ${item.targetLang}</span>
                        <span class="history-item-time">${item.date} ${item.time}</span>
                    </div>
                    <div class="history-item-body">
                        <div class="history-source">${escapeHtml(item.source)}</div>
                        <div class="history-arrow">➔</div>
                        <div class="history-target">${escapeHtml(item.target)}</div>
                    </div>
                `;
                el.addEventListener('click', () => {
                    sourceLang.value = item.sourceLang;
                    targetLang.value = item.targetLang;
                    sourceText.value = item.source;
                    targetText.value = item.target;
                    updateCharCount();
                    closeHistory();
                    navigator.clipboard.writeText(item.target).catch(() => {});
                });
                historyListBody.appendChild(el);
            });
        } else {
            historyModalTitle.textContent = "Historique des Prompts Améliorés";
            const list = JSON.parse(localStorage.getItem('glocal_history_enhancer') || '[]');
            if (list.length === 0) {
                historyListBody.innerHTML = `<div class="history-empty">Aucun prompt enregistré dans l'historique local.</div>`;
                return;
            }

            list.forEach(item => {
                const el = document.createElement('div');
                el.className = 'history-item';
                el.innerHTML = `
                    <div class="history-item-header">
                        <span class="history-item-tag">✨ ${item.type}</span>
                        <span class="history-item-time">${item.date} ${item.time}</span>
                    </div>
                    <div class="history-item-body">
                        <div class="history-source"><b>Idée :</b> ${escapeHtml(item.input)}</div>
                        <div class="history-target"><b>Prompt :</b> ${escapeHtml(item.output)}</div>
                    </div>
                `;
                el.addEventListener('click', () => {
                    enhancerType.value = item.type;
                    enhancerInput.value = item.input;
                    enhancerOutput.value = item.output;
                    closeHistory();
                    navigator.clipboard.writeText(item.output).catch(() => {});
                });
                historyListBody.appendChild(el);
            });
        }
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Tab Switching Logic
    tabTranslate.addEventListener('click', () => {
        tabTranslate.classList.add('active');
        tabEnhancer.classList.remove('active');
        viewTranslate.classList.remove('hidden');
        viewEnhancer.classList.add('hidden');
    });

    tabEnhancer.addEventListener('click', () => {
        tabEnhancer.classList.add('active');
        tabTranslate.classList.remove('active');
        viewEnhancer.classList.remove('hidden');
        viewTranslate.classList.add('hidden');
    });

    // Translation Event Listeners
    sourceText.addEventListener('input', () => {
        updateCharCount();
        handleTyping();
    });

    swapBtn.addEventListener('click', () => {
        const tempLang = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = tempLang;

        const tempText = sourceText.value;
        sourceText.value = targetText.value;
        targetText.value = tempText;

        hideCorrection();
        if (sourceText.value.trim() !== '') {
            triggerTranslation();
        }
    });

    sourceLang.addEventListener('change', () => {
        hideCorrection();
        triggerTranslation();
    });

    targetLang.addEventListener('change', triggerTranslation);

    copyBtn.addEventListener('click', async () => {
        if (!targetText.value) return;
        try {
            await navigator.clipboard.writeText(targetText.value);
            const originalTitle = copyBtn.getAttribute('title');
            copyBtn.setAttribute('title', 'Copié !');
            setTimeout(() => copyBtn.setAttribute('title', originalTitle), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    });

    // Keyboard shortcut for accepting suggestion
    sourceText.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !suggestionBox.classList.contains('hidden')) {
            e.preventDefault();
            acceptSuggestion();
        }
    });

    acceptSuggestionBtn.addEventListener('click', () => {
        acceptSuggestion();
        sourceText.focus();
    });

    // Apply Correction Button Handler
    applyCorrectionBtn.addEventListener('click', () => {
        if (suggestedCorrection) {
            sourceText.value = suggestedCorrection;
            hideCorrection();
            triggerTranslation();
            sourceText.focus();
        }
    });

    // Prompt Enhancer Listeners
    enhanceBtn.addEventListener('click', triggerEnhancer);

    copyEnhancerBtn.addEventListener('click', async () => {
        if (!enhancerOutput.value) return;
        try {
            await navigator.clipboard.writeText(enhancerOutput.value);
            const originalTitle = copyEnhancerBtn.getAttribute('title');
            copyEnhancerBtn.setAttribute('title', 'Copié !');
            setTimeout(() => copyEnhancerBtn.setAttribute('title', originalTitle), 2000);
        } catch (err) {
            console.error('Failed to copy prompt: ', err);
        }
    });

    async function triggerEnhancer() {
        const text = enhancerInput.value.trim();
        if (!text) return;

        enhancerLoading.classList.remove('hidden');
        statusText.textContent = 'Génération du prompt...';
        statusDot.className = 'dot';

        try {
            const response = await fetch('/api/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    target_type: enhancerType.value
                })
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            enhancerOutput.value = data.result;

            saveEnhancerHistory(text, data.result, enhancerType.value);

            statusText.textContent = 'Prêt';
            statusDot.className = 'dot connected';
        } catch (error) {
            console.error(error);
            enhancerOutput.value = "Erreur lors de la génération du prompt.";
            statusText.textContent = 'Erreur';
            statusDot.className = 'dot';
        } finally {
            enhancerLoading.classList.add('hidden');
        }
    }

    function acceptSuggestion() {
        if (currentSuggestion) {
            const val = sourceText.value;
            const newText = val.endsWith(' ') ? val + currentSuggestion : val + ' ' + currentSuggestion;
            sourceText.value = newText;
            hideSuggestion();
            triggerTranslation();
            triggerSuggestion();
        }
    }

    function updateCharCount() {
        charCount.textContent = `${sourceText.value.length} / 5000`;
    }

    function handleTyping() {
        hideSuggestion();
        hideCorrection();
        clearTimeout(translateTimeout);
        clearTimeout(suggestTimeout);
        clearTimeout(correctionTimeout);

        const text = sourceText.value.trim();
        if (text === '') {
            targetText.value = '';
            loadingOverlay.classList.add('hidden');
            return;
        }

        // Debounce for translation
        translateTimeout = setTimeout(() => {
            triggerTranslation();
        }, 600);

        // Debounce for word suggestion
        suggestTimeout = setTimeout(() => {
            triggerSuggestion();
        }, 800);

        // Debounce for spelling/grammar correction proposal
        correctionTimeout = setTimeout(() => {
            triggerCorrectionCheck();
        }, 800);
    }

    async function triggerTranslation() {
        const text = sourceText.value.trim();
        if (!text) return;

        loadingOverlay.classList.remove('hidden');
        statusText.textContent = 'Traduction...';
        statusDot.className = 'dot';

        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    source_lang: sourceLang.value,
                    target_lang: targetLang.value
                })
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            targetText.value = data.result;

            saveTranslateHistory(text, data.result, sourceLang.value, targetLang.value);
            
            statusText.textContent = 'Prêt';
            statusDot.className = 'dot connected';
        } catch (error) {
            console.error(error);
            targetText.value = "Erreur de connexion au modèle local.";
            statusText.textContent = 'Erreur';
            statusDot.className = 'dot';
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    async function triggerSuggestion() {
        const text = sourceText.value.trim();
        if (!text || text.length < 3 || text.endsWith('?') || text.endsWith('!') || text.endsWith('.')) {
            hideSuggestion();
            return;
        }

        if (!correctionBox.classList.contains('hidden')) {
            hideSuggestion();
            return;
        }

        try {
            const response = await fetch('/api/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: sourceText.value,
                    source_lang: sourceLang.value,
                    target_lang: targetLang.value
                })
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            if (data.suggestion && data.suggestion.trim() !== "") {
                currentSuggestion = data.suggestion.trim();
                suggestionTextElement.textContent = currentSuggestion;
                suggestionBox.classList.remove('hidden');
            } else {
                hideSuggestion();
            }
        } catch (error) {
            hideSuggestion();
        }
    }

    async function triggerCorrectionCheck() {
        const text = sourceText.value.trim();
        if (!text || text.length < 3) {
            hideCorrection();
            return;
        }

        try {
            const response = await fetch('/api/check-spelling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    lang: sourceLang.value
                })
            });

            if (!response.ok) return;

            const data = await response.json();
            const corrected = data.corrected ? data.corrected.trim() : "";
            if (corrected && corrected !== text) {
                suggestedCorrection = corrected;
                correctionText.textContent = `"${suggestedCorrection}"`;
                hideSuggestion();
                correctionBox.classList.remove('hidden');
            } else {
                hideCorrection();
            }
        } catch (error) {
            hideCorrection();
        }
    }

    function hideSuggestion() {
        suggestionBox.classList.add('hidden');
        currentSuggestion = "";
    }

    function hideCorrection() {
        correctionBox.classList.add('hidden');
        suggestedCorrection = "";
    }
});
