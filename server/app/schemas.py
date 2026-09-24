"""Contrats d'échange de l'API.

Les schémas d'écriture n'exposent que les champs modifiables : l'identifiant,
le jeton de partage et les horodatages restent sous le contrôle du serveur.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, SecretStr


def _as_utc(value: datetime) -> str:
    # SQLite restitue des dates sans fuseau : on les réaffirme en UTC pour que
    # le client ne les interprète pas en heure locale.
    aware = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return aware.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


UTCDateTime = Annotated[datetime, PlainSerializer(_as_utc, return_type=str)]

Role = Literal["consultant", "dpo", "rssi", "juriste", "dirigeant", "auditeur", "autre"]


class RegisterPayload(BaseModel):
    """Création d'un profil. Le mot de passe ne quitte pas la requête qui le traite."""

    name: str = Field(min_length=1, max_length=120)
    role: Role = "consultant"
    organisation: str = Field(default="", max_length=160)
    email: str = Field(default="", max_length=200)
    password: SecretStr
    password_confirm: SecretStr


class LoginPayload(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    password: SecretStr


class PasswordSetupPayload(BaseModel):
    """Premier mot de passe d'un profil créé avant l'authentification."""

    name: str = Field(min_length=1, max_length=120)
    password: SecretStr
    password_confirm: SecretStr


class PasswordChangePayload(BaseModel):
    current: SecretStr
    password: SecretStr
    password_confirm: SecretStr


class DeleteProfilePayload(BaseModel):
    password: SecretStr | None = None


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    role: Role | None = None
    organisation: str | None = Field(default=None, max_length=160)
    email: str | None = Field(default=None, max_length=200)
    onboarded: bool | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    role: str
    organisation: str
    email: str
    is_guest: bool
    onboarded: bool
    created_at: UTCDateTime
    updated_at: UTCDateTime
    entity_count: int = 0


class EntityCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    scope_note: str = ""
    answers: dict[str, Any] = Field(default_factory=dict)
    profile: dict[str, Any] = Field(default_factory=dict)


class EntityUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    scope_note: str | None = None
    answers: dict[str, Any] | None = None
    coverage: dict[str, Any] | None = None
    measures: dict[str, Any] | None = None
    weights: dict[str, Any] | None = None
    contacts: list[Any] | None = None
    seen_alerts: list[Any] | None = None
    profile: dict[str, Any] | None = None
    notes: list[Any] | None = None
    public_snapshot: dict[str, Any] | None = None
    iso_controls: dict[str, Any] | None = None


class EntitySummary(BaseModel):
    """Vue de liste : suffisante pour choisir, sans charger tout le dossier."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    scope_note: str
    sector: str | None = None
    answered: int = 0
    mode: str | None = None
    share_enabled: bool
    is_demo: bool
    created_at: UTCDateTime
    updated_at: UTCDateTime


class EntityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    scope_note: str
    answers: dict[str, Any]
    coverage: dict[str, Any]
    measures: dict[str, Any]
    weights: dict[str, Any]
    contacts: list[Any]
    seen_alerts: list[Any]
    profile: dict[str, Any]
    notes: list[Any]
    public_snapshot: dict[str, Any] | None
    iso_controls: dict[str, Any]
    share_enabled: bool
    share_token: str
    is_demo: bool
    created_at: UTCDateTime
    updated_at: UTCDateTime


class RevisionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    answers: dict[str, Any]
    created_at: UTCDateTime


class ShareUpdate(BaseModel):
    enabled: bool
    rotate: bool = False


class PublicView(BaseModel):
    name: str
    is_demo: bool
    updated_at: UTCDateTime
    snapshot: dict[str, Any] | None


class FileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    content_type: str
    size: int
    created_at: UTCDateTime
