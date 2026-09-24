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
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, col, func, select

from .auth import SESSION_COOKIE, password_problem, hash_password, sessions, throttle, verify_password
from .db import engine, get_session, init_db
from .models import Entity, EntityFile, EntityRevision, User, new_token, now
from .schemas import (
    DeleteProfilePayload,
    EntityCreate,
    EntityRead,
    EntitySummary,
    EntityUpdate,
    FileRead,
    LoginPayload,
    PasswordChangePayload,
    PasswordSetupPayload,
    PublicView,
    RegisterPayload,
    RevisionRead,
    ShareUpdate,
    UserRead,
    UserUpdate,
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

COOKIE_SECURE = os.environ.get("SCOPEO_COOKIE_SECURE", "").lower() in {"1", "true", "yes"}

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


def purge_empty_guests() -> None:
    """Les sessions ne survivent pas à un redémarrage : un profil invité sans
    entité n'est plus joignable et peut être supprimé."""
    with Session(engine) as session:
        for user in session.exec(select(User).where(col(User.is_guest).is_(True))).all():
            has_entity = session.exec(select(Entity.id).where(Entity.user_id == user.id)).first()
            if has_entity is None:
                session.delete(user)
        session.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    seed_demo()
    purge_empty_guests()
    yield


app = FastAPI(title="Scopeo", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-Scopeo", "Accept-Language"],
)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if request.headers.get(CSRF_HEADER) != "1":
            return JSONResponse({"detail": "csrf"}, status_code=status.HTTP_403_FORBIDDEN)
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
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


def current_user(request: Request, session: Session = Depends(get_session)) -> User:
    active = sessions.get(request.cookies.get(SESSION_COOKIE))
    if active is None:
        raise _error(status.HTTP_401_UNAUTHORIZED, "unauthenticated")
    user = session.get(User, active.user_id)
    if user is None or user.is_demo:
        sessions.revoke(request.cookies.get(SESSION_COOKIE))
        raise _error(status.HTTP_401_UNAUTHORIZED, "unauthenticated")
    return user


def _open_session(response: Response, user: User) -> None:
    token = sessions.create(user.id)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        samesite="strict",
        secure=COOKIE_SECURE,
        path="/",
    )


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


def _find_by_name(session: Session, name: str) -> list[User]:
    wanted = name.strip().casefold()
    users = session.exec(select(User).where(col(User.is_guest).is_(False), col(User.is_demo).is_(False))).all()
    return [u for u in users if u.name.strip().casefold() == wanted]


def _check_new_password(password: str, confirm: str) -> None:
    if password != confirm:
        raise _error(status.HTTP_422_UNPROCESSABLE_ENTITY, "password_mismatch")
    problem = password_problem(password)
    if problem:
        raise _error(status.HTTP_422_UNPROCESSABLE_ENTITY, f"password_{problem}")


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


def _user_read(session: Session, user: User) -> UserRead:
    count = session.exec(select(func.count()).select_from(Entity).where(Entity.user_id == user.id)).one()
    return UserRead.model_validate(user).model_copy(update={"entity_count": count})


def _delete_entity_tree(session: Session, entity: Entity) -> None:
    for row in session.exec(select(EntityRevision).where(EntityRevision.entity_id == entity.id)).all():
        session.delete(row)
    for row in session.exec(select(EntityFile).where(EntityFile.entity_id == entity.id)).all():
        session.delete(row)
    session.delete(entity)


def _delete_user_tree(session: Session, user: User) -> None:
    for entity in session.exec(select(Entity).where(Entity.user_id == user.id)).all():
        _delete_entity_tree(session, entity)
    session.delete(user)


# ---------------------------------------------------------------------------
# Santé
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Authentification
# ---------------------------------------------------------------------------


@app.post("/api/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterPayload, response: Response, session: Session = Depends(get_session)) -> UserRead:
    name = payload.name.strip()
    if not name:
        raise _error(status.HTTP_422_UNPROCESSABLE_ENTITY, "name_required")
    _check_new_password(payload.password.get_secret_value(), payload.password_confirm.get_secret_value())
    if _find_by_name(session, name):
        raise _error(status.HTTP_409_CONFLICT, "name_taken")
    user = User(
        name=name,
        role=payload.role,
        organisation=payload.organisation,
        email=payload.email,
        password_hash=hash_password(payload.password.get_secret_value()),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    _open_session(response, user)
    return _user_read(session, user)


@app.post("/api/auth/login", response_model=UserRead)
def login(payload: LoginPayload, request: Request, response: Response, session: Session = Depends(get_session)) -> UserRead:
    key = _throttle_key(request, payload.name)
    wait = throttle.retry_after(key)
    if wait:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_attempts", headers={"Retry-After": str(wait)})

    candidates = _find_by_name(session, payload.name)
    password = payload.password.get_secret_value()
    user = next((u for u in candidates if u.password_hash and verify_password(password, u.password_hash)), None)
    if user is None:
        if not candidates:
            verify_password(password, None)
        elif all(u.password_hash is None for u in candidates):
            # Profil créé avant l'authentification : il doit d'abord définir un mot de passe.
            raise _error(status.HTTP_409_CONFLICT, "password_setup_required")
        throttle.fail(key)
        raise _error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")

    throttle.success(key)
    user.updated_at = now()
    session.add(user)
    session.commit()
    session.refresh(user)
    _open_session(response, user)
    return _user_read(session, user)


@app.post("/api/auth/setup-password", response_model=UserRead)
def setup_password(payload: PasswordSetupPayload, response: Response, session: Session = Depends(get_session)) -> UserRead:
    candidates = [u for u in _find_by_name(session, payload.name) if u.password_hash is None]
    if len(candidates) != 1:
        raise _error(status.HTTP_404_NOT_FOUND, "not_found")
    _check_new_password(payload.password.get_secret_value(), payload.password_confirm.get_secret_value())
    user = candidates[0]
    user.password_hash = hash_password(payload.password.get_secret_value())
    user.updated_at = now()
    session.add(user)
    session.commit()
    session.refresh(user)
    _open_session(response, user)
    return _user_read(session, user)


@app.post("/api/auth/guest", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def guest(response: Response, session: Session = Depends(get_session)) -> UserRead:
    """Session d'essai sans mot de passe : ses données sont effacées à la déconnexion."""
    user = User(name="Invité", role="autre", is_guest=True)
    session.add(user)
    session.commit()
    session.refresh(user)
    _open_session(response, user)
    return _user_read(session, user)


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, session: Session = Depends(get_session)) -> Response:
    closed = sessions.revoke(request.cookies.get(SESSION_COOKIE))
    if closed is not None:
        user = session.get(User, closed.user_id)
        if user is not None and user.is_guest:
            _delete_user_tree(session, user)
            session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="strict", httponly=True, secure=COOKIE_SECURE)
    return response


@app.get("/api/auth/me", response_model=UserRead)
def me(user: User = Depends(current_user), session: Session = Depends(get_session)) -> UserRead:
    return _user_read(session, user)


@app.post("/api/auth/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChangePayload,
    request: Request,
    user: User = Depends(current_user),
    session: Session = Depends(get_session),
) -> Response:
    if user.is_guest:
        raise _error(status.HTTP_403_FORBIDDEN, "guest_forbidden")
    if not verify_password(payload.current.get_secret_value(), user.password_hash):
        raise _error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")
    _check_new_password(payload.password.get_secret_value(), payload.password_confirm.get_secret_value())
    user.password_hash = hash_password(payload.password.get_secret_value())
    user.updated_at = now()
    session.add(user)
    session.commit()
    # Les autres sessions de ce profil sont fermées ; la courante reste ouverte.
    sessions.revoke_user(user.id, keep=request.cookies.get(SESSION_COOKIE))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Profil
# ---------------------------------------------------------------------------


@app.get("/api/users/{user_id}", response_model=UserRead)
def read_user(user_id: str, user: User = Depends(current_user), session: Session = Depends(get_session)) -> UserRead:
    _self_or_403(user, user_id)
    return _user_read(session, user)


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
    return _user_read(session, user)


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
        supplied = payload.password.get_secret_value() if payload.password else ""
        if not verify_password(supplied, user.password_hash):
            raise _error(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")
    _delete_user_tree(session, user)
    session.commit()
    sessions.revoke_user(user.id)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="strict", httponly=True, secure=COOKIE_SECURE)
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
    _delete_entity_tree(session, entity)
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
        raise _error(status.HTTP_422_UNPROCESSABLE_ENTITY, "empty_file")
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

# Monté en dernier : les routes /api gardent la priorité. L'application utilise
# un routage par fragment (#/…), aucune réécriture d'URL n'est donc nécessaire.
if (DIST / "index.html").exists():
    app.mount("/", StaticFiles(directory=DIST, html=True), name="app")
