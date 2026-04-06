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

// Iniciar sesión anónima automáticamente
signInAnonymously(auth)
    .then(() => {
        console.log("Autenticación anónima exitosa");
    })
    .catch((error) => {
        console.error("Error en autenticación anónima:", error);
    });

let myDeviceId = localStorage.getItem('talkme_device_id');
if (!myDeviceId) {
    myDeviceId = Math.random().toString(36).substring(2, 12);
    localStorage.setItem('talkme_device_id', myDeviceId);
}

window.isInitialLoad = true;
setTimeout(() => { window.isInitialLoad = false; }, 2000); // 2 segs para ignorar audios viejos al cargar

document.addEventListener('DOMContentLoaded', () => {

    // Referencias al DOM (Sincronizadas con diseño premium)
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
    const closeShare = document.getElementById('close-share');
    
    // Referencias de Ajustes (Nuevas)
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');

    // Referencias de Elementos con Guardas (Posibles nulos en nuevo diseño)
    const contactsBtn = document.getElementById('contacts-btn');
    const closeContactsBtn = document.getElementById('close-contacts');
    const contactsPanel = document.getElementById('contacts-panel');

    // Elementos de Pestañas
    const tabSolo = document.getElementById('tab-solo');
    const tabRoom = document.getElementById('tab-room');
    const roomInfoSection = document.getElementById('room-info-section');

    // Nodos de Pantalla Dividida (Split Screen)
    const splitScreenBtn = document.getElementById('split-screen-btn');
    const closeSplitBtn = document.getElementById('close-split-btn');
    const chatHistoryClipTop = document.getElementById('chat-history-clip-top');
    const chatDivider = document.getElementById('chat-divider');
    const chatHistoryTop = document.getElementById('chat-history-top');

    // Nuevos Elementos (Offline, OCR, AI Summary)
    const offlineBadge = document.getElementById('offline-badge');
    const ocrBtn = document.getElementById('ocr-btn');
    const ocrFileInput = document.getElementById('ocr-file-input');
    const ocrModal = document.getElementById('ocr-modal');

    const summaryBtn = document.getElementById('summary-btn');
    const summaryModal = document.getElementById('summary-modal');
    const closeSummary = document.getElementById('close-summary');
    const summaryContent = document.getElementById('summary-content');
    const copySummaryBtn = document.getElementById('copy-summary-btn');

    // --- LÓGICA DE NAVEGACIÓN (Estabilizada y Protegida) --- //
    let currentMode = 'solo'; // 'solo' o 'room'
    if (chatHistory) chatHistory.dataset.activeMode = 'solo';

    let splitModeActive = false;

    const enableSplitScreen = () => {
        splitModeActive = true;
        if (chatHistoryClipTop) chatHistoryClipTop.classList.remove('mode-hidden');
        if (chatDivider) chatDivider.classList.remove('mode-hidden');
        if (chatHistoryTop) chatHistoryTop.scrollTop = chatHistoryTop.scrollHeight;
    };

    const disableSplitScreen = () => {
        splitModeActive = false;
        if (chatHistoryClipTop) chatHistoryClipTop.classList.add('mode-hidden');
        if (chatDivider) chatDivider.classList.add('mode-hidden');
    };

    if (splitScreenBtn) splitScreenBtn.addEventListener('click', enableSplitScreen);
    if (closeSplitBtn) closeSplitBtn.addEventListener('click', disableSplitScreen);

    if (inviteBtn) {
        inviteBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (shareModal) shareModal.classList.remove('hidden');
        });
    }
    if (closeShare) {
        closeShare.addEventListener('click', () => {
            if (shareModal) shareModal.classList.add('hidden');
        });
    }

    if (tabSolo) {
        tabSolo.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            currentMode = 'solo';
            tabSolo.classList.add('active');
            if (tabRoom) tabRoom.classList.remove('active');
            if (roomInfoSection) roomInfoSection.classList.add('mode-hidden');
            if (chatHistory) {
                chatHistory.dataset.activeMode = 'solo';
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
            if (splitScreenBtn) splitScreenBtn.classList.remove('mode-hidden');
        });
    }

    if (tabRoom) {
        tabRoom.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            currentMode = 'room';
            tabRoom.classList.add('active');
            if (tabSolo) tabSolo.classList.remove('active');
            if (roomInfoSection) roomInfoSection.classList.remove('mode-hidden');
            if (chatHistory) {
                chatHistory.dataset.activeMode = 'room';
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
            if (splitScreenBtn) splitScreenBtn.classList.add('mode-hidden');
            disableSplitScreen();
        });
    }

    // Lógica del nuevo botón de ajustes (Diseño Premium)
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            settingsModal.classList.remove('hidden');
        });
    }
    if (closeSettingsBtn && settingsModal) {
        closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    }
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.classList.add('hidden');
        });
    }

    // Elementos de la Lista de Contactos (Guardas)
    const selfContactName = document.querySelector('.self-contact .contact-name');
    const selfContactLang = document.querySelector('.self-contact .contact-lang');

    // Variables de Estado
    let isRecording = false;
    let finalTranscript = '';
    let interimTranscript = '';
    let sessionTranscript = '';
    let isLockedMode = false;

    // --- I18N (INTERNACIONALIZACIÓN ESTABLE) --- //
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

        if (usernameInput) {
            const val = usernameInput.value.trim();
            if (selfContactName) selfContactName.innerText = val ? val + t.youString : t.noNameString;
        }

        if (!isRecording && statusText && statusText.innerText !== t.statusIncoming) {
            statusText.innerText = t.statusReady;
        }
    }

    // Memoria Automática
    const savedAppLang = localStorage.getItem('talkmeAppLang');
    const savedName = localStorage.getItem('lingoName');
    const savedLang = localStorage.getItem('lingoLang');
    const savedTargetLang = localStorage.getItem('lingoTargetLang');

    if (savedAppLang && appLangSelect) appLangSelect.value = savedAppLang;
    if (savedName && usernameInput) usernameInput.value = savedName;
    if (savedLang && myLangSelect) myLangSelect.value = savedLang;
    if (savedTargetLang && targetLangSelect) targetLangSelect.value = savedTargetLang;

    updateUI();

    if (appLangSelect) {
        appLangSelect.addEventListener('change', () => {
            localStorage.setItem('talkmeAppLang', appLangSelect.value);
            updateUI();
        });
    }

    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const t = getT();
            localStorage.setItem('lingoName', val);
            if (selfContactName) selfContactName.innerText = val ? val + t.youString : t.noNameString;
        });
    }

    const flagMap = {
        'es-ES': '🇪🇸', 'en-US': '🇺🇸', 'fr-FR': '🇫🇷', 'de-DE': '🇩🇪',
        'it-IT': '🇮🇹', 'pt-BR': '🇧🇷', 'ja-JP': '🇯🇵', 'zh-CN': '🇨🇳'
    };

    if (myLangSelect) {
        myLangSelect.addEventListener('change', () => {
            const val = myLangSelect.value;
            localStorage.setItem('lingoLang', val);
            if (selfContactLang) selfContactLang.innerText = myLangSelect.options[myLangSelect.selectedIndex].text;
            if (myFlag) myFlag.innerText = flagMap[val] || '🌐';
            updateUI();
        });
    }

    if (targetLangSelect) {
        targetLangSelect.addEventListener('change', () => {
            const val = targetLangSelect.value;
            localStorage.setItem('lingoTargetLang', val);
            if (targetFlag) targetFlag.innerText = flagMap[val] || '🌐';
        });
    }

    if (swapLangBtn) {
        swapLangBtn.addEventListener('click', () => {
            const temp = myLangSelect.value;
            myLangSelect.value = targetLangSelect.value;
            targetLangSelect.value = temp;
            myLangSelect.dispatchEvent(new Event('change'));
            targetLangSelect.dispatchEvent(new Event('change'));
        });
    }

    // --- LÓGICA DE SALAS ---
    const urlParams = new URLSearchParams(window.location.search);
    let currentRoom = urlParams.get('room');
    if (!currentRoom) {
        currentRoom = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + currentRoom;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }
    if (roomIdDisplay) roomIdDisplay.innerText = currentRoom;

    const messagesRef = ref(db, `rooms/${currentRoom}/messages`);

    // --- FIREBASE SYNC (RECIBIR MENSAJES) ---
    onChildAdded(messagesRef, async (snapshot) => {
        const msg = snapshot.val();
        const currentUser = (usernameInput && usernameInput.value.trim()) || getT().anon;

        if (msg.deviceId === myDeviceId) {
            const targetLang = targetLangSelect.value;
            let traduccionViaje = msg.originalText;
            if (msg.originalLang.split('-')[0] !== targetLang.split('-')[0]) {
                traduccionViaje = await translateText(msg.originalText, msg.originalLang, targetLang);
            }
            addChatBubble(currentUser, msg.originalText, traduccionViaje, true, targetLang, 'room');
        } else {
            if (statusText) statusText.innerText = getT().statusIncoming;
            const miIdiomaDynamic = myLangSelect.value;
            let traduccionParaMi = msg.originalText;
            if (msg.originalLang.split('-')[0] !== miIdiomaDynamic.split('-')[0]) {
                traduccionParaMi = await translateText(msg.originalText, msg.originalLang, miIdiomaDynamic);
            }
            addChatBubble(msg.senderName, msg.originalText, traduccionParaMi, false, miIdiomaDynamic, 'room');
            if (!window.isInitialLoad) speakText(traduccionParaMi, miIdiomaDynamic);
            if (statusText) statusText.innerText = getT().statusReady;
        }
    });

    // --- RECONOCIMIENTO DE VOZ (ESTABLE) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let synth = window.speechSynthesis;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        const isAndroid = /Android/i.test(navigator.userAgent);
        recognition.continuous = !isAndroid;
        recognition.interimResults = !isAndroid;
    }

    async function translateText(text, sourceLang, targetLang) {
        if (!text) return "";
        const sl = sourceLang.split('-')[0];
        const tl = targetLang.split('-')[0];
        try {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
            const data = await response.json();
            return data[0].map(item => item[0]).join('');
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
            utterance.onend = () => { isTTSPlaying = false; };
            utterance.onerror = () => { isTTSPlaying = false; };
            synth.speak(utterance);
        }, 100);
    }

    function addChatBubble(senderName, originalText, translatedText, isOutgoing, langToSpeak, modeCategory = 'room') {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble mode-${modeCategory} ${isOutgoing ? 'outgoing' : 'incoming'}`;
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        bubble.innerHTML = `
            <div style="font-size: 11px; margin-bottom: 4px; opacity: 0.7; font-weight: bold;">
                <span>${senderName}</span>
                <span style="font-size: 9px; margin-left: 8px;">${timeString}</span>
            </div>
            <div class="msg-original">${originalText}</div>
            <div class="msg-translated">${translatedText}</div>
            <button class="play-btn" style="background:none; border:none; color:inherit; cursor:pointer;"><i class="ph-fill ph-play-circle"></i></button>
        `;
        bubble.querySelector('.play-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            speakText(translatedText, langToSpeak);
        });
        if (chatHistory) {
            chatHistory.appendChild(bubble);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }
    }

    if (recognition) {
        recognition.onstart = () => { if (statusText) statusText.innerText = getT().statusListening; };
        recognition.onresult = (event) => {
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
                const restart = () => {
                    if (!isRecording) return;
                    if (isTTSPlaying) { setTimeout(restart, 500); return; }
                    try { recognition.start(); } catch (e) {}
                };
                setTimeout(restart, 400);
            } else if (sessionTranscript) {
                sendMessage(sessionTranscript.trim());
                sessionTranscript = '';
            }
        };
    }

    async function sendMessage(text) {
        if (!text) return;
        if (statusText) statusText.innerText = getT().statusSending;
        const miIdioma = myLangSelect.value;
        const t = getT();

        if (currentMode === 'solo') {
            const targetLang = targetLangSelect.value;
            const traduccion = await translateText(text, miIdioma, targetLang);
            addChatBubble(t.youMsg, text, traduccion, true, targetLang, 'solo');
            speakText(traduccion, targetLang);
            if (statusText) statusText.innerText = t.statusReady;
        } else {
            push(messagesRef, {
                deviceId: myDeviceId,
                senderName: usernameInput.value.trim() || t.anon,
                originalText: text,
                originalLang: miIdioma,
                timestamp: serverTimestamp()
            }).finally(() => { if (statusText) statusText.innerText = t.statusReady; });
        }
    }

    // Input Manual con Redimensionado (Hasta 4 líneas)
    const manualInputForm = document.getElementById('manual-input-form');
    const manualTextInput = document.getElementById('manual-text-input');
    if (manualInputForm && manualTextInput) {
        manualTextInput.addEventListener('input', () => {
            manualTextInput.style.height = 'auto';
            const newHeight = Math.min(manualTextInput.scrollHeight, 120);
            manualTextInput.style.height = newHeight + 'px';
        });

        manualInputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = manualTextInput.value.trim();
            if (text) {
                sendMessage(text);
                manualTextInput.value = '';
                manualTextInput.style.height = 'auto';
                manualTextInput.blur();
            }
        });
    }

    // PTT Events e Interacciones Protegidas
    if (pttBtn) {
        pttBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (isRecording) {
                isRecording = false;
                if (recognition) recognition.stop();
                pttBtn.classList.remove('recording');
            } else {
                if (currentMode === 'room' && !usernameInput.value.trim()) {
                    alert(getT().alertName);
                    settingsModal.classList.remove('hidden'); // Abrir ajustes directo
                    usernameInput.focus();
                    return;
                }
                isRecording = true;
                finalTranscript = ''; interimTranscript = ''; sessionTranscript = '';
                pttBtn.classList.add('recording');
                if (recognition) {
                    recognition.lang = myLangSelect.value;
                    try { recognition.start(); } catch(err) { console.error(err); }
                }
            }
        });
    }

    // --- ACCIONES DE COMPARTIR ---
    const shareWA = document.getElementById('share-wa');
    const shareTG = document.getElementById('share-tg');
    const shareEmail = document.getElementById('share-email');
    const shareCopy = document.getElementById('share-copy');

    const getShareData = () => {
        const link = window.location.href;
        const text = `¡Únete a mi sala de Talk.Me para que hablemos en cualquier idioma! ${link}`;
        return { link, text };
    };

    if (shareWA) shareWA.addEventListener('click', () => {
        const data = getShareData();
        window.open(`https://wa.me/?text=${encodeURIComponent(data.text)}`, '_blank');
    });

    if (shareTG) shareTG.addEventListener('click', () => {
        const data = getShareData();
        window.open(`https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent(data.text)}`, '_blank');
    });

    if (shareCopy) shareCopy.addEventListener('click', async () => {
        const data = getShareData();
        await navigator.clipboard.writeText(data.text);
        const originalText = shareCopy.innerText;
        shareCopy.innerText = "¡Copiado!";
        setTimeout(() => shareCopy.innerText = originalText, 2000);
    });

    // Limpieza de mensajes iniciales
    document.querySelectorAll('.message-bubble').forEach(b => b.remove());
});
