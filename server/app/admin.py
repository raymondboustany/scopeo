"""Espace d'administration : comptes, annuaire LDAP, réglages globaux, journal.

Chaque route dépend de ``admin_user`` : le rôle est vérifié au serveur, quelle
que soit l'interface. Aucune route ne lit ni ne modifie les entités d'un compte :
un administrateur gère des accès, pas le contenu des cadrages.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from sqlmodel import Session, col, select

from . import backup, directory, sso
from .auth import hash_password, password_problem, sessions
from .db import get_session
from .deps import (
    admin_count,
    admin_user,
    apply_session_lifetime,
    audit,
    can_sign_in,
    delete_user_tree,
    entity_count,
    error,
    global_settings,
    ldap_config,
    public_url,
    read_setting,
    real_users,
    sso_config,
    write_setting,
)
from .models import AuditEvent, User, now
from .schemas import (
    AdminPasswordPayload,
    AdminUserCreate,
    AdminUserRead,
    AdminUserUpdate,
    AuditRead,
    GlobalSettings,
    LdapConfigRead,
    LdapConfigUpdate,
    LdapTestPayload,
    LdapTestRead,
    LdapTestStep,
    SsoConfigRead,
    SsoConfigUpdate,
)
from .security import encrypt

router = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_user)])


def _read(session: Session, user: User) -> AdminUserRead:
    return AdminUserRead(
        id=user.id,
        name=user.name,
        role=user.role,
        organisation=user.organisation,
        email=user.email,
        is_admin=user.is_admin,
        disabled=user.disabled,
        auth_source=user.auth_source,
        ldap_username=user.ldap_username,
        has_password=bool(user.password_hash),
        mfa_enabled=user.mfa_enabled,
        must_change_password=user.must_change_password,
        entity_count=entity_count(session, user),
        last_login_at=user.last_login_at,
        created_at=user.created_at,
    )


def _target(session: Session, user_id: str) -> User:
    user = session.get(User, user_id)
    if user is None or user.is_guest or user.is_demo:
        raise error(status.HTTP_404_NOT_FOUND, "not_found")
    return user


def _name_free(session: Session, name: str, exclude: str | None = None) -> bool:
    wanted = name.strip().casefold()
    return not any(u.name.strip().casefold() == wanted and u.id != exclude for u in real_users(session))


def _check_password(password: str) -> None:
    problem = password_problem(password)
    if problem:
        raise error(status.HTTP_422_UNPROCESSABLE_CONTENT, f"password_{problem}")


# ---------------------------------------------------------------------------
# Comptes
# ---------------------------------------------------------------------------


@router.get("/users", response_model=list[AdminUserRead])
def list_users(session: Session = Depends(get_session)) -> list[AdminUserRead]:
    users = sorted(real_users(session), key=lambda u: u.created_at)
    return [_read(session, u) for u in users]


@router.post("/users", response_model=AdminUserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: AdminUserCreate, admin: User = Depends(admin_user), session: Session = Depends(get_session)) -> AdminUserRead:
    name = payload.name.strip()
    if not name:
        raise error(status.HTTP_422_UNPROCESSABLE_CONTENT, "name_required")
    if not _name_free(session, name):
        raise error(status.HTTP_409_CONFLICT, "name_taken")
    _check_password(payload.password.get_secret_value())
    user = User(
        name=name,
        role=payload.role,
        organisation=payload.organisation,
        email=payload.email,
        is_admin=payload.is_admin,
        password_hash=hash_password(payload.password.get_secret_value()),
        # Mot de passe transmis par l'administrateur : la personne le remplace à sa première connexion.
        must_change_password=True,
    )
    session.add(user)
    audit(session, admin, "user_created", name, "admin" if payload.is_admin else "")
    session.commit()
    session.refresh(user)
    return _read(session, user)


@router.patch("/users/{user_id}", response_model=AdminUserRead)
def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    admin: User = Depends(admin_user),
    session: Session = Depends(get_session),
) -> AdminUserRead:
    user = _target(session, user_id)
    effective_admin = user.is_admin and not user.disabled and can_sign_in(user)
    losing_admin = effective_admin and (payload.is_admin is False or payload.disabled is True)
    if losing_admin and admin_count(session) <= 1:
        raise error(status.HTTP_409_CONFLICT, "last_admin")
    if user.id == admin.id and (payload.disabled or payload.is_admin is False):
        # On ne se retire pas ses propres droits : un autre administrateur s'en charge.
        raise error(status.HTTP_409_CONFLICT, "cannot_change_self")
    if payload.is_admin is not None and payload.is_admin != user.is_admin:
        user.is_admin = payload.is_admin
        audit(session, admin, "admin_granted" if payload.is_admin else "admin_revoked", user.name)
    if payload.disabled is not None and payload.disabled != user.disabled:
        user.disabled = payload.disabled
        audit(session, admin, "user_disabled" if payload.disabled else "user_enabled", user.name)
    user.updated_at = now()
    session.add(user)
    session.commit()
    # Après validation : les sessions sont dans la même base, hors de cette transaction.
    if user.disabled:
        sessions.revoke_user(user.id)
    session.refresh(user)
    return _read(session, user)


@router.post("/users/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    user_id: str,
    payload: AdminPasswordPayload,
    admin: User = Depends(admin_user),
    session: Session = Depends(get_session),
) -> Response:
    user = _target(session, user_id)
    if user.auth_source != "local":
        raise error(status.HTTP_409_CONFLICT, "managed_by_directory")
    _check_password(payload.password.get_secret_value())
    user.password_hash = hash_password(payload.password.get_secret_value())
    user.must_change_password = user.id != admin.id
    user.updated_at = now()
    session.add(user)
    audit(session, admin, "password_reset", user.name)
    session.commit()
    if user.id != admin.id:
        sessions.revoke_user(user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/users/{user_id}/mfa/reset", status_code=status.HTTP_204_NO_CONTENT)
def reset_mfa(user_id: str, admin: User = Depends(admin_user), session: Session = Depends(get_session)) -> Response:
    """Pour un compte bloqué (téléphone perdu, codes de récupération épuisés)."""
    user = _target(session, user_id)
    if not user.mfa_enabled:
        raise error(status.HTTP_409_CONFLICT, "mfa_not_enabled")
    user.mfa_enabled = False
    user.mfa_secret = None
    user.mfa_pending_secret = None
    user.mfa_last_step = None
    user.mfa_recovery = []
    user.updated_at = now()
    session.add(user)
    audit(session, admin, "mfa_reset", user.name)
    session.commit()
    sessions.revoke_user(user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, admin: User = Depends(admin_user), session: Session = Depends(get_session)) -> Response:
    user = _target(session, user_id)
    if user.id == admin.id:
        raise error(status.HTTP_409_CONFLICT, "cannot_change_self")
    if user.is_admin and not user.disabled and can_sign_in(user) and admin_count(session) <= 1:
        raise error(status.HTTP_409_CONFLICT, "last_admin")
    name = user.name
    delete_user_tree(session, user)
    audit(session, admin, "user_deleted", name)
    session.commit()
    sessions.revoke_user(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Réglages globaux
# ---------------------------------------------------------------------------


@router.get("/settings", response_model=GlobalSettings)
def read_settings(session: Session = Depends(get_session)) -> GlobalSettings:
    return global_settings(session)


@router.put("/settings", response_model=GlobalSettings)
def update_settings(payload: GlobalSettings, admin: User = Depends(admin_user), session: Session = Depends(get_session)) -> GlobalSettings:
    payload.public_url = payload.public_url.strip().rstrip("/")
    if payload.public_url and not payload.public_url.startswith(("https://", "http://localhost", "http://127.0.0.1")):
        raise error(status.HTTP_422_UNPROCESSABLE_CONTENT, "public_url_invalid")
    before = global_settings(session)
    write_setting(session, "global", payload.model_dump())
    changed = [k for k, v in payload.model_dump().items() if getattr(before, k) != v]
    if changed:
        audit(session, admin, "settings_updated", "", ", ".join(changed))
    session.commit()
    apply_session_lifetime(session)
    return payload


# ---------------------------------------------------------------------------
# Annuaire LDAP
# ---------------------------------------------------------------------------


def _ldap_read(config: dict) -> LdapConfigRead:
    data = {k: v for k, v in config.items() if k != "bind_password"}
    return LdapConfigRead(**data, has_bind_password=bool(config.get("bind_password")))


def _merge(session: Session, payload: LdapConfigUpdate) -> dict:
    stored = read_setting(session, "ldap", {})
    config = {**directory.DEFAULTS, **payload.model_dump(exclude={"bind_password", "clear_bind_password"})}
    config = {k: v.strip() if isinstance(v, str) else v for k, v in config.items()}
    if payload.clear_bind_password:
        config["bind_password"] = None
    elif payload.bind_password is not None and payload.bind_password.get_secret_value():
        config["bind_password"] = encrypt(payload.bind_password.get_secret_value())
    else:
        config["bind_password"] = stored.get("bind_password")
    return config


@router.get("/ldap", response_model=LdapConfigRead)
def read_ldap(session: Session = Depends(get_session)) -> LdapConfigRead:
    return _ldap_read(ldap_config(session))


@router.put("/ldap", response_model=LdapConfigRead)
def update_ldap(payload: LdapConfigUpdate, admin: User = Depends(admin_user), session: Session = Depends(get_session)) -> LdapConfigRead:
    config = _merge(session, payload)
    problem = directory.config_problem(config)
    if problem:
        raise error(status.HTTP_422_UNPROCESSABLE_CONTENT, problem)
    was_enabled = bool(ldap_config(session).get("enabled"))
    write_setting(session, "ldap", config)
    action = "ldap_enabled" if config["enabled"] and not was_enabled else "ldap_disabled" if was_enabled and not config["enabled"] else "ldap_updated"
    audit(session, admin, action, config.get("url", ""))
    session.commit()
    return _ldap_read(config)


@router.post("/ldap/test", response_model=LdapTestRead)
def test_ldap(payload: LdapTestPayload, session: Session = Depends(get_session)) -> LdapTestRead:
    """Essai de la configuration saisie, avant ou sans enregistrement."""
    report = directory.test(_merge(session, payload.config), payload.username)
    return LdapTestRead(ok=report.ok, steps=[LdapTestStep(id=s.id, ok=s.ok, detail=s.detail) for s in report.steps])


# ---------------------------------------------------------------------------
# Journal
# ---------------------------------------------------------------------------


@router.get("/audit", response_model=list[AuditRead])
def read_audit(limit: int = 200, session: Session = Depends(get_session)) -> list[AuditEvent]:
    limit = max(1, min(limit, 1000))
    return list(session.exec(select(AuditEvent).order_by(col(AuditEvent.at).desc()).limit(limit)).all())


# ---------------------------------------------------------------------------
# Connexion unique (OIDC)
# ---------------------------------------------------------------------------


def _sso_read(session: Session, request: Request, config: dict) -> SsoConfigRead:
    data = {k: v for k, v in config.items() if k != "client_secret"}
    return SsoConfigRead(**data, has_client_secret=bool(config.get("client_secret")), redirect_uri=public_url(session, request) + sso.CALLBACK_PATH)


def _sso_merge(session: Session, payload: SsoConfigUpdate) -> dict:
    stored = read_setting(session, "sso", {})
    config = {**sso.DEFAULTS, **payload.model_dump(exclude={"client_secret", "clear_client_secret"})}
    config = {k: v.strip() if isinstance(v, str) else v for k, v in config.items()}
    config["issuer"] = config["issuer"].rstrip("/")
    if payload.clear_client_secret:
        config["client_secret"] = None
    elif payload.client_secret is not None and payload.client_secret.get_secret_value():
        config["client_secret"] = encrypt(payload.client_secret.get_secret_value())
    else:
        config["client_secret"] = stored.get("client_secret")
    return config


@router.get("/sso", response_model=SsoConfigRead)
def read_sso(request: Request, session: Session = Depends(get_session)) -> SsoConfigRead:
    return _sso_read(session, request, sso_config(session))


@router.put("/sso", response_model=SsoConfigRead)
def update_sso(payload: SsoConfigUpdate, request: Request, admin: User = Depends(admin_user), session: Session = Depends(get_session)) -> SsoConfigRead:
    config = _sso_merge(session, payload)
    problem = sso.config_problem(config)
    if problem:
        raise error(status.HTTP_422_UNPROCESSABLE_CONTENT, problem)
    was_enabled = bool(sso_config(session).get("enabled"))
    write_setting(session, "sso", config)
    action = "sso_enabled" if config["enabled"] and not was_enabled else "sso_disabled" if was_enabled and not config["enabled"] else "sso_updated"
    audit(session, admin, action, config.get("issuer", ""))
    session.commit()
    sso.clear_cache()
    return _sso_read(session, request, config)


@router.post("/sso/test", response_model=LdapTestRead)
def test_sso(payload: SsoConfigUpdate, session: Session = Depends(get_session)) -> LdapTestRead:
    steps = sso.test(_sso_merge(session, payload))
    return LdapTestRead(ok=all(ok for _, ok, _ in steps), steps=[LdapTestStep(id=i, ok=ok, detail=d) for i, ok, d in steps])


# ---------------------------------------------------------------------------
# Sauvegarde
# ---------------------------------------------------------------------------


@router.get("/backup")
def download_backup(admin: User = Depends(admin_user), session: Session = Depends(get_session)) -> Response:
    """Base et clé de chiffrement, dans une archive : à conserver chiffrée, hors du serveur."""
    try:
        data, name = backup.build_archive()
    except RuntimeError:
        raise error(status.HTTP_409_CONFLICT, "backup_unsupported")
    audit(session, admin, "backup_downloaded", "", name)
    session.commit()
    return Response(content=data, media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{name}"'})
