// --- Setup ---
if (!window.isSecureContext) {
    alert("Web Crypto API will not work! Please use http://localhost or HTTPS. Your current URL is not secure.");
    console.error("crypto.subtle is undefined because the page is not in a secure context (HTTPS/localhost).");
}
// API_PORT এবং API_BASE_URL config.js থেকে সরাসরি পাবে।
const userId = Number(localStorage.getItem('currentUserId'));
const chatUserId = Number(localStorage.getItem('chatUserId'));
const chatUsername = localStorage.getItem('chatUsername') || 'Chat';

let messages = JSON.parse(localStorage.getItem(`messages_${userId}_${chatUserId}`)) || [];

// --- On Page Load ---
window.addEventListener('load', () => {
    if (!localStorage.getItem('isLoggedIn') || !userId) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('chatWith').textContent = chatUsername;
    displayMessages();

    // ✅ WebSocket Connect (API_PORT config.js থেকে আসবে)
    const ws = new WebSocket(`ws://localhost:${API_PORT}/ws/${userId}`);
    window.ws = ws;

    // ✅ When encrypted message arrives
    ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        // সার্ভার থেকে আসা কনফার্মেশন মেসেজ ইগনোর করা (যেগুলোতে sender_id নেই)
        if (data.status === "ok" || data.error) return;

        if (data.sender_id) {
            try {
                // Step 1: Get private key from localStorage
                const privateKeyPEM = localStorage.getItem('privateKey');

                // Step 2: Extract and decrypt AES key using RSA private key
                const encryptedAESKey = Uint8Array.from(atob(data.encrypted_aes_key), c => c.charCodeAt(0));
                const aesKeyBytes = await rsaDecrypt(encryptedAESKey, privateKeyPEM);

                // Step 3: Extract and decrypt message using the decrypted AES key
                const encryptedMsg = Uint8Array.from(atob(data.encrypted_message), c => c.charCodeAt(0));
                const plaintextMsg = await aesDecrypt(encryptedMsg, aesKeyBytes);

                // Step 4: Store plaintext message and update UI
                data.message = plaintextMsg;
                messages.push(data);
                save();
                displayMessages();
            } catch (err) {
                console.error('Decryption failed:', err);
            }
        }
    };
});

// --- Send Message (plaintext) ---
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    // ✅ Plaintext - backend will encrypt this before sending to receiver
    const msg = {
        sender_id: userId,
        receiver_id: chatUserId,
        message: text,  
        timestamp: new Date().toISOString()
    };

    window.ws.send(JSON.stringify(msg));

    // Show immediately on sender's screen
    messages.push(msg);
    save();
    displayMessages();

    input.value = ''; // clear input field
}

// --- Display Messages ---
function displayMessages() {
    const area = document.getElementById('messagesArea');
    area.innerHTML = '';

    messages.forEach(msg => {
        const isMe = Number(msg.sender_id) === userId;
        const raw = msg.created_at ?? msg.sent_at ?? msg.timestamp ?? null;
        const date = raw ? new Date(raw) : new Date();
        const time = isNaN(date) ? 'now' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const row = document.createElement('div');
        row.className = `msg-row ${isMe ? 'mine' : ''}`;
        row.innerHTML = `
            <div class="avatar ${isMe ? 'me' : 'them'}">
                ${isMe ? 'Me' : chatUsername.slice(0, 2).toUpperCase()}
            </div>
            <div class="bubble-group">
                ${!isMe ? `<span class="sender-name">${chatUsername}</span>` : ''}
                <div class="bubble ${isMe ? 'mine' : 'them'}">${msg.message}</div>
                <span class="timestamp">${time}</span>
            </div>
        `;
        area.appendChild(row);
    });

    // Auto-scroll to bottom
    area.scrollTop = area.scrollHeight;
}

// --- Save messages to localStorage ---
function save() {
    localStorage.setItem(`messages_${userId}_${chatUserId}`, JSON.stringify(messages));
}

// === DECRYPTION FUNCTIONS (Browser-side Web Crypto API) ===

// ✅ RSA Decryption
async function rsaDecrypt(encryptedData, privateKeyPEM) {
    if (!privateKeyPEM) {
        console.error("❌ Private key not found in localStorage!");
        return;
    }

    // যেকোনো ধরনের হেডার (RSA PRIVATE KEY বা শুধু PRIVATE KEY), ফুটার এবং স্পেস রিমুভ করবে
    const pemContents = privateKeyPEM
        .replace(/-----BEGIN .*-----/, "")
        .replace(/-----END .*-----/, "")
        .replace(/\s/g, ""); // সব স্পেস এবং নিউলাইন বাদ দিবে
    
    try {
        const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

        // প্রাইভেট-কী ইমপোর্ট করা
        const privateKey = await crypto.subtle.importKey(
            "pkcs8",
            binaryDer.buffer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["decrypt"]
        );

        // ডেটা ডিক্রিপ্ট করা
        const decryptedKeyBuffer = await crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedData
        );

        return new Uint8Array(decryptedKeyBuffer);
    } catch (error) {
        console.error("❌ rsaDecrypt Error: ", error);
        throw error;
    }
}

// ✅ AES Decryption
async function aesDecrypt(encryptedData, aesKeyBytes) {
    // Python এর PyCryptodome থেকে আসে: nonce(16 bytes) + tag(16 bytes) + ciphertext
    const nonce = encryptedData.slice(0, 16);
    const tag = encryptedData.slice(16, 32);
    const ciphertext = encryptedData.slice(32);

    // Web Crypto API আশা করে: ciphertext + tag (একসাথে)
    const ciphertextAndTag = new Uint8Array(ciphertext.length + tag.length);
    ciphertextAndTag.set(ciphertext, 0);
    ciphertextAndTag.set(tag, ciphertext.length);

    // AES-GCM কী ইমপোর্ট করা
    const key = await crypto.subtle.importKey(
        'raw',
        aesKeyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );

    // মেসেজ ডিক্রিপ্ট করা
    const plaintextBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: nonce },
        key,
        ciphertextAndTag
    );

    return new TextDecoder().decode(plaintextBuffer);
}