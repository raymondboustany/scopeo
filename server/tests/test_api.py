from __future__ import annotations

import os
import tempfile

import pytest

# Base de test isolée, créée avant l'import de l'application.
_tmp = tempfile.mkdtemp()
os.environ["SCOPEO_DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import DEMO_ENTITY_ID, app  # noqa: E402


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def make_user(client, name="Claire Martin", **extra):
    r = client.post("/api/users", json={"name": name, "role": "consultant", **extra})
    assert r.status_code == 201
    return r.json()


def test_profil_et_entites_sont_isoles(client):
    user = make_user(client)
    a = client.post(f"/api/users/{user['id']}/entities", json={"name": "Alpha"}).json()
    b = client.post(f"/api/users/{user['id']}/entities", json={"name": "Bêta"}).json()

    client.patch(f"/api/entities/{a['id']}", json={"answers": {"secteur": "energie"}})
    client.patch(f"/api/entities/{b['id']}", json={"name": "Bêta renommée"})

    assert client.get(f"/api/entities/{a['id']}").json()["answers"] == {"secteur": "energie"}
    assert client.get(f"/api/entities/{b['id']}").json()["answers"] == {}

    assert client.delete(f"/api/entities/{a['id']}").status_code == 204
    names = [e["name"] for e in client.get(f"/api/users/{user['id']}/entities").json()]
    assert names == ["Bêta renommée"]


def test_un_profil_invite_n_apparait_pas_dans_la_liste(client):
    make_user(client, name="Invité", is_guest=True)
    listed = [u["name"] for u in client.get("/api/users").json()]
    assert "Invité" not in listed
    assert "Démonstration" not in listed


def test_la_premiere_modification_fige_une_revision(client):
    user = make_user(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "E", "answers": {"secteur": "banque"}}).json()
    client.patch(f"/api/entities/{e['id']}", json={"answers": {"secteur": "energie"}})
    revisions = client.get(f"/api/entities/{e['id']}/revisions").json()
    assert len(revisions) == 1
    assert revisions[0]["answers"] == {"secteur": "banque"}


def test_le_partage_se_revoque(client):
    user = make_user(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "Partagée"}).json()
    token = e["share_token"]
    assert client.get(f"/api/public/{token}").status_code == 404

    client.put(f"/api/entities/{e['id']}/share", json={"enabled": True})
    assert client.get(f"/api/public/{token}").json()["name"] == "Partagée"

    rotated = client.put(f"/api/entities/{e['id']}/share", json={"enabled": True, "rotate": True}).json()
    assert client.get(f"/api/public/{token}").status_code == 404
    assert client.get(f"/api/public/{rotated['share_token']}").status_code == 200


def test_la_vue_publique_n_expose_que_l_instantane(client):
    user = make_user(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "S", "answers": {"chiffre_affaires": "gt1000"}}).json()
    client.patch(f"/api/entities/{e['id']}", json={"public_snapshot": {"score": 42}})
    client.put(f"/api/entities/{e['id']}/share", json={"enabled": True})
    body = client.get(f"/api/public/{e['share_token']}").json()
    assert set(body) == {"name", "is_demo", "updated_at", "snapshot"}
    assert "answers" not in body


def test_la_demonstration_est_en_lecture_seule_mais_copiable(client):
    demo = client.get(f"/api/entities/{DEMO_ENTITY_ID}")
    if demo.status_code == 404:
        pytest.skip("Graine de démonstration absente")
    assert client.patch(f"/api/entities/{DEMO_ENTITY_ID}", json={"name": "x"}).status_code == 403
    user = make_user(client)
    copy = client.post(f"/api/users/{user['id']}/entities/from-demo").json()
    assert copy["answers"] == demo.json()["answers"]
    assert client.patch(f"/api/entities/{copy['id']}", json={"name": "Ma copie"}).status_code == 200


def test_supprimer_un_profil_supprime_ses_entites(client):
    user = make_user(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "Z"}).json()
    assert client.delete(f"/api/users/{user['id']}").status_code == 204
    assert client.get(f"/api/entities/{e['id']}").status_code == 404


def test_la_demonstration_est_publique(client):
    public = client.get("/api/public/demo")
    assert public.status_code == 200
    body = public.json()
    assert body["is_demo"] is True
    assert body["snapshot"]["score"] >= 0
    # Aucune donnée interne dans la vue publique.
    assert "contacts" not in body and "answers" not in body


def test_la_copie_de_la_demonstration_est_modifiable_et_privee(client):
    user = make_user(client)
    copy = client.post(f"/api/users/{user['id']}/entities/from-demo").json()
    assert copy["is_demo"] is False
    assert copy["share_enabled"] is False
    assert copy["contacts"]


def test_fiche_et_notes_sont_enregistrees(client):
    user = make_user(client)
    e = client.post(f"/api/users/{user['id']}/entities", json={"name": "Client A", "profile": {"mode": "client"}}).json()
    assert e["profile"]["mode"] == "client"
    note = {"id": "n1", "tag": "verifier", "text": "Confirmer l'agrément", "anchor": {"kind": "general", "id": "", "label": ""}}
    saved = client.patch(f"/api/entities/{e['id']}", json={"notes": [note]}).json()
    assert saved["notes"][0]["text"] == "Confirmer l'agrément"
