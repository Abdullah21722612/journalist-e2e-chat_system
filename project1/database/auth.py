from fastapi import APIRouter
from fastapi.responses import JSONResponse
import bcrypt
from .db_connection import get_db_connection
import mysql.connector
from Crypto.PublicKey import RSA

router = APIRouter()

@router.post("/register")
async def register(data: dict):
    username = data["username"]
    password = data["password"]

    # RSA key generate + private key encrypt
    rsa_key = RSA.generate(2048)
    
    private_key_pem = rsa_key.export_key(
        format='PEM',
        passphrase=password.encode('utf-8'),
        pkcs=8,
        protection='scryptAndAES256-CBC'
    ).decode('utf-8')
    
    public_key_pem = rsa_key.publickey().export_key().decode('utf-8')

    # 1. Hash the password before saving and decode to store as a clean string in DB
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    hashed_string = hashed_bytes.decode('utf-8') # ✅ Convert bytes to string for MySQL VARCHAR

    # 2. Save to MySQL
    db = get_db_connection()
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, password, public_key, private_key) VALUES (%s, %s, %s, %s)",
            (username, hashed_string, public_key_pem, private_key_pem)
        )
        db.commit()
        user_id = cursor.lastrowid
        cursor.close()
        db.close()
        return {"message": "Registration successful!", "id": user_id, "username": username}

    except mysql.connector.IntegrityError:
        cursor.close()
        db.close()
        return {"message": "Username already taken!"}
    except Exception as e:
        cursor.close()
        db.close()
        return {"message": f"Error: {str(e)}"}


@router.post("/login")
async def login(data: dict):
    username = data["username"]
    password = data["password"]

    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, password, private_key FROM users WHERE username = %s",
        (username,)
    )
    user = cursor.fetchone()
    cursor.close()
    db.close()

    if not user:
        return {"message": "User not found!"}

    user_id, hashed_password, encrypted_private_key_pem = user

    # ✅ Ensure BOTH arguments are bytes by explicitly encoding to utf-8
    # If hashed_password is a string from the DB, .encode('utf-8') makes it bytes
    if not bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8')): 
        return JSONResponse(status_code=401, content={"message": "Wrong password!"})

    # ✅ Decrypt private key with same password
    try:
        private_key = RSA.import_key(
            encrypted_private_key_pem.encode('utf-8'),
            passphrase=password.encode('utf-8')
        )
    except ValueError:
        return {"message": "Failed to decrypt private key!"}

    return {
        "message": "Login successful!",
        "id": user_id, 
        "username": username
    }
    
    
# Update the very last part of auth.py

@router.post("/private-key")
async def get_private_key(data: dict):
    user_id = data.get("id")
    password = data["password"]

    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute(
        "SELECT password, private_key FROM users WHERE id = %s",
        (user_id,)
    )
    user = cursor.fetchone()
    cursor.close()
    db.close()

    if not user:
        return JSONResponse(status_code=404, content={"message": "User not found!"})

    hashed_password, encrypted_private_key = user

    if not bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8')):
        return JSONResponse(status_code=401, content={"message": "Wrong password!"})

    # Main solution: Create unencrypted PKCS#8 by decrypting the Private Key before sending to frontend
    try:
        # Open the encrypted key from database with user's password
        rsa_key = RSA.import_key(
            encrypted_private_key.encode('utf-8'),
            passphrase=password.encode('utf-8')
        )
        # Export in unencrypted PKCS#8 format (so that JS doesn't encounter any errors)
        clean_private_key_pem = rsa_key.export_key(format='PEM', pkcs=8).decode('utf-8')
        
        return {"private_key": clean_private_key_pem}
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": f"Key Error: {str(e)}"})