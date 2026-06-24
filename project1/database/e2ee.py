from Crypto.Cipher import AES
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Random import get_random_bytes
from Crypto.Hash import SHA256

# ✅ AES Encryption with separate key parameter
def aes_encrypt(plain_text: bytes, key: bytes = None) -> bytes:
    if key is None:
        key = get_random_bytes(32)  # 256-bit key
    
    cipher = AES.new(key, AES.MODE_GCM)
    cipher_text, tag = cipher.encrypt_and_digest(plain_text)
    
    encrypted_msg = cipher.nonce + tag + cipher_text
    
    return encrypted_msg, key

# AES Decryption
def aes_decrypt(cipher_text: bytes, key: bytes) -> bytes:
    nonce = cipher_text[:16]
    tag = cipher_text[16:32]
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    plain_text = cipher.decrypt_and_verify(cipher_text[32:], tag)
    return plain_text

# RSA Encryption
def rsa_encrypt(plain_text: bytes, public_key: bytes) -> bytes:
    rsa_key = RSA.import_key(public_key)
    cipher_rsa = PKCS1_OAEP.new(rsa_key, hashAlgo=SHA256)
    return cipher_rsa.encrypt(plain_text)

# RSA Decryption
def rsa_decrypt(cipher_text: bytes, private_key: bytes, passphrase: bytes = None) -> bytes:
    rsa_key = RSA.import_key(private_key, passphrase=passphrase)
    cipher_rsa = PKCS1_OAEP.new(rsa_key, hashAlgo=SHA256)
    return cipher_rsa.decrypt(cipher_text)