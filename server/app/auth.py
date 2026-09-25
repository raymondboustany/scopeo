"""Authentification locale.

Portée volontairement limitée à un usage sur le poste :

- mots de passe hachés avec bcrypt, jamais conservés en clair ;
- session serveur, référencée par un cookie ``HttpOnly`` et ``SameSite=Strict`` ;
  seule l'empreinte SHA-256 du jeton est gardée en mémoire, de sorte qu'une
  copie de la mémoire ne permet pas de rejouer une session ;
- une session expire après la durée fixée par l'administrateur (12 heures par
  défaut), à la déconnexion, ou à l'arrêt du serveur ;
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

import bcrypt

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
    created_at: float


class SessionStore:
    """Sessions en mémoire, indexées par l'empreinte du jeton."""

    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}
        self._lock = threading.Lock()
        # Durée de vie d'une session, en secondes ; 0 pour aucune limite.
        self.max_age = 12 * 3600

    @staticmethod
    def _digest(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def create(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        with self._lock:
            self._sessions[self._digest(token)] = Session(user_id=user_id, created_at=time.time())
        return token

    def get(self, token: str | None) -> Session | None:
        if not token:
            return None
        key = self._digest(token)
        with self._lock:
            session = self._sessions.get(key)
            if session is not None and self.max_age and time.time() - session.created_at > self.max_age:
                del self._sessions[key]
                return None
            return session

    def revoke(self, token: str | None) -> Session | None:
        if not token:
            return None
        with self._lock:
            return self._sessions.pop(self._digest(token), None)

    def revoke_user(self, user_id: str, keep: str | None = None) -> None:
        """Ferme toutes les sessions d'un profil, sauf éventuellement la courante."""
        kept = self._digest(keep) if keep else None
        with self._lock:
            for key in [k for k, s in self._sessions.items() if s.user_id == user_id and k != kept]:
                del self._sessions[key]

    def clear(self) -> None:
        with self._lock:
            self._sessions.clear()


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
