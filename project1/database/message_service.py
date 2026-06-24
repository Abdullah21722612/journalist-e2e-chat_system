import asyncio
from .db_connection import get_db_connection
from datetime import datetime

async def save_message(sender_id: int, receiver_id: int, encrypted_message: bytes, encrypted_aes_key: bytes):
    def _save():
        db = None
        cursor = None
        try:
            db = get_db_connection()
            cursor = db.cursor()
            cursor.execute(
                "INSERT INTO messages (sender_id, receiver_id, encrypted_message, encrypted_aes_key, sent_at) VALUES (%s, %s, %s, %s, %s)",
                (sender_id, receiver_id, encrypted_message, encrypted_aes_key, datetime.now())
            )
            db.commit()
            return True
        except Exception as e:
            print(f"❌ Error saving message: {e}")
            return False
        finally:
            if cursor:
                cursor.close()
            if db:
                db.close()

    return await asyncio.to_thread(_save)