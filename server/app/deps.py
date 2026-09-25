"""Contrôle d'accès, réglages globaux et journal, partagés par les routes."""

from __future__ import annotations

import os
from typing import Any

from fastapi import Depends, HTTPException, Request, Response, status
from sqlmodel import Session, col, func, select

from . import directory
from .auth import SESSION_COOKIE, sessions, verify_password
from .db import get_session
from .models import AuditEvent, Entity, EntityFile, EntityRevision, Setting, User, now
from .schemas import GlobalSettings, UserRead

COOKIE_SECURE = os.environ.get("SCOPEO_COOKIE_SECURE", "").lower() in {"1", "true", "yes"}

# Routes accessibles tant qu'un mot de passe provisoire n'a pas été remplacé.
_PASSWORD_CHANGE_ALLOWED = {"/api/auth/me", "/api/auth/password", "/api/auth/logout"}

AUDIT_KEEP = 1000


def error(code: int, detail: str) -> HTTPException:
    return HTTPException(code, detail)


# ---------------------------------------------------------------------------
# Réglages
# ---------------------------------------------------------------------------


def read_setting(session: Session, key: str, default: Any) -> Any:
    row = session.get(Setting, key)
    return default if row is None or row.value is None else row.value


def write_setting(session: Session, key: str, value: Any) -> None:
    row = session.get(Setting, key) or Setting(key=key)
    row.value = value
    row.updated_at = now()
    session.add(row)


def global_settings(session: Session) -> GlobalSettings:
    return GlobalSettings.model_validate(read_setting(session, "global", {}))


def ldap_config(session: Session) -> dict[str, Any]:
    return {**directory.DEFAULTS, **read_setting(session, "ldap", {})}


def apply_session_lifetime(session: Session) -> None:
    sessions.max_age = global_settings(session).session_hours * 3600


# ---------------------------------------------------------------------------
# Comptes
# ---------------------------------------------------------------------------


def real_users(session: Session) -> list[User]:
    """Comptes de personnes : ni invités, ni profil support de la démonstration."""
    return list(session.exec(select(User).where(col(User.is_guest).is_(False), col(User.is_demo).is_(False))).all())


def has_accounts(session: Session) -> bool:
    return session.exec(
        select(User.id).where(col(User.is_guest).is_(False), col(User.is_demo).is_(False)).limit(1)
    ).first() is not None


def admin_count(session: Session) -> int:
    return session.exec(
        select(func.count()).select_from(User).where(col(User.is_admin).is_(True), col(User.disabled).is_(False))
    ).one()


def entity_count(session: Session, user: User) -> int:
    return session.exec(select(func.count()).select_from(Entity).where(Entity.user_id == user.id)).one()


def user_read(session: Session, user: User) -> UserRead:
    return UserRead.model_validate(user).model_copy(
        update={"entity_count": entity_count(session, user), "recovery_codes_left": len(user.mfa_recovery or [])}
    )


def delete_entity_tree(session: Session, entity: Entity) -> None:
    for row in session.exec(select(EntityRevision).where(EntityRevision.entity_id == entity.id)).all():
        session.delete(row)
    for row in session.exec(select(EntityFile).where(EntityFile.entity_id == entity.id)).all():
        session.delete(row)
    session.delete(entity)


def delete_user_tree(session: Session, user: User) -> None:
    for entity in session.exec(select(Entity).where(Entity.user_id == user.id)).all():
        delete_entity_tree(session, entity)
    session.delete(user)


def verify_identity(session: Session, user: User, password: str) -> bool:
    """Confirme l'identité avant une action sensible, selon l'origine du compte."""
    if user.auth_source == "ldap":
        try:
            directory.authenticate(ldap_config(session), user.ldap_username or "", password)
            return True
        except directory.DirectoryError:
            return False
    return verify_password(password, user.password_hash)


def audit(session: Session, actor: User | None, action: str, target: str = "", detail: str = "") -> None:
    session.add(AuditEvent(actor=actor.name if actor else "", action=action, target=target, detail=detail))
    stale = session.exec(select(AuditEvent).order_by(col(AuditEvent.at).desc()).offset(AUDIT_KEEP)).all()
    for row in stale:
        session.delete(row)


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------


def open_session(response: Response, user: User) -> None:
    token = sessions.create(user.id)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        samesite="strict",
        secure=COOKIE_SECURE,
        path="/",
        max_age=sessions.max_age or None,
    )


def clear_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="strict", httponly=True, secure=COOKIE_SECURE)


def current_user(request: Request, session: Session = Depends(get_session)) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    active = sessions.get(token)
    if active is None:
        raise error(status.HTTP_401_UNAUTHORIZED, "unauthenticated")
    user = session.get(User, active.user_id)
    if user is None or user.is_demo or user.disabled:
        sessions.revoke(token)
        raise error(status.HTTP_401_UNAUTHORIZED, "unauthenticated")
    if user.must_change_password and request.url.path not in _PASSWORD_CHANGE_ALLOWED:
        raise error(status.HTTP_403_FORBIDDEN, "password_change_required")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    """Toute route d'administration passe par ici : le rôle est vérifié au serveur."""
    if not user.is_admin or user.is_guest:
        raise error(status.HTTP_403_FORBIDDEN, "admin_required")
    return user


def ensure_admin(session: Session) -> None:
    """Une base sans administrateur (créée avant ce rôle) promeut son plus ancien compte actif."""
    users = sorted((u for u in real_users(session) if not u.disabled), key=lambda u: u.created_at)
    if users and not any(u.is_admin for u in users):
        users[0].is_admin = True
        session.add(users[0])
        session.commit()
