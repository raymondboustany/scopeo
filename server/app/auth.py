"""Authentification locale.

Portée volontairement limitée à un usage sur le poste :

- mots de passe hachés avec bcrypt, jamais conservés en clair ;
- session serveur, référencée par un cookie ``HttpOnly`` et ``SameSite=Strict`` ;
  seule l'empreinte SHA-256 du jeton est conservée en base, de sorte qu'une
  copie de la base ne permet pas de rejouer une session ;
- une session expire après la durée fixée par l'administrateur (12 heures par
  défaut) ou à la déconnexion ; elle survit à un redémarrage du serveur ;
- limitation des tentatives de connexion, pour ralentir un essai exhaustif.

Le second facteur (TOTP) est traité dans ``security``, l'annuaire LDAP dans
``directory``.
"""

from __future__ import annotations

import hashlib
import os
import secrets
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
from sqlmodel import Session as DbSession, delete

from .db import engine
from .models import UserSession

SESSION_COOKIE = "scopeo_session"

# Coût bcrypt : 12 par défaut, abaissable pour les tests uniquement.
_ROUNDS = int(os.environ.get("SCOPEO_BCRYPT_ROUNDS", "12"))

# bcrypt ne tient compte que des 72 premiers octets : au-delà, on refuse
# plutôt que de tronquer silencieusement.
PASSWORD_MIN_LENGTH = 10
PASSWORD_MAX_BYTES = 72

# Empreinte de référence, pour que la vérification d'un profil inexistant
# prenne le même temps que celle d'un profil existant.
_DUMMY_HASH = bcrypt.hashpw(b"scopeo-timing-guard", bcrypt.gensalt(rounds=_ROUNDS))


def password_problem(password: str) -> str | None:
    """Motif de refus d'un mot de passe, ou ``None`` s'il est acceptable."""
    if len(password) < PASSWORD_MIN_LENGTH:
        return "too_short"
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        return "too_long"
    return None


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=_ROUNDS)).decode("ascii")


def verify_password(password: str, hashed: str | None) -> bool:
    """Vérifie par bcrypt, jamais par comparaison directe des chaînes."""
    candidate = password.encode("utf-8")[:PASSWORD_MAX_BYTES]
    if not hashed:
        bcrypt.checkpw(candidate, _DUMMY_HASH)
        return False
    try:
        return bcrypt.checkpw(candidate, hashed.encode("ascii"))
    except ValueError:
        return False


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------


@dataclass
class Session:
    user_id: str
    created_at: datetime


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


class SessionStore:
    """Sessions conservées en base, indexées par l'empreinte du jeton.

    Elles survivent à un redémarrage du serveur et expirent à l'échéance fixée
    lors de leur ouverture (durée réglée par l'administrateur).
    """

    def __init__(self) -> None:
        # Durée de vie d'une nouvelle session, en secondes ; 0 pour aucune limite.
        self.max_age = 12 * 3600

    @staticmethod
    def _digest(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def create(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        expires = now + timedelta(seconds=self.max_age) if self.max_age else None
        with DbSession(engine) as db:
            db.add(UserSession(token_hash=self._digest(token), user_id=user_id, created_at=now, expires_at=expires))
            db.commit()
        return token

    def get(self, token: str | None) -> Session | None:
        if not token:
            return None
        with DbSession(engine) as db:
            row = db.get(UserSession, self._digest(token))
            if row is None:
                return None
            if row.expires_at is not None and _utc(row.expires_at) < datetime.now(timezone.utc):
                db.delete(row)
                db.commit()
                return None
            return Session(user_id=row.user_id, created_at=_utc(row.created_at))

    def revoke(self, token: str | None) -> Session | None:
        if not token:
            return None
        with DbSession(engine) as db:
            row = db.get(UserSession, self._digest(token))
            if row is None:
                return None
            found = Session(user_id=row.user_id, created_at=_utc(row.created_at))
            db.delete(row)
            db.commit()
            return found

    def revoke_user(self, user_id: str, keep: str | None = None) -> None:
        """Ferme toutes les sessions d'un profil, sauf éventuellement la courante."""
        kept = self._digest(keep) if keep else None
        with DbSession(engine) as db:
            query = delete(UserSession).where(UserSession.user_id == user_id)
            if kept:
                query = query.where(UserSession.token_hash != kept)
            db.exec(query)
            db.commit()

    def purge_expired(self) -> None:
        with DbSession(engine) as db:
            db.exec(delete(UserSession).where(UserSession.expires_at < datetime.now(timezone.utc)))
            db.commit()

    def clear(self) -> None:
        with DbSession(engine) as db:
            db.exec(delete(UserSession))
            db.commit()


sessions = SessionStore()


# ---------------------------------------------------------------------------
# Limitation des tentatives
# ---------------------------------------------------------------------------


class LoginThrottle:
    """Au-delà de cinq échecs en quinze minutes, la connexion est suspendue."""

    MAX_FAILURES = 5
    WINDOW = 15 * 60

    def __init__(self) -> None:
        self._failures: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def _recent(self, key: str, now: float) -> list[float]:
        return [t for t in self._failures.get(key, []) if now - t < self.WINDOW]

    def retry_after(self, key: str) -> int:
        now = time.time()
        with self._lock:
            recent = self._recent(key, now)
            self._failures[key] = recent
            if len(recent) < self.MAX_FAILURES:
                return 0
            return int(self.WINDOW - (now - recent[0])) + 1

    def fail(self, key: str) -> None:
        now = time.time()
        with self._lock:
            self._failures[key] = [*self._recent(key, now), now]

    def success(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._failures.clear()


throttle = LoginThrottle()
