"""Contrôle d'accès, réglages globaux et journal, partagés par les routes."""

from __future__ import annotations

import hashlib
import os
from datetime import timezone
from typing import Any

from fastapi import Depends, HTTPException, Request, Response, status
from sqlmodel import Session, col, func, select

from . import directory
from .auth import SESSION_COOKIE, sessions, verify_password
from .db import get_session
from .models import ApiToken, AuditEvent, Entity, EntityFile, EntityRevision, Setting, User, UserSession, now
from .schemas import GlobalSettings, UserRead

COOKIE_SECURE = os.environ.get("SCOPEO_COOKIE_SECURE", "").lower() in {"1", "true", "yes"}

# Routes accessibles tant qu'un mot de passe provisoire n'a pas été remplacé.
_PASSWORD_CHANGE_ALLOWED = {"/api/auth/me", "/api/auth/password", "/api/auth/logout"}

# Un jeton d'API agit sur les entités de son titulaire ; il n'ouvre ni
# l'administration, ni la gestion du compte (mot de passe, second facteur, jetons).
_TOKEN_FORBIDDEN_PREFIXES = ("/api/admin", "/api/auth/")
_TOKEN_ALLOWED = {"/api/auth/me"}
TOKEN_PREFIX = "scp_"

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


def sso_config(session: Session) -> dict[str, Any]:
    from . import sso

    return {**sso.DEFAULTS, **read_setting(session, "sso", {})}


def public_url(session: Session, request: Request) -> str:
    """Adresse publique de la plateforme : réglage, variable d'environnement, ou adresse de la requête."""
    configured = global_settings(session).public_url or os.environ.get("SCOPEO_PUBLIC_URL", "")
    return (configured or str(request.base_url)).rstrip("/")


def apply_session_lifetime(session: Session) -> None:
    sessions.max_age = global_settings(session).session_hours * 3600


# ---------------------------------------------------------------------------
# Comptes
# ---------------------------------------------------------------------------


def real_users(session: Session) -> list[User]:
    """Comptes de personnes : ni invités, ni profil support de la démonstration."""
    return list(session.exec(select(User).where(col(User.is_guest).is_(False), col(User.is_demo).is_(False))).all())


def can_sign_in(user: User) -> bool:
    """Un compte local sans mot de passe (créé par une version de développement) ne peut pas s'ouvrir."""
    return user.auth_source in {"ldap", "oidc"} or bool(user.password_hash)


def has_accounts(session: Session) -> bool:
    """Au moins un compte capable de se connecter : sinon, l'accueil propose de créer l'administrateur."""
    return any(can_sign_in(u) for u in real_users(session))


def admin_count(session: Session) -> int:
    """Administrateurs actifs et capables de se connecter."""
    return sum(1 for u in real_users(session) if u.is_admin and not u.disabled and can_sign_in(u))


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
    for model in (UserSession, ApiToken):
        for row in session.exec(select(model).where(model.user_id == user.id)).all():
            session.delete(row)
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


def bearer_token(request: Request) -> str | None:
    header = request.headers.get("authorization", "")
    scheme, _, value = header.partition(" ")
    return value.strip() if scheme.lower() == "bearer" and value.strip() else None


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _token_user(request: Request, session: Session, token: str) -> User:
    path = request.url.path
    if path.startswith(_TOKEN_FORBIDDEN_PREFIXES) and path not in _TOKEN_ALLOWED:
        raise error(status.HTTP_403_FORBIDDEN, "token_forbidden")
    if not global_settings(session).api_tokens_enabled or not token.startswith(TOKEN_PREFIX):
        raise error(status.HTTP_401_UNAUTHORIZED, "unauthenticated")
    row = session.exec(select(ApiToken).where(ApiToken.token_hash == token_digest(token))).first()
    current = now()
    if row is None or (row.expires_at is not None and row.expires_at.replace(tzinfo=row.expires_at.tzinfo or timezone.utc) < current):
        raise error(status.HTTP_401_UNAUTHORIZED, "unauthenticated")
    user = session.get(User, row.user_id)
    if user is None or user.is_demo or user.is_guest or user.disabled or user.must_change_password:
        raise error(status.HTTP_401_UNAUTHORIZED, "unauthenticated")
    # Dernier usage, à la minute près : sans écriture à chaque requête.
    last = row.last_used_at.replace(tzinfo=row.last_used_at.tzinfo or timezone.utc) if row.last_used_at else None
    if last is None or (current - last).total_seconds() > 60:
        row.last_used_at = current
        session.add(row)
        session.commit()
    return user


def current_user(request: Request, session: Session = Depends(get_session)) -> User:
    bearer = bearer_token(request)
    if bearer:
        return _token_user(request, session, bearer)
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
    """Sans administrateur capable de se connecter, le plus ancien compte actif et utilisable le devient.

    Couvre une base créée avant ce rôle, ou dont le seul administrateur n'a pas
    de mot de passe : l'administration ne doit jamais devenir inaccessible.
    """
    if admin_count(session) > 0:
        return
    usable = sorted((u for u in real_users(session) if not u.disabled and can_sign_in(u)), key=lambda u: u.created_at)
    if usable:
        usable[0].is_admin = True
        session.add(usable[0])
        audit(session, None, "admin_granted_auto", usable[0].name)
        session.commit()
