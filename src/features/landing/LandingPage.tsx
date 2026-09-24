import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Scale, UserPlus, UserRound } from 'lucide-react'
import { Mark } from '@/components/layout/Brand'
import { Button, Input, Select } from '@/components/ui/controls'
import { RegChip } from '@/components/ui/primitives'
import { useGuest, useLogin, useRegister, useSetupPassword } from '@/lib/queries'
import { api, ApiError } from '@/lib/api'
import { useSession } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { UserProfile, UserRole } from '@/types/domain'
import { REGULATION_ORDER } from '@/data/regulations'
import { TIMELINE } from '@/data/timeline'
import { LanguageToggle, ThemeToggle } from '@/components/layout/ThemeToggle'
import { tr } from '@/i18n'

type Mode = 'connexion' | 'creer' | 'initial'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'consultant', label: tr('Consultant, plusieurs clients', 'Consultant, several clients') },
  { value: 'dpo', label: tr('Délégué à la protection des données', 'Data protection officer') },
  { value: 'rssi', label: tr('RSSI', 'CISO') },
  { value: 'juriste', label: tr('Juriste, conformité', 'Legal, compliance') },
  { value: 'dirigeant', label: tr('Direction', 'Executive') },
  { value: 'auditeur', label: tr('Auditeur', 'Auditor') },
  { value: 'autre', label: tr('Autre', 'Other') },
]

const MIN_PASSWORD = 10

/** Veille : ce qui vient d'entrer en vigueur et ce qui arrive, daté par rapport à aujourd'hui. */
function useWatchItems() {
  const now = Date.now()
  const DAY = 86_400_000
  return TIMELINE.map((e) => ({ e, days: Math.round((new Date(e.date).getTime() - now) / DAY) }))
    .filter(({ days }) => days >= -120 && days <= 540)
    .sort((a, b) => a.e.date.localeCompare(b.e.date))
    .map(({ e, days }) => ({
      id: e.id,
      reg: e.regulation === 'TRANSVERSE' ? null : e.regulation,
      title: e.title,
      when:
        days === 0
          ? tr("aujourd'hui", 'today')
          : days > 0
            ? tr(`dans ${days} j`, `in ${days} d`)
            : tr(`depuis ${-days} j`, `${-days} d ago`),
      past: days < 0,
    }))
}

const PILLARS = [
  { n: '01', title: tr('Qualifier', 'Scope'), body: tr('Quels textes s’appliquent, à quel titre, sur quel fondement.', 'Which texts apply, in what capacity, on what legal basis.') },
  { n: '02', title: tr('Croiser', 'Cross-map'), body: tr('Où une action unique satisfait plusieurs textes, où ils divergent.', 'Where one action satisfies several texts, and where they diverge.') },
  { n: '03', title: tr('Prioriser', 'Prioritise'), body: tr('Dans quel ordre traiter les écarts, et avec quel argumentaire.', 'In which order to close the gaps, and with what rationale.') },
]

/** Coins de cadrage : le motif du logo, repris à l'échelle de la page. */
function FrameCorners() {
  const c = 'pointer-events-none absolute size-6 border-ink-4'
  return (
    <>
      <span className={`${c} -left-4 -top-4 border-l border-t`} aria-hidden />
      <span className={`${c} -right-4 -top-4 border-r border-t`} aria-hidden />
      <span className={`${c} -bottom-4 -right-4 border-b border-r`} aria-hidden />
      <span className={`${c} -bottom-4 -left-4 border-b border-l`} aria-hidden />
    </>
  )
}

/** Cercle de douze points, en filigrane derrière le panneau d'entrée. */
function Constellation() {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    return { x: 300 + Math.cos(a) * 250, y: 300 + Math.sin(a) * 250 }
  })
  return (
    <svg viewBox="0 0 600 600" className="pointer-events-none absolute left-1/2 top-1/2 hidden w-[42rem] -translate-x-1/2 -translate-y-1/2 lg:block" aria-hidden>
      <circle cx="300" cy="300" r="250" fill="none" stroke="var(--c-rule-2)" strokeWidth="1" />
      <circle cx="300" cy="300" r="178" fill="none" stroke="var(--c-rule)" strokeWidth="1" strokeDasharray="2 6" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.2} fill="var(--c-ink-4)" />
      ))}
    </svg>
  )
}

export default function LandingPage() {
  const [mode, setMode] = useState<Mode>('connexion')
  const [pendingName, setPendingName] = useState('')
  const watch = useWatchItems()

  return (
    <div className="stage relative min-h-screen overflow-hidden">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-rule py-5">
          <span className="flex items-center gap-3">
            <Mark size={28} />
            <span className="text-sm font-semibold tracking-tight text-ink">Scopeo</span>
          </span>
          <span className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </span>
        </header>

        <div className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          {/* Positionnement ------------------------------------------------ */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="flex flex-wrap items-center gap-2">
              {REGULATION_ORDER.map((r) => (
                <RegChip key={r} id={r} size="sm" />
              ))}
            </div>
            <h1 className="mt-7 text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[2.75rem] sm:leading-[1.08]">
              {tr("Savoir ce qui s'applique,", 'Know what applies,')}
              <br />
              <span className="text-ink-3">{tr('et par quoi commencer.', 'and where to start.')}</span>
            </h1>
            <p className="mt-6 max-w-lg text-md leading-relaxed text-ink-2">
              {tr(
                "Une plateforme de cadrage réglementaire, en amont d'une plateforme de suivi de conformité. Elle établit le périmètre d'une organisation au regard de cinq textes européens et l'ordre dans lequel le traiter.",
                'A regulatory scoping platform, upstream of a compliance tracking platform. It establishes the scope of an organisation against five European texts and the order in which to handle it.',
              )}
            </p>

            <ol className="mt-9 max-w-lg divide-y divide-rule border-y border-rule">
              {PILLARS.map((p) => (
                <li key={p.n} className="flex items-baseline gap-5 py-3.5">
                  <span className="font-mono text-2xs text-ink-4">{p.n}</span>
                  <span className="w-20 shrink-0 text-sm font-medium text-ink">{p.title}</span>
                  <span className="text-sm text-ink-3">{p.body}</span>
                </li>
              ))}
            </ol>

            <p className="mt-6 flex max-w-lg items-start gap-2 text-xs leading-relaxed text-ink-3">
              <Scale size={13} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <strong className="font-medium text-ink-2">{tr("Plateforme d'aide au cadrage, pas un avis juridique.", 'A scoping aid, not legal advice.')}</strong>{' '}
                {tr('Données enregistrées sur ce poste uniquement.', 'Data stored on this machine only.')}
              </span>
            </p>
          </motion.section>

          {/* Connexion -------------------------------------------------------- */}
          <div className="relative">
            <Constellation />
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="relative mx-auto max-w-md rounded-lg border border-rule-2 bg-surface p-6 sm:p-7"
            >
              <FrameCorners />
              <AnimatePresence mode="wait">
                {mode === 'connexion' ? (
                  <SignIn
                    key="connexion"
                    onCreate={() => setMode('creer')}
                    onSetupRequired={(name) => {
                      setPendingName(name)
                      setMode('initial')
                    }}
                  />
                ) : mode === 'creer' ? (
                  <CreateProfile key="creer" onBack={() => setMode('connexion')} />
                ) : (
                  <FirstPassword key="initial" name={pendingName} onBack={() => setMode('connexion')} />
                )}
              </AnimatePresence>
            </motion.section>
          </div>
        </div>

        {/* Veille réglementaire */}
        <div className="group relative -mx-5 flex items-center overflow-hidden border-t border-rule py-3 sm:-mx-8">
          <span className="relative z-10 ml-5 shrink-0 rounded-md bg-accent-wash px-2 py-1 text-[11px] font-semibold text-accent-strong sm:ml-8">
            {tr('Calendrier', 'Calendar')}
          </span>
          <div
            className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)]"
            aria-label={tr('Calendrier réglementaire', 'Regulatory calendar')}
          >
            <div className="flex w-max animate-[ticker_90s_linear_infinite] gap-10 whitespace-nowrap pl-6 text-xs group-hover:[animation-play-state:paused]">
              {[...watch, ...watch].map((w, i) => (
                <span key={i} className="inline-flex items-center gap-2" aria-hidden={i >= watch.length}>
                  {w.reg ? <RegChip id={w.reg} size="sm" /> : <span className="rounded-md bg-overlay px-1.5 text-[10px] font-semibold text-ink-3">{tr('UE / FR', 'EU / FR')}</span>}
                  <span className="text-ink-2">{w.title}</span>
                  <span className={w.past ? 'text-ink-4' : 'font-medium text-accent-strong'}>{w.when}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ========================================================================== */

const fade = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.2 },
}

/** Après authentification : première entité ouverte, parcours guidé à la première visite. */
function useEnter() {
  const navigate = useNavigate()
  const selectEntity = useSession((s) => s.selectEntity)
  const openTour = useSession((s) => s.openTour)
  return async (user: UserProfile) => {
    const entities = await api.entities(user.id)
    selectEntity(entities[0]?.id ?? null)
    navigate('/app')
    // L'onboarding se déclenche une fois l'application affichée.
    if (!user.onboarded) setTimeout(() => openTour(0), 450)
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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

function PasswordInput({
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

function SignIn({ onCreate, onSetupRequired }: { onCreate: () => void; onSetupRequired: (name: string) => void }) {
  const enter = useEnter()
  const lastName = useSession((s) => s.lastName)
  const login = useLogin()
  const guest = useGuest()
  const [name, setName] = useState(lastName)
  const [password, setPassword] = useState('')
  const [guestError, setGuestError] = useState<string | null>(null)
  const [guestBusy, setGuestBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const user = await login.mutateAsync({ name: name.trim(), password })
      setPassword('')
      await enter(user)
    } catch (err) {
      setPassword('')
      if (err instanceof ApiError && err.code === 'password_setup_required') onSetupRequired(name.trim())
    }
  }

  async function startGuest() {
    setGuestBusy(true)
    setGuestError(null)
    try {
      const user = await guest.mutateAsync()
      // L'invité découvre la plateforme sur une entité complète plutôt que sur une page vide.
      await api.copyDemo(user.id)
      await enter(user)
    } catch (err) {
      setGuestError(err instanceof Error ? err.message : tr('Impossible de démarrer le mode invité.', 'Could not start guest mode.'))
      setGuestBusy(false)
    }
  }

  const error = login.error instanceof ApiError && login.error.code !== 'password_setup_required' ? login.error.message : null

  return (
    <motion.div {...fade}>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
        <LockKeyhole size={18} className="text-ink-3" />
        {tr('Connexion', 'Sign in')}
      </h2>
      <p className="mt-1 text-sm text-ink-3">{tr('Ouvrez votre profil pour retrouver vos entités.', 'Open your profile to get back to your entities.')}</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label={tr('Nom du profil', 'Profile name')}>
          <Input autoFocus={!lastName} value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" required />
        </Field>
        <Field label={tr('Mot de passe', 'Password')}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" autoFocus={Boolean(lastName)} ariaInvalid={Boolean(error)} />
        </Field>
        {error ? (
          <p role="alert" className="text-xs text-critical">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" className="w-full" disabled={!name.trim() || !password || login.isPending}>
          {login.isPending ? tr('Vérification…', 'Checking…') : tr('Se connecter', 'Sign in')}
          <ArrowRight size={14} />
        </Button>
      </form>

      <div className="mt-6 grid gap-2 border-t border-rule pt-5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCreate}
          className="group flex items-start gap-3 rounded-md border border-rule-2 bg-raised p-3 text-left transition-colors hover:border-rule-3 hover:bg-overlay"
        >
          <UserPlus size={16} className="mt-0.5 shrink-0 text-ink-3 group-hover:text-accent" />
          <span>
            <span className="block text-sm font-medium text-ink">{tr('Créer un profil', 'Create a profile')}</span>
            <span className="block text-2xs text-ink-3">{tr('Protégé par un mot de passe', 'Password protected')}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={startGuest}
          disabled={guestBusy}
          className="group flex items-start gap-3 rounded-md border border-rule-2 bg-raised p-3 text-left transition-colors hover:border-rule-3 hover:bg-overlay disabled:opacity-60"
        >
          <UserRound size={16} className="mt-0.5 shrink-0 text-ink-3 group-hover:text-accent" />
          <span>
            <span className="block text-sm font-medium text-ink">{tr('Mode invité', 'Guest mode')}</span>
            <span className="block text-2xs text-ink-3">{tr('Démonstration Finexa, effacée à la déconnexion', 'Finexa demo, erased on sign-out')}</span>
          </span>
        </button>
      </div>
      {guestBusy ? <p className="mt-3 text-xs text-ink-3">{tr("Préparation de l'espace invité…", 'Preparing the guest space…')}</p> : null}
      {guestError ? <p className="mt-3 text-xs text-critical">{guestError}</p> : null}
    </motion.div>
  )
}

function PasswordRules() {
  return (
    <p className="text-2xs leading-relaxed text-ink-4">
      {tr(
        `Au moins ${MIN_PASSWORD} caractères. Une phrase de passe est plus sûre et plus facile à retenir. Le mot de passe est haché (bcrypt) et n'est jamais conservé en clair.`,
        `At least ${MIN_PASSWORD} characters. A passphrase is safer and easier to remember. The password is hashed (bcrypt) and never stored in plain text.`,
      )}
    </p>
  )
}

function CreateProfile({ onBack }: { onBack: () => void }) {
  const enter = useEnter()
  const register = useRegister()
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('consultant')
  const [organisation, setOrganisation] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length > 0 && confirm !== password
  const valid = name.trim() && password.length >= MIN_PASSWORD && password === confirm

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    try {
      const user = await register.mutateAsync({ name: name.trim(), role, organisation: organisation.trim(), password, password_confirm: confirm })
      setPassword('')
      setConfirm('')
      await enter(user)
    } catch {
      /* message affiché ci-dessous */
    }
  }

  return (
    <motion.form {...fade} onSubmit={submit}>
      <BackLink onClick={onBack} />
      <h2 className="mt-4 text-xl font-semibold text-ink">{tr('Créer un profil', 'Create a profile')}</h2>
      <p className="mt-1 text-sm text-ink-3">
        {tr(
          'Le profil vous identifie. Les organisations que vous cadrez seront des entités distinctes, créées ensuite.',
          'The profile identifies you. The organisations you scope will be separate entities, created afterwards.',
        )}
      </p>
      <div className="mt-6 space-y-4">
        <Field label={tr('Nom du profil', 'Profile name')}>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Claire Martin" autoComplete="username" required />
        </Field>
        <Field label={tr('Fonction', 'Role')}>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)} options={ROLES} ariaLabel={tr('Fonction', 'Role')} />
        </Field>
        <Field label={tr('Organisation', 'Organisation')} hint={tr('facultatif', 'optional')}>
          <Input value={organisation} onChange={(e) => setOrganisation(e.target.value)} placeholder={tr('Cabinet, direction, société', 'Firm, department, company')} />
        </Field>
        <Field label={tr('Mot de passe', 'Password')}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Field label={tr('Confirmation du mot de passe', 'Confirm password')}>
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" ariaInvalid={mismatch} />
        </Field>
        {mismatch ? <p className="text-xs text-critical">{tr('Les deux mots de passe ne correspondent pas.', 'The two passwords do not match.')}</p> : null}
        <PasswordRules />
      </div>
      {register.error ? <p role="alert" className="mt-4 text-xs text-critical">{register.error.message}</p> : null}
      <Button type="submit" variant="primary" className="mt-6 w-full" disabled={!valid || register.isPending}>
        {register.isPending ? tr('Création…', 'Creating…') : tr('Créer et commencer', 'Create and start')}
        <ArrowRight size={14} />
      </Button>
    </motion.form>
  )
}

/** Profil créé avant l'authentification : il définit son premier mot de passe. */
function FirstPassword({ name, onBack }: { name: string; onBack: () => void }) {
  const enter = useEnter()
  const setup = useSetupPassword()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length > 0 && confirm !== password
  const valid = password.length >= MIN_PASSWORD && password === confirm

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    try {
      const user = await setup.mutateAsync({ name, password, confirm })
      setPassword('')
      setConfirm('')
      await enter(user)
    } catch {
      /* message affiché ci-dessous */
    }
  }

  return (
    <motion.form {...fade} onSubmit={submit}>
      <BackLink onClick={onBack} />
      <h2 className="mt-4 flex items-center gap-2 text-xl font-semibold text-ink">
        <KeyRound size={18} className="text-ink-3" />
        {tr('Définir un mot de passe', 'Set a password')}
      </h2>
      <p className="mt-1 text-sm text-ink-3">
        {tr(
          `Le profil « ${name} » a été créé avant la protection par mot de passe. Choisissez-en un pour l'ouvrir ; il sera demandé à chaque connexion.`,
          `The profile "${name}" was created before password protection. Choose one to open it; it will be required at every sign-in.`,
        )}
      </p>
      <div className="mt-6 space-y-4">
        <Field label={tr('Nouveau mot de passe', 'New password')}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" autoFocus />
        </Field>
        <Field label={tr('Confirmation', 'Confirmation')}>
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" ariaInvalid={mismatch} />
        </Field>
        {mismatch ? <p className="text-xs text-critical">{tr('Les deux mots de passe ne correspondent pas.', 'The two passwords do not match.')}</p> : null}
        <PasswordRules />
      </div>
      {setup.error ? <p role="alert" className="mt-4 text-xs text-critical">{setup.error.message}</p> : null}
      <Button type="submit" variant="primary" className="mt-6 w-full" disabled={!valid || setup.isPending}>
        {tr('Enregistrer et ouvrir', 'Save and open')}
        <ArrowRight size={14} />
      </Button>
    </motion.form>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink')}>
      <ArrowLeft size={13} />
      {tr('Retour', 'Back')}
    </button>
  )
}
