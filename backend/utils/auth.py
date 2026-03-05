"""
Authentication utilities: Firebase token verification + JWT generation.
"""
import os
import hashlib
import hmac
import jwt
import requests
from datetime import datetime, timedelta

SECRET_KEY = os.environ.get("JWT_SECRET", "fitlife-super-secret-key-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24 * 7  # 7 days

FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")


def hash_password(password: str) -> str:
    """Simple PBKDF2 password hash."""
    salt = os.environ.get("PASSWORD_SALT", "fitlife-salt-2024")
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return dk.hex()


def verify_password(password: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), stored_hash)


def generate_jwt(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])


def verify_firebase_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token using Google's tokeninfo endpoint.
    Returns decoded token payload or raises an exception.
    """
    if not FIREBASE_PROJECT_ID:
        raise ValueError("FIREBASE_PROJECT_ID not configured")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={os.environ.get('FIREBASE_API_KEY', '')}"
    resp = requests.post(url, json={"idToken": id_token}, timeout=10)
    if resp.status_code != 200:
        raise ValueError("Invalid Firebase token")
    users = resp.json().get("users", [])
    if not users:
        raise ValueError("No user found for Firebase token")
    return users[0]
