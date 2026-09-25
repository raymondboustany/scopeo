"""Secours : rétablit l'accès d'un administrateur, depuis le serveur.

Pour le cas où plus aucun administrateur ne peut se connecter (téléphone et
codes de récupération perdus, clé de chiffrement perdue). Il faut un accès à la
machine qui héberge la plateforme :

    server/.venv/bin/python -m app.recover "Nom du compte"      (dans le dossier server)
    docker compose exec scopeo python -m app.recover "Nom du compte"

Le compte redevient administrateur actif, sa double authentification est
désactivée, ses sessions sont fermées et, pour un compte local, un mot de passe
provisoire à changer à la connexion est affiché.
"""

from __future__ import annotations

import secrets
import sys

from sqlmodel import Session, select

from .auth import hash_password
from .db import engine, init_db
from .deps import audit, real_users
from .models import UserSession, now


def main(argv: list[str]) -> int:
    if len(argv) != 2 or not argv[1].strip():
        print('Usage: python -m app.recover "Account name / Nom du compte"')
        return 2
    init_db()
    wanted = argv[1].strip().casefold()
    with Session(engine) as session:
        users = real_users(session)
        found = [u for u in users if u.name.strip().casefold() == wanted]
        if len(found) != 1:
            print("Account not found / Compte introuvable. Accounts / Comptes :")
            for user in sorted(users, key=lambda u: u.created_at):
                print(f"  - {user.name}{' (admin)' if user.is_admin else ''}")
            return 1
        user = found[0]
        user.is_admin = True
        user.disabled = False
        user.mfa_enabled = False
        user.mfa_secret = None
        user.mfa_pending_secret = None
        user.mfa_last_step = None
        user.mfa_recovery = []
        password = None
        if user.auth_source == "local":
            password = secrets.token_urlsafe(12)
            user.password_hash = hash_password(password)
            user.must_change_password = True
        user.updated_at = now()
        session.add(user)
        for row in session.exec(select(UserSession).where(UserSession.user_id == user.id)).all():
            session.delete(row)
        name = user.name
        audit(session, None, "admin_recovered", name)
        session.commit()
    print(f"OK: {name} is an administrator again, two-factor authentication turned off.")
    print(f"OK : {name} est de nouveau administrateur, double authentification désactivée.")
    if password:
        print(f"Temporary password / Mot de passe provisoire : {password}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
