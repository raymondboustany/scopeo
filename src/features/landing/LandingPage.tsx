import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Building2, KeySquare, LockKeyhole, Scale, ShieldCheck, Sparkles, UserPlus, UserRound } from 'lucide-react'
import { Mark } from '@/components/layout/Brand'
import { Button, Input, SegmentedControl, Select } from '@/components/ui/controls'
import { RegChip } from '@/components/ui/primitives'
import { CodeInput, Field, ForcedPasswordChange, MIN_PASSWORD, PasswordInput, PasswordRules } from '@/components/auth/fields'
import { useAuthStatus, useGuest, useLdapLogin, useLogin, useMfaVerify, useRegister, useSsoResume, useUpdateUser } from '@/lib/queries'
import { api, ApiError, messageFor } from '@/lib/api'
import { useSession } from '@/lib/store'
import { cn, parseDate } from '@/lib/utils'
import { needsMfa, type AuthStatus, type UserProfile, type UserRole } from '@/types/domain'
import { REGULATION_ORDER } from '@/data/regulations'
import { TIMELINE } from '@/data/timeline'
import { LanguageToggle, ThemeToggle } from '@/components/layout/ThemeToggle'
import { tr } from '@/i18n'
import { USER_ROLES as ROLES } from '@/components/auth/roles'



/** Veille : ce qui vient d'entrer en vigueur et ce qui arrive, daté par rapport à aujourd'hui. */
function useWatchItems() {
  const now = Date.now()
  const DAY = 86_400_000
  return TIMELINE.map((e) => ({ e, days: Math.round((parseDate(e.date).getTime() - now) / DAY) }))
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
                {tr('Données hébergées chez vous : sur ce poste ou sur le serveur de votre organisation.', 'Data hosted by you: on this machine or on your organisation’s server.')}
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
              <AuthPanel />
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

type Step =
  | { kind: 'signin' }
  | { kind: 'create' }
  | { kind: 'mfa'; challenge: string }
  | { kind: 'change'; user: UserProfile }

/** Après authentification : première entité ouverte, parcours guidé à la première connexion. */
function useEnter() {
  const navigate = useNavigate()
  const selectEntity = useSession((s) => s.selectEntity)
  const openTour = useSession((s) => s.openTour)
  const updateUser = useUpdateUser()
  return async (user: UserProfile) => {
    const entities = await api.entities(user.id)
    selectEntity(entities[0]?.id ?? null)
    navigate('/app')
    if (!user.onboarded) {
      // Marqué dès l'ouverture : le parcours ne revient pas à la connexion suivante,
      // même s'il est fermé en cours de route. Il reste accessible par le « ? ».
      updateUser.mutate({ id: user.id, patch: { onboarded: true } })
      setTimeout(() => openTour(0), 450)
    }
  }
}

/** Panneau d'entrée : ce qu'il propose dépend de l'état de la base et des réglages. */
function AuthPanel() {
  const { data: status, isLoading, error, refetch } = useAuthStatus()
  const [step, setStep] = useState<Step>({ kind: 'signin' })
  const enter = useEnter()
  const signIn = useSession((s) => s.signIn)
  const [params, setParams] = useSearchParams()
  const resume = useSsoResume()
  const resumed = useRef(false)
  const ssoError = params.get('sso_error')

  const afterAuth = (user: UserProfile) => {
    if (user.must_change_password) setStep({ kind: 'change', user })
    else void enter(user)
  }

  // Retour du fournisseur d'identité : la session est ouverte côté serveur.
  useEffect(() => {
    if (params.get('sso') !== 'ok' || resumed.current) return
    resumed.current = true
    setParams({}, { replace: true })
    resume.mutate(undefined, { onSuccess: (user) => void enter(user) })
  }, [params, setParams, resume, enter])

  if (isLoading) {
    return <div className="flex h-72 items-center justify-center text-sm text-ink-3">{tr('Chargement…', 'Loading…')}</div>
  }
  if (error || !status) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm font-medium text-ink">{tr('Le serveur local ne répond pas', 'The local server is not responding')}</p>
        <p className="mt-1 text-xs text-ink-3">{tr('Vérifiez qu’il est démarré, puis réessayez.', 'Check that it is running, then try again.')}</p>
        <Button className="mt-4" onClick={() => void refetch()}>
          {tr('Réessayer', 'Retry')}
        </Button>
      </div>
    )
  }

  // Premier lancement : seule la création du profil administrateur est proposée.
  if (!status.has_accounts) {
    return (
      <AnimatePresence mode="wait">
        {step.kind === 'change' ? (
          <motion.div key="change" {...fade}>
            <ForcedPasswordChange user={step.user} onDone={(u) => void enter(u)} />
          </motion.div>
        ) : (
          <CreateProfile key="first" firstRun onCreated={afterAuth} />
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {step.kind === 'signin' ? (
        <SignIn
          key="signin"
          status={status}
          ssoError={ssoError ? messageFor(ssoError) : null}
          onCreate={() => setStep({ kind: 'create' })}
          onMfa={(challenge) => setStep({ kind: 'mfa', challenge })}
          onUser={afterAuth}
        />
      ) : step.kind === 'create' ? (
        <CreateProfile key="create" onBack={() => setStep({ kind: 'signin' })} onCreated={afterAuth} />
      ) : step.kind === 'mfa' ? (
        <MfaStep key="mfa" challenge={step.challenge} onBack={() => setStep({ kind: 'signin' })} onUser={afterAuth} />
      ) : (
        <motion.div key="change" {...fade}>
          <ForcedPasswordChange
            user={step.user}
            onDone={(u) => {
              signIn(u.id)
              void enter(u)
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SignIn({
  status,
  ssoError,
  onCreate,
  onMfa,
  onUser,
}: {
  status: AuthStatus
  ssoError: string | null
  onCreate: () => void
  onMfa: (challenge: string) => void
  onUser: (user: UserProfile) => void
}) {
  const enter = useEnter()
  const lastName = useSession((s) => s.lastName)
  const login = useLogin()
  const ldapLogin = useLdapLogin()
  const guest = useGuest()
  const [method, setMethod] = useState<'local' | 'ldap'>('local')
  const [name, setName] = useState(lastName)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [guestError, setGuestError] = useState<string | null>(null)
  const [guestBusy, setGuestBusy] = useState(false)
  const useDirectory = status.ldap_enabled && method === 'ldap'
  const mutation = useDirectory ? ldapLogin : login
  const directoryLabel = status.ldap_label || tr("Annuaire de l'organisation", 'Organisation directory')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const result = useDirectory
        ? await ldapLogin.mutateAsync({ username: username.trim(), password })
        : await login.mutateAsync({ name: name.trim(), password })
      setPassword('')
      if (needsMfa(result)) onMfa(result.challenge)
      else onUser(result)
    } catch {
      setPassword('')
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

  const error = mutation.error instanceof Error ? mutation.error.message : null
  const identifier = useDirectory ? username : name
  const alternatives = [status.registration_open, status.guest_enabled].filter(Boolean).length

  return (
    <motion.div {...fade}>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
        <LockKeyhole size={18} className="text-ink-3" />
        {tr('Connexion', 'Sign in')}
      </h2>
      <p className="mt-1 text-sm text-ink-3">{tr('Ouvrez votre profil pour retrouver vos entités.', 'Open your profile to get back to your entities.')}</p>

      {status.sso_enabled ? (
        <>
          {/* Navigation complète vers le fournisseur d'identité : pas de requête en arrière-plan. */}
          <a
            href="/api/auth/sso/start"
            className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-rule-2 bg-surface text-sm font-medium text-ink shadow-xs transition-colors hover:border-rule-3 hover:bg-tint"
          >
            <KeySquare size={15} className="text-accent" />
            {tr(`Se connecter avec ${status.sso_label || 'le compte de l’organisation'}`, `Sign in with ${status.sso_label || 'your organisation account'}`)}
          </a>
          {ssoError ? (
            <p role="alert" className="mt-2 text-xs text-critical">
              {ssoError}
            </p>
          ) : null}
          <div className="mt-5 flex items-center gap-3 text-2xs text-ink-4">
            <span className="h-px flex-1 bg-rule" />
            {tr('ou', 'or')}
            <span className="h-px flex-1 bg-rule" />
          </div>
        </>
      ) : ssoError ? (
        <p role="alert" className="mt-3 text-xs text-critical">
          {ssoError}
        </p>
      ) : null}

      {status.ldap_enabled ? (
        <SegmentedControl
          className="mt-5 w-full sm:flex sm:w-full [&>button]:flex-1 [&>button]:justify-center"
          value={method}
          onChange={(v) => {
            setMethod(v)
            setPassword('')
            login.reset()
            ldapLogin.reset()
          }}
          ariaLabel={tr('Mode de connexion', 'Sign-in method')}
          options={[
            { value: 'local', label: tr('Compte Scopeo', 'Scopeo account') },
            {
              value: 'ldap',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={13} />
                  <span className="max-w-[11rem] truncate">{directoryLabel}</span>
                </span>
              ),
            },
          ]}
        />
      ) : null}

      <form onSubmit={submit} className="mt-5 space-y-4">
        {useDirectory ? (
          <Field label={tr('Identifiant', 'Username')} hint={tr('celui de votre session de travail', 'the one you use at work')}>
            <Input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </Field>
        ) : (
          <Field label={tr('Nom du profil', 'Profile name')}>
            <Input autoFocus={!lastName} value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" required />
          </Field>
        )}
        <Field label={tr('Mot de passe', 'Password')}>
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            autoFocus={!useDirectory && Boolean(lastName)}
            ariaInvalid={Boolean(error)}
          />
        </Field>
        {error ? (
          <p role="alert" className="text-xs text-critical">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" className="w-full" disabled={!identifier.trim() || !password || mutation.isPending}>
          {mutation.isPending ? tr('Vérification…', 'Checking…') : tr('Se connecter', 'Sign in')}
          <ArrowRight size={14} />
        </Button>
        {useDirectory ? (
          <p className="text-2xs leading-relaxed text-ink-4">
            {tr(
              "Le mot de passe est vérifié par l'annuaire de votre organisation ; Scopeo ne le conserve pas.",
              "Your password is checked by your organisation's directory; Scopeo does not store it.",
            )}
          </p>
        ) : null}
      </form>

      {alternatives > 0 ? (
        <div className={cn('mt-6 grid gap-2 border-t border-rule pt-5', alternatives > 1 && 'sm:grid-cols-2')}>
          {status.registration_open ? (
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
          ) : null}
          {status.guest_enabled ? (
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
          ) : null}
        </div>
      ) : (
        <p className="mt-6 border-t border-rule pt-5 text-xs text-ink-3">
          {tr("Pas encore de compte ? Demandez-en un à l'administrateur de Scopeo.", 'No account yet? Ask your Scopeo administrator for one.')}
        </p>
      )}
      {guestBusy ? <p className="mt-3 text-xs text-ink-3">{tr("Préparation de l'espace invité…", 'Preparing the guest space…')}</p> : null}
      {guestError ? <p className="mt-3 text-xs text-critical">{guestError}</p> : null}
    </motion.div>
  )
}

function MfaStep({ challenge, onBack, onUser }: { challenge: string; onBack: () => void; onUser: (user: UserProfile) => void }) {
  const verify = useMfaVerify()
  const [code, setCode] = useState('')
  const [recovery, setRecovery] = useState(false)
  const ready = recovery ? code.replace(/[^a-z0-9]/gi, '').length === 10 : code.length === 6

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready) return
    try {
      onUser(await verify.mutateAsync({ challenge, code }))
    } catch {
      setCode('')
    }
  }

  const expired = verify.error instanceof ApiError && verify.error.code === 'mfa_challenge_expired'

  return (
    <motion.form {...fade} onSubmit={submit}>
      <BackLink onClick={onBack} />
      <h2 className="mt-4 flex items-center gap-2 text-xl font-semibold text-ink">
        <ShieldCheck size={18} className="text-ink-3" />
        {tr('Double authentification', 'Two-factor authentication')}
      </h2>
      <p className="mt-1 text-sm text-ink-3">
        {recovery
          ? tr('Saisissez l’un de vos codes de récupération. Chaque code ne sert qu’une fois.', 'Enter one of your recovery codes. Each code works only once.')
          : tr('Saisissez le code à six chiffres affiché par votre application d’authentification.', 'Enter the six-digit code shown in your authenticator app.')}
      </p>
      <div className="mt-6">
        <CodeInput key={String(recovery)} value={code} onChange={setCode} recovery={recovery} autoFocus />
      </div>
      {verify.error ? (
        <p role="alert" className="mt-3 text-xs text-critical">
          {verify.error.message}
        </p>
      ) : null}
      {expired ? (
        <Button className="mt-6 w-full" onClick={onBack}>
          {tr('Revenir à la connexion', 'Back to sign-in')}
        </Button>
      ) : (
        <Button type="submit" variant="primary" className="mt-6 w-full" disabled={!ready || verify.isPending}>
          {verify.isPending ? tr('Vérification…', 'Checking…') : tr('Valider', 'Verify')}
          <ArrowRight size={14} />
        </Button>
      )}
      <button
        type="button"
        onClick={() => {
          setRecovery((v) => !v)
          setCode('')
          verify.reset()
        }}
        className="mt-4 text-xs text-ink-3 underline-offset-2 hover:text-ink hover:underline"
      >
        {recovery ? tr('Utiliser un code de l’application', 'Use an app code') : tr('Utiliser un code de récupération', 'Use a recovery code')}
      </button>
    </motion.form>
  )
}

function CreateProfile({ onBack, onCreated, firstRun = false }: { onBack?: () => void; onCreated: (user: UserProfile) => void; firstRun?: boolean }) {
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
      onCreated(user)
    } catch {
      /* message affiché ci-dessous */
    }
  }

  return (
    <motion.form {...fade} onSubmit={submit}>
      {onBack ? <BackLink onClick={onBack} /> : null}
      {firstRun ? (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-wash px-2 py-1 text-[11px] font-semibold text-accent-strong">
          <Sparkles size={12} />
          {tr('Premier lancement', 'First launch')}
        </span>
      ) : null}
      <h2 className={cn('text-xl font-semibold text-ink', onBack || firstRun ? 'mt-4' : '')}>
        {firstRun ? tr('Créer le profil administrateur', 'Create the administrator profile') : tr('Créer un profil', 'Create a profile')}
      </h2>
      <p className="mt-1 text-sm text-ink-3">
        {tr(
          'Le profil vous identifie. Les organisations que vous cadrez seront des entités distinctes, créées ensuite.',
          'The profile identifies you. The organisations you scope will be separate entities, created afterwards.',
        )}
      </p>
      {firstRun ? (
        <div className="mt-4 flex gap-2.5 rounded-lg border border-rule bg-raised px-3.5 py-3 text-xs leading-relaxed text-ink-2">
          <ShieldCheck size={15} className="mt-px shrink-0 text-accent" />
          <span>
            {tr(
              "Ce premier profil devient automatiquement administrateur. Il gère les comptes, l'annuaire LDAP et les réglages dans un espace séparé, et utilise Scopeo comme les autres profils, sans accès à leurs entités.",
              'This first profile automatically becomes the administrator. It manages accounts, the LDAP directory and settings in a separate space, and uses Scopeo like any other profile, without access to their entities.',
            )}
          </span>
        </div>
      ) : null}
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

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink">
      <ArrowLeft size={13} />
      {tr('Retour', 'Back')}
    </button>
  )
}
