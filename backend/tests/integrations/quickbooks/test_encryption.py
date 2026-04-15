import pytest
from cryptography.fernet import Fernet, InvalidToken

from app.integrations.quickbooks import encryption


@pytest.fixture(autouse=True)
def patch_key(monkeypatch):
    key = Fernet.generate_key()
    monkeypatch.setattr(encryption, "_get_key", lambda: key)


def test_encrypt_decrypt_round_trip():
    plain = "ya29.A0AfH6S..."
    cipher = encryption.encrypt(plain)
    assert cipher != plain
    assert encryption.decrypt(cipher) == plain


def test_encrypt_produces_different_ciphertext_each_call():
    a = encryption.encrypt("same-token")
    b = encryption.encrypt("same-token")
    assert a != b
    assert encryption.decrypt(a) == encryption.decrypt(b) == "same-token"


def test_decrypt_with_wrong_key_raises(monkeypatch):
    cipher = encryption.encrypt("token")
    monkeypatch.setattr(encryption, "_get_key", lambda: Fernet.generate_key())
    with pytest.raises(InvalidToken):
        encryption.decrypt(cipher)


def test_encrypt_none_returns_none():
    assert encryption.encrypt(None) is None
    assert encryption.decrypt(None) is None
