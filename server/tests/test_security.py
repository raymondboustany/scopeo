"""Premier lancement, administration, second facteur et annuaire LDAP."""

from __future__ import annotations

import time
import uuid

import pyotp
import pytest
from fastapi.testclient import TestClient
from ldap3 import MOCK_SYNC, Connection, Server
from sqlmodel import Session, delete, select

from app import directory
from app.auth import sessions, throttle
from app.db import engine
from app.main import DEMO_USER_ID, app
from app.models import AuditEvent, Entity, EntityFile, EntityRevision, Setting, User
from app.security import challenges

PASSWORD = "correct horse battery"
HEADERS = {"X-Scopeo": "1"}


def _wipe() -> None:
    """Base vide de tout compte : seul le profil support de la démonstration reste."""
    with Session(engine) as session:
        demo_entities = select(Entity.id).where(Entity.user_id != DEMO_USER_ID)
        session.exec(delete(EntityRevision).where(EntityRevision.entity_id.in_(demo_entities)))
        session.exec(delete(EntityFile).where(EntityFile.entity_id.in_(demo_entities)))
        session.exec(delete(Entity).where(Entity.user_id != DEMO_USER_ID))
        session.exec(delete(User).where(User.id != DEMO_USER_ID))
        session.exec(delete(Setting))
        session.exec(delete(AuditEvent))
        session.commit()
    sessions.clear()
    challenges.clear()
    throttle.clear()


@pytest.fixture()
def client():
    with TestClient(app, headers=HEADERS) as c:
        _wipe()
        yield c
        _wipe()


def unique(name: str) -> str:
    return f"{name} {uuid.uuid4().hex[:6]}"


def register(client, name=None, password=PASSWORD):
    r = client.post(
        "/api/auth/register",
        json={"name": name or unique("Profil"), "role": "consultant", "password": password, "password_confirm": password},
    )
    assert r.status_code == 201, r.text
    return r.json()


def login(client, name, password=PASSWORD):
    return client.post("/api/auth/login", json={"name": name, "password": password})


def other_client():
    return TestClient(app, headers=HEADERS)


# ---------------------------------------------------------------------------
# Premier lancement
# ---------------------------------------------------------------------------


def test_une_base_vide_ne_propose_que_la_creation_du_premier_compte(client):
    status = client.get("/api/auth/status").json()
    assert status == {"has_accounts": False, "registration_open": True, "guest_enabled": False, "ldap_enabled": False, "ldap_label": ""}
    assert client.post("/api/auth/guest").json()["detail"] == "setup_required"


def test_le_premier_compte_cree_devient_administrateur_et_pas_les_suivants(client):
    first = register(client)
    assert first["is_admin"] is True
    client.post("/api/auth/logout")
    second = register(client)
    assert second["is_admin"] is False
    assert client.get("/api/auth/status").json()["has_accounts"] is True


# ---------------------------------------------------------------------------
# Contrôle d'accès à l'administration
# ---------------------------------------------------------------------------

ADMIN_ROUTES = [
    ("GET", "/api/admin/users", None),
    ("POST", "/api/admin/users", {"name": "X", "password": PASSWORD}),
    ("PATCH", "/api/admin/users/abc", {"is_admin": True}),
    ("POST", "/api/admin/users/abc/password", {"password": PASSWORD}),
    ("POST", "/api/admin/users/abc/mfa/reset", None),
    ("DELETE", "/api/admin/users/abc", None),
    ("GET", "/api/admin/settings", None),
    ("PUT", "/api/admin/settings", {"registration_open": False, "guest_enabled": False, "session_hours": 8}),
    ("GET", "/api/admin/ldap", None),
    ("PUT", "/api/admin/ldap", {"enabled": False}),
    ("POST", "/api/admin/ldap/test", {"config": {}}),
    ("GET", "/api/admin/audit", None),
]


def test_chaque_route_d_administration_verifie_le_role_au_serveur(client):
    register(client)  # administrateur
    client.post("/api/auth/logout")
    register(client)  # utilisateur ordinaire, session ouverte
    for method, path, body in ADMIN_ROUTES:
        r = client.request(method, path, json=body)
        assert r.status_code == 403 and r.json()["detail"] == "admin_required", (method, path, r.text)
    client.post("/api/auth/logout")
    for method, path, body in ADMIN_ROUTES:
        assert client.request(method, path, json=body).status_code == 401, (method, path)
    guest = client.post("/api/auth/guest")
    assert guest.status_code == 201
    assert client.get("/api/admin/users").status_code == 403


def test_un_administrateur_n_accede_pas_aux_entites_des_autres(client):
    admin = register(client)
    client.post("/api/auth/logout")
    user = register(client)
    entity = client.post(f"/api/users/{user['id']}/entities", json={"name": "Confidentiel"}).json()
    client.post("/api/auth/logout")
    assert login(client, admin["name"]).status_code == 200
    assert client.get(f"/api/entities/{entity['id']}").status_code == 404
    assert client.get(f"/api/users/{user['id']}/entities").status_code == 404
    listed = next(u for u in client.get("/api/admin/users").json() if u["id"] == user["id"])
    assert listed["entity_count"] == 1
    assert "entities" not in listed and "answers" not in str(listed)


def test_gestion_des_comptes_et_garde_du_dernier_administrateur(client):
    admin = register(client)
    r = client.post("/api/admin/users", json={"name": "Nouvelle recrue", "password": PASSWORD})
    assert r.status_code == 201 and r.json()["must_change_password"] is True
    recrue = r.json()
    # Le seul administrateur ne peut ni se retirer ses droits, ni se désactiver.
    assert client.patch(f"/api/admin/users/{admin['id']}", json={"is_admin": False}).json()["detail"] == "last_admin"
    assert client.delete(f"/api/admin/users/{admin['id']}").json()["detail"] == "cannot_change_self"
    # Suspension : la session ouverte de la personne est fermée.
    with other_client() as c2:
        assert login(c2, "Nouvelle recrue").status_code == 200
        assert client.patch(f"/api/admin/users/{recrue['id']}", json={"disabled": True}).json()["disabled"] is True
        assert c2.get("/api/auth/me").status_code == 401
        assert login(c2, "Nouvelle recrue").json()["detail"] == "account_disabled"
    client.patch(f"/api/admin/users/{recrue['id']}", json={"disabled": False, "is_admin": True})
    assert client.patch(f"/api/admin/users/{admin['id']}", json={"is_admin": False}).json()["detail"] == "cannot_change_self"
    assert client.delete(f"/api/admin/users/{recrue['id']}").status_code == 204
    actions = [e["action"] for e in client.get("/api/admin/audit").json()]
    assert {"user_created", "user_disabled", "user_enabled", "admin_granted", "user_deleted"} <= set(actions)


def test_mot_de_passe_provisoire_a_changer_avant_tout_usage(client):
    register(client)
    recrue = client.post("/api/admin/users", json={"name": "Provisoire", "password": PASSWORD}).json()
    with other_client() as c2:
        user = login(c2, "Provisoire").json()
        assert user["must_change_password"] is True
        assert c2.get(f"/api/users/{recrue['id']}/entities").json()["detail"] == "password_change_required"
        r = c2.post("/api/auth/password", json={"current": PASSWORD, "password": PASSWORD, "password_confirm": PASSWORD})
        assert r.json()["detail"] == "password_unchanged"
        new = "une autre phrase de passe"
        assert c2.post("/api/auth/password", json={"current": PASSWORD, "password": new, "password_confirm": new}).status_code == 204
        assert c2.get(f"/api/users/{recrue['id']}/entities").status_code == 200


def test_reglages_globaux_inscription_et_mode_invite(client):
    register(client)
    r = client.put("/api/admin/settings", json={"registration_open": False, "guest_enabled": False, "session_hours": 8})
    assert r.status_code == 200
    status = client.get("/api/auth/status").json()
    assert status["registration_open"] is False and status["guest_enabled"] is False
    with other_client() as c2:
        r = c2.post("/api/auth/register", json={"name": "Refusé", "password": PASSWORD, "password_confirm": PASSWORD})
        assert r.json()["detail"] == "registration_closed"
        assert c2.post("/api/auth/guest").json()["detail"] == "guest_disabled"
    assert sessions.max_age == 8 * 3600
    assert client.put("/api/admin/settings", json={"registration_open": True, "guest_enabled": True, "session_hours": 0}).status_code == 422
    client.put("/api/admin/settings", json={"registration_open": True, "guest_enabled": True, "session_hours": 12})


def test_une_session_expire_apres_la_duree_fixee(client):
    register(client)
    sessions.max_age = 1
    try:
        for s in sessions._sessions.values():
            s.created_at -= 5
        assert client.get("/api/auth/me").status_code == 401
    finally:
        sessions.max_age = 12 * 3600


# ---------------------------------------------------------------------------
# Second facteur
# ---------------------------------------------------------------------------


def _enable_mfa(client) -> tuple[str, list[str]]:
    r = client.post("/api/auth/mfa/setup", json={"password": "faux"})
    assert r.status_code == 401
    setup = client.post("/api/auth/mfa/setup", json={"password": PASSWORD}).json()
    assert setup["uri"].startswith("otpauth://totp/") and "<svg" in setup["qr_svg"]
    assert client.post("/api/auth/mfa/enable", json={"code": "000000"}).status_code == 401
    codes = client.post("/api/auth/mfa/enable", json={"code": pyotp.TOTP(setup["secret"]).now()}).json()["codes"]
    assert len(codes) == 10 and len(set(codes)) == 10
    return setup["secret"], codes


def _next_code(secret: str) -> str:
    """Code de la période suivante : le code courant vient d'être consommé."""
    return pyotp.TOTP(secret).at(time.time() + 30)


def test_second_facteur_de_bout_en_bout(client):
    user = register(client)
    secret, codes = _enable_mfa(client)
    me = client.get("/api/auth/me").json()
    assert me["mfa_enabled"] is True and me["recovery_codes_left"] == 10
    with Session(engine) as session:
        stored = session.get(User, user["id"])
        assert secret not in (stored.mfa_secret or "")
        assert all(c not in stored.mfa_recovery for c in codes)
    client.post("/api/auth/logout")

    r = login(client, user["name"])
    assert r.status_code == 200 and r.json()["mfa_required"] is True
    assert client.get("/api/auth/me").status_code == 401
    challenge = r.json()["challenge"]
    assert client.post("/api/auth/mfa/verify", json={"challenge": challenge, "code": "123456"}).json()["detail"] == "mfa_invalid_code"
    ok = client.post("/api/auth/mfa/verify", json={"challenge": challenge, "code": _next_code(secret)})
    assert ok.status_code == 200 and ok.json()["id"] == user["id"]
    # Un défi ne sert qu'une fois.
    assert client.post("/api/auth/mfa/verify", json={"challenge": challenge, "code": _next_code(secret)}).status_code == 401
    client.post("/api/auth/logout")

    # Code de récupération : accepté une fois, puis retiré.
    challenge = login(client, user["name"]).json()["challenge"]
    assert client.post("/api/auth/mfa/verify", json={"challenge": challenge, "code": codes[0].upper()}).status_code == 200
    assert client.get("/api/auth/me").json()["recovery_codes_left"] == 9
    client.post("/api/auth/logout")
    challenge = login(client, user["name"]).json()["challenge"]
    assert client.post("/api/auth/mfa/verify", json={"challenge": challenge, "code": codes[0]}).status_code == 401


def test_un_code_totp_deja_accepte_ne_peut_pas_etre_rejoue(client):
    user = register(client)
    secret, _ = _enable_mfa(client)
    client.post("/api/auth/logout")
    code = _next_code(secret)
    challenge = login(client, user["name"]).json()["challenge"]
    assert client.post("/api/auth/mfa/verify", json={"challenge": challenge, "code": code}).status_code == 200
    client.post("/api/auth/logout")
    challenge = login(client, user["name"]).json()["challenge"]
    assert client.post("/api/auth/mfa/verify", json={"challenge": challenge, "code": code}).status_code == 401


def test_les_essais_de_code_sont_limites(client):
    user = register(client)
    _enable_mfa(client)
    client.post("/api/auth/logout")
    challenge = login(client, user["name"]).json()["challenge"]
    for _ in range(5):
        client.post("/api/auth/mfa/verify", json={"challenge": challenge, "code": "000000"})
    assert client.post("/api/auth/mfa/verify", json={"challenge": challenge, "code": "000000"}).status_code in {401, 429}
    challenge = login(client, user["name"]).json()["challenge"]
    assert client.post("/api/auth/mfa/verify", json={"challenge": challenge, "code": "000000"}).status_code == 429


def test_desactivation_du_second_facteur_par_l_utilisateur(client):
    register(client)
    secret, _ = _enable_mfa(client)
    assert client.post("/api/auth/mfa/disable", json={"password": PASSWORD, "code": "000000"}).status_code == 401
    assert client.post("/api/auth/mfa/disable", json={"password": PASSWORD, "code": _next_code(secret)}).status_code == 204
    assert client.get("/api/auth/me").json()["mfa_enabled"] is False


def test_un_administrateur_debloque_un_compte_qui_a_perdu_son_second_facteur(client):
    admin = register(client)
    client.post("/api/auth/logout")
    user = register(client)
    _enable_mfa(client)
    client.post("/api/auth/logout")
    assert login(client, user["name"]).json()["mfa_required"] is True
    assert login(client, admin["name"]).status_code == 200
    assert client.post(f"/api/admin/users/{user['id']}/mfa/reset").status_code == 204
    client.post("/api/auth/logout")
    r = login(client, user["name"])
    assert r.status_code == 200 and r.json()["mfa_enabled"] is False


# ---------------------------------------------------------------------------
# Annuaire LDAP
# ---------------------------------------------------------------------------

BASE_DN = "dc=exemple,dc=fr"
ALICE_DN = f"cn=alice,ou=people,{BASE_DN}"
LDAP_CONFIG = {
    "enabled": True,
    "label": "Annuaire Exemple",
    "url": "ldaps://annuaire.exemple.fr",
    "start_tls": False,
    "verify_certificate": True,
    "bind_dn": f"cn=scopeo-svc,{BASE_DN}",
    "bind_password": "service-secret",
    "base_dn": BASE_DN,
    "user_filter": "(uid={username})",
    "name_attribute": "displayName",
    "email_attribute": "mail",
    "group_dn": f"cn=scopeo,ou=groups,{BASE_DN}",
}


@pytest.fixture()
def fake_directory(monkeypatch):
    server = Server("annuaire-simule")
    seed = Connection(server, client_strategy=MOCK_SYNC)
    seed.strategy.add_entry(f"cn=scopeo-svc,{BASE_DN}", {"userPassword": "service-secret", "objectClass": "person"})
    seed.strategy.add_entry(ALICE_DN, {"userPassword": "alice-secret", "uid": "alice", "displayName": "Alice Durand", "mail": "alice@exemple.fr", "objectClass": "person"})
    seed.strategy.add_entry(f"cn=bob,ou=people,{BASE_DN}", {"userPassword": "bob-secret", "uid": "bob", "displayName": "Bob", "objectClass": "person"})
    seed.strategy.add_entry(f"cn=scopeo,ou=groups,{BASE_DN}", {"member": [ALICE_DN], "objectClass": "groupOfNames"})

    def fake_open(_config, user, password):
        return Connection(server, user=user, password=password, client_strategy=MOCK_SYNC)

    monkeypatch.setattr(directory, "open_connection", fake_open)
    return server


def _configure_ldap(client):
    r = client.put("/api/admin/ldap", json=LDAP_CONFIG)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["has_bind_password"] is True and "bind_password" not in body
    return body


def test_configuration_ldap_validee_et_mot_de_passe_de_service_chiffre(client, fake_directory):
    register(client)
    bad = client.put("/api/admin/ldap", json={**LDAP_CONFIG, "user_filter": "(uid=alice)"})
    assert bad.json()["detail"] == "ldap_filter_invalid"
    assert client.put("/api/admin/ldap", json={**LDAP_CONFIG, "url": "http://x"}).json()["detail"] == "ldap_url_invalid"
    _configure_ldap(client)
    with Session(engine) as session:
        stored = session.get(Setting, "ldap").value
        assert stored["bind_password"] and "service-secret" not in stored["bind_password"]
    # Réenregistrer sans ressaisir le mot de passe le conserve.
    kept = client.put("/api/admin/ldap", json={**LDAP_CONFIG, "bind_password": None, "label": "Annuaire"}).json()
    assert kept["has_bind_password"] is True
    report = client.post("/api/admin/ldap/test", json={"config": {**LDAP_CONFIG, "bind_password": None}, "username": "alice"}).json()
    assert report["ok"] is True and [s["id"] for s in report["steps"]] == ["config", "connect", "bind", "search", "group"]
    status = client.get("/api/auth/status").json()
    assert status["ldap_enabled"] is True and status["ldap_label"] == "Annuaire"


def test_connexion_ldap_cree_le_compte_puis_le_retrouve(client, fake_directory):
    register(client)
    _configure_ldap(client)
    with other_client() as c2:
        assert c2.post("/api/auth/ldap", json={"username": "alice", "password": "faux"}).json()["detail"] == "invalid_credentials"
        assert c2.post("/api/auth/ldap", json={"username": "alice", "password": ""}).status_code == 401
        r = c2.post("/api/auth/ldap", json={"username": "alice", "password": "alice-secret"})
        assert r.status_code == 200, r.text
        alice = r.json()
        assert alice["auth_source"] == "ldap" and alice["name"] == "Alice Durand" and alice["is_admin"] is False
        # Mot de passe géré par l'annuaire : il ne se change pas ici.
        r = c2.post("/api/auth/password", json={"current": "alice-secret", "password": PASSWORD, "password_confirm": PASSWORD})
        assert r.json()["detail"] == "managed_by_directory"
        c2.post("/api/auth/logout")
        assert c2.post("/api/auth/ldap", json={"username": "alice", "password": "alice-secret"}).json()["id"] == alice["id"]
        # Un compte d'annuaire ne s'ouvre pas par le formulaire local.
        c2.post("/api/auth/logout")
        assert login(c2, "Alice Durand", "alice-secret").status_code == 401
        # Hors du groupe autorisé : refusé.
        assert c2.post("/api/auth/ldap", json={"username": "bob", "password": "bob-secret"}).status_code == 401


def test_injection_dans_le_filtre_ldap_neutralisee(client, fake_directory):
    register(client)
    _configure_ldap(client)
    with other_client() as c2:
        r = c2.post("/api/auth/ldap", json={"username": "*)(uid=*", "password": "alice-secret"})
        assert r.status_code == 401


def test_ldap_desactive_refuse_la_connexion(client, fake_directory):
    register(client)
    r = client.post("/api/auth/ldap", json={"username": "alice", "password": "alice-secret"})
    assert r.json()["detail"] == "ldap_disabled"
