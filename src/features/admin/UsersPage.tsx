import { useMemo, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Copy,
  Crown,
  KeyRound,
  MoreHorizontal,
  Network,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { Button, Dialog, Input, Select, Switch } from '@/components/ui/controls'
import { Card, PageHeader, Tag } from '@/components/ui/primitives'
import { Field } from '@/components/auth/fields'
import { api } from '@/lib/api'
import { useCurrentUser } from '@/lib/queries'
import { cn, formatDateShort } from '@/lib/utils'
import type { AdminUser, UserRole } from '@/types/domain'
import { tr } from '@/i18n'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'consultant', label: tr('Consultant', 'Consultant') },
  { value: 'dpo', label: tr('Délégué à la protection des données', 'Data protection officer') },
  { value: 'rssi', label: tr('RSSI', 'CISO') },
  { value: 'juriste', label: tr('Juriste, conformité', 'Legal, compliance') },
  { value: 'dirigeant', label: tr('Direction', 'Executive') },
  { value: 'auditeur', label: tr('Auditeur', 'Auditor') },
  { value: 'autre', label: tr('Autre', 'Other') },
]
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label])) as Record<string, string>

/** Mot de passe provisoire lisible, sans caractères ambigus. */
function temporaryPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`
}

type Pending =
  | { kind: 'create' }
  | { kind: 'password'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser }
  | { kind: 'mfa'; user: AdminUser }
  | { kind: 'issued'; user: string; password: string }

export default function UsersPage() {
  const qc = useQueryClient()
  const { data: me } = useCurrentUser()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: api.admin.users })
  const [pending, setPending] = useState<Pending | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin'] })
    void qc.invalidateQueries({ queryKey: ['me'] })
  }

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { is_admin?: boolean; disabled?: boolean } }) => api.admin.updateUser(id, patch),
    onSuccess: refresh,
    onError: (e) => setActionError(e.message),
  })

  const stats = useMemo(() => {
    const active = users.filter((u) => !u.disabled)
    return {
      active: active.length,
      admins: active.filter((u) => u.is_admin).length,
      mfa: active.filter((u) => u.mfa_enabled).length,
      ldap: users.filter((u) => u.auth_source === 'ldap').length,
    }
  }, [users])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr('Administration', 'Administration')}
        title={tr('Comptes', 'Accounts')}
        lead={tr(
          "Qui peut ouvrir Scopeo, avec quels droits et quelle protection. Le contenu des entités de chacun n'est jamais visible ici.",
          'Who can open Scopeo, with which rights and which protection. The content of each person’s entities is never visible here.',
        )}
        actions={
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setPending({ kind: 'create' })}>
            {tr('Nouveau compte', 'New account')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: tr('Comptes actifs', 'Active accounts'), value: stats.active },
          { label: tr('Administrateurs', 'Administrators'), value: stats.admins },
          { label: tr('Double authentification', 'Two-factor authentication'), value: `${stats.mfa} / ${stats.active}` },
          { label: tr("Comptes de l'annuaire", 'Directory accounts'), value: stats.ldap },
        ].map((s) => (
          <Card key={s.label} className="px-5 py-4">
            <div className="text-xs text-ink-3">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">{s.value}</div>
          </Card>
        ))}
      </div>

      {actionError ? (
        <p role="alert" className="rounded-lg bg-critical-wash px-4 py-2.5 text-sm text-critical">
          {actionError}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead className="bg-raised">
              <tr className="border-b border-rule">
                {[tr('Compte', 'Account'), tr('Connexion', 'Sign-in'), tr('Sécurité', 'Security'), tr('Dernière connexion', 'Last sign-in'), tr('Entités', 'Entities'), ''].map((h, i) => (
                  <th key={i} scope="col" className="label-caps px-4 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-3">
                    {tr('Chargement…', 'Loading…')}
                  </td>
                </tr>
              ) : null}
              {users.map((u) => (
                <tr key={u.id} className={cn('border-b border-rule last:border-0', u.disabled && 'bg-raised/60')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          u.disabled ? 'bg-overlay text-ink-3' : 'bg-accent-wash text-accent-strong',
                        )}
                      >
                        {u.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className={cn('truncate font-medium', u.disabled ? 'text-ink-3' : 'text-ink')}>{u.name}</span>
                          {u.id === me?.id ? <span className="text-2xs text-ink-4">{tr('(vous)', '(you)')}</span> : null}
                        </span>
                        <span className="block truncate text-2xs text-ink-3">
                          {[ROLE_LABEL[u.role] ?? u.role, u.organisation, u.email].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.auth_source === 'ldap' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                        <Network size={13} className="text-ink-3" />
                        {tr('Annuaire', 'Directory')}
                        {u.ldap_username ? <span className="font-mono text-2xs text-ink-3">{u.ldap_username}</span> : null}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-2">{tr('Mot de passe local', 'Local password')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.is_admin ? (
                        <Tag tone="accent">
                          <Crown size={11} />
                          {tr('Admin', 'Admin')}
                        </Tag>
                      ) : null}
                      {u.disabled ? <Tag tone="critical">{tr('Suspendu', 'Suspended')}</Tag> : null}
                      {u.mfa_enabled ? (
                        <Tag tone="positive">
                          <ShieldCheck size={11} />
                          {tr('Double auth.', '2FA')}
                        </Tag>
                      ) : (
                        <Tag>{tr('Sans double auth.', 'No 2FA')}</Tag>
                      )}
                      {u.must_change_password ? <Tag tone="caution">{tr('Mot de passe provisoire', 'Temporary password')}</Tag> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-2 tabular-nums">
                    {u.last_login_at ? formatDateShort(u.last_login_at) : <span className="text-ink-4">{tr('Jamais', 'Never')}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-ink-2">{u.entity_count}</td>
                  <td className="px-2 py-3 text-right">
                    <RowMenu
                      user={u}
                      self={u.id === me?.id}
                      onAction={(action) => {
                        setActionError(null)
                        if (action === 'password') setPending({ kind: 'password', user: u })
                        else if (action === 'mfa') setPending({ kind: 'mfa', user: u })
                        else if (action === 'delete') setPending({ kind: 'delete', user: u })
                        else if (action === 'admin') update.mutate({ id: u.id, patch: { is_admin: !u.is_admin } })
                        else if (action === 'disable') update.mutate({ id: u.id, patch: { disabled: !u.disabled } })
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs leading-relaxed text-ink-3">
        {tr(
          "Les comptes de l'annuaire sont créés à leur première connexion, en utilisateur ordinaire. Les invités ne figurent pas ici : leur session et leurs données disparaissent à la déconnexion.",
          'Directory accounts are created at their first sign-in, as ordinary users. Guests are not listed: their session and data disappear on sign-out.',
        )}
      </p>

      {pending?.kind === 'create' ? (
        <CreateDialog
          onClose={() => setPending(null)}
          onCreated={(name, password) => {
            refresh()
            setPending({ kind: 'issued', user: name, password })
          }}
        />
      ) : null}
      {pending?.kind === 'password' ? (
        <PasswordDialog
          user={pending.user}
          onClose={() => setPending(null)}
          onDone={(password) => {
            refresh()
            setPending({ kind: 'issued', user: pending.user.name, password })
          }}
        />
      ) : null}
      {pending?.kind === 'mfa' ? <MfaResetDialog user={pending.user} onClose={() => setPending(null)} onDone={refresh} /> : null}
      {pending?.kind === 'delete' ? <DeleteDialog user={pending.user} onClose={() => setPending(null)} onDone={refresh} /> : null}
      {pending?.kind === 'issued' ? <IssuedDialog name={pending.user} password={pending.password} onClose={() => setPending(null)} /> : null}
    </div>
  )
}

type Action = 'password' | 'mfa' | 'admin' | 'disable' | 'delete'

function RowMenu({ user, self, onAction }: { user: AdminUser; self: boolean; onAction: (a: Action) => void }) {
  const items: { id: Action; label: string; icon: React.ReactNode; danger?: boolean; hidden?: boolean }[] = [
    { id: 'password', label: tr('Mot de passe provisoire', 'Temporary password'), icon: <KeyRound size={14} />, hidden: user.auth_source !== 'local' },
    { id: 'mfa', label: tr('Désactiver la double authentification', 'Turn off two-factor authentication'), icon: <ShieldOff size={14} />, hidden: !user.mfa_enabled },
    { id: 'admin', label: user.is_admin ? tr('Retirer le rôle administrateur', 'Remove administrator role') : tr('Nommer administrateur', 'Make administrator'), icon: <Crown size={14} />, hidden: self },
    { id: 'disable', label: user.disabled ? tr('Réactiver le compte', 'Reactivate account') : tr('Suspendre le compte', 'Suspend account'), icon: user.disabled ? <UserCheck size={14} /> : <UserX size={14} />, hidden: self },
    { id: 'delete', label: tr('Supprimer le compte', 'Delete account'), icon: <Trash2 size={14} />, danger: true, hidden: self },
  ]
  const visible = items.filter((i) => !i.hidden)
  if (visible.length === 0) return null
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-tint hover:text-ink" aria-label={tr(`Actions pour ${user.name}`, `Actions for ${user.name}`)}>
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 w-64 rounded-xl border border-rule bg-surface p-1.5 shadow-pop">
          {visible.map((i) => (
            <DropdownMenu.Item
              key={i.id}
              onSelect={() => onAction(i.id)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-[highlighted]:bg-tint',
                i.danger ? 'text-critical' : 'text-ink-2 data-[highlighted]:text-ink',
              )}
            >
              <span className={i.danger ? '' : 'text-ink-3'}>{i.icon}</span>
              {i.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string, password: string) => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('consultant')
  const [organisation, setOrganisation] = useState('')
  const [email, setEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState(temporaryPassword)
  const create = useMutation({
    mutationFn: () => api.admin.createUser({ name: name.trim(), role, organisation: organisation.trim(), email: email.trim(), password, is_admin: isAdmin }),
    onSuccess: () => onCreated(name.trim(), password),
  })
  return (
    <Dialog
      open
      onOpenChange={(v) => (v ? null : onClose())}
      title={tr('Nouveau compte', 'New account')}
      description={tr('La personne remplacera le mot de passe provisoire à sa première connexion.', 'The person will replace the temporary password at first sign-in.')}
      footer={
        <>
          <Button onClick={onClose}>{tr('Annuler', 'Cancel')}</Button>
          <Button variant="primary" disabled={!name.trim() || password.length < 10 || create.isPending} onClick={() => create.mutate()}>
            {tr('Créer le compte', 'Create account')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr('Nom du profil', 'Profile name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Claire Martin" />
        </Field>
        <Field label={tr('Fonction', 'Role')}>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)} options={ROLES} ariaLabel={tr('Fonction', 'Role')} />
        </Field>
        <Field label={tr('Organisation', 'Organisation')} hint={tr('facultatif', 'optional')}>
          <Input value={organisation} onChange={(e) => setOrganisation(e.target.value)} />
        </Field>
        <Field label={tr('Courriel', 'Email')} hint={tr('facultatif', 'optional')}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={tr('Mot de passe provisoire', 'Temporary password')}>
            <span className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
              <Button icon={<RefreshCw size={14} />} onClick={() => setPassword(temporaryPassword())} aria-label={tr('Générer', 'Generate')} />
            </span>
          </Field>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-rule bg-raised px-3.5 py-3 sm:col-span-2">
          <span>
            <span className="block text-sm font-medium text-ink">{tr('Administrateur', 'Administrator')}</span>
            <span className="block text-2xs text-ink-3">{tr('Accès à cet espace, sans accès aux entités des autres', 'Access to this space, without access to others’ entities')}</span>
          </span>
          <Switch checked={isAdmin} onCheckedChange={setIsAdmin} label={tr('Administrateur', 'Administrator')} />
        </label>
      </div>
      {create.error ? <p role="alert" className="mt-3 text-xs text-critical">{create.error.message}</p> : null}
    </Dialog>
  )
}

function PasswordDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: (password: string) => void }) {
  const [password, setPassword] = useState(temporaryPassword)
  const reset = useMutation({ mutationFn: () => api.admin.resetPassword(user.id, password), onSuccess: () => onDone(password) })
  return (
    <Dialog
      open
      onOpenChange={(v) => (v ? null : onClose())}
      title={tr(`Mot de passe provisoire pour ${user.name}`, `Temporary password for ${user.name}`)}
      description={tr('Ses sessions ouvertes sont fermées ; il choisira un nouveau mot de passe à la connexion.', 'Their open sessions are closed; they will choose a new password at sign-in.')}
      footer={
        <>
          <Button onClick={onClose}>{tr('Annuler', 'Cancel')}</Button>
          <Button variant="primary" disabled={password.length < 10 || reset.isPending} onClick={() => reset.mutate()}>
            {tr('Appliquer', 'Apply')}
          </Button>
        </>
      }
    >
      <span className="flex gap-2">
        <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" aria-label={tr('Mot de passe provisoire', 'Temporary password')} />
        <Button icon={<RefreshCw size={14} />} onClick={() => setPassword(temporaryPassword())} aria-label={tr('Générer', 'Generate')} />
      </span>
      {reset.error ? <p role="alert" className="mt-3 text-xs text-critical">{reset.error.message}</p> : null}
    </Dialog>
  )
}

function MfaResetDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const reset = useMutation({
    mutationFn: () => api.admin.resetMfa(user.id),
    onSuccess: () => {
      onDone()
      onClose()
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(v) => (v ? null : onClose())}
      title={tr('Désactiver la double authentification ?', 'Turn off two-factor authentication?')}
      description={user.name}
      footer={
        <>
          <Button onClick={onClose}>{tr('Annuler', 'Cancel')}</Button>
          <Button variant="danger" disabled={reset.isPending} onClick={() => reset.mutate()}>
            {tr('Désactiver', 'Turn off')}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-2">
        {tr(
          "À réserver à un compte bloqué (téléphone perdu, codes de récupération épuisés), après avoir vérifié l'identité de la personne par un autre moyen. Elle se connectera avec son seul mot de passe et pourra réactiver la double authentification.",
          'Reserve this for a locked-out account (lost phone, recovery codes used up), after checking the person’s identity by other means. They will sign in with their password only and can turn two-factor authentication back on.',
        )}
      </p>
      {reset.error ? <p role="alert" className="mt-3 text-xs text-critical">{reset.error.message}</p> : null}
    </Dialog>
  )
}

function DeleteDialog({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const [typed, setTyped] = useState('')
  const del = useMutation({
    mutationFn: () => api.admin.deleteUser(user.id),
    onSuccess: () => {
      onDone()
      onClose()
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(v) => (v ? null : onClose())}
      title={tr('Supprimer ce compte ?', 'Delete this account?')}
      description={tr(
        `Le compte « ${user.name} » et ses ${user.entity_count} entité(s) seront définitivement supprimés.`,
        `The account "${user.name}" and its ${user.entity_count} entit${user.entity_count > 1 ? 'ies' : 'y'} will be permanently deleted.`,
      )}
      footer={
        <>
          <Button onClick={onClose}>{tr('Annuler', 'Cancel')}</Button>
          <Button variant="danger" icon={<Trash2 size={13} />} disabled={typed.trim() !== user.name.trim() || del.isPending} onClick={() => del.mutate()}>
            {tr('Supprimer définitivement', 'Delete permanently')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-2">
        {tr('Pour suspendre l’accès sans rien effacer, préférez « Suspendre le compte ».', 'To block access without erasing anything, use “Suspend account” instead.')}
      </p>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr(`Saisissez « ${user.name} » pour confirmer`, `Type "${user.name}" to confirm`)}</span>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} />
      </label>
      {del.error ? <p role="alert" className="mt-3 text-xs text-critical">{del.error.message}</p> : null}
    </Dialog>
  )
}

function IssuedDialog({ name, password, onClose }: { name: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <Dialog
      open
      onOpenChange={(v) => (v ? null : onClose())}
      title={tr('Mot de passe provisoire à transmettre', 'Temporary password to pass on')}
      description={tr(`Pour « ${name} ». Il ne sera plus affiché.`, `For "${name}". It will not be shown again.`)}
      footer={
        <Button variant="primary" onClick={onClose}>
          {tr('Terminé', 'Done')}
        </Button>
      }
    >
      <div className="flex items-center gap-2 rounded-lg border border-rule bg-raised p-3">
        <code className="flex-1 font-mono text-base tracking-wider text-ink">{password}</code>
        <Button
          size="sm"
          icon={copied ? <Check size={13} /> : <Copy size={13} />}
          onClick={async () => {
            await navigator.clipboard.writeText(password)
            setCopied(true)
          }}
        >
          {copied ? tr('Copié', 'Copied') : tr('Copier', 'Copy')}
        </Button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        {tr(
          'Transmettez-le par un canal distinct de l’identifiant (de vive voix, par téléphone). La personne le remplacera à sa première connexion.',
          'Pass it on through a different channel from the username (in person, by phone). The person will replace it at first sign-in.',
        )}
      </p>
    </Dialog>
  )
}
