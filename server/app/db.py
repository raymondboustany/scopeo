from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

DATA_DIR = Path(os.environ.get("SCOPEO_DATA_DIR", Path(__file__).resolve().parent.parent / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.environ.get("SCOPEO_DATABASE_URL", f"sqlite:///{DATA_DIR / 'scopeo.db'}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _sqlite_pragmas(dbapi_connection, _record) -> None:  # pragma: no cover - configuration
    cursor = dbapi_connection.cursor()
    # Les clés étrangères ne sont pas appliquées par défaut sous SQLite ; le
    # journal WAL évite de bloquer la lecture pendant les sauvegardes.
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    # Migration v3.1 : le suivi d'incidents réels a été retiré (la plateforme
    # cadre, elle ne pilote pas une crise). La table héritée bloquerait la suppression
    # des entités par sa clé étrangère.
    with engine.begin() as conn:
        conn.exec_driver_sql("DROP TABLE IF EXISTS incident")
        # Migration v3.2 : fiche entité et notes d'entretien.
        columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(entity)")}
        if "profile" not in columns:
            conn.exec_driver_sql("ALTER TABLE entity ADD COLUMN profile JSON NOT NULL DEFAULT '{}'")
        if "notes" not in columns:
            conn.exec_driver_sql("ALTER TABLE entity ADD COLUMN notes JSON NOT NULL DEFAULT '[]'")
        # Migration v4.0 : démarche ISO 27001 et authentification.
        if "iso_controls" not in columns:
            conn.exec_driver_sql("ALTER TABLE entity ADD COLUMN iso_controls JSON NOT NULL DEFAULT '{}'")
        user_columns = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(user)")}
        if "password_hash" not in user_columns:
            conn.exec_driver_sql("ALTER TABLE user ADD COLUMN password_hash VARCHAR")


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
