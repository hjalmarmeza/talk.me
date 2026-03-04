import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
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
const db = getDatabase(app);
let myDeviceId = localStorage.getItem('dialecta_device_id');
if (!myDeviceId) {
    myDeviceId = Math.random().toString(36).substring(2, 12);
    localStorage.setItem('dialecta_device_id', myDeviceId);
}

window.isInitialLoad = true;
setTimeout(() => { window.isInitialLoad = false; }, 2000); // 2 segs para ignorar audios viejos al cargar

document.addEventListener('DOMContentLoaded', () => {

    // Referencias al DOM
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
    const contactsBtn = document.getElementById('contacts-btn');
    const closeContactsBtn = document.getElementById('close-contacts');
    const contactsPanel = document.getElementById('contacts-panel');

    // Elementos de Pestañas
    const tabSolo = document.getElementById('tab-solo');
    const tabRoom = document.getElementById('tab-room');
    const roomInfoSection = document.getElementById('room-info-section');

    // --- LÓGICA DE NAVEGACIÓN (Pestañas) --- //
    let currentMode = 'solo'; // 'solo' o 'room'
    chatHistory.dataset.activeMode = 'solo'; // Inicializamos el filtro CSS

    tabSolo.addEventListener('click', () => {
        currentMode = 'solo';
        tabSolo.classList.add('active');
        tabRoom.classList.remove('active');
        roomInfoSection.classList.add('mode-hidden');
        chatHistory.dataset.activeMode = 'solo';
        chatHistory.scrollTop = chatHistory.scrollHeight; // Auto-scroll al cambiar
    });

    tabRoom.addEventListener('click', () => {
        currentMode = 'room';
        tabRoom.classList.add('active');
        tabSolo.classList.remove('active');
        roomInfoSection.classList.remove('mode-hidden');
        chatHistory.dataset.activeMode = 'room';
        chatHistory.scrollTop = chatHistory.scrollHeight;
    });

    // Elementos de la Lista de Contactos (Yo mismo)
    const selfContactName = document.querySelector('.self-contact .contact-name');
    const selfContactLang = document.querySelector('.self-contact .contact-lang');

    // Variables de Estado
    let isRecording = false;
    let finalTranscript = '';

    // --- I18N (INTERNACIONALIZACIÓN DE LA INTERFAZ) --- //
    const translations = {
        'es': {
            roomLabel: "Sala:", inviteBtn: "Invitar", inThisRoom: "En esta sala", yourName: "Tu Nombre:",
            namePlaceholder: "Tu Nombre", meLabel: "Tú", otherPersonLabel: "Otra Persona:",
            safeRoomDesc: "Sala segura. Elige los idiomas y toca el botón para hablar o detenerte.",
            tapToTalk: "Toca para hablar", tapToStop: "Toca para detener", inviteTitle: "Invitar a Dialecta",
            inviteDesc: "¿Cómo deseas compartir la invitación?", copyLink: "Copiar Enlace",
            alertName: "¡Espera! Escribe tu nombre primero para que sepan quién invita.",
            statusConnecting: "Conectando...", statusListening: "Escuchando...", statusSending: "Enviando...",
            statusReady: "Listo para transmitir", statusIncoming: "Mensaje entrante...",
            unsupported: "Tu navegador no soporta el reconocimiento de voz. ¡Usa Chrome o Safari!",
            copied: "¡Copiado!", youString: " (Tú)", noNameString: "Tú (Aún sin nombre)",
            anon: "Usuario Anónimo", youMsg: "Tú",
            shareSubject: "Invitación a Dialecta de ",
            shareBody: "Únete a mi sala en Dialecta para traducir nuestras voces en tiempo real:",
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
            shareSubject: "Dialecta invitation from ",
            shareBody: "Join my Dialecta room to translate our voices in real time:",
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
            unsupported: "Navigateur non supporté. Utilisez Chrome ou Safari!",
            copied: "Copié!", youString: " (Moi)", noNameString: "Moi (Anonyme)",
            anon: "Anonyme", youMsg: "Moi",
            shareSubject: "Invitation Dialecta de ",
            shareBody: "Rejoins ma salle Dialecta pour traduire nos voix en direct:",
            voiceLabel: "Voix:", autoVoice: "Automatique",
            clearConfirm: "Êtes-vous sûr de vouloir effacer tous les messages de cette salle pour tous les deux ?",
            typeToTranslate: "Écrire ici pour traduire...",
            langES: "Espagnol", langEN: "Anglais (US)", langFR: "Français", langDE: "Allemand",
            langIT: "Italien", langPT: "Portugais (BR)", langJA: "Japonais", langZH: "Chinois"
        }
    };

    function getT() {
        // Obtenemos el idioma de la aplicación (UI) y no el hablado
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

    // --- 0. EXPERIENCIA FÁCIL (ABUELO-FRIENDLY) - MEMORIA AUTOMÁTICA --- //
    // Aquí hacemos que la app recuerde quién es el usuario y su idioma.
    // Así los nietos se lo configuran 1 sola vez y el abuelo ya no debe tocar nada.

    const savedAppLang = localStorage.getItem('dialectaAppLang');
    const savedName = localStorage.getItem('lingoName');
    const savedLang = localStorage.getItem('lingoLang');
    const savedTargetLang = localStorage.getItem('lingoTargetLang');
    const savedVoice = localStorage.getItem('lingoVoice');

    if (savedAppLang && appLangSelect) {
        appLangSelect.value = savedAppLang;
    }

    if (savedName) {
        usernameInput.value = savedName;
        if (selfContactName) selfContactName.innerText = savedName + " (Tú)";
    }

    if (savedLang) {
        myLangSelect.value = savedLang;
        if (selfContactLang) selfContactLang.innerText = myLangSelect.options[myLangSelect.selectedIndex].text;
    }

    if (savedTargetLang) {
        targetLangSelect.value = savedTargetLang;
    }

    updateUI(); // Se traduce en cuanto arranca la app

    if (appLangSelect) {
        appLangSelect.addEventListener('change', () => {
            localStorage.setItem('dialectaAppLang', appLangSelect.value);
            updateUI(); // Traduce la app instantáneamente
        });
    }

    // Guardar cambios automáticamente si el nieto modifica el nombre o idioma
    usernameInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const t = getT();
        localStorage.setItem('lingoName', val);
        if (selfContactName) selfContactName.innerText = val ? val + t.youString : t.noNameString;
    });

    const flagMap = {
        'es-ES': '🇪🇸', 'en-US': '🇺🇸', 'fr-FR': '🇫🇷', 'de-DE': '🇩🇪',
        'it-IT': '🇮🇹', 'pt-BR': '🇧🇷', 'ja-JP': '🇯🇵', 'zh-CN': '🇨🇳'
    };

    myLangSelect.addEventListener('change', () => {
        const val = myLangSelect.value;
        const text = myLangSelect.options[myLangSelect.selectedIndex].text;
        localStorage.setItem('lingoLang', val);
        if (selfContactLang) selfContactLang.innerText = text;
        if (myFlag) myFlag.innerText = flagMap[val] || '🌐';
        updateUI(); // Traducir la interfaz instantaneamente al cambiar origen
    });

    targetLangSelect.addEventListener('change', () => {
        const val = targetLangSelect.value;
        localStorage.setItem('lingoTargetLang', val);
        if (targetFlag) targetFlag.innerText = flagMap[val] || '🌐';
    });

    // Setear flags inicialmente
    if (myFlag) myFlag.innerText = flagMap[myLangSelect.value] || '🌐';
    if (targetFlag) targetFlag.innerText = flagMap[targetLangSelect.value] || '🌐';

    swapLangBtn.addEventListener('click', () => {
        // Intercambio rápido de idiomas para conversaciones de ida y vuelta
        const temp = myLangSelect.value;
        myLangSelect.value = targetLangSelect.value;
        targetLangSelect.value = temp;

        // Forzamos el guardado y la actualización visual
        myLangSelect.dispatchEvent(new Event('change'));
        targetLangSelect.dispatchEvent(new Event('change'));
    });

    // --- 1. LÓGICA DE SALAS Y ENLACES MÁGICOS --- //

    // Obtener la sala de la URL o crear una nueva
    const urlParams = new URLSearchParams(window.location.search);
    let currentRoom = urlParams.get('room');

    if (!currentRoom) {
        // Generar un ID aleatorio corto (ej. A7B9)
        currentRoom = Math.random().toString(36).substring(2, 6).toUpperCase();
        // Actualizar URL sin recargar
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + currentRoom;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    roomIdDisplay.innerText = currentRoom;

    // Lógica para visualizar los Contactos (oculta o eliminada si no existen iconos)
    if (contactsBtn) {
        contactsBtn.addEventListener('click', () => {
            if (contactsPanel) contactsPanel.classList.remove('hidden');
        });
    }

    if (closeContactsBtn) {
        closeContactsBtn.addEventListener('click', () => {
            if (contactsPanel) contactsPanel.classList.add('hidden');
        });
    }

    // --- CONEXIÓN REAL CON FIREBASE (RECIBIR MENSAJES) --- //
    const messagesRef = ref(db, `rooms/${currentRoom}/messages`);

    // Lógica para el botón de borrar sala
    const clearChatBtn = document.getElementById('clear-chat-btn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            if (confirm(getT().clearConfirm)) {
                // Borrar la colección entera de Firebase
                remove(messagesRef).catch(err => {
                    console.error("No se pudo limpiar la base de datos:", err);
                    alert("Asegúrate de estar en el enlace público para borrar los mensajes.");
                });
            }
        });
    }

    // Lógica para limpiar SOLO mi pantalla
    const clearLocalBtn = document.getElementById('clear-local-btn');
    if (clearLocalBtn) {
        clearLocalBtn.addEventListener('click', () => {
            if (confirm("¿Limpiar los mensajes solo de esta pantalla?")) {
                const bubbles = document.querySelectorAll('.message-bubble');
                bubbles.forEach(b => b.remove());

                const systemMsg = chatHistory.querySelector('.system-message');
                if (systemMsg) systemMsg.style.display = 'flex';
            }
        });
    }

    // Detectar cuando alguien borra la sala entera o mis mensajes
    onChildRemoved(messagesRef, (oldSnapshot) => {
        // Al removerse el primer elemento, limpiamos el historial visual entero
        // Ocultamos la burbuja inicial o los mensajes existentes
        const bubbles = document.querySelectorAll('.message-bubble');
        bubbles.forEach(b => b.remove());

        // Mostrar de nuevo el mensaje del sistema
        const systemMsg = chatHistory.querySelector('.system-message');
        if (systemMsg) systemMsg.style.display = 'flex';
    });

    onChildAdded(messagesRef, async (snapshot) => {
        const msg = snapshot.val();
        const currentUser = usernameInput.value.trim() || getT().anon;

        // MÁGICA DE CONTACTOS: Si alguien envía un mensaje y no soy yo, añadirlo al panel
        if (msg.deviceId !== myDeviceId) {
            const contactsList = document.getElementById('contacts-list');
            const existingContact = Array.from(contactsList.querySelectorAll('.contact-item')).find(el => el.dataset.deviceId === msg.deviceId);

            if (!existingContact) {
                const li = document.createElement('li');
                li.className = 'contact-item';
                li.dataset.deviceId = msg.deviceId;
                li.innerHTML = `
                    <div class="contact-avatar" style="background: #ec4899;"><i class="ph-fill ph-user"></i></div>
                    <div class="contact-details">
                        <span class="contact-name">${msg.senderName}</span>
                        <span class="contact-lang">${msg.originalLang}</span>
                    </div>
                `;
                li.style.opacity = '0';
                li.style.transition = 'opacity 0.5s ease';
                contactsList.appendChild(li);

                setTimeout(() => li.style.opacity = '1', 50);

                // Efecto visual de que alguien entró/habló (si existe el botón)
                const cBtn = document.getElementById('contacts-btn');
                if (cBtn) {
                    cBtn.style.boxShadow = "0 0 15px #ec4899";
                    setTimeout(() => cBtn.style.boxShadow = "none", 3000);
                }
            }
        }

        // MOSTRAR EL MENSAJE EN PANTALLA
        if (msg.deviceId === myDeviceId) {
            // Soy yo (lo envié yo mismo)
            // En MODO VIAJE, el teléfono lee dinamicamente de mis selectores
            const idiomaViaje = targetLangSelect.value;
            let traduccionViaje = msg.originalText;

            if (msg.originalLang.split('-')[0] !== idiomaViaje.split('-')[0]) {
                traduccionViaje = await translateText(msg.originalText, msg.originalLang, idiomaViaje);
            }

            addChatBubble(currentUser, msg.originalText, traduccionViaje, true, idiomaViaje, 'room');

            // Hablamos en voz alta la traducción en nuestro propio celular (Para la persona de en frente)
            if (!window.isInitialLoad) {
                speakText(traduccionViaje, idiomaViaje);
            }
        } else {
            // Viene de un familiar (Entrante)
            statusText.innerText = getT().statusIncoming;

            // Lo traducimos a NUESTRO idioma real-time
            const miIdiomaDynamic = myLangSelect.value;
            let traduccionParaMi = msg.originalText;

            if (msg.originalLang.split('-')[0] !== miIdiomaDynamic.split('-')[0]) {
                traduccionParaMi = await translateText(msg.originalText, msg.originalLang, miIdiomaDynamic);
            }

            addChatBubble(msg.senderName, msg.originalText, traduccionParaMi, false, miIdiomaDynamic, 'room');

            // SOLO hablar en voz alta SI el mensaje es nuevo (evitar leer todo el historial del abuelo a la vez al recargar)
            if (!window.isInitialLoad) {
                speakText(traduccionParaMi, miIdiomaDynamic);
            }

            statusText.innerText = getT().statusReady;
        }
    });

    // Elementos del Modal de Compartir
    const shareModal = document.getElementById('share-modal');
    const closeShareBtn = document.getElementById('close-share');

    closeShareBtn.addEventListener('click', () => {
        shareModal.classList.add('hidden');
    });

    // Cerrar el modal al clickear el fondo oscuro
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.classList.add('hidden');
        }
    });

    // Lógica del botón de invitar (Abrir modal)
    inviteBtn.addEventListener('click', () => {
        const currentUser = usernameInput.value.trim();

        if (!currentUser) {
            alert(getT().alertName);
            usernameInput.focus();
            return;
        }

        shareModal.classList.remove('hidden');
    });

    // --- ACCIONES ESPECÍFICAS DE COMPARTIR ---

    function getShareData() {
        const t = getT();
        const currentUser = usernameInput.value.trim();
        const link = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + currentRoom;
        const shortText = `¡Hola! / Hello! ${currentUser}. ${t.shareBody} ${link}`;
        return { currentUser, link, shortText, t };
    }

    document.getElementById('share-wa').addEventListener('click', () => {
        const data = getShareData();
        const waMsg = `${data.shortText} ${data.link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(waMsg)}`, '_blank');
        shareModal.classList.add('hidden');
    });

    document.getElementById('share-tg').addEventListener('click', () => {
        const data = getShareData();
        window.open(`https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent(data.shortText)}`, '_blank');
        shareModal.classList.add('hidden');
    });

    document.getElementById('share-email').addEventListener('click', () => {
        const data = getShareData();
        const subject = `${data.t.shareSubject}${data.currentUser}`;
        const body = `${data.shortText} ${data.link}`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        shareModal.classList.add('hidden');
    });

    document.getElementById('share-copy').addEventListener('click', async () => {
        const data = getShareData();
        const msg = `${data.shortText}`;

        try {
            await navigator.clipboard.writeText(msg);

            const btn = document.getElementById('share-copy');
            const origHTML = btn.innerHTML;
            btn.innerHTML = `<i class="ph-fill ph-check-circle"></i> ${data.t.copied}`;

            setTimeout(() => {
                btn.innerHTML = origHTML;
            }, 2000);

        } catch (e) {
            alert("Error: " + data.link);
        }
    });

    // --- 1. CONFIGURACIÓN DE RECONOCIMIENTO Y SÍNTESIS DE VOZ --- //
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let synth = window.speechSynthesis;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true; // Graba sin parar hasta soltar el botón
        recognition.interimResults = true; // Permite procesar resultados largos sin cortar
    } else {
        alert(getT().unsupported);
    }
    // --- 2. FUNCIÓN DE TRADUCCIÓN GRATUITA (Hack de Google Translate + Memoria) --- //
    async function translateText(text, sourceLang, targetLang) {
        if (!text) return "";

        const sl = sourceLang.split('-')[0];
        const tl = targetLang.split('-')[0];

        // Memoria Caché inmediata para evitar el límite rápido de traducciones al refrescar la web
        const cacheKey = `tr_${sl}_${tl}_${text.substring(0, 250)}`;
        const localCache = sessionStorage.getItem(cacheKey);

        if (localCache) {
            return localCache;
        }

        try {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
            const data = await response.json();

            const translatedResult = data[0].map(item => item[0]).join('');

            // Guardamos en la memoria para que si recargamos en 1 minuto no llamemos a Google 50 veces igual y nos bloqueen.
            sessionStorage.setItem(cacheKey, translatedResult);

            return translatedResult;
        } catch (error) {
            console.error("Error al traducir (Posible bloqueo por límite de Google). Mostrando original:", error);
            return text; // Fallback
        }
    }

    // --- 3. FUNCIÓN PARA HABLAR EL TEXTO TRADUCIDO --- //
    function speakText(text, lang) {
        if (!synth || !text) return;

        // Limpiar caché TTS interno por seguridad de sistema
        synth.cancel();

        // En Safari y iOS, si llamamos a speak justo después de cancel, se traga el audio.
        // Un pequeño timeout garantiza que el buffer se libere.
        setTimeout(() => {
            // Aplicamos el formateo sintético si por alguna razón el texto llega sin puntos ni conectores 
            let formattedText = text.replace(/ (pero|porque|aunque|entonces|además|sin embargo|y|but|because|although|then|and|mais|parce que|donc|et) /gi, ', $1 ');
            formattedText = formattedText.replace(/ (entonces|además|por lo tanto|sin embargo|then|therefore|donc) /gi, '. $1 ');
            formattedText = formattedText.charAt(0).toUpperCase() + formattedText.slice(1);
            if (!/[.!?]$/.test(formattedText)) {
                formattedText += ".";
            }

            const utterance = new SpeechSynthesisUtterance(formattedText);
            utterance.lang = lang; // Ej. 'es-ES' o 'en-US'

            // Velocidad y Tono estabilizados: 0.9 y 1.0 previenen distorsión robótica en iOS y Android
            utterance.rate = 0.95;
            utterance.pitch = 1.0;

            // Inyectar automáticamente la MEJOR voz masculina disponible (Tier List / Prioridad)
            const voices = synth.getVoices();
            const targetLangPrefix = lang.split('-')[0];

            // Diccionario ordenado de las mejores voces masculinas por idioma
            // iOS/Mac usan "Premium" o "Enhanced". Android usa Cloud Network o "Google...".
            const premiumMaleVoices = {
                'es': ["Jorge Premium", "Jorge Enhanced", "Jorge", "Diego", "Google español", "Pablo"],
                'en': ["Alex", "Daniel Premium", "Daniel Enhanced", "Daniel", "Google UK English Male", "Google US English Male", "Fred"],
                'fr': ["Thomas Premium", "Thomas Enhanced", "Thomas", "Paul", "Google français"],
                'de': ["Markus Premium", "Markus Enhanced", "Markus", "Google Deutsch"],
                'it': ["Luca Premium", "Luca Enhanced", "Luca", "Google italiano"],
                'pt': ["Tiago Premium", "Tiago Enhanced", "Tiago", "Google português do Brasil"],
                'ja': ["Otoya Premium", "Otoya Enhanced", "Otoya", "Google 日本語"],
                'zh': ["Li-mu", "Google 普通话 (中国大陆)"]
            };

            const preferredNames = premiumMaleVoices[targetLangPrefix] || ["Premium", "Enhanced", "Male", "male", "Hombre", "man"];
            let bestVoice = null;

            // 1. Intentar encontrar una coincidencia exacta de nuestra lista VIP
            for (const name of preferredNames) {
                const match = voices.find(v => v.lang.startsWith(targetLangPrefix) && v.name.includes(name));
                if (match) {
                    bestVoice = match;
                    break;
                }
            }

            // 2. Si no, buscar "Online", "Network" o "Cloud"
            if (!bestVoice) {
                bestVoice = voices.find(v => v.lang.startsWith(targetLangPrefix) && (v.name.includes('Online') || v.name.includes('Network') || v.name.includes('Premium')));
            }

            // 3. Genérica
            if (!bestVoice) {
                const genericMaleKeywords = ["Male", "male", "Hombre", "man", "Boy"];
                bestVoice = voices.find(v => v.lang.startsWith(targetLangPrefix) && genericMaleKeywords.some(kw => v.name.includes(kw)));
            }

            if (bestVoice) {
                utterance.voice = bestVoice;
            } else {
                const fallbackVoice = voices.find(v => v.lang.startsWith(targetLangPrefix));
                if (fallbackVoice) utterance.voice = fallbackVoice;
            }

            // Efecto visual al hablar
            utterance.onstart = () => { document.body.style.boxShadow = "inset 0 0 50px var(--accent-glow)"; };
            utterance.onend = () => { document.body.style.boxShadow = "none"; };
            utterance.onerror = () => { document.body.style.boxShadow = "none"; };

            synth.speak(utterance);
        }, 50);
    }

    // --- 4. FUNCIÓN PARA CREAR BURBUJAS DE CHAT EN LA PANTALLA --- //
    function addChatBubble(senderName, originalText, translatedText, isOutgoing, langToSpeak, modeCategory = 'room') {
        const bubble = document.createElement('div');
        // Agregamos la clase mode-solo o mode-room para permitir estilos CSS dinámicos de filtrado de Pestañas
        bubble.className = `message-bubble mode-${modeCategory} ${isOutgoing ? 'outgoing' : 'incoming'}`;

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        bubble.innerHTML = `
            <div style="font-size: 11px; margin-bottom: 4px; opacity: 0.7; font-weight: bold; color: ${isOutgoing ? 'var(--text-translated)' : 'var(--accent-secondary)'}; display: flex; justify-content: space-between; align-items: center;">
                <span>${isOutgoing ? getT().youMsg : senderName}</span>
                <span class="msg-time" style="font-size: 9px; opacity: 0.6; font-weight: normal;">${timeString}</span>
            </div>
            <div class="msg-original">${originalText}</div>
            <div class="msg-translated">${translatedText}</div>
            <button class="play-btn" aria-label="Reproducir traducción"><i class="ph-fill ph-play-circle"></i></button>
        `;

        // Añadir evento al botón de play
        const btn = bubble.querySelector('.play-btn');
        btn.addEventListener('click', () => {
            const icon = btn.querySelector('i');
            icon.classList.remove('ph-play-circle');
            icon.classList.add('ph-speaker-high');

            speakText(translatedText, langToSpeak);

            // Volver a icono original (aprox 2 segundos por simplicidad)
            setTimeout(() => {
                icon.classList.remove('ph-speaker-high');
                icon.classList.add('ph-play-circle');
            }, 2000);
        });

        chatHistory.appendChild(bubble);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Auto-scroll abajo
    }

    // --- 5. EVENTOS DEL RECONOCIMIENTO DE VOZ --- //
    if (recognition) {
        recognition.onstart = () => {
            statusText.innerText = getT().statusListening;
        };

        recognition.onresult = (event) => {
            // Acumular fragmentos sin enviarlos aún (se envían al soltar el botón Walkie-Talkie)
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + " ";
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // FEEDBACK VISUAL EN TIEMPO REAL: Mostrar transcripción en curso en el statusText
            if (statusText) {
                let currentText = (finalTranscript + interimTranscript).trim();
                // Limitar longitud visible si es muy larga
                if (currentText.length > 50) currentText = "..." + currentText.slice(-50);
                if (currentText) statusText.innerText = currentText;
            }
        };

        recognition.onerror = (event) => {
            if (event.error === 'no-speech') {
                // Silencios largos normales: NO matamos la grabación, 
                // dejamos que onend la reinicie automáticamente.
                return;
            }
            if (event.error === 'aborted') {
                // El usuario o el sistema la canceló. Dejamos que onend haga su trabajo de enviar si queda texto.
                return;
            }
            console.error("Error de micrófono:", event.error);
            if (statusText) statusText.innerText = 'Error al escuchar';
            isRecording = false;
            pttBtn.classList.remove('recording');
            document.body.classList.remove('is-recording');
            const instEl = document.querySelector('.instruction');
            if (instEl) instEl.innerText = getT().tapToTalk;
        };

        recognition.onend = () => {
            // SI SIGUE GRABANDO (Es decir, el usuario NO fue quien presionó el botón para detener)
            // Significa que Chrome/Safari cortó el micro por "silencio prolongado". 
            if (isRecording) {
                try {
                    recognition.start();
                    return; // Si el reinicio es exitoso, cortamos la función para no detener la UI
                } catch (e) {
                    console.log("No se pudo auto-reiniciar", e);
                    // Si el auto-reinicio falla (típico en iOS Safari sin gesto del usuario), dejamos caer al flujo normal para resetear la UI obligatoriamente.
                }
            }

            isRecording = false;
            pttBtn.classList.remove('recording');
            document.body.classList.remove('is-recording');

            // Actualizar boton instruction visual text
            const instructionEl = document.querySelector('.instruction');
            if (instructionEl) instructionEl.innerText = getT().tapToTalk;

            // Combinar y limpiar texto
            let rawText = finalTranscript.trim();

            // --- TRUCO DE ENTONACIÓN Y PUNTUACIÓN VISUAL ---
            // Los motores de dictado no ponen comas literales en dispositivos móviles. 
            // Añadimos puntuación antes de enviar a firebase para que se vea reflejado en la pantalla.
            if (rawText) {
                // Comas para conectores menores
                rawText = rawText.replace(/ (pero|porque|aunque|y|but|because|although|and|mais|parce que|et) /gi, ', $1 ');
                // Puntos para conectores mayores
                rawText = rawText.replace(/ (entonces|además|por lo tanto|sin embargo|then|therefore|donc) /gi, '. $1 ');

                // Normalización gramatical básica
                rawText = rawText.charAt(0).toUpperCase() + rawText.slice(1);
                if (!/[.!?]$/.test(rawText)) {
                    rawText += ".";
                }
            }

            const textToSend = rawText;

            sendMessageToFirebase(textToSend);

            finalTranscript = ''; // Limpiar siempre al terminar
        };
    }

    // --- 5.5 FUNCIÓN GENERAL DE MANEJO DE MENSAJES --- //
    async function sendMessageToFirebase(textToSend) {
        if (!textToSend) {
            if (statusText) statusText.innerText = getT().statusReady;
            return;
        }

        statusText.innerText = getT().statusSending;

        const currentUser = usernameInput.value.trim() || getT().anon;
        const miIdioma = myLangSelect.value;

        if (currentMode === 'solo') {
            // MODO "EN PERSONA": Procesamiento puramente local, NO Firebase, máxima velocidad y voz aislada
            const targetLang = targetLangSelect.value;
            let traduccion = textToSend;

            if (miIdioma.split('-')[0] !== targetLang.split('-')[0]) {
                traduccion = await translateText(textToSend, miIdioma, targetLang);
            }

            addChatBubble(getT().youMsg, textToSend, traduccion, true, targetLang, 'solo');

            // Garantizar TTS invocando directo post-traducción en la misma cadena local
            setTimeout(() => {
                speakText(traduccion, targetLang);
            }, 60);

            if (statusText) statusText.innerText = getT().statusReady;

        } else {
            // MODO "SALA GRUPAL": ENVÍO REAL A FIREBASE
            push(messagesRef, {
                deviceId: myDeviceId,
                senderName: currentUser,
                originalText: textToSend,
                originalLang: miIdioma,
                timestamp: serverTimestamp()
            }).catch((error) => {
                console.error("Error de Firebase:", error);
                alert("Error de conexión al enviar el mensaje.");
            }).finally(() => {
                // Limpieza garantizada después de enviar o fallar
                setTimeout(() => {
                    if (statusText) statusText.innerText = getT().statusReady;
                }, 1200);
            });
        }
    }

    // --- 5.8 EVENTOS INPUT MANUAL EN SILENCIO --- //
    const manualInputForm = document.getElementById('manual-input-form');
    const manualTextInput = document.getElementById('manual-text-input');

    if (manualInputForm) {
        manualInputForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // WARM-UP DEL WEBSPEECH ENGINE SÍNCRONO: Desbloquea iOS/Safari activando voz por teclado
            if (synth && synth.state === 'paused') synth.resume();
            if (synth) {
                let ut = new SpeechSynthesisUtterance('');
                ut.volume = 0;
                synth.speak(ut);
            }

            // En Modo Sala es obligatorio el nombre
            if (currentMode === 'room' && !usernameInput.value.trim()) {
                alert(getT().alertName);
                usernameInput.focus();
                return;
            }

            const text = manualTextInput.value.trim();
            if (!text) return; // evitar enviar vacío

            // Enviar formateado y listo
            let formattedText = text.charAt(0).toUpperCase() + text.slice(1);
            if (!/[.!?]$/.test(formattedText)) {
                formattedText += ".";
            }

            sendMessageToFirebase(formattedText);
            manualTextInput.value = ''; // Limpiar input para siguiente
            manualTextInput.blur(); // Minimizar teclado en móviles
        });
    }

    // --- 6. SIMULACIÓN DEL BOTÓN TOGGLE (Tocar para Grabar / Tocar para Detener) --- //
    const toggleRecording = (e) => {
        // Evitamos doble disparo
        if (e && e.cancelable) e.preventDefault();

        // En Modo Sala es obligatorio el nombre, en Modo Solo es opcional.
        if (currentMode === 'room' && !usernameInput.value.trim()) {
            alert(getT().alertName);
            usernameInput.focus();
            return;
        }

        const instructionEl = document.querySelector('.instruction');

        if (!isRecording) {
            // Empezar a grabar
            if (!recognition) return;
            isRecording = true;
            finalTranscript = '';
            pttBtn.classList.add('recording');
            document.body.classList.add('is-recording');
            statusText.innerText = getT().statusListening;
            if (instructionEl) instructionEl.innerText = getT().tapToStop;

            recognition.lang = myLangSelect.value;
            try {
                recognition.start();
            } catch (err) {
                console.error("No se pudo iniciar reconocimiento:", err);
                statusText.innerText = "Error: micrófono ocupado";
                isRecording = false;
                pttBtn.classList.remove('recording');
                document.body.classList.remove('is-recording');
                if (instructionEl) instructionEl.innerText = getT().tapToTalk;
            }
        } else {
            // Detener grabación -> Respuesta Inmediata en la Interfaz (UI)
            isRecording = false;
            pttBtn.classList.remove('recording');
            document.body.classList.remove('is-recording');
            if (instructionEl) instructionEl.innerText = getT().tapToTalk;

            if (statusText.innerText === getT().statusListening || statusText.innerText === "Escuchando...") {
                statusText.innerText = "Procesando...";
            }

            try {
                recognition.stop();
            } catch (err) {
                console.error(err);
            }

            // Respaldo de Limpieza Suprema: Si el navegador mata el onend nativo, la UI igual se repondrá
            setTimeout(() => {
                if (isRecording === false && finalTranscript !== '') {
                    // Si pasaron 2 segundos de haber presionado STOP y onend nunca disparó (Bug de Android), forzamos enviar y limpiar.
                    let rawText = finalTranscript.trim();
                    if (rawText) {
                        rawText = rawText.replace(/ (pero|porque|aunque|y|but|because|although|and|mais|parce que|et) /gi, ', $1 ');
                        rawText = rawText.replace(/ (entonces|además|por lo tanto|sin embargo|then|therefore|donc) /gi, '. $1 ');
                        rawText = rawText.charAt(0).toUpperCase() + rawText.slice(1);
                        if (!/[.!?]$/.test(rawText)) rawText += ".";
                        sendMessageToFirebase(rawText);
                    }
                    finalTranscript = '';
                }
                pttBtn.classList.remove('recording');
                document.body.classList.remove('is-recording');
                if (statusText) statusText.innerText = getT().statusReady;
                if (instructionEl) instructionEl.innerText = getT().tapToTalk;
            }, 2000);
        }
    };

    // Usar click unificado en lugar de mousedown/touchstart para evitar doble-disparo fantasma en móviles
    pttBtn.addEventListener('click', toggleRecording);

    // Eliminar mensaje base de bienvenida original (limpieza final)
    const initialBubbles = document.querySelectorAll('.message-bubble');
    initialBubbles.forEach(b => b.remove());

});
