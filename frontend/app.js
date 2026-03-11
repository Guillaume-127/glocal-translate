document.addEventListener('DOMContentLoaded', () => {
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

    let translateTimeout;
    let suggestTimeout;
    let currentSuggestion = "";

    // Event Listeners
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

        if (sourceText.value.trim() !== '') {
            triggerTranslation();
        }
    });

    sourceLang.addEventListener('change', triggerTranslation);
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

    function acceptSuggestion() {
        if (currentSuggestion) {
            // Append suggestion safely
            const val = sourceText.value;
            // If there's no trailing space, add one.
            const newText = val.endsWith(' ') ? val + currentSuggestion : val + ' ' + currentSuggestion;
            sourceText.value = newText;
            hideSuggestion();
            triggerTranslation();
            triggerSuggestion(); // look for the next word
        }
    }

    function updateCharCount() {
        charCount.textContent = `${sourceText.value.length} / 5000`;
    }

    function handleTyping() {
        hideSuggestion();
        clearTimeout(translateTimeout);
        clearTimeout(suggestTimeout);

        const text = sourceText.value.trim();
        if (text === '') {
            targetText.value = '';
            loadingOverlay.classList.add('hidden');
            return;
        }

        // Debounce for translation
        translateTimeout = setTimeout(() => {
            triggerTranslation();
        }, 600); // 600ms wait after typing

        // Debounce for suggestion (faster)
        suggestTimeout = setTimeout(() => {
            triggerSuggestion();
        }, 800);
    }

    async function triggerTranslation() {
        const text = sourceText.value.trim();
        if (!text) return;

        loadingOverlay.classList.remove('hidden');
        statusText.textContent = 'Traduction...';
        statusDot.className = 'dot'; // remove connected class (yellow)

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
            statusDot.className = 'dot'; // yellow/red meaning error
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    async function triggerSuggestion() {
        const text = sourceText.value.trim();
        // Need at least a word to suggest the next one safely
        if (!text || text.length < 3) {
            hideSuggestion();
            return;
        }

        try {
            const response = await fetch('/api/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: sourceText.value, // Send whole value, spaces included
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

    function hideSuggestion() {
        suggestionBox.classList.add('hidden');
        currentSuggestion = "";
    }
});
