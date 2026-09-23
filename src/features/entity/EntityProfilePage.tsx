import { Link } from 'react-router-dom'
import { Briefcase, Building, Building2, CalendarRange, Lock, Plus, Trash2, Users } from 'lucide-react'
import { Input, SegmentedControl, Textarea } from '@/components/ui/controls'
import { Callout, Card, CardHeader, PageHeader, Tag } from '@/components/ui/primitives'
import { useScoping } from '@/lib/hooks'
import { useEntityEditor } from '@/lib/queries'
import { cn, uid } from '@/lib/utils'
import { NextStep } from '@/components/layout/NextStep'
import type { EntityProfile, Stakeholder } from '@/types/domain'

const ROLE_SUGGESTIONS = [
  'Direction générale',
  'DSI',
  'RSSI',
  'DPO',
  'Direction juridique',
  'Conformité',
  'Risques',
  'Achats',
  'Audit interne',
  'Communication',
]

/**
 * Fiche entité.
 *
 * Deux usages, deux vocabulaires : un conseil cadre un client (société,
 * mission, interlocuteurs), une équipe cadre sa propre organisation (projet,
 * équipe). Les données sont les mêmes ; elles alimentent la page de garde et
 * le contexte des rapports, et ne sont jamais publiées par le Trust Center.
 */
export default function EntityProfilePage() {
  const { entity, readOnly } = useScoping()
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
        eyebrow="Cadrage"
        title="Fiche entité"
        lead="Qui est cadré, dans quel cadre, avec qui. Ces informations figurent en ouverture des rapports ; elles ne sont jamais publiées par le Trust Center."
        actions={readOnly ? <Tag><Lock size={10} /> Démonstration — lecture seule</Tag> : null}
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-ink">Type de cadrage</div>
            <p className="mt-0.5 text-xs text-ink-3">
              {client
                ? "Vous cadrez l'organisation d'un client : la fiche décrit la société, la mission et vos interlocuteurs."
                : 'Vous cadrez votre propre organisation : la fiche décrit le projet et l’équipe mobilisée.'}
            </p>
          </div>
          <SegmentedControl<'client' | 'interne'>
            ariaLabel="Type de cadrage"
            value={mode}
            onChange={(v) => !readOnly && set('mode', v)}
            options={[
              { value: 'client', label: 'Cadrage d’un client' },
              { value: 'interne', label: 'Cadrage interne' },
            ]}
          />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title={client ? 'Société cliente' : 'Organisation'} icon={client ? <Building2 size={16} /> : <Building size={16} />} />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">{field('legalName', 'Raison sociale', entity.name)}</div>
            {field('siren', 'SIREN', '123 456 789')}
            {field('group', 'Groupe ou maison mère', 'Facultatif')}
            <div className="sm:col-span-2">{field('address', 'Siège', 'Adresse du siège social')}</div>
            <div className="sm:col-span-2">{field('website', 'Site internet', 'https://')}</div>
          </div>
        </Card>

        <Card>
          <CardHeader title={client ? 'Mission' : 'Projet'} icon={client ? <Briefcase size={16} /> : <CalendarRange size={16} />} />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {field('missionRef', client ? 'Référence de mission' : 'Nom du projet', client ? 'Ex. : CAD-2026-014' : 'Ex. : Programme conformité 2027')}
            {field('lead', client ? 'Consultant en charge' : 'Pilote du cadrage', client ? 'Votre nom' : 'Nom et fonction')}
            {field('sponsor', client ? 'Commanditaire chez le client' : 'Commanditaire (direction)', 'Nom et fonction')}
            <div />
            {field('startDate', 'Lancement', '', 'date')}
            {field('reportDate', 'Restitution prévue', '', 'date')}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">Objectif</span>
              <Textarea
                rows={2}
                disabled={readOnly}
                value={profile.objective ?? ''}
                onChange={(e) => set('objective', e.target.value)}
                placeholder={client ? 'Ce que le client attend du cadrage' : 'Pourquoi ce cadrage, et pour quelle décision'}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">Périmètre couvert</span>
              <Textarea
                rows={2}
                disabled={readOnly}
                value={entity.scope_note}
                onChange={(e) => edit({ scope_note: e.target.value })}
                placeholder="Filiales, activités, pays ou produits inclus — et ce qui est exclu"
              />
            </label>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={client ? 'Interlocuteurs' : 'Équipe projet'}
          subtitle={client ? 'Les personnes rencontrées ou à rencontrer pendant le cadrage' : 'Les personnes mobilisées et leur rôle'}
          icon={<Users size={16} />}
        />
        <div className="p-5">
          <datalist id="role-suggestions">
            {ROLE_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          {people.length === 0 ? (
            <p className="mb-3 text-sm text-ink-3">Personne pour l'instant.</p>
          ) : (
            <div className="mb-3 space-y-2">
              <div className="hidden grid-cols-[1fr_1fr_1fr_auto] gap-3 px-1 text-2xs font-medium text-ink-3 sm:grid">
                <span>Nom</span>
                <span>Fonction</span>
                <span>Courriel</span>
                <span className="w-8" />
              </div>
              {people.map((p) => (
                <div key={p.id} className="grid gap-2 rounded-lg bg-sunken p-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:gap-3 sm:bg-transparent sm:p-0">
                  <Input disabled={readOnly} value={p.name} placeholder="Nom" onChange={(e) => setPeople(people.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} />
                  <Input disabled={readOnly} list="role-suggestions" value={p.role} placeholder="Fonction" onChange={(e) => setPeople(people.map((x) => (x.id === p.id ? { ...x, role: e.target.value } : x)))} />
                  <Input disabled={readOnly} type="email" value={p.email} placeholder="Courriel" onChange={(e) => setPeople(people.map((x) => (x.id === p.id ? { ...x, email: e.target.value } : x)))} />
                  {readOnly ? (
                    <span />
                  ) : (
                    <button
                      onClick={() => setPeople(people.filter((x) => x.id !== p.id))}
                      className="flex size-9 items-center justify-center rounded-md text-ink-4 hover:bg-critical-wash hover:text-critical"
                      aria-label={`Retirer ${p.name || 'cette personne'}`}
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
              <Plus size={14} /> Ajouter une personne
            </button>
          )}
          <Callout tone="neutral" className="mt-4 text-xs">
            La chaîne d'escalade en cas d'incident (RSSI, DPO, direction) se renseigne à part, dans{' '}
            <Link to="/app/signalement" className="font-medium text-accent-strong underline underline-offset-2">
              Signalement
            </Link>
            .
          </Callout>
        </div>
      </Card>

      <NextStep to="/app/qualification" label="Qualifier l'entité" hint="Une trentaine de questions, chacune rattachée à l'article qu'elle établit" />
    </div>
  )
}
