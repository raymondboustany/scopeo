import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Clock, FolderOpen, Scale, UserPlus, UserRound } from 'lucide-react'
import { Mark } from '@/components/layout/Brand'
import { Button, Input, Select } from '@/components/ui/controls'
import { RegChip } from '@/components/ui/primitives'
import { useCreateUser, useUsers, queryClient, keys } from '@/lib/queries'
import { api, ApiError } from '@/lib/api'
import { useSession } from '@/lib/store'
import { cn, formatDate } from '@/lib/utils'
import type { UserRole } from '@/types/domain'
import { REGULATION_ORDER } from '@/data/regulations'
import { TIMELINE } from '@/data/timeline'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

type Mode = 'choix' | 'creer' | 'charger'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'consultant', label: 'Consultant — plusieurs clients' },
  { value: 'dpo', label: 'Délégué à la protection des données' },
  { value: 'rssi', label: 'RSSI' },
  { value: 'juriste', label: 'Juriste, conformité' },
  { value: 'dirigeant', label: 'Direction' },
  { value: 'auditeur', label: 'Auditeur' },
  { value: 'autre', label: 'Autre' },
]

const ROLE_SHORT: Record<string, string> = {
  consultant: 'Consultant',
  dpo: 'DPO',
  rssi: 'RSSI',
  juriste: 'Juriste',
  dirigeant: 'Direction',
  auditeur: 'Auditeur',
  autre: 'Utilisateur',
}

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
      when: days === 0 ? "aujourd'hui" : days > 0 ? `dans ${days} j` : `depuis ${-days} j`,
      past: days < 0,
    }))
}

const PILLARS = [
  { n: '01', title: 'Qualifier', body: 'Quels textes s’appliquent, à quel titre, sur quel fondement.' },
  { n: '02', title: 'Croiser', body: 'Où une action unique satisfait plusieurs textes, où ils divergent.' },
  { n: '03', title: 'Prioriser', body: 'Dans quel ordre traiter les écarts, et avec quel argumentaire.' },
]

/** Coins de cadrage — le motif du logo, repris à l'échelle de la page. */
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
  const [mode, setMode] = useState<Mode>('choix')
  const watch = useWatchItems()

  return (
    <div className="stage relative min-h-screen overflow-hidden">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-rule py-5">
          <span className="flex items-center gap-3">
            <Mark size={28} />
            <span className="text-sm font-semibold tracking-tight text-ink">Scopeo</span>
          </span>
          <span className="flex items-center gap-3">
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
              Savoir ce qui s'applique,
              <br />
              <span className="text-ink-3">et par quoi commencer.</span>
            </h1>
            <p className="mt-6 max-w-lg text-md leading-relaxed text-ink-2">
              Un outil de cadrage réglementaire, en amont d'un outil de suivi de conformité. Il établit le
              périmètre d'une organisation au regard de quatre textes européens et l'ordre dans lequel le traiter.
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
                <strong className="font-medium text-ink-2">Outil d'aide au cadrage, pas un avis juridique.</strong> Données
                enregistrées sur ce poste uniquement.
              </span>
            </p>
          </motion.section>

          {/* Choix ------------------------------------------------------------ */}
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
                {mode === 'choix' ? (
                  <Choices key="choix" onPick={setMode} />
                ) : mode === 'creer' ? (
                  <CreateProfile key="creer" onBack={() => setMode('choix')} />
                ) : (
                  <LoadProfile key="charger" onBack={() => setMode('choix')} onCreate={() => setMode('creer')} />
                )}
              </AnimatePresence>
            </motion.section>
          </div>
        </div>

        {/* Veille réglementaire */}
        <div className="group relative -mx-5 flex items-center overflow-hidden border-t border-rule py-3 sm:-mx-8">
          <span className="relative z-10 ml-5 shrink-0 rounded-md bg-accent-wash px-2 py-1 text-[11px] font-semibold text-accent-strong sm:ml-8">Calendrier</span>
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)]" aria-label="Calendrier réglementaire">
            <div className="flex w-max animate-[ticker_90s_linear_infinite] gap-10 whitespace-nowrap pl-6 text-xs group-hover:[animation-play-state:paused]">
              {[...watch, ...watch].map((w, i) => (
                <span key={i} className="inline-flex items-center gap-2" aria-hidden={i >= watch.length}>
                  {w.reg ? <RegChip id={w.reg} size="sm" /> : <span className="rounded-md bg-overlay px-1.5 text-[10px] font-semibold text-ink-3">UE / FR</span>}
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

function useEnter() {
  const navigate = useNavigate()
  const signIn = useSession((s) => s.signIn)
  const openTour = useSession((s) => s.openTour)
  return (userId: string, entityId: string | null, firstVisit: boolean) => {
    signIn(userId, entityId)
    navigate('/app')
    // L'onboarding se déclenche après le choix, une fois l'application affichée.
    if (firstVisit) setTimeout(() => openTour(0), 450)
  }
}

function Choices({ onPick }: { onPick: (m: Mode) => void }) {
  const enter = useEnter()
  const guestId = useSession((s) => s.guestId)
  const setGuestId = useSession((s) => s.setGuestId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startGuest() {
    setBusy(true)
    setError(null)
    try {
      // Le profil invité de ce navigateur est retrouvé d'une visite à l'autre.
      let user = null
      if (guestId) {
        try {
          user = await api.user(guestId)
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 404)) throw e
        }
      }
      if (!user) {
        user = await api.createUser({ name: 'Invité', role: 'autre', is_guest: true })
        setGuestId(user.id)
      }
      let entities = await api.entities(user.id)
      // L'invité découvre l'outil sur une entité complète plutôt que sur une page vide.
      if (entities.length === 0) {
        await api.copyDemo(user.id)
        entities = await api.entities(user.id)
      }
      queryClient.setQueryData(keys.user(user.id), user)
      enter(user.id, entities[0]?.id ?? null, !user.onboarded)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de démarrer le mode invité.')
      setBusy(false)
    }
  }

  const options = [
    {
      id: 'creer' as const,
      icon: <UserPlus size={18} />,
      title: 'Créer un profil',
      body: 'Votre identité d’utilisateur — consultant, DPO, RSSI. Vous y rattacherez une ou plusieurs entités.',
      onClick: () => onPick('creer'),
    },
    {
      id: 'charger' as const,
      icon: <FolderOpen size={18} />,
      title: 'Charger un profil existant',
      body: 'Reprendre là où vous en étiez : vos entités et leurs cadrages sont conservés.',
      onClick: () => onPick('charger'),
    },
    {
      id: 'invite' as const,
      icon: <UserRound size={18} />,
      title: 'Mode invité',
      body: 'Explorer l’outil sur Finexa, établissement de paiement de 50 salariés, déjà qualifié et évalué.',
      onClick: startGuest,
    },
  ]

  return (
    <motion.div {...fade}>
      <h2 className="text-xl font-semibold text-ink">Commencer</h2>
      <p className="mt-1 text-sm text-ink-3">Choisissez comment ouvrir l'outil.</p>
      <div className="mt-6 space-y-3">
        {options.map((o, i) => (
          <motion.button
            key={o.id}
            onClick={o.onClick}
            disabled={busy}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i + 0.1 }}
            className="group flex w-full items-start gap-4 rounded-md border border-rule-2 bg-raised p-4 text-left transition-colors hover:border-rule-3 hover:bg-overlay disabled:opacity-60"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-rule-2 bg-sunken text-ink-2 transition-colors group-hover:text-accent">
              {o.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-ink">{o.title}</span>
              <span className="mt-0.5 block text-sm leading-snug text-ink-3">{o.body}</span>
            </span>
            <ArrowRight size={16} className="mt-3 shrink-0 text-ink-4 transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
          </motion.button>
        ))}
      </div>
      {busy ? <p className="mt-4 text-xs text-ink-3">Préparation de l'espace invité…</p> : null}
      {error ? <p className="mt-4 text-xs text-critical">{error}</p> : null}
    </motion.div>
  )
}

function CreateProfile({ onBack }: { onBack: () => void }) {
  const enter = useEnter()
  const create = useCreateUser()
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('consultant')
  const [organisation, setOrganisation] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const user = await create.mutateAsync({ name: name.trim(), role, organisation: organisation.trim() })
    queryClient.setQueryData(keys.user(user.id), user)
    enter(user.id, null, true)
  }

  return (
    <motion.form {...fade} onSubmit={submit}>
      <BackLink onClick={onBack} />
      <h2 className="mt-4 text-xl font-semibold text-ink">Créer un profil</h2>
      <p className="mt-1 text-sm text-ink-3">
        Le profil vous identifie. Les organisations que vous cadrez seront des entités distinctes, créées ensuite.
      </p>
      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Nom</span>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Claire Martin" required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Fonction</span>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)} options={ROLES} ariaLabel="Fonction" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">
            Organisation <span className="text-ink-4">— facultatif</span>
          </span>
          <Input value={organisation} onChange={(e) => setOrganisation(e.target.value)} placeholder="Cabinet, direction, société" />
        </label>
      </div>
      {create.error ? <p className="mt-4 text-xs text-critical">{create.error.message}</p> : null}
      <Button type="submit" variant="primary" className="mt-6 w-full" disabled={!name.trim() || create.isPending}>
        {create.isPending ? 'Création…' : 'Créer et commencer'}
        <ArrowRight size={14} />
      </Button>
    </motion.form>
  )
}

function LoadProfile({ onBack, onCreate }: { onBack: () => void; onCreate: () => void }) {
  const enter = useEnter()
  const { data: users, isLoading, error } = useUsers()

  return (
    <motion.div {...fade}>
      <BackLink onClick={onBack} />
      <h2 className="mt-4 text-xl font-semibold text-ink">Charger un profil</h2>
      <p className="mt-1 text-sm text-ink-3">Profils enregistrés sur ce poste.</p>

      <div className="mt-6 max-h-[22rem] space-y-2 overflow-y-auto pr-1">
        {isLoading ? <p className="text-sm text-ink-3">Chargement…</p> : null}
        {error ? <p className="text-sm text-critical">{error.message}</p> : null}
        {users?.length === 0 ? (
          <div className="rounded-lg border border-dashed border-rule-3 p-6 text-center">
            <p className="text-sm text-ink-2">Aucun profil enregistré pour l'instant.</p>
            <Button size="sm" variant="primary" className="mt-3" onClick={onCreate}>
              Créer un profil
            </Button>
          </div>
        ) : null}
        {users?.map((u, i) => (
          <motion.button
            key={u.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={async () => {
              const entities = await api.entities(u.id)
              enter(u.id, entities[0]?.id ?? null, !u.onboarded)
            }}
            className="group flex w-full items-center gap-3 rounded-lg border border-rule-2 bg-raised p-3.5 text-left transition-colors hover:border-accent-line hover:bg-overlay"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-wash text-sm font-semibold text-accent">
              {u.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{u.name}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-ink-3">
                <span>{ROLE_SHORT[u.role] ?? u.role}</span>
                {u.organisation ? <span>· {u.organisation}</span> : null}
                <span>
                  · {u.entity_count} entité{u.entity_count > 1 ? 's' : ''}
                </span>
              </span>
            </span>
            <span className="hidden shrink-0 items-center gap-1 text-2xs text-ink-4 sm:flex">
              <Clock size={11} />
              {formatDate(u.updated_at)}
            </span>
            <ArrowRight size={15} className="shrink-0 text-ink-4 transition-colors group-hover:text-accent" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex items-center gap-1.5 text-xs text-ink-3 transition-colors hover:text-ink')}>
      <ArrowLeft size={13} />
      Retour
    </button>
  )
}
