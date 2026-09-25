import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Check, ExternalLink, Mail, Phone, Plus, Trash2, UserRound } from 'lucide-react'
import { Button, Dialog, Input, Select, Tooltip } from '@/components/ui/controls'
import { Card, RegChip, Tag } from '@/components/ui/primitives'
import { REG_STYLE } from '@/components/ui/tokens'
import {
  authoritiesFor,
  NOTIFICATION_DELAYS,
  formatRemaining,
  incidentSteps,
  nextDeadline,
  REGIME_LABEL,
  REGIME_REGULATION,
  suggestedRegimes,
  type IncidentStep,
  type ReadinessItem,
  type Regime,
  type StepStatus,
} from '@/engines/incidents'
import { useEntityEditor } from '@/lib/queries'
import { cn, uid } from '@/lib/utils'
import type { Answers, IncidentRecord, InternalContact, RegulationId } from '@/types/domain'
import { REG_LABEL } from '@/components/ui/tokens'
import { COLON, LOCALE, tr } from '@/i18n'

/* ==========================================================================
   Cartes d'autorité
   ========================================================================== */

export function AuthorityCards({ applicable, answers }: { applicable: RegulationId[]; answers: Answers }) {
  if (applicable.length === 0) {
    return <p className="text-sm text-ink-3">{tr("Aucune autorité à contacter : aucun texte applicable n'a été retenu.", 'No authority to contact: no applicable text was identified.')}</p>
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {applicable.map((r, i) => {
        const authorities = authoritiesFor(r, answers)
        const main = authorities[0]
        return (
          <motion.a
            key={r}
            href={main.url}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-glow group flex flex-col rounded-lg p-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-2">
              <RegChip id={r} size="sm" />
              <ExternalLink size={13} className="text-ink-4 transition-colors group-hover:text-accent" />
            </div>
            <div className="mt-3 text-base font-semibold text-ink">{authorities.map((a) => a.name).join(' / ')}</div>
            <div className="text-2xs text-ink-3">{main.role}</div>
            {r === 'NIS2' && applicable.includes('DORA') && answers.entite_financiere === 'oui' ? (
              <p className="mt-3 rounded-sm bg-overlay px-2.5 py-2 text-2xs leading-snug text-ink-2">
                {tr('Incidents notifiés au titre de DORA, qui prime ici sur NIS2 (article 4 de NIS2).', 'Incidents are reported under DORA, which prevails over NIS2 here (Article 4 of NIS2).')}
              </p>
            ) : null}
            <ul className="mt-3 space-y-1">
              {NOTIFICATION_DELAYS[r].map((d) => (
                <li key={d.step} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink-2">{d.step}</span>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-overlay px-2 py-0.5 font-mono text-2xs text-ink">{d.delay}</span>
                </li>
              ))}
            </ul>
            {main.phone || main.email ? (
              <div className="mt-3 space-y-1 border-t border-rule pt-2.5 text-2xs text-ink-3">
                {main.phone ? (
                  <div className="flex items-center gap-1.5">
                    <Phone size={11} /> {main.phone}
                  </div>
                ) : null}
                {main.email ? (
                  <div className="flex items-center gap-1.5">
                    <Mail size={11} /> {main.email}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 border-t border-rule pt-2.5 text-2xs leading-snug text-ink-3">{main.channel}</p>
            )}
            {r === 'AIACT' ? (
              <p className="mt-2 text-[10px] leading-snug text-ink-4">
                {tr(
                  "Incidents graves des systèmes à haut risque, exigible à l'application du régime haut risque (2 décembre 2027 pour l'annexe III).",
                  'Serious incidents involving high-risk systems, enforceable once the high-risk regime applies (2 December 2027 for Annex III).',
                )}
              </p>
            ) : null}
            {r === 'DORA' ? (
              <p className="mt-2 text-[10px] leading-snug text-ink-4">{tr('* 4 h après classification comme majeur, 24 h au plus tard après la détection.', '* 4 h after classification as major, no later than 24 h after detection.')}</p>
            ) : null}
          </motion.a>
        )
      })}
    </div>
  )
}

/* ==========================================================================
   Statuts d'étape
   ========================================================================== */

const STEP_STYLE: Record<StepStatus, { label: string; tone: string; border: string; led?: 'critical' | 'caution' }> = {
  done_on_time: { label: tr('Respecté', 'Met'), tone: 'text-positive', border: 'border-positive-line bg-positive-wash' },
  done_late: { label: tr('Fait hors délai', 'Done late'), tone: 'text-critical', border: 'border-critical-line bg-critical-wash' },
  overdue: { label: tr('Délai dépassé', 'Overdue'), tone: 'text-critical', border: 'border-critical-line bg-critical-wash', led: 'critical' },
  due_soon: { label: tr('Échéance proche', 'Due soon'), tone: 'text-caution', border: 'border-caution-line bg-caution-wash', led: 'caution' },
  running: { label: tr('Délai en cours', 'Clock running'), tone: 'text-ink-2', border: 'border-rule-2 bg-raised' },
  no_deadline: { label: tr('Sans délai chiffré', 'No fixed deadline'), tone: 'text-ink-3', border: 'border-rule-2 bg-raised' },
}

/* ==========================================================================
   Frise des délais d'un incident : compte à rebours
   ========================================================================== */

export function DeadlineTimeline({ steps, detectedAt, now }: { steps: IncidentStep[]; detectedAt: Date; now: Date }) {
  const dated = steps.filter((s) => s.due)
  const nearest = nextDeadline(steps)
  const end = Math.max(now.getTime(), ...dated.map((s) => s.due!.getTime())) + 3_600_000
  const start = detectedAt.getTime()
  // Échelle racine : les premières heures, où tout se joue, occupent l'essentiel
  // de la largeur ; le rapport final à un mois reste visible sans écraser le reste.
  const x = (t: number) => Math.sqrt(Math.max(0, t - start) / Math.max(1, end - start)) * 100

  // Un libellé n'est affiché que s'il ne chevauche pas le précédent ; les
  // autres restent lisibles au survol. Le prochain délai est toujours nommé.
  const labelled = new Set<string>()
  let last: { id: string; left: number } | null = null
  for (const st of [...dated].sort((a, b) => a.due!.getTime() - b.due!.getTime())) {
    const l = x(st.due!.getTime())
    const clear = !last || l - last.left >= 14
    if (clear || st.id === nearest?.id) {
      // Le prochain délai prend la place d'un voisin trop proche.
      if (!clear && last && last.id !== nearest?.id) labelled.delete(last.id)
      if (clear || !last || last.id !== nearest?.id) {
        labelled.add(st.id)
        last = { id: st.id, left: l }
      }
    }
  }

  return (
    <div className="relative mt-2 h-24 select-none">
      <div className="absolute left-0 right-0 top-9 h-1 rounded-full bg-overlay" />
      <motion.div
        className="absolute left-0 top-9 h-1 rounded-full bg-gradient-to-r from-accent/60 to-accent"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, x(now.getTime()))}%` }}
        transition={{ duration: 0.9 }}
      />
      {/* Maintenant */}
      <div className="absolute top-5 -translate-x-1/2" style={{ left: `${Math.min(100, x(now.getTime()))}%` }}>
        <div className="h-9 w-px bg-accent" />
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-accent">{tr('maintenant', 'now')}</span>
      </div>
      {dated.map((s) => {
        const left = x(s.due!.getTime())
        const showLabel = labelled.has(s.id)
        const style = STEP_STYLE[s.status]
        const isNearest = nearest?.id === s.id
        const color = REG_STYLE[REGIME_REGULATION[s.regime]].hex
        return (
          <Tooltip
            key={s.id}
            content={`${s.label} (${s.authority})${COLON}${s.due!.toLocaleString(LOCALE, { dateStyle: 'short', timeStyle: 'short' })}`}
          >
            <div className="absolute top-7 -translate-x-1/2 cursor-default" style={{ left: `${left}%` }}>
              <span
                className={cn('block size-5 rounded-full border-2 border-paper', isNearest && s.status === 'due_soon' && 'animate-led')}
                style={{ background: s.doneAt ? 'var(--c-positive)' : s.status === 'overdue' ? 'var(--c-critical)' : color, ['--led-color' as string]: color }}
              />
              {showLabel ? (
                <span
                  className={cn(
                    'absolute top-6 whitespace-nowrap text-[10px]',
                    left > 85 ? 'right-0' : left < 8 ? 'left-0' : 'left-1/2 -translate-x-1/2',
                    style.tone,
                  )}
                >
                  {REG_LABEL[REGIME_REGULATION[s.regime]].split(' ')[0]} · {s.label.split(' ')[0]}
                </span>
              ) : null}
            </div>
          </Tooltip>
        )
      })}
      <span className="absolute bottom-0 left-0 text-[10px] text-ink-4">{tr('détection', 'detection')}</span>
    </div>
  )
}


/* ==========================================================================
   Contacts internes d'escalade
   ========================================================================== */

const CONTACT_ROLES: { value: InternalContact['role']; label: string }[] = [
  { value: 'direction', label: tr('Membre de la direction', 'Executive') },
  { value: 'rssi', label: tr('RSSI', 'CISO') },
  { value: 'reponse', label: tr('Réponse à incident (équipe ou prestataire)', 'Incident response (team or provider)') },
  { value: 'dpo', label: 'DPO' },
  { value: 'juridique', label: tr('Juridique', 'Legal') },
  { value: 'communication', label: tr('Communication', 'Communications') },
  { value: 'autre', label: tr('Autre', 'Other') },
]

const ROLE_LABEL = Object.fromEntries(CONTACT_ROLES.map((r) => [r.value, r.label])) as Record<string, string>

/** Ordre d'escalade : sécurité et appui technique, puis protection des données, puis direction. */
const ESCALATION: InternalContact['role'][] = ['rssi', 'reponse', 'dpo', 'direction', 'juridique', 'communication', 'autre']

export function ContactCards({ contacts, readOnly }: { contacts: InternalContact[]; readOnly: boolean }) {
  const edit = useEntityEditor()
  const [editing, setEditing] = useState<InternalContact | null>(null)
  const sorted = [...contacts].sort((a, b) => ESCALATION.indexOf(a.role) - ESCALATION.indexOf(b.role))

  const save = (c: InternalContact) => {
    edit((cur) => ({
      contacts: cur.contacts.some((x) => x.id === c.id) ? cur.contacts.map((x) => (x.id === c.id ? c : x)) : [...cur.contacts, c],
    }))
    setEditing(null)
  }
  const remove = (id: string) => edit((cur) => ({ contacts: cur.contacts.filter((x) => x.id !== id) }))

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="flex h-full items-start gap-3 p-4">
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-wash text-sm font-semibold text-accent">
                {c.name ? c.name.slice(0, 1).toUpperCase() : <UserRound size={15} />}
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full border border-paper bg-overlay font-mono text-[9px] text-ink-2">
                  {i + 1}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">{c.name || tr('Sans nom', 'No name')}</span>
                </div>
                <Tag className="mt-1">{ROLE_LABEL[c.role]}</Tag>
                {c.title ? <div className="mt-1 text-2xs text-ink-3">{c.title}</div> : null}
                <div className="mt-2 space-y-0.5 text-2xs text-ink-3">
                  {c.phone ? (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 hover:text-ink">
                      <Phone size={11} /> {c.phone}
                    </a>
                  ) : null}
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-ink">
                      <Mail size={11} /> {c.email}
                    </a>
                  ) : null}
                </div>
              </div>
              {readOnly ? null : (
                <div className="flex flex-col gap-1">
                  <button onClick={() => setEditing(c)} className="rounded p-1 text-2xs text-ink-3 hover:bg-tint hover:text-ink">
                    {tr('Modifier', 'Edit')}
                  </button>
                  <button onClick={() => remove(c.id)} className="rounded p-1 text-ink-4 hover:bg-tint hover:text-critical" aria-label={tr('Supprimer le contact', 'Delete contact')}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
        {readOnly ? null : (
          <button
            onClick={() => setEditing({ id: uid(), role: contacts.length === 0 ? 'rssi' : 'dpo', name: '', title: '', email: '', phone: '' })}
            className="flex min-h-[7rem] items-center justify-center gap-2 rounded-lg border border-dashed border-rule-3 text-sm text-ink-3 transition-colors hover:border-accent-line hover:text-ink"
          >
            <Plus size={15} />
            {tr('Ajouter un contact', 'Add a contact')}
          </button>
        )}
      </div>
      {editing ? <ContactDialog contact={editing} onSave={save} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}

function ContactDialog({ contact, onSave, onClose }: { contact: InternalContact; onSave: (c: InternalContact) => void; onClose: () => void }) {
  const [c, setC] = useState(contact)
  const set = (k: keyof InternalContact, v: string) => setC((x) => ({ ...x, [k]: v }))
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={tr("Contact d'escalade", 'Escalation contact')}
      description={tr("Personne à mobiliser en cas d'incident.", 'Person to call on in case of an incident.')}
      footer={
        <>
          <Button onClick={onClose}>{tr('Annuler', 'Cancel')}</Button>
          <Button variant="primary" onClick={() => onSave(c)} disabled={!c.name.trim()}>
            {tr('Enregistrer', 'Save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Rôle', 'Role')}</span>
          <Select value={c.role} onValueChange={(v) => set('role', v)} options={CONTACT_ROLES} ariaLabel={tr('Rôle', 'Role')} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Nom', 'Name')}</span>
          <Input value={c.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Fonction', 'Job title')}</span>
          <Input value={c.title} onChange={(e) => set('title', e.target.value)} placeholder={tr("Directeur des systèmes d'information", 'Chief information officer')} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Téléphone', 'Phone')}</span>
          <Input value={c.phone} onChange={(e) => set('phone', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Courriel', 'Email')}</span>
          <Input type="email" value={c.email} onChange={(e) => set('email', e.target.value)} />
        </label>
      </div>
    </Dialog>
  )
}


/* ==========================================================================
   Préparation au signalement : ce qu'un cadrage doit avoir établi
   ========================================================================== */

export function ReadinessList({ items }: { items: ReadinessItem[] }) {
  return (
    <ul className="divide-y divide-rule">
      {items.map((it) => (
        <li key={it.id} className="flex items-start gap-3 py-2.5">
          <span
            className={cn(
              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
              it.ok ? 'border-positive bg-positive text-paper' : 'border-caution-line text-caution',
            )}
            aria-label={it.ok ? tr('Établi', 'Established') : tr('À compléter', 'To complete')}
          >
            {it.ok ? <Check size={10} strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-caution" />}
          </span>
          <span className="min-w-0">
            <span className={cn('block text-sm', it.ok ? 'text-ink' : 'font-medium text-ink')}>{it.label}</span>
            <span className="block text-2xs leading-snug text-ink-3">{it.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/* ==========================================================================
   Simulation : exercer les horloges sans rien enregistrer
   ========================================================================== */

const ALL_REGIMES: Regime[] = ['RGPD', 'NIS2', 'DORA', 'CRA-VULN', 'CRA-INC', 'AIACT']

export function Simulator({ applicable, answers }: { applicable: RegulationId[]; answers: Answers }) {
  const offered = ALL_REGIMES.filter((r) => suggestedRegimes(applicable, answers).includes(r))
  const [regimes, setRegimes] = useState<Regime[]>(offered.filter((r) => r !== 'CRA-INC'))
  const [elapsed, setElapsed] = useState(0)
  const [classifiedAfter, setClassifiedAfter] = useState(2)
  const [t0] = useState(() => {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    return d
  })

  const scenario: IncidentRecord = useMemo(
    () => ({
      id: 'simulation',
      entity_id: '',
      title: tr('Simulation', 'Simulation'),
      description: '',
      detected_at: t0.toISOString(),
      classified_at: regimes.includes('DORA') ? new Date(t0.getTime() + classifiedAfter * 3_600_000).toISOString() : null,
      corrected_at: null,
      regimes,
      steps: {},
      closed: false,
      created_at: t0.toISOString(),
      updated_at: t0.toISOString(),
    }),
    [t0, regimes, classifiedAfter],
  )
  const now = new Date(t0.getTime() + elapsed * 3_600_000)
  const steps = incidentSteps(scenario, answers, now)
  const next = nextDeadline(steps)

  if (offered.length === 0) {
    return <p className="text-sm text-ink-3">{tr("Aucun régime de notification ne s'applique à cette entité au vu de sa qualification.", 'No notification regime applies to this entity given its scoping.')}</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div>
          <span className="label-caps mb-2 block">{tr("L'incident relèverait de", 'The incident would fall under')}</span>
          <div className="flex flex-wrap gap-2">
            {offered.map((r) => {
              const on = regimes.includes(r)
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  title={REGIME_LABEL[r].trigger}
                  onClick={() => setRegimes((cur) => (on ? cur.filter((x) => x !== r) : [...cur, r]))}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors',
                    on ? 'border-rule-3 bg-overlay text-ink' : 'border-rule-2 text-ink-3 hover:text-ink',
                  )}
                >
                  <span className={cn('size-3.5 rounded-sm border', on ? 'border-accent bg-accent' : 'border-rule-3')} aria-hidden>
                    {on ? <Check size={10} strokeWidth={3} className="text-accent-ink" /> : null}
                  </span>
                  <RegChip id={REGIME_REGULATION[r]} size="sm" />
                  {REGIME_LABEL[r].title}
                </button>
              )
            })}
          </div>
        </div>
        {regimes.includes('DORA') ? (
          <label className="block">
            <span className="label-caps mb-2 block">{tr('Classé majeur après', 'Classified as major after')}</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={24}
                value={classifiedAfter}
                onChange={(e) => setClassifiedAfter(Number(e.target.value))}
                className="w-full accent-[var(--c-accent)]"
              />
              <span className="w-12 text-right font-mono text-xs text-ink">{classifiedAfter} h</span>
            </div>
          </label>
        ) : null}
      </div>

      <div className="rounded-md border border-rule-2 bg-sunken p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-w-[16rem] flex-1 items-center gap-3">
            <span className="shrink-0 text-xs text-ink-2">{tr('Temps écoulé depuis la détection', 'Time since detection')}</span>
            <input
              type="range"
              min={0}
              max={96}
              value={elapsed}
              onChange={(e) => setElapsed(Number(e.target.value))}
              className="w-full accent-[var(--c-accent)]"
              aria-label={tr('Temps écoulé depuis la détection, en heures', 'Time since detection, in hours')}
            />
            <span className="w-14 text-right font-mono text-xs text-ink">+{elapsed} h</span>
          </label>
          {next ? (
            <span className={cn('rounded-md border px-2.5 py-1 text-xs', STEP_STYLE[next.status].border, STEP_STYLE[next.status].tone)}>
              {tr('Prochaine', 'Next')}{COLON}{next.label} ({next.authority}), {formatRemaining(next.due!.getTime() - now.getTime())}
            </span>
          ) : null}
        </div>
        <DeadlineTimeline steps={steps} detectedAt={t0} now={now} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-rule-2 text-left">
              <th className="label-caps py-2 pr-3 font-medium">{tr('Étape', 'Step')}</th>
              <th className="label-caps py-2 pr-3 font-medium">{tr('Autorité', 'Authority')}</th>
              <th className="label-caps py-2 pr-3 font-medium">{tr('Échéance', 'Deadline')}</th>
              <th className="label-caps py-2 font-medium">{tr(`État à +${elapsed} h`, `Status at +${elapsed} h`)}</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => {
              const st = STEP_STYLE[s.status]
              return (
                <tr key={s.id} className="border-b border-rule align-top">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <RegChip id={REGIME_REGULATION[s.regime]} size="sm" />
                      <span className="text-ink">{s.label}</span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-ink-4">{s.basis}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-ink-2">{s.authority}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-ink-2">
                    {s.due ? `T0 + ${Math.round((s.due.getTime() - t0.getTime()) / 3_600_000)} h` : tr('sans délai chiffré', 'no fixed deadline')}
                    {s.provisional && s.due ? <span className="ml-1 text-ink-4">{tr('(provisoire)', '(provisional)')}</span> : null}
                  </td>
                  <td className={cn('py-2.5 text-xs font-medium', st.tone)}>{st.label}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
