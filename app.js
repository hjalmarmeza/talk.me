import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, onChildRemoved, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBUhWqhxZk3Gvhjz66D02LUJgcytFbS4bo",
    authDomain: "dialecta-42e1d.firebaseapp.com",
    databaseURL: "https://dialecta-42e1d-default-rtdb.firebaseio.com",
    projectId: "dialecta-42e1d",
    storageBucket: "dialecta-42e1d.firebasestorage.app",
    messagingSenderId: "607459496925",
    appId: "1:607459496925:web:83b129e898bef094c55c34"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

signInAnonymously(auth).catch((error) => console.error("Auth error:", error));

let myDeviceId = localStorage.getItem('talkme_device_id');
if (!myDeviceId) {
    myDeviceId = Math.random().toString(36).substring(2, 12);
    localStorage.setItem('talkme_device_id', myDeviceId);
}

window.isInitialLoad = true;
setTimeout(() => { window.isInitialLoad = false; }, 2000);

document.addEventListener('DOMContentLoaded', () => {

    const appLangSelect = document.getElementById('app-lang-select');
    const pttBtn = document.getElementById('ptt-button');
    const statusText = document.getElementById('status-text');
    const myLangSelect = document.getElementById('my-lang');
    const targetLangSelect = document.getElementById('target-lang');
    const swapLangBtn = document.getElementById('swap-lang-btn');
    const myFlag = document.getElementById('my-flag');
    const targetFlag = document.getElementById('target-flag');
    const usernameInput = document.getElementById('username');
    const chatHistory = document.getElementById('chat-history');
    const roomIdDisplay = document.getElementById('room-id-display');
    const inviteBtn = document.getElementById('invite-btn');
    const shareModal = document.getElementById('share-modal');
    const closeShareBtn = document.getElementById('close-share');
    const roomInfoSection = document.getElementById('room-info-section');
    const tabSolo = document.getElementById('tab-solo');
    const tabRoom = document.getElementById('tab-room');

    const splitScreenBtn = document.getElementById('split-screen-btn');
    const closeSplitBtn = document.getElementById('close-split-btn');
    const chatHistoryClipTop = document.getElementById('chat-history-clip-top');
    const chatDivider = document.getElementById('chat-divider');
    const chatHistoryTop = document.getElementById('chat-history-top');

    const offlineBadge = document.getElementById('offline-badge');
    const ocrBtn = document.getElementById('ocr-btn');
    const ocrFileInput = document.getElementById('ocr-file-input');
    const ocrModal = document.getElementById('ocr-modal');

    const summaryBtn = document.getElementById('summary-btn');
    const summaryModal = document.getElementById('summary-modal');
    const closeSummary = document.getElementById('close-summary');
    const summaryContent = document.getElementById('summary-content');
    const copySummaryBtn = document.getElementById('copy-summary-btn');

    // Referencias de Ajustes
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');

    let currentMode = 'solo';
    chatHistory.dataset.activeMode = 'solo';

    let splitModeActive = false;

    const enableSplitScreen = () => {
        splitModeActive = true;
        chatHistoryClipTop.classList.remove('mode-hidden');
        chatDivider.classList.remove('mode-hidden');
        if (chatHistoryTop) chatHistoryTop.scrollTop = chatHistoryTop.scrollHeight;
    };

    const disableSplitScreen = () => {
        splitModeActive = false;
        chatHistoryClipTop.classList.add('mode-hidden');
        chatDivider.classList.add('mode-hidden');
    };

    if (splitScreenBtn) splitScreenBtn.addEventListener('click', enableSplitScreen);
    if (closeSplitBtn) closeSplitBtn.addEventListener('click', disableSplitScreen);

    if (tabSolo) {
        tabSolo.addEventListener('click', () => {
            currentMode = 'solo';
            tabSolo.classList.add('active');
            tabRoom.classList.remove('active');
            roomInfoSection.classList.add('mode-hidden');
            chatHistory.dataset.activeMode = 'solo';
            chatHistory.scrollTop = chatHistory.scrollHeight;
            if (splitScreenBtn) splitScreenBtn.classList.remove('mode-hidden');
        });
    }

    if (tabRoom) {
        tabRoom.addEventListener('click', () => {
            currentMode = 'room';
            tabRoom.classList.add('active');
            tabSolo.classList.remove('active');
            roomInfoSection.classList.remove('mode-hidden');
            chatHistory.dataset.activeMode = 'room';
            chatHistory.scrollTop = chatHistory.scrollHeight;
            if (splitScreenBtn) splitScreenBtn.classList.add('mode-hidden');
            disableSplitScreen();
        });
    }

    // Lógica del botón de ajustes
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            settingsModal.classList.remove('hidden');
        });
    }
    if (closeSettingsBtn && settingsModal) {
        closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    }

    const selfContactName = document.querySelector('.self-contact .contact-name');
    const selfContactLang = document.querySelector('.self-contact .contact-lang');

    let isRecording = false;
    let finalTranscript = '';
    let interimTranscript = '';
    let sessionTranscript = '';
    let isLockedMode = false;

    const translations = {
        'es': {
            roomLabel: "Sala:", inviteBtn: "Invitar", inThisRoom: "En esta sala", yourName: "Tu Nombre:",
            namePlaceholder: "Tu Nombre", meLabel: "Tú", otherPersonLabel: "Otra Persona:",
            safeRoomDesc: "Sala segura. Elige los idiomas y toca el botón para hablar o detenerte.",
            tapToTalk: "Toca para hablar", tapToStop: "Toca para detener", inviteTitle: "Invitar a Talk.Me",
            inviteDesc: "¿Cómo deseas compartir la invitación?", copyLink: "Copiar Enlace",
            alertName: "¡Espera! Escribe tu nombre primero para que sepan quién invita.",
            statusConnecting: "Conectando...", statusListening: "Escuchando...", statusSending: "Enviando...",
            statusReady: "Listo para transmitir", statusIncoming: "Mensaje entrante...",
            unsupported: "Tu navegador no soporta el reconocimiento de voz. ¡Usa Chrome o Safari!",
            copied: "¡Copiado!", youString: " (Tú)", noNameString: "Tú (Aún sin nombre)",
            anon: "Usuario Anónimo", youMsg: "Tú",
            shareSubject: "Invitación a Talk.Me de ",
            shareBody: "Únete a mi sala en Talk.Me para traducir nuestras voces en tiempo real:",
            voiceLabel: "Voz:", autoVoice: "Automática",
            clearConfirm: "¿Seguro que quieres borrar todos los mensajes de esta sala para ambos?",
            typeToTranslate: "Escribe aquí para traducir...",
            langES: "Español", langEN: "Inglés (US)", langFR: "Francés", langDE: "Alemán",
            langIT: "Italiano", langPT: "Portugués (BR)", langJA: "Japonés", langZH: "Chino"
        },
        'en': {
            roomLabel: "Room:", inviteBtn: "Invite", inThisRoom: "In this room", yourName: "Your Name:",
            namePlaceholder: "Your Name", meLabel: "Me", otherPersonLabel: "Other:",
            safeRoomDesc: "Secure room. Choose your language and tap the center button to speak or stop.",
            tapToTalk: "Tap to talk", tapToStop: "Tap to stop", inviteTitle: "Invite a contact",
            inviteDesc: "How would you like to share the room invitation?", copyLink: "Copy Link",
            alertName: "Wait! Write your name first so they know who's inviting.",
            statusConnecting: "Connecting...", statusListening: "Listening...", statusSending: "Sending...",
            statusReady: "Ready to transmit", statusIncoming: "Incoming message...",
            unsupported: "Your browser doesn't support speech recognition. Use Chrome or Safari!",
            copied: "Copied!", youString: " (You)", noNameString: "You (No name yet)",
            anon: "Anonymous User", youMsg: "You",
            shareSubject: "Talk.Me invitation from ",
            shareBody: "Join my Talk.Me room to translate our voices in real time:",
            voiceLabel: "Voice:", autoVoice: "Automatic",
            clearConfirm: "Are you sure you want to clear all messages in this room for both of you?",
            typeToTranslate: "Type here to translate...",
            langES: "Spanish", langEN: "English (US)", langFR: "French", langDE: "German",
            langIT: "Italian", langPT: "Portuguese (BR)", langJA: "Japanese", langZH: "Chinese"
        },
        'fr': {
            roomLabel: "Salle:", inviteBtn: "Inviter", inThisRoom: "Dans cette salle", yourName: "Ton Nom:",
            namePlaceholder: "Ton Nom", meLabel: "Moi", otherPersonLabel: "Autre:",
            safeRoomDesc: "Salle sécurisée. Choisissez la langue et appuyez pour parler ou arrêter.",
            tapToTalk: "Appuyez pour parler", tapToStop: "Appuyez pour arrêter", inviteTitle: "Inviter un ami",
            inviteDesc: "Comment partager l'invitation ?", copyLink: "Copier le lien",
            alertName: "Tapez votre nom d'abord pour qu'ils sachent qui invite.",
            statusListening: "Écoute...", statusSending: "Envoi...",
            statusReady: "Prêt à parler", statusIncoming: "Message entrant...",
            unsupported: "Navigateur non supporté. Utilisez Chrome o Safari!",
            copied: "Copié!", youString: " (Moi)", noNameString: "Moi (Anonyme)",
            anon: "Anonyme", youMsg: "Moi",
            shareSubject: "Invitation Talk.Me de ",
            shareBody: "Rejoins ma salle Talk.Me pour traduire nos voix en direct:",
            voiceLabel: "Voix:", autoVoice: "Automatique",
            clearConfirm: "Êtes-vous sûr de vouloir effacer tous les messages de cette salle pour tous les deux ?",
            typeToTranslate: "Écrire ici pour traduire...",
            langES: "Espagnol", langEN: "Anglais (US)", langFR: "Français", langDE: "Allemand",
            langIT: "Italien", langPT: "Portugais (BR)", langJA: "Japonais", langZH: "Chinois"
        }
    };

    function getT() {
        const langCode = appLangSelect ? appLangSelect.value : 'es';
        return translations[langCode] || translations['en'];
    }

    function updateUI() {
        const t = getT();
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) el.innerText = t[key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (t[key]) el.placeholder = t[key];
        });
        const val = usernameInput.value.trim();
        if (selfContactName) selfContactName.innerText = val ? val + t.youString : t.noNameString;
        if (!isRecording && statusText.innerText !== t.statusIncoming) {
            statusText.innerText = t.statusReady;
        }
    }

    const savedAppLang = localStorage.getItem('talkmeAppLang');
    const savedName = localStorage.getItem('lingoName');
    const savedLang = localStorage.getItem('lingoLang');
    const savedTargetLang = localStorage.getItem('lingoTargetLang');

    if (savedAppLang && appLangSelect) appLangSelect.value = savedAppLang;
    if (savedName) usernameInput.value = savedName;
    if (savedLang) myLangSelect.value = savedLang;
    if (savedTargetLang) targetLangSelect.value = savedTargetLang;

    updateUI();

    if (appLangSelect) {
        appLangSelect.addEventListener('change', () => {
            localStorage.setItem('talkmeAppLang', appLangSelect.value);
            updateUI();
        });
    }

    usernameInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        localStorage.setItem('lingoName', val);
        updateUI();
    });

    const flagMap = {
        'es-ES': '🇪🇸', 'en-US': '🇺🇸', 'fr-FR': '🇫🇷', 'de-DE': '🇩🇪',
        'it-IT': '🇮🇹', 'pt-BR': '🇧🇷', 'ja-JP': '🇯🇵', 'zh-CN': '🇨🇳'
    };

    myLangSelect.addEventListener('change', () => {
        const val = myLangSelect.value;
        localStorage.setItem('lingoLang', val);
        if (myFlag) myFlag.innerText = flagMap[val] || '🌐';
        updateUI();
    });

    targetLangSelect.addEventListener('change', () => {
        const val = targetLangSelect.value;
        localStorage.setItem('lingoTargetLang', val);
        if (targetFlag) targetFlag.innerText = flagMap[val] || '🌐';
    });

    if (myFlag) myFlag.innerText = flagMap[myLangSelect.value] || '🌐';
    if (targetFlag) targetFlag.innerText = flagMap[targetLangSelect.value] || '🌐';

    swapLangBtn.addEventListener('click', () => {
        const temp = myLangSelect.value;
        myLangSelect.value = targetLangSelect.value;
        targetLangSelect.value = temp;
        myLangSelect.dispatchEvent(new Event('change'));
        targetLangSelect.dispatchEvent(new Event('change'));
    });

    const urlParams = new URLSearchParams(window.location.search);
    let currentRoom = urlParams.get('room');
    if (!currentRoom) {
        currentRoom = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + currentRoom;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }
    roomIdDisplay.innerText = currentRoom;

    const messagesRef = ref(db, `rooms/${currentRoom}/messages`);

    onChildRemoved(messagesRef, () => {
        document.querySelectorAll('.message-bubble').forEach(b => b.remove());
    });

    onChildAdded(messagesRef, async (snapshot) => {
        const msg = snapshot.val();
        if (msg.deviceId === myDeviceId) {
            const targetLang = targetLangSelect.value;
            let translation = msg.originalText;
            if (msg.originalLang.split('-')[0] !== targetLang.split('-')[0]) {
                translation = await translateText(msg.originalText, msg.originalLang, targetLang);
            }
            addChatBubble(usernameInput.value, msg.originalText, translation, true, targetLang, 'room');
        } else {
            statusText.innerText = getT().statusIncoming;
            const myLang = myLangSelect.value;
            let translation = msg.originalText;
            if (msg.originalLang.split('-')[0] !== myLang.split('-')[0]) {
                translation = await translateText(msg.originalText, msg.originalLang, myLang);
            }
            addChatBubble(msg.senderName, msg.originalText, translation, false, myLang, 'room');
            if (!window.isInitialLoad) speakText(translation, myLang);
            statusText.innerText = getT().statusReady;
        }
    });

    closeShareBtn.addEventListener('click', () => shareModal.classList.add('hidden'));
    shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.classList.add('hidden'); });
    inviteBtn.addEventListener('click', () => shareModal.classList.remove('hidden'));

    function getShareData() {
        const t = getT();
        const currentUser = usernameInput.value.trim() || t.anon;
        const link = window.location.href;
        const shortText = `¡Hola! ${currentUser} te invita. ${t.shareBody} ${link}`;
        return { currentUser, link, shortText, t };
    }

    document.getElementById('share-wa').addEventListener('click', () => {
        const data = getShareData();
        window.open(`https://wa.me/?text=${encodeURIComponent(data.shortText)}`, '_blank');
        shareModal.classList.add('hidden');
    });
    document.getElementById('share-copy').addEventListener('click', async () => {
        const data = getShareData();
        try {
            await navigator.clipboard.writeText(data.shortText);
            const btn = document.getElementById('share-copy');
            const orig = btn.innerHTML;
            btn.innerHTML = `<i class="ph-fill ph-check-circle"></i> ${data.t.copied}`;
            setTimeout(() => { btn.innerHTML = orig; }, 2000);
        } catch (e) { alert("Error: " + data.link); }
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let synth = window.speechSynthesis;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMobileSafari = isIOS || (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent));

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = !isMobileSafari && !isAndroid;
        recognition.interimResults = !isAndroid;
    }

    async function translateText(text, sourceLang, targetLang) {
        if (!text) return "";
        const sl = sourceLang.split('-')[0];
        const tl = targetLang.split('-')[0];
        const cacheKey = `tr_${sl}_${tl}_${text.substring(0, 250)}`;
        const localCache = sessionStorage.getItem(cacheKey);
        if (localCache) return localCache;
        try {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
            const data = await response.json();
            const res = data[0].map(item => item[0]).join('');
            sessionStorage.setItem(cacheKey, res);
            return res;
        } catch (error) { return text; }
    }

    let isTTSPlaying = false;
    function speakText(text, lang) {
        if (!synth || !text) return;
        isTTSPlaying = true;
        synth.cancel();
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            const voices = synth.getVoices();
            const targetLangPrefix = lang.split('-')[0];
            const premiumMaleVoices = {
                'es': ["Jorge", "Diego", "Google español", "Pablo"],
                'en': ["Alex", "Daniel", "Google UK English Male", "Google US English Male"],
                'fr': ["Thomas", "Paul", "Google français"],
                'de': ["Markus", "Google Deutsch"],
                'it': ["Luca", "Google italiano"],
                'pt': ["Tiago", "Google português do Brasil"],
                'ja': ["Otoya", "Google 日本語"],
                'zh': ["Li-mu", "Google 普通话 (中国大陆)"]
            };
            const preferredNames = premiumMaleVoices[targetLangPrefix] || ["Male", "male", "Hombre", "man"];
            let bestVoice = voices.find(v => v.lang.startsWith(targetLangPrefix) && preferredNames.some(name => v.name.includes(name)));
            if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith(targetLangPrefix));
            if (bestVoice) utterance.voice = bestVoice;
            utterance.onstart = () => { document.body.style.boxShadow = "inset 0 0 50px var(--accent-glow)"; };
            utterance.onend = () => { document.body.style.boxShadow = "none"; isTTSPlaying = false; };
            utterance.onerror = () => { document.body.style.boxShadow = "none"; isTTSPlaying = false; };
            synth.speak(utterance);
        }, 50);
    }

    function addChatBubble(senderName, originalText, translatedText, isOutgoing, langToSpeak, modeCategory = 'room') {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble mode-${modeCategory} ${isOutgoing ? 'outgoing' : 'incoming'}`;
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        bubble.innerHTML = `
            <div style="font-size: 11px; margin-bottom: 4px; opacity: 0.7; font-weight: bold; color: ${isOutgoing ? 'var(--text-translated)' : 'var(--accent-secondary)'}; display: flex; justify-content: space-between; align-items: center;">
                <span>${isOutgoing ? getT().youMsg : senderName}</span>
                <span class="msg-time" style="font-size: 9px; opacity: 0.6; font-weight: normal;">${timeString}</span>
            </div>
            <div class="msg-original">${originalText}</div>
            <div class="msg-translated">${translatedText}</div>
            <button class="play-btn"><i class="ph-fill ph-play-circle"></i></button>
        `;
        bubble.querySelector('.play-btn').addEventListener('click', () => speakText(translatedText, langToSpeak));
        chatHistory.appendChild(bubble);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        if (chatHistoryTop) {
            const clone = bubble.cloneNode(true);
            clone.querySelector('.play-btn').addEventListener('click', () => speakText(translatedText, langToSpeak));
            chatHistoryTop.appendChild(clone);
            chatHistoryTop.scrollTop = chatHistoryTop.scrollHeight;
        }
    }

    let silenceTimer = null;
    const resetSilenceTimer = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        if (isLockedMode) {
            silenceTimer = setTimeout(() => {
                if (isLockedMode && isRecording) stopRecordingSession();
            }, 10000);
        }
    };

    if (recognition) {
        recognition.onstart = () => { statusText.innerText = getT().statusListening; resetSilenceTimer(); };
        recognition.onresult = (event) => {
            resetSilenceTimer();
            let currentInterim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
                else currentInterim += event.results[i][0].transcript;
            }
            interimTranscript = currentInterim;
        };
        recognition.onend = () => {
            let rawText = (finalTranscript + " " + interimTranscript).trim();
            finalTranscript = ''; interimTranscript = '';
            if (rawText) sessionTranscript += (sessionTranscript ? " " : "") + rawText;
            if (isRecording) {
                setTimeout(() => { if (isRecording && !isTTSPlaying) try { recognition.start(); } catch(e) {} }, 400);
                return;
            }
            if (sessionTranscript) {
                sendMessageToFirebase(sessionTranscript.trim());
                sessionTranscript = '';
            }
            stopVisualRecording();
        };
    }

    async function sendMessageToFirebase(text) {
        if (!text) return;
        statusText.innerText = getT().statusSending;
        if (currentMode === 'solo') {
            const targetLang = targetLangSelect.value;
            const translation = await translateText(text, myLangSelect.value, targetLang);
            addChatBubble(getT().youMsg, text, translation, true, targetLang, 'solo');
            setTimeout(() => speakText(translation, targetLang), 60);
            statusText.innerText = getT().statusReady;
        } else {
            push(messagesRef, {
                deviceId: myDeviceId,
                senderName: usernameInput.value.trim() || getT().anon,
                originalText: text,
                originalLang: myLangSelect.value,
                timestamp: serverTimestamp()
            }).finally(() => { setTimeout(() => statusText.innerText = getT().statusReady, 1200); });
        }
    }

    const manualInputForm = document.getElementById('manual-input-form');
    const manualTextInput = document.getElementById('manual-text-input');
    if (manualInputForm) {
        manualInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = manualTextInput.value.trim();
            if (!text) return;
            sendMessageToFirebase(text);
            manualTextInput.value = ''; manualTextInput.blur();
        });
    }

    const startRecordingSession = () => {
        if (!recognition || isRecording) return;
        isRecording = true; finalTranscript = ''; interimTranscript = ''; sessionTranscript = '';
        pttBtn.classList.add('recording');
        document.body.classList.add('is-recording');
        statusText.innerText = getT().statusListening;
        recognition.lang = myLangSelect.value;
        try { recognition.start(); } catch(e) {}
    };

    const stopVisualRecording = () => {
        isRecording = false; isLockedMode = false;
        pttBtn.classList.remove('recording', 'locked');
        document.body.classList.remove('is-recording');
    };

    const stopRecordingSession = () => {
        if (!isRecording) return;
        try { recognition.stop(); } catch(e) {}
        stopVisualRecording();
    };

    let touchStartY = 0;
    let touchStartTime = 0;
    let isSwiping = false;

    pttBtn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        if (isRecording) { stopRecordingSession(); return; }
        startRecordingSession();
        touchStartY = e.clientY; touchStartTime = Date.now(); isSwiping = true;
        pttBtn.setPointerCapture(e.pointerId);
    });

    pttBtn.addEventListener('pointermove', (e) => {
        if (!isSwiping || !isRecording || isLockedMode) return;
        if (touchStartY - e.clientY > 40) {
            isLockedMode = true; isSwiping = false;
            pttBtn.classList.remove('recording'); pttBtn.classList.add('locked');
        }
    });

    pttBtn.addEventListener('pointerup', (e) => {
        if (!isRecording) return;
        isSwiping = false;
        if (Date.now() - touchStartTime < 400 && !isLockedMode) {
            isLockedMode = true; pttBtn.classList.remove('recording'); pttBtn.classList.add('locked');
        } else if (!isLockedMode) stopRecordingSession();
        pttBtn.releasePointerCapture(e.pointerId);
    });

    // OCR Logic
    if (ocrBtn && ocrFileInput) {
        ocrBtn.addEventListener('click', () => ocrFileInput.click());
        ocrFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            ocrModal.classList.remove('hidden');
            try {
                const { data: { text } } = await Tesseract.recognize(file, 'eng+spa+fra');
                manualTextInput.value = text.trim();
                manualTextInput.focus();
            } catch (err) { console.error(err); } finally { ocrModal.classList.add('hidden'); ocrFileInput.value = ''; }
        });
    }

    // Summary Logic
    if (summaryBtn && summaryModal) {
        summaryBtn.addEventListener('click', () => {
            summaryModal.classList.remove('hidden');
            summaryContent.innerHTML = '<div style="text-align:center; padding: 20px;"><i class="ph ph-spinner ph-spin"></i><p>Analiando sala...</p></div>';
            setTimeout(() => {
                const msgs = Array.from(chatHistory.querySelectorAll('.message-bubble.mode-room')).slice(-5);
                if (msgs.length < 1) { summaryContent.innerText = "No hay mensajes para resumir."; return; }
                const puntos = msgs.map(m => `<li>${m.querySelector('.msg-translated').innerText}</li>`).join('');
                summaryContent.innerHTML = `<div style="font-weight:600; margin-bottom:12px;">Resumen Ejecutivo</div><ul>${puntos}</ul>`;
            }, 2000);
        });
        closeSummary.addEventListener('click', () => summaryModal.classList.add('hidden'));
        copySummaryBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(summaryContent.innerText);
            copySummaryBtn.innerText = "¡Copiado!";
            setTimeout(() => copySummaryBtn.innerHTML = '<i class="ph-fill ph-copy"></i> Copiar Resumen', 2000);
        });
    }
});
