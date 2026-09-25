"""Sauvegarde cohérente des données : base SQLite et clé de chiffrement.

Utilisable depuis l'espace d'administration (téléchargement) ou en ligne de
commande, pour une sauvegarde planifiée (cron, planificateur de tâches) :

    python -m app.backup <dossier> [--keep 14]

L'archive contient ``scopeo.db`` (copie cohérente, même serveur en marche),
``secret.key`` et une note de restauration. Elle donne accès à toutes les
données : conservez-la chiffrée, hors du serveur.
"""

from __future__ import annotations

import argparse
import io
import os
import sqlite3
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from .db import DATA_DIR, DATABASE_URL

RESTORE_NOTE = """Scopeo : restauration / restore

FR
1. Arrêter Scopeo.
2. Remplacer scopeo.db et secret.key du dossier de données (server/data, ou le volume Docker scopeo-data) par ceux de cette archive.
   Si SCOPEO_SECRET_KEY est défini, garder la même valeur.
3. Supprimer scopeo.db-wal et scopeo.db-shm s'ils existent, puis relancer Scopeo.

EN
1. Stop Scopeo.
2. Replace scopeo.db and secret.key in the data folder (server/data, or the scopeo-data Docker volume) with those from this archive.
   If SCOPEO_SECRET_KEY is set, keep the same value.
3. Delete scopeo.db-wal and scopeo.db-shm if present, then start Scopeo again.
"""


def sqlite_path() -> Path | None:
    if not DATABASE_URL.startswith("sqlite:///"):
        return None
    return Path(DATABASE_URL.removeprefix("sqlite:///"))


def build_archive() -> tuple[bytes, str]:
    """Archive ZIP en mémoire et nom de fichier horodaté."""
    source = sqlite_path()
    if source is None or not source.exists():
        raise RuntimeError("backup_unsupported")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    with tempfile.TemporaryDirectory() as tmp:
        copy = Path(tmp) / "scopeo.db"
        # API de sauvegarde SQLite : copie cohérente, sans interrompre le service.
        src, dst = sqlite3.connect(source), sqlite3.connect(copy)
        try:
            src.backup(dst)
        finally:
            # Fermeture explicite : sous Windows, un fichier ouvert ne peut être supprimé.
            src.close()
            dst.close()
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.write(copy, "scopeo.db")
            key = Path(DATA_DIR) / "secret.key"
            if key.exists():
                archive.write(key, "secret.key")
            archive.writestr("RESTORE.txt", RESTORE_NOTE)
    return buffer.getvalue(), f"scopeo-backup-{stamp}.zip"


def main() -> None:
    parser = argparse.ArgumentParser(description="Sauvegarde Scopeo / Scopeo backup")
    parser.add_argument("destination", help="Dossier de destination / destination folder")
    parser.add_argument("--keep", type=int, default=14, help="Nombre d'archives conservées / archives kept (0 = all)")
    args = parser.parse_args()
    dest = Path(args.destination)
    dest.mkdir(parents=True, exist_ok=True)
    data, name = build_archive()
    target = dest / name
    target.write_bytes(data)
    os.chmod(target, 0o600)
    print(target)
    if args.keep > 0:
        for old in sorted(dest.glob("scopeo-backup-*.zip"))[: -args.keep]:
            old.unlink()


if __name__ == "__main__":
    main()
