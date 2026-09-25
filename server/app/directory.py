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
    return None


def _server(config: dict[str, Any]) -> Server:
    parsed = urlparse(config["url"])
    use_ssl = parsed.scheme == "ldaps"
    tls = None
    if use_ssl or config.get("start_tls"):
        tls = Tls(validate=ssl.CERT_REQUIRED if config.get("verify_certificate", True) else ssl.CERT_NONE)
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
        raise DirectoryError("ldap_unreachable", type(exc).__name__) from exc
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


def _find(conn: Connection, config: dict[str, Any], username: str) -> Any:
    query = config["user_filter"].replace("{username}", escape_filter_chars(username))
    attributes = [a for a in {config.get("name_attribute"), config.get("email_attribute"), "memberOf"} if a]
    ok = conn.search(config["base_dn"], query, search_scope=SUBTREE, attributes=attributes, size_limit=2)
    entries = conn.entries if ok else []
    if len(entries) != 1:
        # Aucun résultat ou résultat ambigu : dans les deux cas, on refuse.
        return None
    return entries[0]


def _in_group(conn: Connection, config: dict[str, Any], entry: Any, username: str) -> bool:
    group = (config.get("group_dn") or "").strip()
    if not group:
        return True
    try:
        member_of = entry["memberOf"].values
    except (KeyError, LDAPException):
        member_of = []
    if any(str(g).casefold() == group.casefold() for g in member_of):
        return True
    dn = escape_filter_chars(entry.entry_dn)
    query = f"(|(member={dn})(uniqueMember={dn})(memberUid={escape_filter_chars(username)}))"
    return bool(conn.search(group, query, search_scope=BASE, attributes=[]) and conn.entries)


def authenticate(config: dict[str, Any], username: str, password: str) -> DirectoryUser:
    """Utilisateur de l'annuaire si l'identifiant et le mot de passe sont valides."""
    if not config.get("enabled"):
        raise DirectoryError("ldap_disabled")
    username = username.strip()
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
            if not _in_group(service, config, entry, username):
                raise DirectoryError("ldap_not_in_group")
        finally:
            service.unbind()
        dn = entry.entry_dn
        user_conn = open_connection(config, dn, password)
        try:
            if not user_conn.bind():
                raise DirectoryError("invalid_credentials")
        finally:
            user_conn.unbind()
    except LDAPException as exc:
        raise DirectoryError("ldap_unreachable", type(exc).__name__) from exc
    return DirectoryUser(
        dn=dn,
        username=username,
        name=_first(entry, config.get("name_attribute", "")) or username,
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
        if username.strip():
            entry = _find(service, config, username.strip())
            report.steps.append(TestStep("search", entry is not None, entry.entry_dn if entry is not None else "ldap_user_not_found"))
            if entry is not None and (config.get("group_dn") or "").strip():
                report.steps.append(TestStep("group", _in_group(service, config, entry, username.strip())))
        else:
            ok = service.search(config["base_dn"], "(objectClass=*)", search_scope=BASE, attributes=[])
            report.steps.append(TestStep("search", bool(ok), "" if ok else "ldap_base_dn_not_found"))
    finally:
        service.unbind()
    report.ok = all(step.ok for step in report.steps)
    return report
