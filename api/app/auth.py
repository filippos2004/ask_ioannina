from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic_settings import BaseSettings
import json
import os
from threading import Lock

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Settings(BaseSettings):
    JWT_SECRET: str = "change-me"
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_TOKEN_DAYS: int = 7

    class Config:
        env_file = ".env"

settings = Settings()

USERS_FILE = os.path.join(os.path.dirname(__file__), "users.json")
_users_lock = Lock()

def _load_users() -> dict:
    # users.json format: {"email": {"password_hash": "..."}}
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, dict) else {}
        except Exception:
            return {}
    return {}

def _save_users(users: dict) -> None:
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

# Seed: 1 “demo” user
_users = _load_users()
if "demo@demo.com" not in _users:
    _users["demo@demo.com"] = {"password_hash": pwd_context.hash("demo1234")}
    _save_users(_users)

def register_user(email: str, password: str) -> None:
    email = email.lower().strip()
    with _users_lock:
        users = _load_users()
        if email in users:
            raise ValueError("User already exists")
        users[email] = {"password_hash": pwd_context.hash(password)}
        _save_users(users)

def verify_user(email: str, password: str) -> bool:
    email = email.lower().strip()
    with _users_lock:
        users = _load_users()
    user = users.get(email)
    if not user:
        return False
    return pwd_context.verify(password, user["password_hash"])



def create_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def create_access_token(email: str) -> str:
    return create_token(
        subject=email,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_MINUTES),
    )

def create_refresh_token(email: str) -> str:
    return create_token(
        subject=email,
        token_type="refresh",
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_DAYS),
    )

def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        return None