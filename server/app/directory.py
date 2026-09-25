"""Connexion par annuaire LDAP (Active Directory, OpenLDAP…).

Déroulé classique « rechercher puis lier » :

1. connexion au serveur, en LDAPS ou avec StartTLS ;
2. liaison du compte de service (ou liaison anonyme si aucun n'est défini) ;
3. recherche de l'utilisateur sous la base indiquée, avec le filtre configuré,
   dans lequel l'identifiant saisi est échappé ;
4. contrôle facultatif d'appartenance à un groupe ;
5. liaison avec le DN trouvé et le mot de passe saisi : c'est l'annuaire qui
   vérifie le mot de passe, la plateforme ne le conserve jamais.
"""

from __future__ import annotations

import ssl
from dataclasses import dataclass, field
from typing import Any, Callable
from urllib.parse import urlparse

from ldap3 import BASE, NONE, SUBTREE, Connection, Server, Tls
from ldap3.core.exceptions import LDAPException
from ldap3.utils.conv import escape_filter_chars

from .security import decrypt

DEFAULTS: dict[str, Any] = {
    "enabled": False,
    "label": "",
    "url": "",
    "start_tls": False,
    "verify_certificate": True,
    "bind_dn": "",
    "bind_password": None,  # chiffré
    "base_dn": "",
    "user_filter": "(sAMAccountName={username})",
    "name_attribute": "displayName",
    "email_attribute": "mail",
    "group_dn": "",
    # Certificat (PEM) de l'autorité interne qui a signé celui de l'annuaire, si elle
    # n'est pas connue du système (cas fréquent dans un conteneur).
    "ca_certificate": "",
}

TIMEOUT = 8


class DirectoryError(Exception):
    """Échec côté annuaire. ``code`` est un code stable, traduit par l'interface."""

    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(code)
        self.code = code
        self.detail = detail


@dataclass
class DirectoryUser:
    dn: str
    username: str
    name: str
    email: str
    # Identifiant immuable (objectGUID d'Active Directory, entryUUID d'OpenLDAP) :
    # il suit l'utilisateur quand il change d'unité d'organisation, pas le DN.
    uid: str = ""


@dataclass
class TestStep:
    id: str
    ok: bool
    detail: str = ""


@dataclass
class TestReport:
    ok: bool
    steps: list[TestStep] = field(default_factory=list)


def config_problem(config: dict[str, Any]) -> str | None:
    """Motif de refus d'une configuration, ou ``None``."""
    if not config.get("enabled"):
        return None
    parsed = urlparse(config.get("url") or "")
    if parsed.scheme not in {"ldap", "ldaps"} or not parsed.hostname:
        return "ldap_url_invalid"
    if not (config.get("base_dn") or "").strip():
        return "ldap_base_dn_required"
    template = config.get("user_filter") or ""
    if "{username}" not in template or not (template.startswith("(") and template.endswith(")")):
        return "ldap_filter_invalid"
    ca = (config.get("ca_certificate") or "").strip()
    if ca:
        try:
            ssl.create_default_context(cadata=ca)
        except (ssl.SSLError, ValueError):
            return "ldap_ca_invalid"
    return None


def _server(config: dict[str, Any]) -> Server:
    parsed = urlparse(config["url"])
    use_ssl = parsed.scheme == "ldaps"
    tls = None
    if use_ssl or config.get("start_tls"):
        ca = (config.get("ca_certificate") or "").strip() or None
        tls = Tls(validate=ssl.CERT_REQUIRED if config.get("verify_certificate", True) else ssl.CERT_NONE, ca_certs_data=ca)
    return Server(
        parsed.hostname,
        port=parsed.port or (636 if use_ssl else 389),
        use_ssl=use_ssl,
        tls=tls,
        get_info=NONE,
        connect_timeout=TIMEOUT,
    )


def _open(config: dict[str, Any], user: str | None, password: str | None) -> Connection:
    """Connexion liée. Remplacée dans les tests par un annuaire simulé."""
    conn = Connection(_server(config), user=user or None, password=password or None, receive_timeout=TIMEOUT, raise_exceptions=False)
    try:
        conn.open()
    except LDAPException as exc:
        # Un certificat refusé ne doit pas passer pour un serveur injoignable.
        text = str(exc).lower()
        code = "ldap_tls_failed" if ("certificate" in text or "ssl" in text) else "ldap_unreachable"
        raise DirectoryError(code, type(exc).__name__) from exc
    if conn.closed:
        raise DirectoryError("ldap_unreachable")
    if config.get("start_tls"):
        try:
            started = conn.start_tls()
        except LDAPException as exc:
            raise DirectoryError("ldap_tls_failed", type(exc).__name__) from exc
        if not started:
            raise DirectoryError("ldap_tls_failed")
    return conn


# Point d'injection pour les tests.
open_connection: Callable[[dict[str, Any], str | None, str | None], Connection] = _open


def _first(entry: Any, attribute: str) -> str:
    if not attribute:
        return ""
    try:
        value = entry[attribute].value
    except (KeyError, LDAPException, IndexError):
        return ""
    if isinstance(value, list):
        value = value[0] if value else ""
    return str(value or "")


def _service_connection(config: dict[str, Any]) -> Connection:
    bind_dn = (config.get("bind_dn") or "").strip()
    password = decrypt(config.get("bind_password")) if bind_dn else None
    conn = open_connection(config, bind_dn or None, password)
    if not conn.bind():
        conn.unbind()
        raise DirectoryError("ldap_service_bind_failed")
    return conn


def normalize_username(username: str) -> str:
    """« DOMAINE\\alice » devient « alice » : forme courante sur les postes Windows."""
    username = username.strip()
    if "\\" in username:
        username = username.rsplit("\\", 1)[1].strip()
    return username


def _find(conn: Connection, config: dict[str, Any], username: str) -> Any:
    attributes = [
        a
        for a in {config.get("name_attribute"), config.get("email_attribute"), "memberOf", "givenName", "sn", "sAMAccountName", "uid", "objectGUID", "entryUUID"}
        if a
    ]
    queries = [config["user_filter"].replace("{username}", escape_filter_chars(username))]
    if "@" in username:
        # Identifiant saisi sous la forme alice@domaine (nom principal Active Directory).
        queries.append(f"(userPrincipalName={escape_filter_chars(username)})")
    for query in queries:
        ok = conn.search(config["base_dn"], query, search_scope=SUBTREE, attributes=attributes, size_limit=2)
        entries = conn.entries if ok else []
        if len(entries) == 1:
            return entries[0]
        if len(entries) > 1:
            # Résultat ambigu : on refuse.
            return None
    return None


def _uid(entry: Any) -> str:
    for attribute in ("objectGUID", "entryUUID"):
        try:
            raw = entry[attribute].raw_values
        except (KeyError, LDAPException):
            continue
        if raw:
            value = raw[0]
            if isinstance(value, bytes):
                value = value.hex() if attribute == "objectGUID" else value.decode("ascii", "replace")
            return f"{attribute}:{value}"
    return ""


def _norm_dn(dn: str) -> str:
    return ",".join(part.strip() for part in str(dn).split(",")).casefold()


def _rdn_value(dn: str) -> str:
    first = str(dn).split(",", 1)[0]
    return first.split("=", 1)[-1].strip().casefold()


def member_of(entry: Any) -> list[str]:
    try:
        return [str(g) for g in entry["memberOf"].values]
    except (KeyError, LDAPException):
        return []


def _in_group(conn: Connection, config: dict[str, Any], entry: Any, username: str) -> bool:
    """Appartenance au groupe autorisé, donné par son nom (« Scopeo ») ou son DN complet."""
    group = (config.get("group_dn") or "").strip()
    if not group:
        return True
    groups = member_of(entry)
    is_dn = "=" in group
    if is_dn and any(_norm_dn(g) == _norm_dn(group) for g in groups):
        return True
    if not is_dn and any(_rdn_value(g) == group.casefold() for g in groups):
        return True
    dn = escape_filter_chars(entry.entry_dn)
    members = f"(|(member={dn})(uniqueMember={dn})(memberUid={escape_filter_chars(username)}))"
    if is_dn:
        if conn.search(group, members, search_scope=BASE, attributes=[]) and conn.entries:
            return True
    else:
        name = escape_filter_chars(group)
        query = f"(&(|(cn={name})(ou={name})){members})"
        if conn.search(config["base_dn"], query, search_scope=SUBTREE, attributes=[], size_limit=5) and conn.entries:
            return True
    return _in_nested_group(conn, config, entry, group, is_dn)


# Règle de correspondance « en chaîne » d'Active Directory : suit les groupes imbriqués.
IN_CHAIN = "1.2.840.113556.1.4.1941"


def _in_nested_group(conn: Connection, config: dict[str, Any], entry: Any, group: str, is_dn: bool) -> bool:
    """Membre d'un groupe lui-même membre du groupe autorisé (Active Directory)."""
    try:
        if is_dn:
            group_dns = [group]
        else:
            name = escape_filter_chars(group)
            if not conn.search(config["base_dn"], f"(&(objectClass=group)(cn={name}))", search_scope=SUBTREE, attributes=[], size_limit=5):
                return False
            group_dns = [e.entry_dn for e in conn.entries]
        user = escape_filter_chars(entry.entry_dn)
        for group_dn in group_dns:
            query = f"(&(distinguishedName={user})(memberOf:{IN_CHAIN}:={escape_filter_chars(group_dn)}))"
            if conn.search(config["base_dn"], query, search_scope=SUBTREE, attributes=[], size_limit=1) and conn.entries:
                return True
    except LDAPException:
        # Annuaire qui ne connaît pas cette règle (OpenLDAP…) : pas d'imbrication.
        return False
    return False


# Codes « data » renvoyés par Active Directory quand le mot de passe est juste mais
# le compte ne peut pas l'utiliser : mot de passe expiré ou à changer.
_EXPIRED = ("data 532", "data 773")


def _bind_refusal(conn: Connection) -> str:
    message = str((conn.result or {}).get("message", "")).lower()
    return "ldap_password_expired" if any(code in message for code in _EXPIRED) else "invalid_credentials"


def authenticate(config: dict[str, Any], username: str, password: str) -> DirectoryUser:
    """Utilisateur de l'annuaire si l'identifiant et le mot de passe sont valides."""
    if not config.get("enabled"):
        raise DirectoryError("ldap_disabled")
    username = normalize_username(username)
    # Un mot de passe vide produirait une liaison « non authentifiée » acceptée
    # par certains annuaires : il est refusé avant tout échange.
    if not username or not password:
        raise DirectoryError("invalid_credentials")
    try:
        service = _service_connection(config)
        try:
            entry = _find(service, config, username)
            if entry is None:
                raise DirectoryError("invalid_credentials")
            # memberUid (groupes POSIX) porte l'identifiant de l'annuaire, pas la saisie.
            if not _in_group(service, config, entry, _first(entry, "uid") or username):
                raise DirectoryError("ldap_not_in_group")
        finally:
            service.unbind()
        dn = entry.entry_dn
        user_conn = open_connection(config, dn, password)
        try:
            if not user_conn.bind():
                raise DirectoryError(_bind_refusal(user_conn))
        finally:
            user_conn.unbind()
    except LDAPException as exc:
        raise DirectoryError("ldap_unreachable", type(exc).__name__) from exc
    return DirectoryUser(
        dn=dn,
        # Identifiant de l'annuaire plutôt que la saisie (alice@domaine, DOMAINE\alice…).
        username=_first(entry, "sAMAccountName") or _first(entry, "uid") or username,
        uid=_uid(entry),
        # Nom affiché, sinon prénom et nom (souvent seuls renseignés dans OpenLDAP), sinon l'identifiant.
        name=_first(entry, config.get("name_attribute", "")) or " ".join(filter(None, [_first(entry, "givenName"), _first(entry, "sn")])) or username,
        email=_first(entry, config.get("email_attribute", "")),
    )


def test(config: dict[str, Any], username: str = "") -> TestReport:
    """Diagnostic pas à pas, sans mot de passe utilisateur : connexion, compte de service, recherche."""
    report = TestReport(ok=False)
    problem = config_problem({**config, "enabled": True})
    report.steps.append(TestStep("config", problem is None, problem or ""))
    if problem:
        return report
    try:
        conn = open_connection(config, None, None)
        conn.unbind()
        report.steps.append(TestStep("connect", True))
    except (DirectoryError, LDAPException) as exc:
        report.steps.append(TestStep("connect", False, getattr(exc, "code", type(exc).__name__)))
        return report
    try:
        service = _service_connection(config)
        report.steps.append(TestStep("bind", True))
    except (DirectoryError, LDAPException) as exc:
        report.steps.append(TestStep("bind", False, getattr(exc, "code", type(exc).__name__)))
        return report
    try:
        username = normalize_username(username)
        if username:
            entry = _find(service, config, username)
            report.steps.append(TestStep("search", entry is not None, entry.entry_dn if entry is not None else "ldap_user_not_found"))
            if entry is not None and (config.get("group_dn") or "").strip():
                allowed = _in_group(service, config, entry, username)
                # En cas d'échec, les groupes trouvés aident à corriger la saisie.
                found = ", ".join(_rdn_value(g) for g in member_of(entry)[:6])
                report.steps.append(TestStep("group", allowed, "" if allowed else f"ldap_not_in_group|{found}"))
        else:
            ok = service.search(config["base_dn"], "(objectClass=*)", search_scope=BASE, attributes=[])
            report.steps.append(TestStep("search", bool(ok), "" if ok else "ldap_base_dn_not_found"))
    finally:
        service.unbind()
    report.ok = all(step.ok for step in report.steps)
    return report
