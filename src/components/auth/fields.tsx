import { useState, type ReactNode } from 'react'
import { ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react'
import { Button, Input } from '@/components/ui/controls'
import { useChangePassword } from '@/lib/queries'
import type { UserProfile } from '@/types/domain'
import { tr } from '@/i18n'

export const MIN_PASSWORD = 10

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-2">
        {label}
        {hint ? <span className="font-normal text-ink-4"> ({hint})</span> : null}
      </span>
      {children}
    </label>
  )
}

export function PasswordInput({
  value,
  onChange,
  autoComplete,
  autoFocus,
  ariaInvalid,
}: {
  value: string
  onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'
  autoFocus?: boolean
  ariaInvalid?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative block">
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={ariaInvalid}
        className="pr-9"
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-4 hover:text-ink"
        aria-label={visible ? tr('Masquer le mot de passe', 'Hide password') : tr('Afficher le mot de passe', 'Show password')}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </span>
  )
}

export function PasswordRules() {
  return (
    <p className="text-2xs leading-relaxed text-ink-4">
      {tr(
        `Au moins ${MIN_PASSWORD} caractères. Une phrase de passe est plus sûre et plus facile à retenir. Le mot de passe est haché (bcrypt) et n'est jamais conservé en clair.`,
        `At least ${MIN_PASSWORD} characters. A passphrase is safer and easier to remember. The password is hashed (bcrypt) and never stored in plain text.`,
      )}
    </p>
  )
}

/** Code à six chiffres ou code de récupération, saisi sans contrainte de format. */
export function CodeInput({ value, onChange, recovery, autoFocus }: { value: string; onChange: (v: string) => void; recovery?: boolean; autoFocus?: boolean }) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(recovery ? e.target.value.slice(0, 20) : e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode={recovery ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      placeholder={recovery ? 'xxxxx-xxxxx' : '123456'}
      className="font-mono tracking-[0.2em]"
      aria-label={recovery ? tr('Code de récupération', 'Recovery code') : tr('Code à six chiffres', 'Six-digit code')}
    />
  )
}

/**
 * Mot de passe provisoire posé par un administrateur : il est remplacé avant
 * tout accès, le serveur refusant les autres requêtes d'ici là.
 */
export function ForcedPasswordChange({ user, onDone }: { user: UserProfile; onDone: (user: UserProfile) => void }) {
  const change = useChangePassword()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length > 0 && confirm !== password
  const valid = current && password.length >= MIN_PASSWORD && password === confirm

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    try {
      await change.mutateAsync({ current, password, confirm })
      onDone({ ...user, must_change_password: false })
    } catch {
      /* message affiché ci-dessous */
    }
  }

  return (
    <form onSubmit={submit}>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
        <KeyRound size={18} className="text-ink-3" />
        {tr('Choisissez votre mot de passe', 'Choose your password')}
      </h2>
      <p className="mt-1 text-sm text-ink-3">
        {tr(
          `Bienvenue ${user.name}. Le mot de passe transmis par l'administrateur est provisoire : remplacez-le par un mot de passe que vous seul connaissez.`,
          `Welcome ${user.name}. The password given by the administrator is temporary: replace it with one only you know.`,
        )}
      </p>
      <div className="mt-6 space-y-4">
        <Field label={tr('Mot de passe provisoire', 'Temporary password')}>
          <PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" autoFocus />
        </Field>
        <Field label={tr('Nouveau mot de passe', 'New password')}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Field label={tr('Confirmation', 'Confirmation')}>
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" ariaInvalid={mismatch} />
        </Field>
        {mismatch ? <p className="text-xs text-critical">{tr('Les deux mots de passe ne correspondent pas.', 'The two passwords do not match.')}</p> : null}
        <PasswordRules />
      </div>
      {change.error ? (
        <p role="alert" className="mt-4 text-xs text-critical">
          {change.error.message}
        </p>
      ) : null}
      <Button type="submit" variant="primary" className="mt-6 w-full" disabled={!valid || change.isPending}>
        {tr('Enregistrer et continuer', 'Save and continue')}
        <ArrowRight size={14} />
      </Button>
    </form>
  )
}
