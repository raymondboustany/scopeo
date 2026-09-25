from __future__ import annotations

import uuid

import pytest

from fastapi.testclient import TestClient

from app.auth import sessions, throttle
from app.db import engine
from app.main import DEMO_ENTITY_ID, app
from app.models import User
from sqlmodel import Session, select

PASSWORD = "correct horse battery"
HEADERS = {"X-Scopeo": "1"}


@pytest.fixture(scope="module", autouse=True)
def _administrateur():
    """Un administrateur existe d'emblée : les comptes créés par les tests sont ordinaires."""
    from app.db import init_db

    init_db()
    with Session(engine) as session:
        session.add(User(name=f"Administrateur {uuid.uuid4().hex[:6]}", is_admin=True))
        session.commit()


@pytest.fixture()
def client():
    throttle.clear()
    with TestClient(app, headers=HEADERS) as c:
        yield c


def unique(name: str) -> str:
    return f"{name} {uuid.uuid4().hex[:6]}"


def register(client, name=None, password=PASSWORD, **extra):
    name = name or unique("Claire Martin")
    r = client.post(
        "/api/auth/register",
        json={"name": name, "role": "consultant", "password": password, "password_confirm": password, **extra},
    )
    assert r.status_code == 201, r.text
    return r.json()


# ---------------------------------------------------------------------------
# Authentification
# ---------------------------------------------------------------------------


def test_le_mot_de_passe_n_est_jamais_stocke_en_clair(client):
    user = register(client)
    with Session(engine) as session:
        stored = session.get(User, user["id"])
        assert stored.password_hash and stored.password_hash.startswith("$2")
        assert PASSWORD not in stored.password_hash
    assert "password" not in user and "password_hash" not in user


def test_la_creation_exige_une_confirmation_identique_et_un_mot_de_passe_suffisant(client):
    r = client.post("/api/auth/register", json={"name": unique("A"), "password": PASSWORD, "password_confirm": "autre chose"})
    assert r.status_code == 422 and r.json()["detail"] == "password_mismatch"
    r = client.post("/api/auth/register", json={"name": unique("B"), "password": "court", "password_confirm": "court"})
    assert r.json()["detail"] == "password_too_short"
    long = "é" * 40
    r = client.post("/api/auth/register", json={"name": unique("C"), "password": long, "password_confirm": long})
    assert r.json()["detail"] == "password_too_long"


def test_deux_profils_ne_peuvent_pas_porter_le_meme_nom(client):
    name = unique("Doublon")
    register(client, name=name)
    r = client.post("/api/auth/register", json={"name": name.upper(), "password": PASSWORD, "password_confirm": PASSWORD})
    assert r.status_code == 409 and r.json()["detail"] == "name_taken"


def test_connexion_deconnexion_et_invalidation_cote_serveur(client):
    user = register(client)
    assert client.get("/api/auth/me").json()["id"] == user["id"]

    token = client.cookies.get("scopeo_session")
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401

    # Rejouer l'ancien cookie ne rouvre pas la session : elle est détruite au serveur.
    client.cookies.set("scopeo_session", token)
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.clear()

    r = client.post("/api/auth/login", json={"name": user["name"], "password": PASSWORD})
    assert r.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_un_mauvais_mot_de_passe_est_refuse_puis_la_connexion_est_suspendue(client):
    user = register(client)
    client.post("/api/auth/logout")
    for _ in range(5):
        r = client.post("/api/auth/login", json={"name": user["name"], "password": "mauvais mot de passe"})
        assert r.status_code == 401 and r.json()["detail"] == "invalid_credentials"
    r = client.post("/api/auth/login", json={"name": user["name"], "password": PASSWORD})
    assert r.status_code == 429 and "Retry-After" in r.headers


def test_le_cookie_de_session_est_http_only_et_same_site_strict(client):
    r = client.post("/api/auth/register", json={"name": unique("Cookie"), "password": PASSWORD, "password_confirm": PASSWORD})
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie


def test_une_ecriture_sans_en_tete_anti_csrf_est_refusee():
    with TestClient(app) as bare:
        r = bare.post("/api/auth/register", json={"name": unique("X"), "password": PASSWORD, "password_confirm": PASSWORD})
        assert r.status_code == 403 and r.json()["detail"] == "csrf"


def test_un_profil_sans_mot_de_passe_ne_peut_etre_ni_ouvert_ni_revendique(client):
    name = unique("Ancien profil")
    with Session(engine) as session:
        session.add(User(name=name, role="dpo"))
        session.commit()
    r = client.post("/api/auth/login", json={"name": name, "password": PASSWORD})
    assert r.status_code == 401 and r.json()["detail"] == "invalid_credentials"
    # Seul un administrateur peut lui attribuer un mot de passe provisoire.
    assert client.post("/api/auth/setup-password", json={"name": name, "password": PASSWORD, "password_confirm": PASSWORD}).status_code in {404, 405}


def test_le_changement_de_mot_de_passe_exige_l_ancien(client):
    register(client)
    r = client.post("/api/auth/password", json={"current": "faux", "password": "nouveau mot de passe", "password_confirm": "nouveau mot de passe"})
    assert r.status_code == 401
    r = client.post("/api/auth/password", json={"current": PASSWORD, "password": "nouveau mot de passe", "password_confirm": "nouveau mot de passe"})
    assert r.status_code == 204


def test_une_session_invitee_est_effacee_a_la_deconnexion(client):
    guest = client.post("/api/auth/guest").json()
    e = client.post(f"/api/users/{guest['id']}/entities", json={"name": "Brouillon"}).json()
    client.post("/api/auth/logout")
    with Session(engine) as session:
        assert session.get(User, guest["id"]) is None
    register(client)
    assert client.get(f"/api/entities/{e['id']}").status_code == 404


def test_les_routes_exigent_une_session(client):
    assert client.get(f"/api/entities/{DEMO_ENTITY_ID}").status_code == 401
    assert client.get("/api/users/quelconque/entities").status_code == 401


# ---------------------------------------------------------------------------
# Isolement
# ---------------------------------------------------------------------------


def test_profil_et_entites_sont_isoles(client):
    user = register(client)
    a = client.post(f"/api/users/{user['id']}/entities", json={"name": "Alpha"}).json()
    b = client.post(f"/api/users/{user['id']}/entities", json={"name": "Bêta"}).json()

    client.patch(f"/api/entities/{a['id']}", json={"answers": {"secteur": "energie"}})
    client.patch(f"/api/entities/{b['id']}", json={"name": "Bêta renommée"})

    assert client.get(f"/api/entities/{a['id']}").json()["answers"] == {"secteur": "energie"}
    assert client.get(f"/api/entities/{b['id']}").json()["answers"] == {}

    assert client.delete(f"/api/entities/{a['id']}").status_code == 204
    names = [e["name"] for e in client.get(f"/api/users/{user['id']}/entities").json()]
    assert names == ["Bêta renommée"]


def test_un_profil_ne_voit_ni_ne_modifie_les_entites_d_un_autre(client):
    owner = register(client)
    e = client.post(f"/api/users/{owner['id']}/entities", json={"name": "Confidentielle"}).json()
    client.post("/api/auth/logout")

    intruder = register(client)
    assert client.get(f"/api/entities/{e['id']}").status_code == 404
    assert client.patch(f"/api/entities/{e['id']}", json={"name": "x"}).status_code == 404
    assert client.delete(f"/api/entities/{e['id']}").status_code == 404
    assert client.get(f"/api/users/{owner['id']}/entities").status_code == 404
    assert client.post(f"/api/users/{owner['id']}/entities", json={"name": "Intrus"}).status_code == 404
    assert client.get(f"/api/users/{intruder['id']}/entities").json() == []


def test_la_premiere_modification_fige_une_revision(client):
    user = register(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "E", "answers": {"secteur": "banque"}}).json()
    client.patch(f"/api/entities/{e['id']}", json={"answers": {"secteur": "energie"}})
    revisions = client.get(f"/api/entities/{e['id']}/revisions").json()
    assert len(revisions) == 1
    assert revisions[0]["answers"] == {"secteur": "banque"}


def test_supprimer_un_profil_exige_le_mot_de_passe_et_supprime_ses_entites(client):
    user = register(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "Z"}).json()
    assert client.request("DELETE", f"/api/users/{user['id']}", json={"password": "faux"}).status_code == 401
    assert client.request("DELETE", f"/api/users/{user['id']}", json={"password": PASSWORD}).status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    register(client)
    assert client.get(f"/api/entities/{e['id']}").status_code == 404


# ---------------------------------------------------------------------------
# Trust Center et démonstration
# ---------------------------------------------------------------------------


def test_le_partage_se_revoque(client):
    user = register(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "Partagée"}).json()
    token = e["share_token"]
    assert client.get(f"/api/public/{token}").status_code == 404

    client.put(f"/api/entities/{e['id']}/share", json={"enabled": True})
    assert client.get(f"/api/public/{token}").json()["name"] == "Partagée"

    rotated = client.put(f"/api/entities/{e['id']}/share", json={"enabled": True, "rotate": True}).json()
    assert client.get(f"/api/public/{token}").status_code == 404
    assert client.get(f"/api/public/{rotated['share_token']}").status_code == 200


def test_la_vue_publique_n_expose_que_l_instantane(client):
    user = register(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "S", "answers": {"chiffre_affaires": "gt1000"}}).json()
    client.patch(f"/api/entities/{e['id']}", json={"public_snapshot": {"score": 42}})
    client.put(f"/api/entities/{e['id']}/share", json={"enabled": True})
    body = client.get(f"/api/public/{e['share_token']}").json()
    assert set(body) == {"name", "is_demo", "updated_at", "snapshot"}
    assert "answers" not in body


def test_la_demonstration_est_en_lecture_seule_mais_copiable(client):
    user = register(client)
    demo = client.get(f"/api/entities/{DEMO_ENTITY_ID}")
    if demo.status_code == 404:
        pytest.skip("Graine de démonstration absente")
    assert client.patch(f"/api/entities/{DEMO_ENTITY_ID}", json={"name": "x"}).status_code == 403
    copy = client.post(f"/api/users/{user['id']}/entities/from-demo").json()
    assert copy["answers"] == demo.json()["answers"]
    assert copy["is_demo"] is False and copy["share_enabled"] is False
    assert copy["contacts"]
    assert client.patch(f"/api/entities/{copy['id']}", json={"name": "Ma copie"}).status_code == 200


def test_la_demonstration_est_publique(client):
    public = client.get("/api/public/demo")
    assert public.status_code == 200
    body = public.json()
    assert body["is_demo"] is True
    assert body["snapshot"]["score"] >= 0
    assert "contacts" not in body and "answers" not in body


# ---------------------------------------------------------------------------
# Fiche, notes et ISO 27001
# ---------------------------------------------------------------------------


def test_fiche_notes_et_controles_iso_sont_enregistres(client):
    user = register(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "Client A", "profile": {"mode": "client"}}).json()
    assert e["profile"]["mode"] == "client"
    assert e["iso_controls"] == {}
    note = {"id": "n1", "tag": "verifier", "text": "Confirmer l'agrément", "anchor": {"kind": "general", "id": "", "label": ""}}
    saved = client.patch(
        f"/api/entities/{e['id']}",
        json={
            "notes": [note],
            "profile": {"mode": "client", "iso27001": {"status": "certifie", "validUntil": "2027-06-30", "perimeter": "integral"}},
            "iso_controls": {"themes": {"A5": {"applicability": "applicable", "implementation": "mis_en_oeuvre"}}},
        },
    ).json()
    assert saved["notes"][0]["text"] == "Confirmer l'agrément"
    assert saved["profile"]["iso27001"]["status"] == "certifie"
    assert saved["iso_controls"]["themes"]["A5"]["implementation"] == "mis_en_oeuvre"


def test_la_declaration_d_applicabilite_se_depose_se_relit_et_se_retire(client):
    user = register(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "SoA"}).json()
    content = "Contrôle;Applicable\nA.5.1;Oui\n".encode("utf-8")
    r = client.put(f"/api/entities/{e['id']}/soa", params={"name": "../../soa.csv"}, content=content, headers={"Content-Type": "text/csv"})
    assert r.status_code == 200
    assert "/" not in r.json()["name"]
    got = client.get(f"/api/entities/{e['id']}/soa")
    assert got.content == content
    assert got.headers["content-disposition"].startswith("attachment")

    bad = client.put(f"/api/entities/{e['id']}/soa", params={"name": "x.html"}, content=b"<script>", headers={"Content-Type": "text/html"})
    assert bad.status_code == 415
    assert client.delete(f"/api/entities/{e['id']}/soa").status_code == 204
    assert client.get(f"/api/entities/{e['id']}/soa").status_code == 404


def test_les_reponses_portent_les_en_tetes_de_securite(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"


@pytest.fixture(autouse=True)
def _reset_sessions():
    yield
    sessions.clear()
