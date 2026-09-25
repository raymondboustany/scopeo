import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CircleCheck, CircleX, Copy, FlaskConical, KeySquare, ShieldCheck, UsersRound } from 'lucide-react'
import { Button, Input, Switch } from '@/components/ui/controls'
import { Callout, Card, CardHeader, PageHeader, Tag } from '@/components/ui/primitives'
import { Field } from '@/components/auth/fields'
import { api, messageFor } from '@/lib/api'
import type { LdapTestReport, SsoConfig, SsoConfigRead } from '@/types/domain'
import { tr } from '@/i18n'

/** Adresse de l'émetteur pour les fournisseurs courants : à compléter par l'administrateur. */
const PRESETS = [
  { id: 'entra', label: 'Microsoft Entra ID', issuer: 'https://login.microsoftonline.com/<tenant-id>/v2.0', name: 'Microsoft' },
  { id: 'google', label: 'Google Workspace', issuer: 'https://accounts.google.com', name: 'Google' },
  { id: 'okta', label: 'Okta', issuer: 'https://<organisation>.okta.com', name: 'Okta' },
  { id: 'keycloak', label: 'Keycloak', issuer: 'https://<serveur>/realms/<realm>', name: 'Keycloak' },
]

const STEP_LABEL: Record<string, string> = {
  config: tr('Configuration complète', 'Configuration complete'),
  discovery: tr('Découverte du fournisseur', 'Provider discovery'),
  keys: tr('Clés de signature', 'Signing keys'),
}

function toForm(c: SsoConfigRead): SsoConfig {
  const { has_client_secret: _a, redirect_uri: _b, ...rest } = c
  void _a
  void _b
  return rest
}

export default function SsoPage() {
  const { data } = useQuery({ queryKey: ['admin', 'sso'], queryFn: api.admin.sso })
  return data ? <SsoForm initial={data} /> : null
}

function SsoForm({ initial }: { initial: SsoConfigRead }) {
  const qc = useQueryClient()
  const [data, setData] = useState(initial)
  const [form, setForm] = useState<SsoConfig>(() => toForm(initial))
  const [secret, setSecret] = useState('')
  const [report, setReport] = useState<LdapTestReport | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const payload = () => ({ ...form, client_secret: secret || null, clear_client_secret: false })
  const save = useMutation({
    mutationFn: () => api.admin.saveSso(payload()),
    onSuccess: (r) => {
      qc.setQueryData(['admin', 'sso'], r)
      void qc.invalidateQueries({ queryKey: ['auth-status'] })
      setData(r)
      setForm(toForm(r))
      setSecret('')
      setSaved(true)
    },
  })
  const test = useMutation({ mutationFn: () => api.admin.testSso(payload()), onSuccess: setReport })
  const set = <K extends keyof SsoConfig>(k: K, v: SsoConfig[K]) => {
    setForm({ ...form, [k]: v })
    setSaved(false)
    setReport(null)
  }
  const localAddress = /^http:\/\/(localhost|127\.0\.0\.1)/.test(data.redirect_uri)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr('Administration', 'Administration')}
        title={tr('Connexion unique (SSO)', 'Single sign-on (SSO)')}
        lead={tr(
          "Permettre de se connecter avec le compte de l'organisation (Microsoft Entra ID, Google, Okta, Keycloak…) par le protocole OpenID Connect. Scopeo ne voit jamais le mot de passe ; seule l'identité est reçue.",
          "Let people sign in with their organisation account (Microsoft Entra ID, Google, Okta, Keycloak…) through OpenID Connect. Scopeo never sees the password; only the identity is received.",
        )}
        actions={data.enabled ? <Tag tone="positive">{tr('Active', 'On')}</Tag> : <Tag>{tr('Inactive', 'Off')}</Tag>}
      />

      <Card>
        <CardHeader
          title={tr('1. Déclarer Scopeo chez le fournisseur', '1. Register Scopeo with the provider')}
          subtitle={tr('Créez une application « web » et indiquez cette adresse de retour :', 'Create a "web" application and enter this redirect address:')}
          icon={<KeySquare size={16} />}
        />
        <div className="space-y-3 p-5">
          <div className="flex items-center gap-2 rounded-lg border border-rule bg-raised p-2.5">
            <code className="flex-1 break-all font-mono text-xs text-ink">{data.redirect_uri}</code>
            <Button
              size="sm"
              icon={copied ? <Check size={13} /> : <Copy size={13} />}
              onClick={async () => {
                await navigator.clipboard.writeText(data.redirect_uri)
                setCopied(true)
              }}
            >
              {copied ? tr('Copiée', 'Copied') : tr('Copier', 'Copy')}
            </Button>
          </div>
          {localAddress ? (
            <Callout tone="caution">
              {tr(
                "Cette adresse est locale. Pour une équipe, renseignez d'abord l'adresse publique de Scopeo (https://…) dans Réglages : c'est elle que le fournisseur doit connaître.",
                "This address is local. For a team, first set Scopeo's public address (https://…) in Settings: that is the one the provider must know.",
              )}
            </Callout>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={tr('2. Relier le fournisseur', '2. Connect the provider')}
          icon={<ShieldCheck size={16} />}
          aside={<Switch checked={form.enabled} onCheckedChange={(v) => set('enabled', v)} label={tr('Activer la connexion unique', 'Enable single sign-on')} />}
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-3">{tr('Modèle :', 'Template:')}</span>
            {PRESETS.map((p) => (
              <Button key={p.id} size="sm" onClick={() => setForm({ ...form, issuer: p.issuer, label: form.label || p.name })}>
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr('Émetteur (issuer)', 'Issuer')}>
              <Input value={form.issuer} onChange={(e) => set('issuer', e.target.value)} placeholder="https://login.microsoftonline.com/…/v2.0" className="font-mono text-xs" />
            </Field>
            <Field label={tr('Nom du bouton', 'Button name')} hint={tr('facultatif', 'optional')}>
              <Input value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Microsoft" />
            </Field>
            <Field label={tr('Identifiant client (client ID)', 'Client ID')}>
              <Input value={form.client_id} onChange={(e) => set('client_id', e.target.value)} className="font-mono text-xs" />
            </Field>
            <Field
              label={tr('Secret client', 'Client secret')}
              hint={data.has_client_secret ? tr('enregistré, chiffré ; laisser vide pour le conserver', 'saved, encrypted; leave empty to keep it') : tr('si le fournisseur en délivre un', 'if the provider issues one')}
            >
              <Input
                type="password"
                autoComplete="new-password"
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value)
                  setSaved(false)
                }}
                placeholder={data.has_client_secret ? '••••••••' : ''}
              />
            </Field>
            <Field label={tr('Portées (scopes)', 'Scopes')}>
              <Input value={form.scopes} onChange={(e) => set('scopes', e.target.value)} className="font-mono text-xs" />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={tr('3. Restreindre l’accès', '3. Restrict access')}
          subtitle={tr('Facultatif. Sans restriction, toute personne acceptée par le fournisseur peut se connecter.', 'Optional. Without restriction, anyone the provider accepts can sign in.')}
          icon={<UsersRound size={16} />}
        />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label={tr('Domaines de courriel autorisés', 'Allowed email domains')} hint={tr('séparés par des virgules', 'comma-separated')}>
            <Input value={form.allowed_domains} onChange={(e) => set('allowed_domains', e.target.value)} placeholder="exemple.fr, filiale.fr" />
          </Field>
          <Field label={tr('Groupe requis', 'Required group')}>
            <Input value={form.required_group} onChange={(e) => set('required_group', e.target.value)} className="font-mono text-xs" />
          </Field>
          <Field label={tr('Attribut des groupes', 'Groups claim')}>
            <Input value={form.groups_claim} onChange={(e) => set('groups_claim', e.target.value)} className="font-mono text-xs" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title={tr('Tester avant d’activer', 'Test before switching on')} subtitle={tr('Vérifie que le fournisseur répond et publie ses clés.', 'Checks that the provider responds and publishes its keys.')} icon={<FlaskConical size={16} />} />
        <div className="space-y-4 p-5">
          <Button icon={<FlaskConical size={14} />} disabled={test.isPending} onClick={() => test.mutate()}>
            {test.isPending ? tr('Test en cours…', 'Testing…') : tr('Tester', 'Test')}
          </Button>
          {report ? (
            <ul className="divide-y divide-rule rounded-lg border border-rule">
              {report.steps.map((s) => (
                <li key={s.id} className="flex items-start gap-2.5 px-3.5 py-2.5 text-sm">
                  {s.ok ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-positive" /> : <CircleX size={16} className="mt-0.5 shrink-0 text-critical" />}
                  <span className="min-w-0">
                    <span className="block text-ink">{STEP_LABEL[s.id] ?? s.id}</span>
                    {s.detail ? <span className="block break-all font-mono text-2xs text-ink-3">{s.ok ? s.detail : messageFor(s.detail)}</span> : null}
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
            "Flux « code d'autorisation » avec PKCE ; signature, émetteur, audience, échéance et nonce du jeton vérifiés. Les comptes créés par la connexion unique sont ordinaires ; la double authentification relève du fournisseur. Les comptes locaux restent disponibles en secours.",
            'Authorization code flow with PKCE; token signature, issuer, audience, expiry and nonce are checked. Accounts created through single sign-on are ordinary; two-factor authentication is handled by the provider. Local accounts remain available as a fallback.',
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
