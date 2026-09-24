import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Briefcase, Building, Building2, CalendarRange, Lock, Plus, Trash2, TriangleAlert, Users } from 'lucide-react'
import { Input, LinkButton, SegmentedControl, Textarea } from '@/components/ui/controls'
import { Callout, Card, CardHeader, PageHeader, Tag } from '@/components/ui/primitives'
import { useScoping } from '@/lib/hooks'
import { useEntityEditor } from '@/lib/queries'
import { cn, uid } from '@/lib/utils'
import { NextStep } from '@/components/layout/NextStep'
import { IsoBadge } from '@/features/iso/IsoBadge'
import { ISO_STATUS_OPTIONS, namedList } from '@/features/iso/labels'
import { isoProgress } from '@/engines/iso'
import { tr } from '@/i18n'
import type { EntityProfile, IsoPerimeter, IsoProfile, Stakeholder } from '@/types/domain'

const ROLE_SUGGESTIONS = [
  tr('Direction générale', 'Chief executive'),
  tr('DSI', 'CIO'),
  tr('RSSI', 'CISO'),
  tr('DPO', 'DPO'),
  tr('Direction juridique', 'Legal department'),
  tr('Conformité', 'Compliance'),
  tr('Risques', 'Risk'),
  tr('Achats', 'Procurement'),
  tr('Audit interne', 'Internal audit'),
  tr('Communication', 'Communications'),
]

/**
 * Fiche entité.
 *
 * Deux usages, deux vocabulaires : un conseil cadre un client (société,
 * mission, interlocuteurs), une équipe cadre sa propre organisation (projet,
 * équipe). Les données sont les mêmes ; elles alimentent la page de garde et
 * le contexte des rapports, et ne sont jamais publiées par le Trust Center.
 *
 * La démarche ISO 27001 n'apparaît qu'une fois la qualification terminée :
 * la question de périmètre qu'elle pose dépend des textes retenus.
 */
export default function EntityProfilePage() {
  const { entity, readOnly, qualified } = useScoping()
  const edit = useEntityEditor()
  if (!entity) return null
  const profile: EntityProfile = entity.profile ?? {}
  const mode = profile.mode ?? 'client'
  const client = mode === 'client'

  const set = <K extends keyof EntityProfile>(key: K, value: EntityProfile[K]) =>
    edit((cur) => ({ profile: { ...(cur.profile ?? {}), [key]: value } }))
  const people = profile.stakeholders ?? []
  const setPeople = (list: Stakeholder[]) => set('stakeholders', list)

  const field = (key: keyof EntityProfile, label: string, placeholder = '', type = 'text') => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-2">{label}</span>
      <Input
        type={type}
        disabled={readOnly}
        value={(profile[key] as string | undefined) ?? ''}
        onChange={(e) => set(key, e.target.value as never)}
        placeholder={placeholder}
      />
    </label>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr('Cadrage', 'Scoping')}
        title={tr('Fiche entité', 'Entity profile')}
        lead={tr(
          'Qui est cadré, dans quel cadre, avec qui. Ces informations figurent en ouverture des rapports ; elles ne sont jamais publiées par le Trust Center.',
          'Who is being scoped, in what context, with whom. This information opens the reports; it is never published by the Trust Center.',
        )}
        actions={
          readOnly ? (
            <Tag>
              <Lock size={10} /> {tr('Démonstration, lecture seule', 'Demo, read-only')}
            </Tag>
          ) : null
        }
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-ink">{tr('Type de cadrage', 'Type of scoping')}</div>
            <p className="mt-0.5 text-xs text-ink-3">
              {client
                ? tr(
                    "Vous cadrez l'organisation d'un client : la fiche décrit la société, la mission et vos interlocuteurs.",
                    "You are scoping a client's organisation: the profile describes the company, the engagement and your contacts.",
                  )
                : tr(
                    'Vous cadrez votre propre organisation : la fiche décrit le projet et l’équipe mobilisée.',
                    'You are scoping your own organisation: the profile describes the project and the team involved.',
                  )}
            </p>
          </div>
          <SegmentedControl<'client' | 'interne'>
            ariaLabel={tr('Type de cadrage', 'Type of scoping')}
            value={mode}
            onChange={(v) => !readOnly && set('mode', v)}
            options={[
              { value: 'client', label: tr('Cadrage d’un client', 'Client scoping') },
              { value: 'interne', label: tr('Cadrage interne', 'Internal scoping') },
            ]}
          />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={client ? tr('Société cliente', 'Client company') : tr('Organisation', 'Organisation')}
            icon={client ? <Building2 size={16} /> : <Building size={16} />}
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">{field('legalName', tr('Raison sociale', 'Legal name'), entity.name)}</div>
            {field('siren', tr('SIREN', 'Company number (SIREN)'), '123 456 789')}
            {field('group', tr('Groupe ou maison mère', 'Group or parent company'), tr('Facultatif', 'Optional'))}
            <div className="sm:col-span-2">{field('address', tr('Siège', 'Head office'), tr('Adresse du siège social', 'Registered office address'))}</div>
            <div className="sm:col-span-2">{field('website', tr('Site internet', 'Website'), 'https://')}</div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={client ? tr('Mission', 'Engagement') : tr('Projet', 'Project')}
            icon={client ? <Briefcase size={16} /> : <CalendarRange size={16} />}
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {field(
              'missionRef',
              client ? tr('Référence de mission', 'Engagement reference') : tr('Nom du projet', 'Project name'),
              client ? tr('Ex. : CAD-2026-014', 'E.g. CAD-2026-014') : tr('Ex. : Programme conformité 2027', 'E.g. Compliance programme 2027'),
            )}
            {field(
              'lead',
              client ? tr('Consultant en charge', 'Consultant in charge') : tr('Pilote du cadrage', 'Scoping lead'),
              client ? tr('Votre nom', 'Your name') : tr('Nom et fonction', 'Name and role'),
            )}
            {field(
              'sponsor',
              client ? tr('Commanditaire chez le client', 'Client sponsor') : tr('Commanditaire (direction)', 'Sponsor (management)'),
              tr('Nom et fonction', 'Name and role'),
            )}
            <div />
            {field('startDate', tr('Lancement', 'Start'), '', 'date')}
            {field('reportDate', tr('Restitution prévue', 'Planned report date'), '', 'date')}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Objectif', 'Objective')}</span>
              <Textarea
                rows={2}
                disabled={readOnly}
                value={profile.objective ?? ''}
                onChange={(e) => set('objective', e.target.value)}
                placeholder={
                  client
                    ? tr('Ce que le client attend du cadrage', 'What the client expects from the scoping')
                    : tr('Pourquoi ce cadrage, et pour quelle décision', 'Why this scoping, and for which decision')
                }
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Périmètre couvert', 'Scope covered')}</span>
              <Textarea
                rows={2}
                disabled={readOnly}
                value={entity.scope_note}
                onChange={(e) => edit({ scope_note: e.target.value })}
                placeholder={tr(
                  'Filiales, activités, pays ou produits inclus, et ce qui est exclu',
                  'Subsidiaries, activities, countries or products included, and what is excluded',
                )}
              />
            </label>
          </div>
        </Card>
      </div>

      {qualified ? <IsoSection iso={profile.iso27001} readOnly={readOnly} onChange={(iso) => set('iso27001', iso)} /> : null}

      <Card>
        <CardHeader
          title={client ? tr('Interlocuteurs', 'Contacts') : tr('Équipe projet', 'Project team')}
          subtitle={
            client
              ? tr('Les personnes rencontrées ou à rencontrer pendant le cadrage', 'People met or to be met during the scoping')
              : tr('Les personnes mobilisées et leur rôle', 'People involved and their role')
          }
          icon={<Users size={16} />}
        />
        <div className="p-5">
          <datalist id="role-suggestions">
            {ROLE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          {people.length === 0 ? (
            <p className="mb-3 text-sm text-ink-3">{tr("Personne pour l'instant.", 'Nobody yet.')}</p>
          ) : (
            <div className="mb-3 space-y-2">
              <div className="hidden grid-cols-[1fr_1fr_1fr_auto] gap-3 px-1 text-2xs font-medium text-ink-3 sm:grid">
                <span>{tr('Nom', 'Name')}</span>
                <span>{tr('Fonction', 'Role')}</span>
                <span>{tr('Courriel', 'Email')}</span>
                <span className="w-8" />
              </div>
              {people.map((p) => (
                <div key={p.id} className="grid gap-2 rounded-lg bg-sunken p-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:gap-3 sm:bg-transparent sm:p-0">
                  <Input disabled={readOnly} value={p.name} placeholder={tr('Nom', 'Name')} onChange={(e) => setPeople(people.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} />
                  <Input disabled={readOnly} list="role-suggestions" value={p.role} placeholder={tr('Fonction', 'Role')} onChange={(e) => setPeople(people.map((x) => (x.id === p.id ? { ...x, role: e.target.value } : x)))} />
                  <Input disabled={readOnly} type="email" value={p.email} placeholder={tr('Courriel', 'Email')} onChange={(e) => setPeople(people.map((x) => (x.id === p.id ? { ...x, email: e.target.value } : x)))} />
                  {readOnly ? (
                    <span />
                  ) : (
                    <button
                      onClick={() => setPeople(people.filter((x) => x.id !== p.id))}
                      className="flex size-9 items-center justify-center rounded-md text-ink-4 hover:bg-critical-wash hover:text-critical"
                      aria-label={tr(`Retirer ${p.name || 'cette personne'}`, `Remove ${p.name || 'this person'}`)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {readOnly ? null : (
            <button
              onClick={() => setPeople([...people, { id: uid(), name: '', role: '', email: '' }])}
              className={cn('inline-flex h-9 items-center gap-2 rounded-md bg-accent-wash px-3 text-sm font-medium text-accent-strong transition-colors hover:bg-accent/15')}
            >
              <Plus size={14} /> {tr('Ajouter une personne', 'Add a person')}
            </button>
          )}
          <Callout tone="neutral" className="mt-4 text-xs">
            {tr(
              "La chaîne d'escalade en cas d'incident (RSSI, DPO, direction) se renseigne à part, dans ",
              'The incident escalation chain (CISO, DPO, management) is entered separately, in ',
            )}
            <Link to="/app/signalement" className="font-medium text-accent-strong underline underline-offset-2">
              {tr('Qui notifier', 'Who to notify')}
            </Link>
            .
          </Callout>
        </div>
      </Card>

      <NextStep
        to="/app/qualification"
        label={tr("Qualifier l'entité", 'Scope the entity')}
        hint={tr("Une quarantaine de questions, chacune rattachée à l'article qu'elle établit", 'About forty questions, each tied to the article it establishes')}
      />
    </div>
  )
}

/* ==========================================================================
   Démarche ISO/IEC 27001
   ========================================================================== */

function IsoSection({ iso, readOnly, onChange }: { iso: IsoProfile | undefined; readOnly: boolean; onChange: (iso: IsoProfile) => void }) {
  const { applicable, entity } = useScoping()
  const status = iso?.status
  const current = iso ?? {}
  const asksPerimeter = status === 'certifie' || status === 'conforme' || status === 'partiel'
  const named = namedList(applicable)
  const stale =
    iso?.perimeter &&
    iso.perimeterRegulations &&
    (iso.perimeterRegulations.length !== applicable.length || iso.perimeterRegulations.some((r) => !applicable.includes(r)))
  const progress = isoProgress(entity?.iso_controls)

  return (
    <Card>
      <CardHeader
        title={tr('Démarche ISO/IEC 27001', 'ISO/IEC 27001 status')}
        subtitle={tr(
          "Facultatif. Renseignée, elle pré-remplit l'évaluation des exigences qui ont un contrôle ISO correspondant.",
          'Optional. When filled in, it pre-fills the assessment of requirements that have a matching ISO control.',
        )}
        icon={<BadgeCheck size={16} />}
        aside={<IsoBadge iso={iso} size="sm" />}
      />
      <div className="space-y-5 p-5">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label={tr('Statut ISO 27001', 'ISO 27001 status')}>
          {ISO_STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={status === o.value}
              disabled={readOnly}
              onClick={() => onChange({ ...current, status: o.value, ...(o.value === 'aucune' ? { perimeter: undefined, perimeterRegulations: undefined } : {}) })}
              className={cn(
                'rounded-lg px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed',
                status === o.value ? 'bg-accent-wash ring-2 ring-accent' : 'bg-sunken hover:bg-overlay',
              )}
            >
              <span className={cn('block text-sm font-medium', status === o.value ? 'text-accent-strong' : 'text-ink')}>{o.label}</span>
              <span className="block text-2xs text-ink-3">{o.hint}</span>
            </button>
          ))}
        </div>

        {status === 'certifie' ? (
          <label className="block max-w-xs">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Date de fin de validité du certificat', 'Certificate expiry date')}</span>
            <Input type="date" disabled={readOnly} value={current.validUntil ?? ''} onChange={(e) => onChange({ ...current, validUntil: e.target.value })} />
          </label>
        ) : null}

        {asksPerimeter ? (
          <div className="rounded-lg bg-sunken p-4">
            <p className="text-sm font-medium text-ink">
              {tr(
                `La démarche ISO 27001 couvre-t-elle l'intégralité du périmètre concerné par ${named}, ou seulement une partie ?`,
                `Does the ISO 27001 initiative cover the entire scope concerned by ${named}, or only part of it?`,
              )}
            </p>
            <p className="mt-1 text-2xs text-ink-3">
              {tr(
                "Périmètre de certification, systèmes, sites et activités inclus. Une couverture partielle désactive le pré-remplissage automatique : chaque exigence est alors à évaluer à la main.",
                'Certification scope, systems, sites and activities included. Partial coverage turns off automatic pre-filling: each requirement must then be assessed by hand.',
              )}
            </p>
            <div className="mt-3">
              <SegmentedControl<IsoPerimeter>
                ariaLabel={tr('Couverture du périmètre', 'Scope coverage')}
                value={current.perimeter as IsoPerimeter}
                onChange={(v) => !readOnly && onChange({ ...current, perimeter: v, perimeterRegulations: applicable })}
                options={[
                  { value: 'integral', label: tr("L'intégralité du périmètre", 'The entire scope') },
                  { value: 'partiel', label: tr('Une partie seulement', 'Only part of it') },
                ]}
              />
            </div>
            {stale ? (
              <p className="mt-3 flex items-start gap-2 text-2xs text-caution">
                <TriangleAlert size={12} className="mt-0.5 shrink-0" />
                {tr(
                  'Les textes applicables ont changé depuis cette réponse. Vérifiez qu’elle vaut toujours pour le périmètre actuel, puis confirmez-la.',
                  'The applicable texts have changed since this answer. Check that it still holds for the current scope, then confirm it.',
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
          <p className="text-xs text-ink-3">
            {tr(
              `Détail des 93 contrôles de l'annexe A : ${progress.assessed} renseigné${progress.assessed > 1 ? 's' : ''}. Module facultatif : vous pouvez aussi évaluer directement les exigences NIS2, DORA et CRA.`,
              `Detail of the 93 Annex A controls: ${progress.assessed} filled in. Optional module: you can also assess NIS2, DORA and CRA requirements directly.`,
            )}
          </p>
          <LinkButton to="/app/iso27001" size="sm" icon={<ArrowRight size={13} />}>
            {tr('Détailler les contrôles', 'Detail the controls')}
          </LinkButton>
        </div>
      </div>
    </Card>
  )
}
