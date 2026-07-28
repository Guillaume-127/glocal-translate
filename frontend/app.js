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

    let translateTimeout;
    let suggestTimeout;
    let correctionTimeout;
    let currentSuggestion = "";
    let suggestedCorrection = "";

    // Activity Tracking & Heartbeat (Keeps model loaded while active, auto-unloads RAM after 60s idle)
    let lastUserActivity = Date.now();
    
    function recordActivity() {
        lastUserActivity = Date.now();
    }

    window.addEventListener('mousemove', recordActivity);
    window.addEventListener('click', recordActivity);
    window.addEventListener('keydown', recordActivity);
    window.addEventListener('scroll', recordActivity);

    setInterval(async () => {
        if (Date.now() - lastUserActivity < 45000) {
            try {
                await fetch('/api/heartbeat', { method: 'POST' });
            } catch (e) {
                // Ignore network errors
            }
        }
    }, 20000);

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
        // Do NOT suggest completion if text is empty, too short, or ends with sentence punctuation
        if (!text || text.length < 3 || text.endsWith('?') || text.endsWith('!') || text.endsWith('.')) {
            hideSuggestion();
            return;
        }

        // If a correction proposal is currently visible, suppress completion suggestions
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
