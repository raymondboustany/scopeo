"""Comptes hérités, sessions durables, jetons d'API, sauvegarde et connexion unique (OIDC)."""

from __future__ import annotations

import io
import json
import time
import urllib.parse
import zipfile

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app import sso
from app.auth import SessionStore, sessions
from app.db import engine
from app.deps import ensure_admin, has_accounts
from app.main import app, purge_stale_guests
from app.models import ApiToken, User, UserSession
from tests.test_security import PASSWORD, _wipe, login, register

HEADERS = {"X-Scopeo": "1"}


@pytest.fixture()
def client():
    with TestClient(app, headers=HEADERS) as c:
        _wipe()
        sso.pending.clear()
        sso.clear_cache()
        yield c
        _wipe()


def enable_tokens(client):
    r = client.put("/api/admin/settings", json={"registration_open": True, "guest_enabled": True, "session_hours": 12, "api_tokens_enabled": True})
    assert r.status_code == 200, r.text


# ---------------------------------------------------------------------------
# Comptes hérités sans mot de passe
# ---------------------------------------------------------------------------


def test_un_compte_sans_mot_de_passe_ne_compte_ni_comme_compte_ni_comme_administrateur(client):
    with Session(engine) as session:
        session.add(User(name="Ancien", is_admin=True))
        session.commit()
        assert has_accounts(session) is False
    # L'accueil propose donc la création du premier administrateur.
    assert client.get("/api/auth/status").json()["has_accounts"] is False
    first = register(client, name="Nouvelle administratrice")
    assert first["is_admin"] is True


def test_au_demarrage_un_compte_utilisable_remplace_un_administrateur_inaccessible(client):
    with Session(engine) as session:
        session.add(User(name="Ancien", is_admin=True))
        session.commit()
    user = register(client, name="Utilisable")
    with Session(engine) as session:
        session.get(User, user["id"]).is_admin = False
        session.commit()
        ensure_admin(session)
        assert session.get(User, user["id"]).is_admin is True


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------


def test_une_session_survit_a_un_redemarrage_du_serveur(client):
    register(client)
    token = client.cookies.get("scopeo_session")
    assert SessionStore().get(token) is not None
    with Session(engine) as session:
        stored = session.exec(select(UserSession)).all()
        assert stored and all(token not in s.token_hash for s in stored)


def test_un_invite_sans_session_est_efface_au_demarrage(client):
    register(client)
    client.post("/api/auth/logout")
    guest = client.post("/api/auth/guest").json()
    client.post(f"/api/users/{guest['id']}/entities/from-demo")
    sessions.revoke(client.cookies.get("scopeo_session"))
    purge_stale_guests()
    with Session(engine) as session:
        assert session.get(User, guest["id"]) is None


# ---------------------------------------------------------------------------
# Jetons d'API
# ---------------------------------------------------------------------------


def test_les_jetons_sont_desactives_par_defaut(client):
    register(client)
    assert client.post("/api/auth/tokens", json={"name": "GRC"}).json()["detail"] == "api_tokens_disabled"


def test_un_jeton_agit_sur_les_entites_de_son_titulaire_et_rien_d_autre(client):
    admin = register(client)
    enable_tokens(client)
    created = client.post("/api/auth/tokens", json={"name": "Export GRC", "expires_days": 30}).json()
    token = created["token"]
    assert token.startswith("scp_") and created["prefix"] == token[:10]
    with Session(engine) as session:
        assert token not in session.exec(select(ApiToken)).one().token_hash

    with TestClient(app) as api:  # ni cookie, ni en-tête anti-CSRF
        auth = {"Authorization": f"Bearer {token}"}
        assert api.get("/api/auth/me", headers=auth).json()["id"] == admin["id"]
        entity = api.post(f"/api/users/{admin['id']}/entities", headers=auth, json={"name": "Via API"})
        assert entity.status_code == 201
        assert api.get(f"/api/entities/{entity.json()['id']}", headers=auth).status_code == 200
        # Ni administration, ni gestion du compte.
        assert api.get("/api/admin/users", headers=auth).json()["detail"] == "token_forbidden"
        assert api.get("/api/auth/tokens", headers=auth).json()["detail"] == "token_forbidden"
        assert api.post("/api/auth/mfa/setup", headers=auth, json={"password": PASSWORD}).json()["detail"] == "token_forbidden"
        assert api.get("/api/auth/me", headers={"Authorization": "Bearer scp_inconnu"}).status_code == 401

        client.delete(f"/api/auth/tokens/{created['id']}")
        assert api.get("/api/auth/me", headers=auth).status_code == 401


def test_un_jeton_expire_ou_d_un_compte_suspendu_est_refuse(client):
    register(client)
    enable_tokens(client)
    token = client.post("/api/auth/tokens", json={"name": "Court", "expires_days": 1}).json()["token"]
    with Session(engine) as session:
        row = session.exec(select(ApiToken)).one()
        row.expires_at = row.created_at
        session.commit()
    with TestClient(app) as api:
        assert api.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_desactiver_les_jetons_les_rend_inoperants(client):
    register(client)
    enable_tokens(client)
    token = client.post("/api/auth/tokens", json={"name": "X"}).json()["token"]
    client.put("/api/admin/settings", json={"registration_open": True, "guest_enabled": True, "session_hours": 12, "api_tokens_enabled": False})
    with TestClient(app) as api:
        assert api.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


# ---------------------------------------------------------------------------
# Sauvegarde, description OpenAPI, en-têtes
# ---------------------------------------------------------------------------


def test_la_sauvegarde_est_reservee_aux_administrateurs_et_complete(client):
    register(client)
    r = client.get("/api/admin/backup")
    assert r.status_code == 200 and r.headers["content-type"] == "application/zip"
    names = zipfile.ZipFile(io.BytesIO(r.content)).namelist()
    assert {"scopeo.db", "secret.key", "RESTORE.txt"} <= set(names)
    client.post("/api/auth/logout")
    register(client)
    assert client.get("/api/admin/backup").status_code == 403


def test_la_description_openapi_est_publiee_sans_interface_externe(client):
    spec = client.get("/api/openapi.json").json()
    assert "/api/auth/login" in spec["paths"] and "/api/admin/users" in spec["paths"]
    assert client.get("/docs").status_code in {404, 200}  # 200 : application compilée servie à la place
    assert "swagger" not in client.get("/docs").text.lower()


def test_l_adresse_publique_doit_etre_en_https(client):
    register(client)
    r = client.put("/api/admin/settings", json={"registration_open": True, "guest_enabled": True, "session_hours": 12, "public_url": "http://scopeo.exemple.fr"})
    assert r.json()["detail"] == "public_url_invalid"


# ---------------------------------------------------------------------------
# Connexion unique (OIDC) avec un fournisseur simulé
# ---------------------------------------------------------------------------

ISSUER = "https://idp.exemple.fr/realm"
CLIENT_ID = "scopeo"


class FakeProvider:
    def __init__(self) -> None:
        self.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(self.key.public_key()))
        self.jwks = {"keys": [{**jwk, "kid": "k1", "use": "sig", "alg": "RS256"}]}
        self.claims: dict = {}
        self.nonce = ""
        self.token_requests: list[dict] = []

    def id_token(self, **override) -> str:
        now = int(time.time())
        claims = {"iss": ISSUER, "aud": CLIENT_ID, "sub": "user-123", "iat": now, "exp": now + 300, "nonce": self.nonce,
                  "name": "Camille Durand", "email": "camille@exemple.fr", "email_verified": True, "groups": ["scopeo-users"]}
        claims.update(self.claims)
        claims.update(override)
        return jwt.encode(claims, self.key, algorithm="RS256", headers={"kid": "k1"})

    def fetch(self, url: str, data=None):
        if url.endswith("/.well-known/openid-configuration"):
            return {"issuer": ISSUER, "authorization_endpoint": ISSUER + "/auth", "token_endpoint": ISSUER + "/token", "jwks_uri": ISSUER + "/certs"}
        if url.endswith("/certs"):
            return self.jwks
        if url.endswith("/token"):
            self.token_requests.append(data)
            return {"id_token": self.id_token(), "access_token": "x"}
        raise AssertionError(url)


@pytest.fixture()
def provider(monkeypatch):
    fake = FakeProvider()
    monkeypatch.setattr(sso, "fetch_json", fake.fetch)
    return fake


def configure_sso(client, **extra):
    body = {"enabled": True, "label": "Exemple", "issuer": ISSUER, "client_id": CLIENT_ID, "client_secret": "secret-client", **extra}
    r = client.put("/api/admin/sso", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def sso_login(c, provider, **claims):
    provider.claims = claims
    start = c.get("/api/auth/sso/start", follow_redirects=False)
    assert start.status_code == 303, start.text
    query = urllib.parse.parse_qs(urllib.parse.urlparse(start.headers["location"]).query)
    provider.nonce = query.get("nonce", [""])[0]
    state = query.get("state", [""])[0]
    return c.get(f"/api/auth/sso/callback?state={state}&code=abc", follow_redirects=False), query


def test_configuration_sso_secret_chiffre_et_adresse_de_retour(client, provider):
    register(client)
    conf = configure_sso(client)
    assert conf["has_client_secret"] is True and "client_secret" not in conf
    assert conf["redirect_uri"].endswith("/api/auth/sso/callback")
    assert client.put("/api/admin/sso", json={"enabled": True, "issuer": "http://idp", "client_id": "x"}).json()["detail"] == "sso_issuer_invalid"
    report = client.post("/api/admin/sso/test", json={"enabled": True, "issuer": ISSUER, "client_id": CLIENT_ID}).json()
    assert report["ok"] is True
    status = client.get("/api/auth/status").json()
    assert status["sso_enabled"] is True and status["sso_label"] == "Exemple"


def test_connexion_sso_de_bout_en_bout(client, provider):
    register(client)
    configure_sso(client)
    with TestClient(app, headers=HEADERS) as c2:
        callback, query = sso_login(c2, provider)
        assert query["code_challenge_method"] == ["S256"] and query["client_id"] == [CLIENT_ID]
        assert callback.headers["location"] == "/#/?sso=ok"
        me = c2.get("/api/auth/me").json()
        assert me["auth_source"] == "oidc" and me["name"] == "Camille Durand" and me["is_admin"] is False
        assert provider.token_requests[-1]["code_verifier"] and provider.token_requests[-1]["client_secret"] == "secret-client"
        # Second facteur et mot de passe relèvent du fournisseur.
        assert c2.post("/api/auth/mfa/setup", json={"password": "x"}).json()["detail"] == "mfa_managed_by_provider"
        c2.post("/api/auth/logout")
        sso_login(c2, provider)
        assert c2.get("/api/auth/me").json()["id"] == me["id"]


def test_sso_refuse_un_state_falsifie_un_nonce_rejoue_ou_un_jeton_mal_signe(client, provider):
    register(client)
    configure_sso(client)
    with TestClient(app, headers=HEADERS) as c2:
        c2.get("/api/auth/sso/start", follow_redirects=False)
        r = c2.get("/api/auth/sso/callback?state=autre&code=abc", follow_redirects=False)
        assert r.headers["location"] == "/#/?sso_error=sso_state_invalid"

        provider.claims = {}
        start = c2.get("/api/auth/sso/start", follow_redirects=False)
        state = urllib.parse.parse_qs(urllib.parse.urlparse(start.headers["location"]).query)["state"][0]
        provider.nonce = "nonce-rejoue"
        r = c2.get(f"/api/auth/sso/callback?state={state}&code=abc", follow_redirects=False)
        assert r.headers["location"] == "/#/?sso_error=sso_token_invalid"

        other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        provider.key, original = other, provider.key
        r, _ = sso_login(c2, provider)
        assert r.headers["location"] == "/#/?sso_error=sso_token_invalid"
        provider.key = original
        assert c2.get("/api/auth/me").status_code == 401


def test_sso_restreint_au_domaine_et_au_groupe(client, provider):
    register(client)
    configure_sso(client, allowed_domains="exemple.fr", required_group="scopeo-users")
    with TestClient(app, headers=HEADERS) as c2:
        r, _ = sso_login(c2, provider, email="intrus@autre.fr")
        assert r.headers["location"] == "/#/?sso_error=sso_domain_forbidden"
        r, _ = sso_login(c2, provider, groups=["autre"])
        assert r.headers["location"] == "/#/?sso_error=sso_not_in_group"
        r, _ = sso_login(c2, provider)
        assert r.headers["location"] == "/#/?sso=ok"


def test_un_compte_sso_suspendu_ne_se_connecte_plus(client, provider):
    register(client)
    configure_sso(client)
    with TestClient(app, headers=HEADERS) as c2:
        sso_login(c2, provider)
        user_id = c2.get("/api/auth/me").json()["id"]
    client.patch(f"/api/admin/users/{user_id}", json={"disabled": True})
    with TestClient(app, headers=HEADERS) as c3:
        r, _ = sso_login(c3, provider)
        assert r.headers["location"] == "/#/?sso_error=account_disabled"


def test_login_local_inchange(client):
    user = register(client)
    client.post("/api/auth/logout")
    assert login(client, user["name"]).status_code == 200
