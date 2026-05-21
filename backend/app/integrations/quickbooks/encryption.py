"""Fernet-based encryption for QuickBooks OAuth tokens at rest."""
from cryptography.fernet import Fernet

from app.config import settings


def _get_key() -> bytes:
    key = settings.qbo_token_encryption_key
    if not key:
        raise RuntimeError("QBO_TOKEN_ENCRYPTION_KEY is not configured")
    return key.encode()


def encrypt(plaintext: str | None) -> str | None:
    if plaintext is None:
        return None
    return Fernet(_get_key()).encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str | None) -> str | None:
    if ciphertext is None:
        return None
    return Fernet(_get_key()).decrypt(ciphertext.encode()).decode()
