"""API locale de Scopeo.

Le serveur ne porte aucune logique réglementaire : qualification, périmètre et
priorisation sont calculés par le client à partir des réponses stockées ici.
Il garantit l'authentification, la persistance, l'isolement des entités entre
profils et le partage public en lecture seule.

Les messages d'erreur sont des codes stables (``invalid_credentials``,
``not_found``…) : l'interface les traduit dans la langue de l'utilisateur.
"""

from __future__ import annotations

import json
import secrets
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, col, func, select

from . import directory, sso
from .admin import router as admin_router
from .auth import SESSION_COOKIE, hash_password, password_problem, sessions, throttle, verify_password
from .db import engine, get_session, init_db
from .deps import (
    COOKIE_SECURE,
    TOKEN_PREFIX,
    admin_count,
    apply_session_lifetime,
    audit,
    clear_cookie,
    current_user,
    delete_entity_tree,
    delete_user_tree,
    ensure_admin,
    global_settings,
    has_accounts,
    ldap_config,
    open_session,
    public_url,
    real_users,
    sso_config,
    token_digest,
    user_read,
    verify_identity,
)
from .models import ApiToken, Entity, EntityFile, EntityRevision, User, UserSession, new_token, now
from .schemas import (
    ApiTokenCreate,
    ApiTokenCreated,
    ApiTokenRead,
    AuthStatus,
    DeleteProfilePayload,
    EntityCreate,
    EntityRead,
    EntitySummary,
    EntityUpdate,
    FileRead,
    LdapLoginPayload,
    LoginPayload,
    MfaChallengeRead,
    MfaCodePayload,
    MfaDisablePayload,
    MfaSetupPayload,
    MfaSetupRead,
    MfaVerifyPayload,
    PasswordChangePayload,
    PublicView,
    RecoveryCodesRead,
    RegisterPayload,
    RevisionRead,
    ShareUpdate,
    UserRead,
    UserUpdate,
)
from .security import (
    challenges,
    consume_recovery_code,
    decrypt,
    encrypt,
    new_recovery_codes,
    new_totp_secret,
    provisioning_uri,
    qr_svg,
    recovery_digest,
    verify_totp,
)

DEMO_ENTITY_ID = "demo-finexa"
DEMO_USER_ID = "demo-user"
DEMO_SEED = Path(__file__).resolve().parent / "demo_seed.json"
DIST = Path(__file__).resolve().parents[2] / "dist"

# Une révision fige l'état des réponses au début d'une session d'édition :
# au-delà de ce délai sans modification, la suivante ouvre une nouvelle session.
REVISION_WINDOW = timedelta(minutes=10)
MAX_REVISIONS = 40

# Déclaration d'applicabilité : formats de tableur et de document courants.
SOA_MAX_BYTES = 5 * 1024 * 1024
SOA_TYPES = {
    "text/csv",
    "text/plain",
    "text/tab-separated-values",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/octet-stream",
}

# En-tête exigé sur toute requête d'écriture : un formulaire tiers ne peut pas
# le poser sans déclencher une vérification CORS, que le serveur refuse.
CSRF_HEADER = "x-scopeo"


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _error(code: int, detail: str) -> HTTPException:
    return HTTPException(code, detail)


# ---------------------------------------------------------------------------
# Démonstration
# ---------------------------------------------------------------------------


def seed_demo() -> None:
    """Réécrit l'entité de démonstration à chaque démarrage.

    Elle reste ainsi canonique : une démonstration ne doit pas dériver au fil
    des essais. Les utilisateurs qui veulent la manipuler en reçoivent une copie.
    """
    if not DEMO_SEED.exists():
        return
    seed = json.loads(DEMO_SEED.read_text(encoding="utf-8"))

    with Session(engine) as session:
        user = session.get(User, DEMO_USER_ID)
        if user is None:
            user = User(id=DEMO_USER_ID, name="Démonstration", role="consultant", is_demo=True, onboarded=True)
            session.add(user)
            session.flush()

        entity = session.get(Entity, DEMO_ENTITY_ID)
        data = seed["entity"]
        if entity is None:
            entity = Entity(id=DEMO_ENTITY_ID, user_id=DEMO_USER_ID, name=data["name"], share_token="demo")
            session.add(entity)
        entity.name = data["name"]
        entity.scope_note = data.get("scope_note", "")
        entity.answers = data.get("answers", {})
        entity.coverage = data.get("coverage", {})
        entity.measures = data.get("measures", {})
        entity.weights = data.get("weights", {})
        entity.contacts = data.get("contacts", [])
        entity.profile = data.get("profile", {})
        entity.notes = data.get("notes", [])
        entity.iso_controls = data.get("iso_controls", {})
        entity.public_snapshot = data.get("public_snapshot")
        entity.is_demo = True
        entity.share_enabled = True
        entity.updated_at = now()

        session.commit()


def purge_stale_guests() -> None:
    """Un invité sans session ouverte n'est plus joignable : ses données sont effacées.

    La déconnexion le fait déjà ; ceci rattrape les sessions invitées expirées
    ou abandonnées (navigateur fermé sans se déconnecter).
    """
    sessions.purge_expired()
    with Session(engine) as session:
        for user in session.exec(select(User).where(col(User.is_guest).is_(True))).all():
            if session.exec(select(UserSession.token_hash).where(UserSession.user_id == user.id)).first() is None:
                delete_user_tree(session, user)
        session.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    seed_demo()
    purge_stale_guests()
    with Session(engine) as session:
        ensure_admin(session)
        apply_session_lifetime(session)
    yield


app = FastAPI(
    title="Scopeo",
    version="1.0.0",
    description="API de la plateforme Scopeo. Authentification par cookie de session (interface) ou par jeton personnel `Authorization: Bearer scp_…` (intégrations).",
    lifespan=lifespan,
    # Description OpenAPI publiée pour les intégrations ; pas d'interface Swagger,
    # qui chargerait des ressources externes interdites par la politique de sécurité.
    docs_url=None,
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-Scopeo", "Accept-Language"],
)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Un jeton porté par l'en-tête Authorization ne peut pas être posé par un site
    # tiers : l'en-tête anti-CSRF n'est exigé que des requêtes authentifiées par cookie.
    bearer = request.headers.get("authorization", "").lower().startswith("bearer ")
    if request.url.path.startswith("/api/") and request.method in {"POST", "PUT", "PATCH", "DELETE"} and not bearer:
        if request.headers.get(CSRF_HEADER) != "1":
            return JSONResponse({"detail": "csrf"}, status_code=status.HTTP_403_FORBIDDEN)
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    if COOKIE_SECURE:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    if not request.url.path.startswith("/api/"):
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self' blob:; "
            "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        )
    else:
        response.headers.setdefault("Cache-Control", "no-store")
    return response


# ---------------------------------------------------------------------------
# Session et contrôle d'accès
# ---------------------------------------------------------------------------


def _self_or_403(user: User, user_id: str) -> None:
    # Un identifiant qui n'est pas le sien répond comme un identifiant inconnu.
    if user.id != user_id:
        raise _error(status.HTTP_404_NOT_FOUND, "not_found")


def _readable_entity(session: Session, entity_id: str, user: User) -> Entity:
    entity = session.get(Entity, entity_id)
    if entity is None or not (entity.is_demo or entity.user_id == user.id):
        raise _error(status.HTTP_404_NOT_FOUND, "not_found")
    return entity


def _writable_entity(session: Session, entity_id: str, user: User) -> Entity:
    entity = _readable_entity(session, entity_id, user)
    if entity.is_demo:
        raise _error(status.HTTP_403_FORBIDDEN, "demo_read_only")
    return entity


def _find_by_name(session: Session, name: str, local_only: bool = False) -> list[User]:
    wanted = name.strip().casefold()
    found = [u for u in real_users(session) if u.name.strip().casefold() == wanted]
    # Un compte d'annuaire ne s'ouvre jamais par un mot de passe local.
    return [u for u in found if u.auth_source == "local"] if local_only else found


def _reset_mfa(user: User) -> None:
    user.mfa_enabled = False
    user.mfa_secret = None
    user.mfa_pending_secret = None
    user.mfa_last_step = None
    user.mfa_recovery = []


def _check_new_password(password: str, confirm: str) -> None:
    if password != confirm:
        raise _error(status.HTTP_422_UNPROCESSABLE_CONTENT, "password_mismatch")
    problem = password_problem(password)
    if problem:
        raise _error(status.HTTP_422_UNPROCESSABLE_CONTENT, f"password_{problem}")


def _throttle_key(request: Request, name: str) -> str:
    host = request.client.host if request.client else "local"
    return f"{host}|{name.strip().casefold()}"


# ---------------------------------------------------------------------------
# Utilitaires
# ---------------------------------------------------------------------------


def _summary(entity: Entity) -> EntitySummary:
    answers = entity.answers or {}
    return EntitySummary(
        id=entity.id,
        name=entity.name,
        scope_note=entity.scope_note,
        sector=answers.get("secteur"),
        answered=len([v for v in answers.values() if v not in (None, "", [])]),
        mode=(entity.profile or {}).get("mode"),
        share_enabled=entity.share_enabled,
        is_demo=entity.is_demo,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


# ---------------------------------------------------------------------------
# Santé
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Authentification
# ---------------------------------------------------------------------------

# La création du premier compte, qui devient administrateur, est sérialisée.
_register_lock = threading.Lock()


@app.get("/api/auth/status", response_model=AuthStatus)
def auth_status(session: Session = Depends(get_session)) -> AuthStatus:
    settings = global_settings(session)
    ldap = ldap_config(session)
    sso_conf = sso_config(session)
    first_run = not has_accounts(session)
    return AuthStatus(
        has_accounts=not first_run,
        registration_open=first_run or settings.registration_open,
        guest_enabled=not first_run and settings.guest_enabled,
        ldap_enabled=not first_run and bool(ldap.get("enabled")),
        ldap_label=ldap.get("label") or "",
        sso_enabled=not first_run and bool(sso_conf.get("enabled")),
        sso_label=sso_conf.get("label") or "",
        api_tokens_enabled=settings.api_tokens_enabled,
    )


@app.post("/api/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterPayload, response: Response, session: Session = Depends(get_session)) -> UserRead:
    name = payload.name.strip()
    if not name:
        raise _error(status.HTTP_422_UNPROCESSABLE_CONTENT, "name_required")
    _check_new_password(payload.password.get_secret_value(), payload.password_confirm.get_secret_value())
    with _register_lock:
        first = not has_accounts(session)
        if not first and not global_settings(session).registration_open:
            raise _error(status.HTTP_403_FORBIDDEN, "registration_closed")
        if _find_by_name(session, name):
            raise _error(status.HTTP_409_CONFLICT, "name_taken")
        user = User(
            name=name,
            role=payload.role,
            organisation=payload.organisation,
            email=payload.email,
            password_hash=hash_password(payload.password.get_secret_value()),
            is_admin=first,
            last_login_at=now(),
        )
        session.add(user)
        audit(session, user, "account_created_admin" if first else "account_created", user.name)
        session.commit()
    session.refresh(user)
    open_session(response, user)
    return user_read(session, user)


def _complete_login(session: Session, response: Response, user: User) -> UserRead | MfaChallengeRead:
    """Mot de passe vérifié : second facteur si activé, sinon ouverture de session."""
    if user.mfa_enabled:
        return MfaChallengeRead(challenge=challenges.create(user.id))
    user.last_login_at = now()
    session.add(user)
    session.commit()
    session.refresh(user)
    open_session(response, user)
    return user_read(session, user)


def _throttled(key: str) -> None:
    wait = throttle.retry_after(key)
    if wait:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_attempts", headers={"Retry-After": str(wait)})


@app.post("/api/auth/login", response_model=UserRead | MfaChallengeRead)
def login(payload: LoginPayload, request: Request, response: Response, session: Session = Depends(get_session)):
    key = _throttle_key(request, payload.name)
    _throttled(key)

    candidates = _find_by_name(session, payload.name, local_only=True)
    password = payload.password.get_secret_value()
    user = next((u for u in candidates if u.password_hash and verify_password(password, u.password_hash)), None)
    if user is None:
        if not any(u.password_hash for u in candidates):
            verify_password(password, None)
        throttle.fail(key)
        raise _error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")
    if user.disabled:
        raise _error(status.HTTP_403_FORBIDDEN, "account_disabled")

    throttle.success(key)
    return _complete_login(session, response, user)


def _ldap_account(session: Session, found: directory.DirectoryUser) -> User:
    """Compte local rattaché à l'utilisateur de l'annuaire, créé à la première connexion."""
    user = session.exec(select(User).where(User.auth_source == "ldap", User.ldap_dn == found.dn)).first()
    if user is not None:
        user.ldap_username = found.username
        if found.email and not user.email:
            user.email = found.email
        return user
    name = found.name.strip() or found.username
    if _find_by_name(session, name):
        name = f"{name} ({found.username})"
    user = User(name=name, email=found.email, auth_source="ldap", ldap_dn=found.dn, ldap_username=found.username)
    session.add(user)
    audit(session, None, "account_created_ldap", name, found.dn)
    session.flush()
    return user


@app.post("/api/auth/ldap", response_model=UserRead | MfaChallengeRead)
def ldap_login(payload: LdapLoginPayload, request: Request, response: Response, session: Session = Depends(get_session)):
    key = _throttle_key(request, f"ldap|{payload.username}")
    _throttled(key)
    try:
        found = directory.authenticate(ldap_config(session), payload.username, payload.password.get_secret_value())
    except directory.DirectoryError as exc:
        if exc.code in {"invalid_credentials", "ldap_not_in_group"}:
            throttle.fail(key)
        if exc.code == "ldap_disabled":
            raise _error(status.HTTP_404_NOT_FOUND, "ldap_disabled")
        if exc.code in {"ldap_unreachable", "ldap_tls_failed", "ldap_service_bind_failed"}:
            raise _error(status.HTTP_502_BAD_GATEWAY, "ldap_unavailable")
        raise _error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")
    user = _ldap_account(session, found)
    if user.disabled:
        session.commit()
        raise _error(status.HTTP_403_FORBIDDEN, "account_disabled")
    throttle.success(key)
    return _complete_login(session, response, user)


@app.post("/api/auth/mfa/verify", response_model=UserRead)
def mfa_verify(payload: MfaVerifyPayload, response: Response, session: Session = Depends(get_session)) -> UserRead:
    pending = challenges.get(payload.challenge)
    if pending is None:
        raise _error(status.HTTP_401_UNAUTHORIZED, "mfa_challenge_expired")
    user = session.get(User, pending.user_id)
    if user is None or user.disabled or not user.mfa_enabled:
        challenges.consume(payload.challenge)
        raise _error(status.HTTP_401_UNAUTHORIZED, "mfa_challenge_expired")
    key = f"mfa|{user.id}"
    _throttled(key)
    secret = decrypt(user.mfa_secret)
    step = verify_totp(secret, payload.code, user.mfa_last_step) if secret else None
    if step is not None:
        user.mfa_last_step = step
    else:
        remaining = consume_recovery_code(list(user.mfa_recovery or []), payload.code)
        if remaining is None:
            challenges.fail(payload.challenge)
            throttle.fail(key)
            raise _error(status.HTTP_401_UNAUTHORIZED, "mfa_invalid_code")
        user.mfa_recovery = remaining
        audit(session, user, "mfa_recovery_code_used", user.name, f"{len(remaining)}")
    challenges.consume(payload.challenge)
    throttle.success(key)
    user.last_login_at = now()
    session.add(user)
    session.commit()
    session.refresh(user)
    open_session(response, user)
    return user_read(session, user)


@app.post("/api/auth/guest", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def guest(response: Response, session: Session = Depends(get_session)) -> UserRead:
    """Session d'essai sans mot de passe : ses données sont effacées à la déconnexion."""
    if not has_accounts(session):
        raise _error(status.HTTP_403_FORBIDDEN, "setup_required")
    if not global_settings(session).guest_enabled:
        raise _error(status.HTTP_403_FORBIDDEN, "guest_disabled")
    user = User(name="Invité", role="autre", is_guest=True)
    session.add(user)
    session.commit()
    session.refresh(user)
    open_session(response, user)
    return user_read(session, user)


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, session: Session = Depends(get_session)) -> Response:
    closed = sessions.revoke(request.cookies.get(SESSION_COOKIE))
    if closed is not None:
        user = session.get(User, closed.user_id)
        if user is not None and user.is_guest:
            delete_user_tree(session, user)
            session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_cookie(response)
    return response


@app.get("/api/auth/me", response_model=UserRead)
def me(user: User = Depends(current_user), session: Session = Depends(get_session)) -> UserRead:
    return user_read(session, user)


@app.post("/api/auth/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChangePayload,
    request: Request,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> Response:
    if user.is_guest:
        raise _error(status.HTTP_403_FORBIDDEN, "guest_forbidden")
    if user.auth_source != "local":
        raise _error(status.HTTP_403_FORBIDDEN, "managed_by_directory")
    if not verify_password(payload.current.get_secret_value(), user.password_hash):
        raise _error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")
    _check_new_password(payload.password.get_secret_value(), payload.password_confirm.get_secret_value())
    if payload.password.get_secret_value() == payload.current.get_secret_value():
        raise _error(status.HTTP_422_UNPROCESSABLE_CONTENT, "password_unchanged")
    user.password_hash = hash_password(payload.password.get_secret_value())
    user.must_change_password = False
    user.updated_at = now()
    session.add(user)
    audit(session, user, "password_changed", user.name)
    session.commit()
    # Les autres sessions de ce profil sont fermées ; la courante reste ouverte.
    sessions.revoke_user(user.id, keep=request.cookies.get(SESSION_COOKIE))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Connexion unique (OIDC)
# ---------------------------------------------------------------------------


def _sso_redirect(target: str) -> RedirectResponse:
    response = RedirectResponse(target, status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie(sso.STATE_COOKIE, path="/api/auth/sso", samesite="lax", httponly=True, secure=COOKIE_SECURE)
    return response


@app.get("/api/auth/sso/start")
def sso_start(request: Request, session: Session = Depends(get_session)) -> Response:
    config = sso_config(session)
    if not config.get("enabled") or not has_accounts(session):
        return _sso_redirect("/#/?sso_error=sso_disabled")
    try:
        url, state = sso.start(config, public_url(session, request) + sso.CALLBACK_PATH)
    except sso.SsoError as exc:
        return _sso_redirect(f"/#/?sso_error={exc.code}")
    response = RedirectResponse(url, status_code=status.HTTP_303_SEE_OTHER)
    # « Lax » : le cookie doit revenir lors du retour, qui est une navigation depuis le fournisseur.
    response.set_cookie(sso.STATE_COOKIE, state, max_age=sso.STATE_TTL, httponly=True, samesite="lax", secure=COOKIE_SECURE, path="/api/auth/sso")
    return response


def _sso_account(session: Session, identity: sso.SsoIdentity) -> User:
    """Compte rattaché à l'identité du fournisseur, créé à la première connexion.

    Jamais rapproché d'un compte existant par le seul courriel : ce serait
    offrir un compte à quiconque contrôle une adresse identique chez le fournisseur.
    """
    user = session.exec(select(User).where(User.auth_source == "oidc", User.oidc_issuer == identity.issuer, User.oidc_sub == identity.subject)).first()
    if user is not None:
        if identity.email and not user.email:
            user.email = identity.email
        return user
    name = identity.name or identity.email or "SSO"
    if _find_by_name(session, name):
        name = f"{name} ({identity.email or identity.subject[:8]})"
    user = User(name=name, email=identity.email, auth_source="oidc", oidc_issuer=identity.issuer, oidc_sub=identity.subject)
    session.add(user)
    audit(session, None, "account_created_sso", name, identity.email)
    session.flush()
    return user


@app.get("/api/auth/sso/callback")
def sso_callback(request: Request, session: Session = Depends(get_session), state: str = "", code: str = "", error: str = "") -> Response:
    if error:
        return _sso_redirect("/#/?sso_error=sso_cancelled")
    cookie_state = request.cookies.get(sso.STATE_COOKIE, "")
    if not state or not code or not secrets.compare_digest(cookie_state, state):
        return _sso_redirect("/#/?sso_error=sso_state_invalid")
    config = sso_config(session)
    if not config.get("enabled"):
        return _sso_redirect("/#/?sso_error=sso_disabled")
    try:
        identity = sso.finish(config, state, code)
    except sso.SsoError as exc:
        return _sso_redirect(f"/#/?sso_error={exc.code}")
    user = _sso_account(session, identity)
    if user.disabled:
        session.commit()
        return _sso_redirect("/#/?sso_error=account_disabled")
    user.last_login_at = now()
    session.add(user)
    session.commit()
    response = _sso_redirect("/#/?sso=ok")
    open_session(response, user)
    return response


# ---------------------------------------------------------------------------
# Jetons d'accès personnels (intégrations)
# ---------------------------------------------------------------------------


def _tokens_allowed(session: Session, user: User) -> None:
    if user.is_guest:
        raise _error(status.HTTP_403_FORBIDDEN, "guest_forbidden")
    if not global_settings(session).api_tokens_enabled:
        raise _error(status.HTTP_403_FORBIDDEN, "api_tokens_disabled")


@app.get("/api/auth/tokens", response_model=list[ApiTokenRead])
def list_tokens(user: User = Depends(current_user), session: Session = Depends(get_session)) -> list[ApiToken]:
    return list(session.exec(select(ApiToken).where(ApiToken.user_id == user.id).order_by(col(ApiToken.created_at).desc())).all())


@app.post("/api/auth/tokens", response_model=ApiTokenCreated, status_code=status.HTTP_201_CREATED)
def create_token(payload: ApiTokenCreate, user: User = Depends(current_user), session: Session = Depends(get_session)) -> ApiTokenCreated:
    _tokens_allowed(session, user)
    count = session.exec(select(func.count()).select_from(ApiToken).where(ApiToken.user_id == user.id)).one()
    if count >= 20:
        raise _error(status.HTTP_409_CONFLICT, "too_many_tokens")
    secret = TOKEN_PREFIX + secrets.token_urlsafe(32)
    row = ApiToken(
        user_id=user.id,
        name=payload.name.strip() or "API",
        token_hash=token_digest(secret),
        prefix=secret[:10],
        expires_at=now() + timedelta(days=payload.expires_days) if payload.expires_days else None,
    )
    session.add(row)
    audit(session, user, "api_token_created", user.name, row.name)
    session.commit()
    session.refresh(row)
    return ApiTokenCreated(**ApiTokenRead.model_validate(row).model_dump(), token=secret)


@app.delete("/api/auth/tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_token(token_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Response:
    row = session.get(ApiToken, token_id)
    if row is None or row.user_id != user.id:
        raise _error(status.HTTP_404_NOT_FOUND, "not_found")
    session.delete(row)
    audit(session, user, "api_token_revoked", user.name, row.name)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Second facteur
# ---------------------------------------------------------------------------


def _no_guest(user: User) -> None:
    if user.is_guest:
        raise _error(status.HTTP_403_FORBIDDEN, "guest_forbidden")
    # Connexion unique : le second facteur relève du fournisseur d'identité.
    if user.auth_source == "oidc":
        raise _error(status.HTTP_403_FORBIDDEN, "mfa_managed_by_provider")


def _check_identity(session: Session, user: User, password: str) -> None:
    if not verify_identity(session, user, password):
        raise _error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")


def _check_current_code(user: User, code: str) -> None:
    secret = decrypt(user.mfa_secret)
    step = verify_totp(secret, code, user.mfa_last_step) if secret else None
    if step is None:
        raise _error(status.HTTP_401_UNAUTHORIZED, "mfa_invalid_code")
    user.mfa_last_step = step


@app.post("/api/auth/mfa/setup", response_model=MfaSetupRead)
def mfa_setup(payload: MfaSetupPayload, user: User = Depends(current_user), session: Session = Depends(get_session)) -> MfaSetupRead:
    """Prépare une graine ; le second facteur n'est actif qu'après confirmation d'un premier code."""
    _no_guest(user)
    if user.mfa_enabled:
        raise _error(status.HTTP_409_CONFLICT, "mfa_already_enabled")
    _check_identity(session, user, payload.password.get_secret_value())
    secret = new_totp_secret()
    user.mfa_pending_secret = encrypt(secret)
    session.add(user)
    session.commit()
    uri = provisioning_uri(secret, user.name)
    return MfaSetupRead(secret=secret, uri=uri, qr_svg=qr_svg(uri))


@app.post("/api/auth/mfa/enable", response_model=RecoveryCodesRead)
def mfa_enable(payload: MfaCodePayload, user: User = Depends(current_user), session: Session = Depends(get_session)) -> RecoveryCodesRead:
    _no_guest(user)
    secret = decrypt(user.mfa_pending_secret)
    if secret is None:
        raise _error(status.HTTP_409_CONFLICT, "mfa_setup_required")
    step = verify_totp(secret, payload.code, None)
    if step is None:
        raise _error(status.HTTP_401_UNAUTHORIZED, "mfa_invalid_code")
    codes = new_recovery_codes()
    user.mfa_secret = user.mfa_pending_secret
    user.mfa_pending_secret = None
    user.mfa_enabled = True
    user.mfa_last_step = step
    user.mfa_recovery = [recovery_digest(c) for c in codes]
    session.add(user)
    audit(session, user, "mfa_enabled", user.name)
    session.commit()
    return RecoveryCodesRead(codes=codes)


@app.post("/api/auth/mfa/recovery-codes", response_model=RecoveryCodesRead)
def mfa_new_codes(payload: MfaCodePayload, user: User = Depends(current_user), session: Session = Depends(get_session)) -> RecoveryCodesRead:
    _no_guest(user)
    if not user.mfa_enabled:
        raise _error(status.HTTP_409_CONFLICT, "mfa_not_enabled")
    _check_current_code(user, payload.code)
    codes = new_recovery_codes()
    user.mfa_recovery = [recovery_digest(c) for c in codes]
    session.add(user)
    audit(session, user, "mfa_codes_renewed", user.name)
    session.commit()
    return RecoveryCodesRead(codes=codes)


@app.post("/api/auth/mfa/disable", status_code=status.HTTP_204_NO_CONTENT)
def mfa_disable(payload: MfaDisablePayload, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Response:
    _no_guest(user)
    if not user.mfa_enabled:
        raise _error(status.HTTP_409_CONFLICT, "mfa_not_enabled")
    _check_identity(session, user, payload.password.get_secret_value())
    _check_current_code(user, payload.code)
    _reset_mfa(user)
    session.add(user)
    audit(session, user, "mfa_disabled", user.name)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Profil
# ---------------------------------------------------------------------------


@app.get("/api/users/{user_id}", response_model=UserRead)
def read_user(user_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)) -> UserRead:
    _self_or_403(user, user_id)
    return user_read(session, user)


@app.patch("/api/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    payload: UserUpdate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> UserRead:
    _self_or_403(user, user_id)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and not user.is_guest:
        others = [u for u in _find_by_name(session, data["name"]) if u.id != user.id]
        if others:
            raise _error(status.HTTP_409_CONFLICT, "name_taken")
        data["name"] = data["name"].strip()
    for key, value in data.items():
        setattr(user, key, value)
    user.updated_at = now()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user_read(session, user)


@app.delete("/api/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    payload: DeleteProfilePayload,
    request: Request,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> Response:
    _self_or_403(user, user_id)
    if not user.is_guest:
        if user.auth_source == "oidc":
            # Pas de mot de passe connu de Scopeo : confirmation par le nom du profil.
            if (payload.confirm or "").strip() != user.name.strip():
                raise _error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")
        else:
            supplied = payload.password.get_secret_value() if payload.password else ""
            _check_identity(session, user, supplied)
        # Le dernier administrateur ne part pas en laissant d'autres comptes sans gestion.
        if user.is_admin and admin_count(session) <= 1 and len(real_users(session)) > 1:
            raise _error(status.HTTP_409_CONFLICT, "last_admin")
        audit(session, None, "account_deleted_self", user.name)
    delete_user_tree(session, user)
    session.commit()
    sessions.revoke_user(user.id)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_cookie(response)
    return response


# ---------------------------------------------------------------------------
# Entités
# ---------------------------------------------------------------------------


@app.get("/api/users/{user_id}/entities", response_model=list[EntitySummary])
def list_entities(user_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)) -> list[EntitySummary]:
    _self_or_403(user, user_id)
    rows = session.exec(select(Entity).where(Entity.user_id == user.id).order_by(col(Entity.updated_at).desc())).all()
    return [_summary(e) for e in rows]


@app.post("/api/users/{user_id}/entities", response_model=EntityRead, status_code=status.HTTP_201_CREATED)
def create_entity(
    user_id: str,
    payload: EntityCreate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> Entity:
    _self_or_403(user, user_id)
    entity = Entity(user_id=user.id, **payload.model_dump())
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return entity


@app.post("/api/users/{user_id}/entities/from-demo", response_model=EntityRead, status_code=status.HTTP_201_CREATED)
def copy_demo(user_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Entity:
    """Copie l'entité de démonstration dans le profil, pour la manipuler librement."""
    _self_or_403(user, user_id)
    demo = session.get(Entity, DEMO_ENTITY_ID)
    if demo is None:
        raise _error(status.HTTP_404_NOT_FOUND, "not_found")
    copy = Entity(
        user_id=user.id,
        name=f"{demo.name} (exemple)",
        scope_note=demo.scope_note,
        answers=dict(demo.answers),
        coverage=dict(demo.coverage),
        measures=dict(demo.measures),
        weights=dict(demo.weights),
        contacts=list(demo.contacts),
        profile=dict(demo.profile),
        notes=list(demo.notes),
        iso_controls=dict(demo.iso_controls or {}),
        public_snapshot=demo.public_snapshot,
    )
    session.add(copy)
    session.commit()
    session.refresh(copy)
    return copy


@app.get("/api/entities/{entity_id}", response_model=EntityRead)
def read_entity(entity_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Entity:
    return _readable_entity(session, entity_id, user)


@app.patch("/api/entities/{entity_id}", response_model=EntityRead)
def update_entity(
    entity_id: str,
    payload: EntityUpdate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> Entity:
    entity = _writable_entity(session, entity_id, user)
    data = payload.model_dump(exclude_unset=True)

    if "answers" in data and data["answers"] != entity.answers:
        _record_revision(session, entity)

    for key, value in data.items():
        setattr(entity, key, value)
    entity.updated_at = now()
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return entity


def _record_revision(session: Session, entity: Entity) -> None:
    latest = session.exec(
        select(EntityRevision).where(EntityRevision.entity_id == entity.id).order_by(col(EntityRevision.created_at).desc())
    ).first()
    # Une série de modifications rapprochées ne produit qu'une révision : celle
    # de l'état initial, qui est le bon point de comparaison.
    last_edit = _utc(entity.updated_at)
    if latest is not None and now() - last_edit < REVISION_WINDOW:
        return
    if not entity.answers:
        return
    session.add(EntityRevision(entity_id=entity.id, answers=dict(entity.answers)))

    stale = session.exec(
        select(EntityRevision)
        .where(EntityRevision.entity_id == entity.id)
        .order_by(col(EntityRevision.created_at).desc())
        .offset(MAX_REVISIONS)
    ).all()
    for row in stale:
        session.delete(row)


@app.delete("/api/entities/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entity(entity_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Response:
    entity = _writable_entity(session, entity_id, user)
    delete_entity_tree(session, entity)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/entities/{entity_id}/revisions", response_model=list[RevisionRead])
def list_revisions(entity_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)) -> list[EntityRevision]:
    _readable_entity(session, entity_id, user)
    return list(
        session.exec(
            select(EntityRevision).where(EntityRevision.entity_id == entity_id).order_by(col(EntityRevision.created_at).desc())
        ).all()
    )


@app.put("/api/entities/{entity_id}/share", response_model=EntityRead)
def update_share(
    entity_id: str,
    payload: ShareUpdate,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> Entity:
    entity = _writable_entity(session, entity_id, user)
    entity.share_enabled = payload.enabled
    if payload.rotate:
        # Renouveler le jeton révoque immédiatement tout lien déjà diffusé.
        entity.share_token = new_token()
    entity.updated_at = now()
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return entity


# ---------------------------------------------------------------------------
# Déclaration d'applicabilité ISO 27001
# ---------------------------------------------------------------------------


def _safe_filename(name: str) -> str:
    cleaned = "".join(ch for ch in name if ch.isprintable() and ch not in '\\/:*?"<>|').strip()
    return (cleaned or "declaration-applicabilite")[:160]


@app.put("/api/entities/{entity_id}/soa", response_model=FileRead)
async def upload_soa(
    entity_id: str,
    request: Request,
    name: str,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> EntityFile:
    """Conserve la déclaration d'applicabilité telle que déposée. Une seule par entité."""
    entity = _writable_entity(session, entity_id, user)
    content_type = (request.headers.get("content-type") or "application/octet-stream").split(";")[0].strip().lower()
    if content_type not in SOA_TYPES:
        raise _error(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "unsupported_file")
    body = await request.body()
    if not body:
        raise _error(status.HTTP_422_UNPROCESSABLE_CONTENT, "empty_file")
    if len(body) > SOA_MAX_BYTES:
        raise _error(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "file_too_large")
    for row in session.exec(select(EntityFile).where(EntityFile.entity_id == entity.id, EntityFile.kind == "soa")).all():
        session.delete(row)
    record = EntityFile(entity_id=entity.id, name=_safe_filename(name), content_type=content_type, size=len(body), data=body)
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@app.get("/api/entities/{entity_id}/soa")
def download_soa(entity_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Response:
    entity = _readable_entity(session, entity_id, user)
    record = session.exec(select(EntityFile).where(EntityFile.entity_id == entity.id, EntityFile.kind == "soa")).first()
    if record is None:
        raise _error(status.HTTP_404_NOT_FOUND, "not_found")
    return Response(
        content=record.data,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(record.name)}"},
    )


@app.delete("/api/entities/{entity_id}/soa", status_code=status.HTTP_204_NO_CONTENT)
def delete_soa(entity_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)) -> Response:
    entity = _writable_entity(session, entity_id, user)
    for row in session.exec(select(EntityFile).where(EntityFile.entity_id == entity.id, EntityFile.kind == "soa")).all():
        session.delete(row)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Trust Center
# ---------------------------------------------------------------------------


@app.get("/api/public/{token}", response_model=PublicView)
def public_view(token: str, session: Session = Depends(get_session)) -> PublicView:
    entity = session.exec(select(Entity).where(Entity.share_token == token)).first()
    # Un lien désactivé répond comme un lien inexistant : on ne confirme pas
    # l'existence d'une entité à qui n'y a plus accès.
    if entity is None or not (entity.share_enabled or entity.is_demo):
        raise _error(status.HTTP_404_NOT_FOUND, "link_inactive")
    return PublicView(
        name=entity.name,
        is_demo=entity.is_demo,
        updated_at=entity.updated_at,
        snapshot=entity.public_snapshot,
    )


# ---------------------------------------------------------------------------
# Application compilée
# ---------------------------------------------------------------------------

app.include_router(admin_router)

# Monté en dernier : les routes /api gardent la priorité. L'application utilise
# un routage par fragment (#/…), aucune réécriture d'URL n'est donc nécessaire.
if (DIST / "index.html").exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="app")
