import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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
const myDeviceId = Math.random().toString(36).substring(2, 12);

window.isInitialLoad = true;
setTimeout(() => { window.isInitialLoad = false; }, 2000); // 2 segs para ignorar audios viejos al cargar

document.addEventListener('DOMContentLoaded', () => {

    // Referencias al DOM
    const pttBtn = document.getElementById('ptt-button');
    const statusText = document.getElementById('status-text');
    const myLangSelect = document.getElementById('my-lang');
    const targetLangSelect = document.getElementById('target-lang');
    const swapLangBtn = document.getElementById('swap-lang-btn');
    const voiceSelect = document.getElementById('voice-select');
    const testVoiceBtn = document.getElementById('test-voice-btn');
    const usernameInput = document.getElementById('username');
    const chatHistory = document.getElementById('chat-history');
    const roomIdDisplay = document.getElementById('room-id-display');
    const inviteBtn = document.getElementById('invite-btn');
    const contactsBtn = document.getElementById('contacts-btn');
    const closeContactsBtn = document.getElementById('close-contacts');
    const contactsPanel = document.getElementById('contacts-panel');

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
            namePlaceholder: "Ej: Juan", meLabel: "Tú", otherPersonLabel: "Otra Persona:",
            safeRoomDesc: "Sala segura. Elige los idiomas y toca el botón para hablar o detenerte.",
            tapToTalk: "Toca para hablar", tapToStop: "Toca para detener", inviteTitle: "Invitar a Dialecta",
            inviteDesc: "¿Cómo deseas compartir la invitación?", copyLink: "Copiar Enlace",
            alertName: "¡Espera! Escribe tu nombre primero (Ej: Juan) para que sepan quién invita.",
            statusConnecting: "Conectando...", statusListening: "Escuchando...", statusSending: "Enviando...",
            statusReady: "Listo para transmitir", statusIncoming: "Mensaje entrante...",
            unsupported: "Tu navegador no soporta el reconocimiento de voz. ¡Usa Chrome o Safari!",
            copied: "¡Copiado!", youString: " (Tú)", noNameString: "Tú (Aún sin nombre)",
            anon: "Usuario Anónimo", youMsg: "Tú",
            shareSubject: "Invitación a Dialecta de ",
            shareBody: "Únete a mi sala en Dialecta para traducir nuestras voces en tiempo real:",
            voiceLabel: "Voz:", autoVoice: "Automática"
        },
        'en': {
            roomLabel: "Room:", inviteBtn: "Invite", inThisRoom: "In this room", yourName: "Your Name:",
            namePlaceholder: "Ex: John", meLabel: "Me", otherPersonLabel: "Other:",
            safeRoomDesc: "Secure room. Choose your language and tap the center button to speak or stop.",
            tapToTalk: "Tap to talk", tapToStop: "Tap to stop", inviteTitle: "Invite a contact",
            inviteDesc: "How would you like to share the room invitation?", copyLink: "Copy Link",
            alertName: "Wait! Write your name first (Ex: John) so they know who's inviting.",
            statusConnecting: "Connecting...", statusListening: "Listening...", statusSending: "Sending...",
            statusReady: "Ready to transmit", statusIncoming: "Incoming message...",
            unsupported: "Your browser doesn't support speech recognition. Use Chrome or Safari!",
            copied: "Copied!", youString: " (You)", noNameString: "You (No name yet)",
            anon: "Anonymous User", youMsg: "You",
            shareSubject: "Dialecta invitation from ",
            shareBody: "Join my Dialecta room to translate our voices in real time:",
            voiceLabel: "Voice:", autoVoice: "Automatic"
        },
        'fr': {
            roomLabel: "Salle:", inviteBtn: "Inviter", inThisRoom: "Dans cette salle", yourName: "Ton Nom:",
            namePlaceholder: "Ex: Jean", meLabel: "Moi", otherPersonLabel: "Autre:",
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
            voiceLabel: "Voix:", autoVoice: "Automatique"
        }
    };

    function getT() {
        const langCode = myLangSelect.value.split('-')[0];
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
        selfContactName.innerText = val ? val + t.youString : t.noNameString;

        if (!isRecording && statusText.innerText !== t.statusIncoming) {
            statusText.innerText = t.statusReady;
        }
    }

    // --- 0. EXPERIENCIA FÁCIL (ABUELO-FRIENDLY) - MEMORIA AUTOMÁTICA --- //
    // Aquí hacemos que la app recuerde quién es el usuario y su idioma.
    // Así los nietos se lo configuran 1 sola vez y el abuelo ya no debe tocar nada.

    const savedName = localStorage.getItem('lingoName');
    const savedLang = localStorage.getItem('lingoLang');
    const savedTargetLang = localStorage.getItem('lingoTargetLang');
    const savedVoice = localStorage.getItem('lingoVoice');

    if (savedName) {
        usernameInput.value = savedName;
        selfContactName.innerText = savedName + " (Tú)";
    }

    if (savedLang) {
        myLangSelect.value = savedLang;
        selfContactLang.innerText = myLangSelect.options[myLangSelect.selectedIndex].text;
    }

    if (savedTargetLang) {
        targetLangSelect.value = savedTargetLang;
    }

    updateUI(); // Se traduce en cuanto arranca la app

    // Guardar cambios automáticamente si el nieto modifica el nombre o idioma
    usernameInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const t = getT();
        localStorage.setItem('lingoName', val);
        selfContactName.innerText = val ? val + t.youString : t.noNameString;
    });

    myLangSelect.addEventListener('change', () => {
        const val = myLangSelect.value;
        const text = myLangSelect.options[myLangSelect.selectedIndex].text;
        localStorage.setItem('lingoLang', val);
        selfContactLang.innerText = text;
        updateUI(); // Traducir la interfaz instantaneamente al cambiar origen
    });

    targetLangSelect.addEventListener('change', () => {
        localStorage.setItem('lingoTargetLang', targetLangSelect.value);
    });

    voiceSelect.addEventListener('change', () => {
        localStorage.setItem('lingoVoice', voiceSelect.value);
    });

    // Test de voz seleccionada
    if (testVoiceBtn) {
        testVoiceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const baseLang = myLangSelect.value;
            const msgs = {
                'es-ES': 'Hola, probando 1, 2, 3. Así es como suena mi voz en español. ¿Me copias?',
                'en-US': 'Hello, testing 1, 2, 3. This is what my voice sounds like. Do you read me?',
                'fr-FR': 'Bonjour, test 1, 2, 3. Voici comment je sonne en français. Tu me reçois ?'
            };
            const textToTest = msgs[baseLang] || msgs['en-US'];

            const icon = testVoiceBtn.querySelector('i');
            icon.classList.remove('ph-play-circle');
            icon.classList.add('ph-speaker-high');

            speakText(textToTest, baseLang);

            setTimeout(() => {
                icon.classList.remove('ph-speaker-high');
                icon.classList.add('ph-play-circle');
            }, 3000);
        });
    }

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

    // Lógica para visualizar los Contactos
    contactsBtn.addEventListener('click', () => {
        contactsPanel.classList.remove('hidden');
    });

    closeContactsBtn.addEventListener('click', () => {
        contactsPanel.classList.add('hidden');
    });

    // --- CONEXIÓN REAL CON FIREBASE (RECIBIR MENSAJES) --- //
    const messagesRef = ref(db, `rooms/${currentRoom}/messages`);
    onChildAdded(messagesRef, async (snapshot) => {
        const msg = snapshot.val();
        const miIdioma = myLangSelect.value;
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

                // Efecto visual de que alguien entró/habló
                const cBtn = document.getElementById('contacts-btn');
                cBtn.style.boxShadow = "0 0 15px #ec4899";
                setTimeout(() => cBtn.style.boxShadow = "none", 3000);
            }
        }

        // MOSTRAR EL MENSAJE EN PANTALLA
        if (msg.deviceId === myDeviceId) {
            // Soy yo (lo envié yo mismo)
            // En MODO VIAJE, el teléfono traduce y "habla en voz alta" mi propio mensaje al idioma de la otra persona
            const idiomaViaje = targetLangSelect.value;
            let traduccionViaje = msg.originalText;

            if (msg.originalLang.split('-')[0] !== idiomaViaje.split('-')[0]) {
                traduccionViaje = await translateText(msg.originalText, msg.originalLang, idiomaViaje);
            }

            addChatBubble(currentUser, msg.originalText, traduccionViaje, true, idiomaViaje);

            // Hablamos en voz alta la traducción en nuestro propio celular (Para la persona de en frente)
            if (!window.isInitialLoad) {
                speakText(traduccionViaje, idiomaViaje);
            }
        } else {
            // Viene de un familiar (Entrante)
            statusText.innerText = getT().statusIncoming;

            // Lo traducimos a NUESTRO idioma
            let traduccionParaMi = msg.originalText;
            if (msg.originalLang.split('-')[0] !== miIdioma.split('-')[0]) {
                traduccionParaMi = await translateText(msg.originalText, msg.originalLang, miIdioma);
            }

            addChatBubble(msg.senderName, msg.originalText, traduccionParaMi, false, miIdioma);

            // SOLO hablar en voz alta SI el mensaje es nuevo (evitar leer todo el historial del abuelo a la vez al recargar)
            if (!window.isInitialLoad) {
                speakText(traduccionParaMi, miIdioma);
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

    // --- CARGADO DINÁMICO DE VOCES DISPONIBLES EN EL SISTEMA --- //
    function populateVoices() {
        if (!synth) return;
        const voices = synth.getVoices();
        if (voices.length === 0) return;

        const currentLangPrefix = myLangSelect.value.split('-')[0];
        // Filtrar voces que coincidan con "Mi Idioma" base
        const relevantVoices = voices.filter(v => v.lang.startsWith(currentLangPrefix));

        const t = getT();
        const currentVal = voiceSelect.value;
        const storedVal = localStorage.getItem('lingoVoice');

        voiceSelect.innerHTML = `<option value="">${t.autoVoice}</option>`;

        relevantVoices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.voiceURI;
            opt.textContent = v.name;
            voiceSelect.appendChild(opt);
        });

        // Intentar mantener la voz seleccionada o guardar
        if (currentVal && relevantVoices.find(v => v.voiceURI === currentVal)) {
            voiceSelect.value = currentVal;
        } else if (storedVal && relevantVoices.find(v => v.voiceURI === storedVal)) {
            voiceSelect.value = storedVal;
        } else {
            voiceSelect.value = "";
        }
    }

    if (synth) {
        synth.onvoiceschanged = populateVoices;
        // Algunos navegadores cargan voces instantáneamente y nunca disparan el evento
        populateVoices();
        // Otros toman un poco más de tiempo, un timer de respaldo asegura que aparezcan
        setTimeout(populateVoices, 1000);
    }
    // Re-pintar lista de voces de lectura cuando el idioma base cambie
    myLangSelect.addEventListener('change', populateVoices);
    // --- 2. FUNCIÓN DE TRADUCCIÓN GRATUITA (Hack de Google Translate) --- //
    // NOTA: Para producción real en el futuro, es mejor tu backend de Google Apps Script o una API oficial
    async function translateText(text, sourceLang, targetLang) {
        // Obtenemos solo los primeros dos caracteres (ej. 'es' de 'es-ES' o 'en' de 'en-US')
        const sl = sourceLang.split('-')[0];
        const tl = targetLang.split('-')[0];

        try {
            const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
            const data = await response.json();
            // Retorna solo el texto traducido principal
            return data[0].map(item => item[0]).join('');
        } catch (error) {
            console.error("Error al traducir:", error);
            return text; // Fallback
        }
    }

    // --- 3. FUNCIÓN PARA HABLAR EL TEXTO TRADUCIDO --- //
    function speakText(text, lang) {
        if (!synth) return;

        // Cancelar si algo estaba hablando ya
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang; // Ej. 'es-ES' o 'en-US'

        // Redujimos la velocidad (rate) drásticamente. 
        // 1.0 en algunos sistemas suena como locutor de radio apresurado. 0.85 es más natural y pausado.
        utterance.rate = 0.85;
        // Bajar LIGERAMENTE el tono (pitch) también ayuda a que la voz suene menos robótica/aguda
        utterance.pitch = 0.95;

        // Inyectar la voz personalizada (si está definida y si corresponde al idioma que estamos por hablar)
        const voices = synth.getVoices();
        const selectedVoiceURI = voiceSelect.value;

        if (selectedVoiceURI) {
            const chosen = voices.find(v => v.voiceURI === selectedVoiceURI);
            if (chosen) { // Quité el filtro estricto para forzar aplicación de la voz elegida
                utterance.voice = chosen;
            }
        }

        // Efecto visual al hablar
        utterance.onstart = () => { document.body.style.boxShadow = "inset 0 0 50px var(--accent-glow)"; };
        utterance.onend = () => { document.body.style.boxShadow = "none"; };

        synth.speak(utterance);
    }

    // --- 4. FUNCIÓN PARA CREAR BURBUJAS DE CHAT EN LA PANTALLA --- //
    function addChatBubble(senderName, originalText, translatedText, isOutgoing, langToSpeak) {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;

        bubble.innerHTML = `
            <div style="font-size: 11px; margin-bottom: 4px; opacity: 0.7; font-weight: bold; color: ${isOutgoing ? 'var(--text-translated)' : 'var(--accent-secondary)'};">${isOutgoing ? getT().youMsg : senderName}</div>
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

        // Eliminar mensaje base de bienvenida
        const systemMsg = chatHistory.querySelector('.system-message');
        if (systemMsg) systemMsg.style.display = 'none';

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
        };

        recognition.onerror = (event) => {
            console.error("Error de micrófono:", event.error);
            statusText.innerText = 'Error al escuchar';
        };

        recognition.onend = () => {
            isRecording = false;
            pttBtn.classList.remove('recording');
            document.body.classList.remove('is-recording');

            // Actualizar boton instruction visual text
            const instructionEl = document.querySelector('.instruction');
            if (instructionEl) instructionEl.innerText = getT().tapToTalk;

            // Combinar y limpiar texto
            const textToSend = finalTranscript.trim();

            if (textToSend) {
                statusText.innerText = getT().statusSending;

                const currentUser = usernameInput.value.trim() || getT().anon;
                const miIdioma = myLangSelect.value;

                // ENVÍO REAL A FIREBASE
                push(messagesRef, {
                    deviceId: myDeviceId,
                    senderName: currentUser,
                    originalText: textToSend,
                    originalLang: miIdioma,
                    timestamp: serverTimestamp()
                }).catch((error) => {
                    console.error("Error de Firebase:", error);
                    alert("Error de conexión al enviar el mensaje.");
                    statusText.innerText = getT().statusReady;
                });

                setTimeout(() => {
                    if (statusText.innerText === getT().statusSending) {
                        statusText.innerText = getT().statusReady;
                    }
                }, 1000);
            } else {
                // Si paró de grabar y no captó ningún texto
                if (statusText.innerText === getT().statusListening || statusText.innerText === "Escuchando...") {
                    statusText.innerText = getT().statusReady;
                }
            }

            finalTranscript = ''; // Limpiar siempre al terminar
        };
    }

    // --- 6. SIMULACIÓN DEL BOTÓN TOGGLE (Tocar para Grabar / Tocar para Detener) --- //
    const toggleRecording = (e) => {
        // Evitamos doble disparo
        if (e && e.cancelable) e.preventDefault();

        if (!usernameInput.value.trim()) {
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
            // Detener grabación
            try {
                recognition.stop();
            } catch (err) {
                console.error(err);
            }

            // Respaldo por si el navegador se queda atascado sin disparar onend
            setTimeout(() => {
                if (isRecording && recognition.onend) {
                    recognition.onend();
                }
            }, 1200);
        }
    };

    // Usar click y touchend para la accion unica (un tap)
    pttBtn.addEventListener('click', toggleRecording);

    // Eliminar mensaje base de bienvenida original (limpieza final)
    const initialBubbles = document.querySelectorAll('.message-bubble');
    initialBubbles.forEach(b => b.remove());

});
