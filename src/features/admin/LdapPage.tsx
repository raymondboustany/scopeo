import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, CircleX, FlaskConical, KeyRound, Network, Search, ShieldCheck, UsersRound } from 'lucide-react'
import { Button, Input, Switch, Textarea } from '@/components/ui/controls'
import { Callout, Card, CardHeader, PageHeader, Tag } from '@/components/ui/primitives'
import { Field } from '@/components/auth/fields'
import { api } from '@/lib/api'
import type { LdapConfig, LdapConfigRead, LdapTestReport } from '@/types/domain'
import { tr } from '@/i18n'

const PRESETS = [
  { id: 'ad', label: 'Active Directory', filter: '(&(objectClass=user)(sAMAccountName={username}))', name: 'displayName' },
  { id: 'openldap', label: 'OpenLDAP', filter: '(&(objectClass=inetOrgPerson)(uid={username}))', name: 'cn' },
]

const STEP_LABEL: Record<string, string> = {
  config: tr('Configuration complète', 'Configuration complete'),
  connect: tr('Connexion au serveur', 'Connection to the server'),
  bind: tr('Authentification du compte de service', 'Service account authentication'),
  search: tr('Recherche dans la base', 'Search in the base'),
  group: tr('Appartenance au groupe autorisé', 'Membership of the allowed group'),
}

const DETAIL_LABEL: Record<string, string> = {
  ldap_unreachable: tr('Serveur injoignable : vérifiez l’adresse, le port et le pare-feu.', 'Server unreachable: check the address, port and firewall.'),
  ldap_tls_failed: tr('Échec du chiffrement : vérifiez le certificat du serveur.', 'Encryption failed: check the server certificate.'),
  ldap_service_bind_failed: tr('Identifiants du compte de service refusés.', 'Service account credentials rejected.'),
  ldap_user_not_found: tr('Utilisateur introuvable avec ce filtre.', 'No user found with this filter.'),
  ldap_base_dn_not_found: tr('Base de recherche introuvable.', 'Search base not found.'),
  ldap_url_invalid: tr('Adresse invalide.', 'Invalid address.'),
  ldap_base_dn_required: tr('Base de recherche manquante.', 'Search base missing.'),
  ldap_filter_invalid: tr('Filtre invalide.', 'Invalid filter.'),
  ldap_ca_invalid: tr("Certificat d'autorité illisible.", 'Unreadable authority certificate.'),
  ldap_not_in_group: tr("L'utilisateur n'appartient pas au groupe autorisé.", 'The user is not in the allowed group.'),
}

/** Détail d'une étape : code traduit, suivi des groupes trouvés pour un refus d'appartenance. */
function detailText(detail: string): string {
  const [code, extra] = detail.split('|')
  const label = DETAIL_LABEL[code] ?? code
  return extra ? `${label} ${tr('Groupes trouvés :', 'Groups found:')} ${extra}` : label
}

function toForm(c: LdapConfigRead): LdapConfig {
  const { has_bind_password: _unused, ...rest } = c
  void _unused
  return rest
}

export default function LdapPage() {
  const { data } = useQuery({ queryKey: ['admin', 'ldap'], queryFn: api.admin.ldap })
  return data ? <LdapForm initial={data} /> : null
}

function LdapForm({ initial }: { initial: LdapConfigRead }) {
  const qc = useQueryClient()
  const [data, setData] = useState(initial)
  const [form, setForm] = useState<LdapConfig>(() => toForm(initial))
  const [bindPassword, setBindPassword] = useState('')
  const [testUser, setTestUser] = useState('')
  const [report, setReport] = useState<LdapTestReport | null>(null)
  const [saved, setSaved] = useState(false)

  const payload = () => ({ ...form, bind_password: bindPassword || null, clear_bind_password: false })
  const save = useMutation({
    mutationFn: () => api.admin.saveLdap(payload()),
    onSuccess: (r) => {
      qc.setQueryData(['admin', 'ldap'], r)
      setData(r)
      setForm(toForm(r))
      setBindPassword('')
      setSaved(true)
    },
  })
  const test = useMutation({ mutationFn: () => api.admin.testLdap(payload(), testUser.trim()), onSuccess: setReport })

  const set = <K extends keyof LdapConfig>(k: K, v: LdapConfig[K]) => {
    setForm({ ...form, [k]: v })
    setSaved(false)
    setReport(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr('Administration', 'Administration')}
        title={tr('Annuaire LDAP', 'LDAP directory')}
        lead={tr(
          "Permettre aux personnes de l'organisation de se connecter avec leur compte habituel (Active Directory, OpenLDAP). Une fois activé, un onglet dédié apparaît sur la page de connexion.",
          'Let people in the organisation sign in with their usual account (Active Directory, OpenLDAP). Once on, a dedicated tab appears on the sign-in page.',
        )}
        actions={
          <>
            {data.enabled ? <Tag tone="positive">{tr('Actif', 'On')}</Tag> : <Tag>{tr('Inactif', 'Off')}</Tag>}
          </>
        }
      />

      <Card>
        <CardHeader title={tr('Serveur', 'Server')} icon={<Network size={16} />} aside={<Switch checked={form.enabled} onCheckedChange={(v) => set('enabled', v)} label={tr('Activer la connexion par annuaire', 'Enable directory sign-in')} />} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label={tr('Adresse', 'Address')}>
            <Input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="ldaps://ad.exemple.fr" className="font-mono text-xs" />
          </Field>
          <Field label={tr('Nom affiché sur la page de connexion', 'Name shown on the sign-in page')} hint={tr('facultatif', 'optional')}>
            <Input value={form.label} onChange={(e) => set('label', e.target.value)} placeholder={tr('Compte Exemple', 'Example account')} />
          </Field>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-raised px-3.5 py-3">
            <span>
              <span className="block text-sm font-medium text-ink">StartTLS</span>
              <span className="block text-2xs text-ink-3">{tr('Chiffrer une connexion ldap:// (inutile en ldaps://)', 'Encrypt an ldap:// connection (not needed with ldaps://)')}</span>
            </span>
            <Switch checked={form.start_tls} onCheckedChange={(v) => set('start_tls', v)} label="StartTLS" />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-raised px-3.5 py-3">
            <span>
              <span className="block text-sm font-medium text-ink">{tr('Vérifier le certificat', 'Verify the certificate')}</span>
              <span className="block text-2xs text-ink-3">{tr('À désactiver seulement pour un essai', 'Turn off only for a test')}</span>
            </span>
            <Switch checked={form.verify_certificate} onCheckedChange={(v) => set('verify_certificate', v)} label={tr('Vérifier le certificat', 'Verify the certificate')} />
          </label>
          {form.verify_certificate ? (
            <div className="sm:col-span-2">
              <Field
                label={tr("Certificat de l'autorité de certification", 'Certificate authority certificate')}
                hint={tr("facultatif, format PEM : si le certificat de l'annuaire est émis par une autorité interne", 'optional, PEM format: if the directory certificate is issued by an internal authority')}
              >
                <Textarea
                  value={form.ca_certificate}
                  onChange={(e) => set('ca_certificate', e.target.value)}
                  rows={3}
                  className="font-mono text-2xs"
                  placeholder="-----BEGIN CERTIFICATE-----"
                />
              </Field>
            </div>
          ) : null}
        </div>
        {form.url.startsWith('ldap://') && !form.start_tls ? (
          <div className="px-5 pb-5">
            <Callout tone="caution">
              {tr(
                'Sans ldaps:// ni StartTLS, les mots de passe circulent en clair sur le réseau. Activez l’un des deux en production.',
                'Without ldaps:// or StartTLS, passwords travel in clear text over the network. Turn one of them on in production.',
              )}
            </Callout>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title={tr('Compte de service', 'Service account')}
          subtitle={tr('Utilisé pour rechercher les utilisateurs. Laissez vide pour une recherche anonyme.', 'Used to look up users. Leave empty for an anonymous search.')}
          icon={<KeyRound size={16} />}
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label={tr('DN du compte', 'Account DN')}>
            <Input value={form.bind_dn} onChange={(e) => set('bind_dn', e.target.value)} placeholder="CN=svc-scopeo,OU=Services,DC=exemple,DC=fr" className="font-mono text-xs" />
          </Field>
          <Field label={tr('Mot de passe', 'Password')} hint={data.has_bind_password ? tr('enregistré, chiffré ; laisser vide pour le conserver', 'saved, encrypted; leave empty to keep it') : undefined}>
            <Input type="password" autoComplete="new-password" value={bindPassword} onChange={(e) => { setBindPassword(e.target.value); setSaved(false) }} placeholder={data.has_bind_password ? '••••••••' : ''} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title={tr('Recherche des utilisateurs', 'User lookup')} icon={<Search size={16} />} />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-3">{tr('Modèle :', 'Template:')}</span>
            {PRESETS.map((p) => (
              <Button key={p.id} size="sm" onClick={() => setForm({ ...form, user_filter: p.filter, name_attribute: p.name })}>
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Base de recherche', 'Search base')}>
              <Input value={form.base_dn} onChange={(e) => set('base_dn', e.target.value)} placeholder="OU=Utilisateurs,DC=exemple,DC=fr" className="font-mono text-xs" />
            </Field>
            <Field label={tr('Filtre', 'Filter')} hint="{username}">
              <Input value={form.user_filter} onChange={(e) => set('user_filter', e.target.value)} className="font-mono text-xs" />
            </Field>
            <Field label={tr('Attribut du nom affiché', 'Display name attribute')}>
              <Input value={form.name_attribute} onChange={(e) => set('name_attribute', e.target.value)} className="font-mono text-xs" />
            </Field>
            <Field label={tr('Attribut du courriel', 'Email attribute')}>
              <Input value={form.email_attribute} onChange={(e) => set('email_attribute', e.target.value)} className="font-mono text-xs" />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={tr('Restreindre l’accès', 'Restrict access')}
          subtitle={tr("Facultatif : seuls les membres de ce groupe pourront se connecter.", 'Optional: only members of this group will be able to sign in.')}
          icon={<UsersRound size={16} />}
        />
        <div className="p-5">
          <Field label={tr('Groupe autorisé', 'Allowed group')} hint={tr('nom du groupe ou DN complet, facultatif', 'group name or full DN, optional')}>
            <Input value={form.group_dn} onChange={(e) => set('group_dn', e.target.value)} placeholder="Scopeo  ou  CN=Scopeo,OU=Groupes,DC=exemple,DC=fr" className="font-mono text-xs" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={tr('Tester avant d’activer', 'Test before switching on')}
          subtitle={tr('Essaie la configuration saisie, même non enregistrée. Aucun mot de passe utilisateur n’est demandé.', 'Tries the configuration as entered, even unsaved. No user password is asked.')}
          icon={<FlaskConical size={16} />}
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-64">
              <Field label={tr('Identifiant à rechercher', 'Username to look up')} hint={tr('facultatif', 'optional')}>
                <Input value={testUser} onChange={(e) => setTestUser(e.target.value)} placeholder="c.martin" />
              </Field>
            </div>
            <Button icon={<FlaskConical size={14} />} disabled={test.isPending} onClick={() => test.mutate()}>
              {test.isPending ? tr('Test en cours…', 'Testing…') : tr('Tester', 'Test')}
            </Button>
          </div>
          {report ? (
            <ul className="divide-y divide-rule rounded-lg border border-rule">
              {report.steps.map((s) => (
                <li key={s.id} className="flex items-start gap-2.5 px-3.5 py-2.5 text-sm">
                  {s.ok ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-positive" /> : <CircleX size={16} className="mt-0.5 shrink-0 text-critical" />}
                  <span className="min-w-0">
                    <span className="block text-ink">{STEP_LABEL[s.id] ?? s.id}</span>
                    {s.detail ? <span className="block break-all font-mono text-2xs text-ink-3">{detailText(s.detail)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {test.error ? <p role="alert" className="text-xs text-critical">{test.error.message}</p> : null}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex max-w-2xl items-start gap-2 text-xs leading-relaxed text-ink-3">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          {tr(
            "Les mots de passe des utilisateurs sont vérifiés par l'annuaire et jamais conservés. Le mot de passe du compte de service est chiffré dans la base. Les comptes créés par l'annuaire sont ordinaires : le rôle administrateur s'attribue dans Comptes.",
            'User passwords are checked by the directory and never stored. The service account password is encrypted in the database. Accounts created through the directory are ordinary: the administrator role is granted in Accounts.',
          )}
        </p>
        <span className="flex items-center gap-3">
          {save.error ? <span className="text-xs text-critical">{save.error.message}</span> : saved ? <span className="text-xs text-positive">{tr('Enregistré.', 'Saved.')}</span> : null}
          <Button variant="primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {tr('Enregistrer', 'Save')}
          </Button>
        </span>
      </div>
    </div>
  )
}
