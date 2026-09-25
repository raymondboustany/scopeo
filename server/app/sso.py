"""Connexion unique par OpenID Connect (Microsoft Entra ID, Google, Okta, Keycloak…).

Flux « code d'autorisation » avec PKCE, le plus sûr pour une application web :

1. ``/api/auth/sso/start`` redirige vers le fournisseur, avec un ``state``
   (lié au navigateur par un cookie éphémère), un ``nonce`` et un défi PKCE ;
2. le fournisseur authentifie la personne (mot de passe, second facteur,
   règles d'accès de l'organisation) : Scopeo ne voit jamais le mot de passe ;
3. ``/api/auth/sso/callback`` échange le code contre un jeton d'identité,
   dont la signature, l'émetteur, l'audience, l'échéance et le nonce sont vérifiés.

Seule l'identité est reçue (identifiant stable, nom, courriel, groupes) ;
aucune donnée de cadrage n'est transmise au fournisseur.
"""

from __future__ import annotations

import base64
import hashlib
import json
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable

import jwt

from .security import decrypt

DEFAULTS: dict[str, Any] = {
    "enabled": False,
    "label": "",
    "issuer": "",
    "client_id": "",
    "client_secret": None,  # chiffré
    "scopes": "openid profile email",
    "allowed_domains": "",
    "groups_claim": "groups",
    "required_group": "",
}

TIMEOUT = 10
ALGORITHMS = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512"]
STATE_TTL = 10 * 60
STATE_COOKIE = "scopeo_sso"
CALLBACK_PATH = "/api/auth/sso/callback"


class SsoError(Exception):
    """Échec de la connexion unique. ``code`` est un code stable, traduit par l'interface."""

    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(code)
        self.code = code
        self.detail = detail


@dataclass
class SsoIdentity:
    issuer: str
    subject: str
    name: str
    email: str


# ---------------------------------------------------------------------------
# Échanges HTTP (remplaçables dans les tests)
# ---------------------------------------------------------------------------


def _http_json(url: str, data: dict[str, str] | None = None) -> dict[str, Any]:
    if not url.startswith("https://") and not url.startswith("http://localhost") and not url.startswith("http://127.0.0.1"):
        raise SsoError("sso_insecure_url", url)
    body = urllib.parse.urlencode(data).encode("ascii") if data is not None else None
    request = urllib.request.Request(url, data=body, headers={"Accept": "application/json", "User-Agent": "Scopeo"})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:  # noqa: S310 (schéma contrôlé ci-dessus)
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise SsoError("sso_provider_error", f"HTTP {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise SsoError("sso_unreachable", type(exc).__name__) from exc


fetch_json: Callable[[str, dict[str, str] | None], dict[str, Any]] = _http_json


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


def config_problem(config: dict[str, Any]) -> str | None:
    if not config.get("enabled"):
        return None
    issuer = (config.get("issuer") or "").strip()
    if not issuer.startswith("https://") and not issuer.startswith("http://localhost"):
        return "sso_issuer_invalid"
    if not (config.get("client_id") or "").strip():
        return "sso_client_id_required"
    if "openid" not in (config.get("scopes") or "").split():
        return "sso_scopes_invalid"
    return None


_discovery_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_cache_lock = threading.Lock()


def discover(issuer: str) -> dict[str, Any]:
    """Document de découverte OIDC, mis en cache une heure."""
    issuer = issuer.rstrip("/")
    with _cache_lock:
        cached = _discovery_cache.get(issuer)
        if cached and time.time() - cached[0] < 3600:
            return cached[1]
    doc = fetch_json(f"{issuer}/.well-known/openid-configuration", None)
    for key in ("authorization_endpoint", "token_endpoint", "jwks_uri", "issuer"):
        if not doc.get(key):
            raise SsoError("sso_discovery_invalid", key)
    with _cache_lock:
        _discovery_cache[issuer] = (time.time(), doc)
    return doc


def clear_cache() -> None:
    with _cache_lock:
        _discovery_cache.clear()


# ---------------------------------------------------------------------------
# Démarrage et retour
# ---------------------------------------------------------------------------


@dataclass
class PendingLogin:
    nonce: str
    verifier: str
    redirect_uri: str
    expires: float


class PendingStore:
    def __init__(self) -> None:
        self._items: dict[str, PendingLogin] = {}
        self._lock = threading.Lock()

    def add(self, state: str, item: PendingLogin) -> None:
        with self._lock:
            now = time.time()
            for key in [k for k, v in self._items.items() if v.expires < now]:
                del self._items[key]
            self._items[state] = item

    def pop(self, state: str) -> PendingLogin | None:
        with self._lock:
            item = self._items.pop(state, None)
        return item if item and item.expires >= time.time() else None

    def clear(self) -> None:
        with self._lock:
            self._items.clear()


pending = PendingStore()


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def start(config: dict[str, Any], redirect_uri: str) -> tuple[str, str]:
    """URL d'autorisation et ``state`` à lier au navigateur."""
    doc = discover(config["issuer"])
    state = secrets.token_urlsafe(24)
    nonce = secrets.token_urlsafe(24)
    verifier = secrets.token_urlsafe(48)
    challenge = _b64url(hashlib.sha256(verifier.encode("ascii")).digest())
    pending.add(state, PendingLogin(nonce=nonce, verifier=verifier, redirect_uri=redirect_uri, expires=time.time() + STATE_TTL))
    params = {
        "response_type": "code",
        "client_id": config["client_id"],
        "redirect_uri": redirect_uri,
        "scope": config.get("scopes") or "openid profile email",
        "state": state,
        "nonce": nonce,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    }
    separator = "&" if "?" in doc["authorization_endpoint"] else "?"
    return f"{doc['authorization_endpoint']}{separator}{urllib.parse.urlencode(params)}", state


def _claim_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value]
    if isinstance(value, str) and value:
        return [value]
    return []


def finish(config: dict[str, Any], state: str, code: str) -> SsoIdentity:
    """Échange le code et vérifie le jeton d'identité. Lève ``SsoError`` au moindre écart."""
    login = pending.pop(state)
    if login is None:
        raise SsoError("sso_state_invalid")
    doc = discover(config["issuer"])
    form = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": login.redirect_uri,
        "client_id": config["client_id"],
        "code_verifier": login.verifier,
    }
    secret = decrypt(config.get("client_secret"))
    if secret:
        form["client_secret"] = secret
    tokens = fetch_json(doc["token_endpoint"], form)
    id_token = tokens.get("id_token")
    if not id_token:
        raise SsoError("sso_no_id_token")

    try:
        header = jwt.get_unverified_header(id_token)
        if header.get("alg") not in ALGORITHMS:
            raise SsoError("sso_token_invalid", f"alg {header.get('alg')}")
        keys = jwt.PyJWKSet.from_dict(fetch_json(doc["jwks_uri"], None))
        kid = header.get("kid")
        candidates = [k for k in keys.keys if kid is None or k.key_id == kid]
        if not candidates:
            raise SsoError("sso_token_invalid", "kid")
        claims = jwt.decode(
            id_token,
            key=candidates[0].key,
            algorithms=ALGORITHMS,
            audience=config["client_id"],
            issuer=doc["issuer"],
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
            leeway=60,
        )
    except jwt.PyJWTError as exc:
        raise SsoError("sso_token_invalid", type(exc).__name__) from exc
    if claims.get("nonce") != login.nonce:
        raise SsoError("sso_token_invalid", "nonce")

    email = str(claims.get("email") or claims.get("preferred_username") or "")
    domains = [d.strip().lower().lstrip("@") for d in (config.get("allowed_domains") or "").split(",") if d.strip()]
    if domains:
        domain = email.rsplit("@", 1)[-1].lower() if "@" in email else ""
        if domain not in domains or claims.get("email_verified") is False:
            raise SsoError("sso_domain_forbidden")
    required = (config.get("required_group") or "").strip()
    if required:
        groups = _claim_list(claims.get(config.get("groups_claim") or "groups"))
        if required not in groups:
            raise SsoError("sso_not_in_group")

    name = str(claims.get("name") or " ".join(filter(None, [claims.get("given_name"), claims.get("family_name")])) or email or claims["sub"])
    return SsoIdentity(issuer=doc["issuer"], subject=str(claims["sub"]), name=name.strip(), email=email if "@" in email else "")


def test(config: dict[str, Any]) -> list[tuple[str, bool, str]]:
    """Diagnostic : configuration, puis découverte du fournisseur."""
    steps: list[tuple[str, bool, str]] = []
    problem = config_problem({**config, "enabled": True})
    steps.append(("config", problem is None, problem or ""))
    if problem:
        return steps
    try:
        clear_cache()
        doc = discover(config["issuer"])
        steps.append(("discovery", True, doc["issuer"]))
        fetch_json(doc["jwks_uri"], None)
        steps.append(("keys", True, ""))
    except SsoError as exc:
        steps.append(("discovery" if len(steps) == 1 else "keys", False, exc.code))
    return steps
