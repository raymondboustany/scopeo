from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.pool import NullPool
from sqlmodel import Session, SQLModel, create_engine

DATA_DIR = Path(os.environ.get("SCOPEO_DATA_DIR", Path(__file__).resolve().parent.parent / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
if not os.access(DATA_DIR, os.W_OK | os.X_OK):
    # Cas courant : dossier de l'hôte monté dans le conteneur sans en donner les droits.
    raise SystemExit(
        f"Scopeo: the data folder {DATA_DIR} is not writable by this account. See docs/deployment.md.\n"
        f"Scopeo : le dossier de données {DATA_DIR} n'est pas accessible en écriture par ce compte. Voir docs/deployment.md."
    )

DATABASE_URL = os.environ.get("SCOPEO_DATABASE_URL", f"sqlite:///{DATA_DIR / 'scopeo.db'}")

if DATABASE_URL.startswith("sqlite"):
    # SQLite : une connexion légère par usage plutôt qu'un réservoir limité. Une
    # requête peut en ouvrir deux (données et session) ; avec un réservoir de taille
    # fixe, une affluence de connexions simultanées finirait par s'attendre en boucle.
    # L'attente d'un verrou d'écriture est portée à 30 s (5 s par défaut).
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 30}, poolclass=NullPool)
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def _sqlite_pragmas(dbapi_connection, _record) -> None:  # pragma: no cover - configuration
    cursor = dbapi_connection.cursor()
    # Les clés étrangères ne sont pas appliquées par défaut sous SQLite ; le
    # journal WAL évite de bloquer la lecture pendant les sauvegardes.
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


if DATABASE_URL.startswith("sqlite"):
    event.listen(engine, "connect", _sqlite_pragmas)


# Colonnes ajoutées au fil du développement : une base créée par une version
# antérieure les reçoit au démarrage, sans perte de données.
_USER_COLUMNS = {
    "password_hash": "VARCHAR",
    "is_admin": "BOOLEAN NOT NULL DEFAULT 0",
    "admin_onboarded": "BOOLEAN NOT NULL DEFAULT 0",
    "disabled": "BOOLEAN NOT NULL DEFAULT 0",
    "must_change_password": "BOOLEAN NOT NULL DEFAULT 0",
    "auth_source": "VARCHAR NOT NULL DEFAULT 'local'",
    "ldap_dn": "VARCHAR",
    "ldap_username": "VARCHAR",
    "ldap_uid": "VARCHAR",
    "oidc_issuer": "VARCHAR",
    "oidc_sub": "VARCHAR",
    "mfa_enabled": "BOOLEAN NOT NULL DEFAULT 0",
    "mfa_secret": "VARCHAR",
    "mfa_pending_secret": "VARCHAR",
    "mfa_last_step": "INTEGER",
    "mfa_recovery": "JSON NOT NULL DEFAULT '[]'",
    "last_login_at": "DATETIME",
}
_ENTITY_COLUMNS = {
    "profile": "JSON NOT NULL DEFAULT '{}'",
    "notes": "JSON NOT NULL DEFAULT '[]'",
    "iso_controls": "JSON NOT NULL DEFAULT '{}'",
}


def _add_missing(conn, table: str, columns: dict[str, str]) -> None:
    present = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")}
    for name, ddl in columns.items():
        if name not in present:
            conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    with engine.begin() as conn:
        # Table d'un ancien suivi d'incidents, retiré : la plateforme cadre, elle
        # ne pilote pas une crise. Sa clé étrangère bloquerait la suppression des entités.
        conn.exec_driver_sql("DROP TABLE IF EXISTS incident")
        _add_missing(conn, "entity", _ENTITY_COLUMNS)
        _add_missing(conn, "user", _USER_COLUMNS)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
