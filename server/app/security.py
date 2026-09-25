"""Secrets chiffrés et second facteur.

- Les secrets conservés en base (graine TOTP, mot de passe du compte de
  service LDAP) sont chiffrés par Fernet (AES-128-CBC + HMAC-SHA256). La clé
  vient de ``SCOPEO_SECRET_KEY`` ou, à défaut, d'un fichier ``secret.key``
  créé au premier démarrage dans le dossier de données : elle se sauvegarde
  avec la base, jamais dans le dépôt.
- Le second facteur suit la RFC 6238 (TOTP, 30 secondes, 6 chiffres), avec une
  tolérance d'une période et un refus de rejouer un code déjà accepté.
- Les codes de récupération sont à usage unique ; seule leur empreinte HMAC
  est conservée.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import io
import os
import secrets
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

import pyotp
import qrcode
import qrcode.image.svg
from cryptography.fernet import Fernet, InvalidToken

from .db import DATA_DIR

ISSUER = "Scopeo"
RECOVERY_CODE_COUNT = 10


# ---------------------------------------------------------------------------
# Clé de chiffrement
# ---------------------------------------------------------------------------


def _load_key() -> bytes:
    configured = os.environ.get("SCOPEO_SECRET_KEY", "").strip()
    if configured:
        # Une valeur quelconque est dérivée en clé Fernet valide.
        return base64.urlsafe_b64encode(hashlib.sha256(configured.encode("utf-8")).digest())
    path = Path(DATA_DIR) / "secret.key"
    if path.exists():
        return path.read_bytes().strip()
    key = Fernet.generate_key()
    # Création exclusive : lisible par le seul compte qui fait tourner le serveur.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as handle:
        handle.write(key)
    return key


_KEY = _load_key()
_fernet = Fernet(_KEY)
_pepper = hashlib.sha256(b"scopeo-recovery|" + _KEY).digest()


def encrypt(value: str) -> str:
    return _fernet.encrypt(value.encode("utf-8")).decode("ascii")


def decrypt(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return _fernet.decrypt(value.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError):
        # Clé changée ou valeur altérée : le secret est considéré comme absent.
        return None


# ---------------------------------------------------------------------------
# TOTP
# ---------------------------------------------------------------------------


def new_totp_secret() -> str:
    return pyotp.random_base32(length=32)


def provisioning_uri(secret: str, account: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=account, issuer_name=ISSUER)


def qr_svg(data: str) -> str:
    """QR code en SVG autonome, sans dépendance d'image."""
    image = qrcode.make(data, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=2)
    buffer = io.BytesIO()
    image.save(buffer)
    svg = buffer.getvalue().decode("utf-8")
    # Inséré dans la page : la déclaration XML n'a pas lieu d'être.
    return svg[svg.index("<svg") :]


def normalise_code(code: str) -> str:
    return "".join(ch for ch in code if ch.isalnum()).lower()


def verify_totp(secret: str, code: str, last_step: int | None) -> int | None:
    """Pas de temps accepté, ou ``None``. Un pas déjà utilisé est refusé."""
    digits = normalise_code(code)
    if len(digits) != 6 or not digits.isdigit():
        return None
    totp = pyotp.TOTP(secret)
    current = int(time.time()) // totp.interval
    for step in (current - 1, current, current + 1):
        if last_step is not None and step <= last_step:
            continue
        if hmac.compare_digest(totp.generate_otp(step), digits):
            return step
    return None


# ---------------------------------------------------------------------------
# Codes de récupération
# ---------------------------------------------------------------------------

_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"


def new_recovery_codes() -> list[str]:
    codes = []
    for _ in range(RECOVERY_CODE_COUNT):
        raw = "".join(secrets.choice(_ALPHABET) for _ in range(10))
        codes.append(f"{raw[:5]}-{raw[5:]}")
    return codes


def recovery_digest(code: str) -> str:
    return hmac.new(_pepper, normalise_code(code).encode("ascii"), hashlib.sha256).hexdigest()


def consume_recovery_code(stored: list[str], code: str) -> list[str] | None:
    """Liste restante si le code est valide (il en est retiré), sinon ``None``."""
    if len(normalise_code(code)) != 10:
        return None
    digest = recovery_digest(code)
    for index, candidate in enumerate(stored):
        if hmac.compare_digest(candidate, digest):
            return stored[:index] + stored[index + 1 :]
    return None


# ---------------------------------------------------------------------------
# Défis de second facteur
# ---------------------------------------------------------------------------


@dataclass
class Challenge:
    user_id: str
    expires: float
    attempts: int = 0
    meta: dict = field(default_factory=dict)


class ChallengeStore:
    """Étape intermédiaire entre le mot de passe et le code : cinq minutes, cinq essais."""

    TTL = 5 * 60
    MAX_ATTEMPTS = 5

    def __init__(self) -> None:
        self._items: dict[str, Challenge] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _digest(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def create(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        now = time.time()
        with self._lock:
            for key in [k for k, c in self._items.items() if c.expires < now]:
                del self._items[key]
            self._items[self._digest(token)] = Challenge(user_id=user_id, expires=now + self.TTL)
        return token

    def get(self, token: str) -> Challenge | None:
        with self._lock:
            item = self._items.get(self._digest(token))
            if item is None or item.expires < time.time() or item.attempts >= self.MAX_ATTEMPTS:
                return None
            return item

    def fail(self, token: str) -> None:
        with self._lock:
            item = self._items.get(self._digest(token))
            if item is not None:
                item.attempts += 1

    def consume(self, token: str) -> None:
        with self._lock:
            self._items.pop(self._digest(token), None)

    def clear(self) -> None:
        with self._lock:
            self._items.clear()


challenges = ChallengeStore()
