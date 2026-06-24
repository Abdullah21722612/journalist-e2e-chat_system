from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from datetime import datetime
import base64

# Import from other modules
from .message_service import save_message 
from .e2ee import aes_encrypt, rsa_encrypt 
from .db_connection import get_db_connection # To fetch public key from database

app = FastAPI()

# Dictionary to store active WebSocket connections (not a database table, only in-memory list)
active_users = {}

# Fetch user's real public key from database
def get_public_key_from_db(user_id: int) -> bytes:
    db = get_db_connection()
    cur = db.cursor()
    cur.execute("SELECT public_key FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    cur.close()
    db.close()
    
    if row and row[0]:
        # If public key is stored as string, convert it to bytes
        return row[0].encode('utf-8') if isinstance(row[0], str) else row[0]
    return None

@app.websocket("/ws/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: int):
    # When user connects, add them to the active_users list
    await websocket.accept()
    active_users[user_id] = websocket

    try:
        while True:
            data = await websocket.receive_json()

            sender_id    = int(data.get("sender_id"))
            receiver_id  = int(data.get("receiver_id"))
            plaintext    = data.get("message")  # Plaintext message from browser
            timestamp    = data.get("timestamp", datetime.now().isoformat())

            if not plaintext:
                continue

            # 1. Fetch receiver's public key from database
            receiver_pub_key = get_public_key_from_db(receiver_id)
            
            if not receiver_pub_key:
                # If receiver's public key not found, cannot send message
                await websocket.send_json({"error": "Receiver's public key not found!"})
                continue

            # 2. Encrypt message using AES
            encrypted_msg_bytes, aes_key = aes_encrypt(plaintext.encode('utf-8'))

            # 3. Encrypt AES key using receiver's public key
            encrypted_aes_key_bytes = rsa_encrypt(aes_key, receiver_pub_key)

            # 4. Convert to Base64 for sending in JSON
            b64_msg = base64.b64encode(encrypted_msg_bytes).decode('utf-8')
            b64_key = base64.b64encode(encrypted_aes_key_bytes).decode('utf-8')

            msg_to_send = {
                "sender_id"        : sender_id,
                "receiver_id"      : receiver_id,
                "encrypted_message": b64_msg,
                "encrypted_aes_key": b64_key,
                "timestamp"        : timestamp
            }

            # 5. Save to database (as bytes)
            await save_message(
                sender_id=sender_id,
                receiver_id=receiver_id,
                encrypted_message=encrypted_msg_bytes,
                encrypted_aes_key=encrypted_aes_key_bytes
            )

            # 6. If receiver is online (in active_users), send message immediately
            if receiver_id in active_users:
                await active_users[receiver_id].send_json(msg_to_send)

    except WebSocketDisconnect:
        # When user disconnects, remove them from the active users list
        if user_id in active_users:
            del active_users[user_id]