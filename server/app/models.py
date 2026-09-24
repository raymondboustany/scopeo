"""Modèle de persistance.

Deux niveaux distincts, comme le cadrage l'exige :

- ``User`` : la personne qui utilise la plateforme (consultant, DPO, RSSI…),
  protégée par un mot de passe haché ;
- ``Entity`` : l'organisation cadrée, avec ses réponses, son évaluation,
  ses contacts d'escalade et sa démarche ISO 27001.

Un profil porte plusieurs entités ; chaque entité est une ligne autonome,
chargée, renommée ou supprimée sans effet sur les autres.

Les données métier variables (réponses, couverture, contacts…) sont stockées
en JSON : leur forme est dictée par le corpus réglementaire, qui évolue plus
vite qu'un schéma relationnel ne devrait le faire.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Column, LargeBinary
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


def now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return uuid.uuid4().hex


def new_token() -> str:
    return secrets.token_urlsafe(18)


class User(SQLModel, table=True):
    id: str = Field(default_factory=new_id, primary_key=True)
    name: str
    role: str = "consultant"
    organisation: str = ""
    email: str = ""
    # Empreinte bcrypt du mot de passe. Absente pour un profil invité, ou pour
    # un profil créé avant l'authentification, qui en définit une à la
    # première connexion.
    password_hash: str | None = Field(default=None)
    is_guest: bool = False
    # Profil support de l'entité de démonstration : jamais listé comme profil.
    is_demo: bool = False
    onboarded: bool = False
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class Entity(SQLModel, table=True):
    id: str = Field(default_factory=new_id, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    name: str
    scope_note: str = ""
    answers: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    coverage: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    measures: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    weights: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    contacts: list[Any] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    seen_alerts: list[Any] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    # Fiche entité : mode (client ou interne), société, mission, interlocuteurs.
    profile: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False, server_default="{}"))
    # Notes d'entretien, ancrées à une question, une exigence ou un texte.
    notes: list[Any] = Field(default_factory=list, sa_column=Column(JSON, nullable=False, server_default="[]"))
    # Instantané public calculé côté client : c'est la seule chose que le
    # Trust Center expose, de sorte qu'aucune donnée sensible ne quitte
    # l'entité par ce canal.
    public_snapshot: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    # Détail des contrôles de l'annexe A d'ISO/IEC 27001:2022.
    iso_controls: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False, server_default="{}"))
    share_enabled: bool = False
    share_token: str = Field(default_factory=new_token, index=True, unique=True)
    is_demo: bool = False
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class EntityRevision(SQLModel, table=True):
    """État des réponses avant une série de modifications.

    Sert au comparateur avant / après : on ne conserve pas chaque frappe, mais
    l'état en vigueur au début de chaque session d'édition.
    """

    id: str = Field(default_factory=new_id, primary_key=True)
    entity_id: str = Field(foreign_key="entity.id", index=True)
    answers: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=now)


class EntityFile(SQLModel, table=True):
    """Pièce déposée pour une entité : aujourd'hui, la déclaration d'applicabilité ISO 27001.

    Le contenu est conservé tel quel, pour être relu ; il n'est jamais
    interprété par le serveur.
    """

    id: str = Field(default_factory=new_id, primary_key=True)
    entity_id: str = Field(foreign_key="entity.id", index=True)
    kind: str = "soa"
    name: str
    content_type: str
    size: int
    data: bytes = Field(sa_column=Column(LargeBinary, nullable=False))
    created_at: datetime = Field(default_factory=now)
