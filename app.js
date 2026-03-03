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

    // --- 0. EXPERIENCIA FÁCIL (ABUELO-FRIENDLY) - MEMORIA AUTOMÁTICA --- //
    // Aquí hacemos que la app recuerde quién es el usuario y su idioma.
    // Así los nietos se lo configuran 1 sola vez y el abuelo ya no debe tocar nada.

    const savedName = localStorage.getItem('lingoName');
    const savedLang = localStorage.getItem('lingoLang');
    const savedTargetLang = localStorage.getItem('lingoTargetLang');

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

    // Guardar cambios automáticamente si el nieto modifica el nombre o idioma
    usernameInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        localStorage.setItem('lingoName', val);
        selfContactName.innerText = val ? val + " (Tú)" : "Tú (Aún sin nombre)";
    });

    myLangSelect.addEventListener('change', () => {
        const val = myLangSelect.value;
        const text = myLangSelect.options[myLangSelect.selectedIndex].text;
        localStorage.setItem('lingoLang', val);
        selfContactLang.innerText = text;
    });

    targetLangSelect.addEventListener('change', () => {
        localStorage.setItem('lingoTargetLang', targetLangSelect.value);
    });

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
        const currentUser = usernameInput.value.trim() || 'Usuario Anónimo';

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
            statusText.innerText = 'Mensaje entrante...';

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

            statusText.innerText = 'Listo para transmitir';
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
            alert("¡Espera! Escribe tu nombre primero (Ej. Tío Hjalmar) para que tu familia sepa quién lo invita.");
            usernameInput.focus();
            return;
        }

        shareModal.classList.remove('hidden');
    });

    // --- ACCIONES ESPECÍFICAS DE COMPARTIR ---

    function getShareData() {
        const currentUser = usernameInput.value.trim();
        const link = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + currentRoom;
        const shortText = `¡Hola! Soy ${currentUser}. Únete a mi sala en Dialecta para traducir nuestras voces en tiempo real:`;
        return { currentUser, link, shortText };
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
        const subject = `Invitación a Dialecta de ${data.currentUser}`;
        const body = `¡Hola!\n\n${data.shortText}\n\nIngresa desde tu celular o pc haciendo clic aquí:\n${data.link}`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        shareModal.classList.add('hidden');
    });

    document.getElementById('share-copy').addEventListener('click', async () => {
        const data = getShareData();
        const msg = `${data.shortText} ${data.link}`;

        try {
            await navigator.clipboard.writeText(msg);

            const btn = document.getElementById('share-copy');
            const origHTML = btn.innerHTML;
            btn.innerHTML = '<i class="ph-fill ph-check-circle"></i> ¡Copiado!';

            setTimeout(() => {
                btn.innerHTML = origHTML;
            }, 2000);

        } catch (e) {
            alert("Tu enlace es: " + data.link);
        }
    });

    // --- 1. CONFIGURACIÓN DE RECONOCIMIENTO Y SÍNTESIS DE VOZ --- //
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let synth = window.speechSynthesis;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Solo graba un audio a la vez, como Walkie Talkie
        recognition.interimResults = false; // Sin resultados parciales por ahora para mayor precisión
    } else {
        alert("Tu navegador no soporta el reconocimiento de voz. ¡Usa Google Chrome o Safari para usar Dialecta!");
    }

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
        // Podemos hacer que suene un poco más suave
        utterance.rate = 1.0;

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
            <div style="font-size: 11px; margin-bottom: 4px; opacity: 0.7; font-weight: bold; color: ${isOutgoing ? 'var(--text-translated)' : 'var(--accent-secondary)'};">${isOutgoing ? 'Tú' : senderName}</div>
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
            statusText.innerText = 'Escuchando...';
        };

        recognition.onresult = (event) => {
            finalTranscript = event.results[0][0].transcript;

            statusText.innerText = 'Enviando...';

            const currentUser = usernameInput.value.trim() || 'Usuario Anónimo';

            // ENVÍO REAL A FIREBASE
            // Esto mandará el mensaje a la nube de Google. Al recibirlo de vuelta (vía onChildAdded arriba),
            // se mostrará automáticamente en nuestro chat local y en el de todos los rincones del mundo.
            push(messagesRef, {
                deviceId: myDeviceId,
                senderName: currentUser,
                originalText: finalTranscript,
                originalLang: miIdioma,
                timestamp: serverTimestamp()
            });

            // Re-habilitamos estado grabando si alguien más quiere hablar
            setTimeout(() => {
                statusText.innerText = 'Listo para transmitir';
            }, 500);
        };

        recognition.onerror = (event) => {
            console.error(event.error);
            statusText.innerText = 'Error al escuchar';
        };

        recognition.onend = () => {
            isRecording = false;
            pttBtn.classList.remove('recording');
            document.body.classList.remove('is-recording');
        };
    }

    // --- 6. SIMULACIÓN DEL BOTÓN WALKIE TALKIE --- //
    const startWalkieTalkie = (e) => {
        if (e) e.preventDefault();

        if (!usernameInput.value.trim()) {
            alert("Por favor, ingresa tu nombre antes de hablar.");
            usernameInput.focus();
            return;
        }

        if (isRecording || !recognition) return;

        isRecording = true;
        pttBtn.classList.add('recording');
        document.body.classList.add('is-recording');

        // Configuramos para que escuche en el idioma que tiene marcado
        recognition.lang = myLangSelect.value;
        recognition.start();
    };

    const stopWalkieTalkie = (e) => {
        if (e) e.preventDefault();
        if (!isRecording || !recognition) return;

        // Al soltar el boton paramos de escuchar y procesamos lo oído
        recognition.stop();
    };

    // Eventos PC (Mouse)
    pttBtn.addEventListener('mousedown', startWalkieTalkie);
    window.addEventListener('mouseup', stopWalkieTalkie);

    // Eventos Móviles (Touch)
    pttBtn.addEventListener('touchstart', startWalkieTalkie);
    window.addEventListener('touchend', stopWalkieTalkie);

    // Cancelar si salen de la ventana
    pttBtn.addEventListener('mouseleave', () => {
        if (isRecording) stopWalkieTalkie();
    });

    // Reproducir ejemplos estáticos que iniciaron para prueba original
    // Limpiamos los ejemplos estáticos del HTML para que se vea real
    const initialBubbles = document.querySelectorAll('.message-bubble');
    initialBubbles.forEach(b => b.remove());

});
