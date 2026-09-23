"""API locale de Scopeo.

Le serveur ne porte aucune logique réglementaire : qualification, périmètre et
priorisation sont calculés par le client à partir des réponses stockées ici.
Il garantit la persistance, l'isolement des entités et le partage public
en lecture seule.
"""

from __future__ import annotations

import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, col, func, select

from .db import get_session, init_db, engine
from .models import Entity, EntityRevision, User, new_token, now
from .schemas import (
    EntityCreate,
    EntityRead,
    EntitySummary,
    EntityUpdate,
    PublicView,
    RevisionRead,
    ShareUpdate,
    UserCreate,
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


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


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
        entity.public_snapshot = data.get("public_snapshot")
        entity.is_demo = True
        entity.share_enabled = True
        entity.updated_at = now()

        session.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    seed_demo()
    yield


app = FastAPI(title="Scopeo", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Utilitaires
# ---------------------------------------------------------------------------


def _user_or_404(session: Session, user_id: str) -> User:
    user = session.get(User, user_id)
    if user is None or user.is_demo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profil introuvable.")
    return user


def _entity_or_404(session: Session, entity_id: str) -> Entity:
    entity = session.get(Entity, entity_id)
    if entity is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entité introuvable.")
    return entity


def _writable_entity(session: Session, entity_id: str) -> Entity:
    entity = _entity_or_404(session, entity_id)
    if entity.is_demo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "L'entité de démonstration est en lecture seule.")
    return entity


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
    session.delete(entity)


# ---------------------------------------------------------------------------
# Santé
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Profils
# ---------------------------------------------------------------------------


@app.get("/api/users", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session)) -> list[UserRead]:
    users = session.exec(
        select(User).where(col(User.is_guest).is_(False), col(User.is_demo).is_(False)).order_by(col(User.updated_at).desc())
    ).all()
    return [_user_read(session, u) for u in users]


@app.post("/api/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, session: Session = Depends(get_session)) -> UserRead:
    user = User(**payload.model_dump())
    session.add(user)
    session.commit()
    session.refresh(user)
    return _user_read(session, user)


@app.get("/api/users/{user_id}", response_model=UserRead)
def read_user(user_id: str, session: Session = Depends(get_session)) -> UserRead:
    return _user_read(session, _user_or_404(session, user_id))


@app.patch("/api/users/{user_id}", response_model=UserRead)
def update_user(user_id: str, payload: UserUpdate, session: Session = Depends(get_session)) -> UserRead:
    user = _user_or_404(session, user_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    user.updated_at = now()
    session.add(user)
    session.commit()
    session.refresh(user)
    return _user_read(session, user)


@app.delete("/api/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, session: Session = Depends(get_session)) -> Response:
    user = _user_or_404(session, user_id)
    for entity in session.exec(select(Entity).where(Entity.user_id == user.id)).all():
        _delete_entity_tree(session, entity)
    session.delete(user)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Entités
# ---------------------------------------------------------------------------


@app.get("/api/users/{user_id}/entities", response_model=list[EntitySummary])
def list_entities(user_id: str, session: Session = Depends(get_session)) -> list[EntitySummary]:
    _user_or_404(session, user_id)
    rows = session.exec(
        select(Entity).where(Entity.user_id == user_id).order_by(col(Entity.updated_at).desc())
    ).all()
    return [_summary(e) for e in rows]


@app.post("/api/users/{user_id}/entities", response_model=EntityRead, status_code=status.HTTP_201_CREATED)
def create_entity(user_id: str, payload: EntityCreate, session: Session = Depends(get_session)) -> Entity:
    _user_or_404(session, user_id)
    entity = Entity(user_id=user_id, **payload.model_dump())
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return entity


@app.post(
    "/api/users/{user_id}/entities/from-demo",
    response_model=EntityRead,
    status_code=status.HTTP_201_CREATED,
)
def copy_demo(user_id: str, session: Session = Depends(get_session)) -> Entity:
    """Copie l'entité de démonstration dans le profil, pour la manipuler librement."""
    _user_or_404(session, user_id)
    demo = session.get(Entity, DEMO_ENTITY_ID)
    if demo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Aucune démonstration disponible.")
    copy = Entity(
        user_id=user_id,
        name=f"{demo.name} (exemple)",
        scope_note=demo.scope_note,
        answers=dict(demo.answers),
        coverage=dict(demo.coverage),
        measures=dict(demo.measures),
        weights=dict(demo.weights),
        contacts=list(demo.contacts),
        profile=dict(demo.profile),
        notes=list(demo.notes),
        public_snapshot=demo.public_snapshot,
    )
    session.add(copy)
    session.commit()
    session.refresh(copy)
    return copy


@app.get("/api/entities/{entity_id}", response_model=EntityRead)
def read_entity(entity_id: str, session: Session = Depends(get_session)) -> Entity:
    return _entity_or_404(session, entity_id)


@app.patch("/api/entities/{entity_id}", response_model=EntityRead)
def update_entity(entity_id: str, payload: EntityUpdate, session: Session = Depends(get_session)) -> Entity:
    entity = _writable_entity(session, entity_id)
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
        select(EntityRevision)
        .where(EntityRevision.entity_id == entity.id)
        .order_by(col(EntityRevision.created_at).desc())
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
def delete_entity(entity_id: str, session: Session = Depends(get_session)) -> Response:
    entity = _writable_entity(session, entity_id)
    _delete_entity_tree(session, entity)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/entities/{entity_id}/revisions", response_model=list[RevisionRead])
def list_revisions(entity_id: str, session: Session = Depends(get_session)) -> list[EntityRevision]:
    _entity_or_404(session, entity_id)
    return list(
        session.exec(
            select(EntityRevision)
            .where(EntityRevision.entity_id == entity_id)
            .order_by(col(EntityRevision.created_at).desc())
        ).all()
    )


@app.put("/api/entities/{entity_id}/share", response_model=EntityRead)
def update_share(entity_id: str, payload: ShareUpdate, session: Session = Depends(get_session)) -> Entity:
    entity = _writable_entity(session, entity_id)
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
# Trust Center
# ---------------------------------------------------------------------------


@app.get("/api/public/{token}", response_model=PublicView)
def public_view(token: str, session: Session = Depends(get_session)) -> PublicView:
    entity = session.exec(select(Entity).where(Entity.share_token == token)).first()
    # Un lien désactivé répond comme un lien inexistant : on ne confirme pas
    # l'existence d'une entité à qui n'y a plus accès.
    if entity is None or not (entity.share_enabled or entity.is_demo):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ce lien n'est pas ou plus actif.")
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
