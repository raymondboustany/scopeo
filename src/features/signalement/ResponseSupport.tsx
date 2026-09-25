import { ExternalLink, Gavel, LifeBuoy, MapPin, ShieldHalf, Siren } from 'lucide-react'
import { Tag } from '@/components/ui/primitives'
import type { Answers, InternalContact } from '@/types/domain'
import { cn } from '@/lib/utils'
import { tr } from '@/i18n'

/**
 * Appui technique à la réponse.
 *
 * Notifier une autorité et contenir une attaque sont deux choses distinctes :
 * le CERT-FR reçoit les signalements, il ne remplace pas une équipe qui
 * intervient sur les systèmes. Sans capacité interne, l'entité doit savoir à
 * l'avance qui appeler. Sources : ANSSI (PRIS, CSIRT territoriaux), ReCyF
 * v2.5 (objectif 12), code des assurances (article L. 12-10-1).
 */

interface Resource {
  id: string
  icon: React.ReactNode
  title: string
  body: string
  link: { label: string; url: string }
  highlight?: boolean
}

export function ResponseSupport({ answers, contacts }: { answers: Answers; contacts: InternalContact[] }) {
  const small = ['micro', 'petite', 'moyenne'].includes(String(answers.effectif ?? ''))
  const provider = contacts.find((c) => c.role === 'reponse' && c.name.trim())

  const resources: Resource[] = [
    {
      id: 'pris',
      icon: <ShieldHalf size={16} />,
      title: tr('Prestataire de réponse aux incidents', 'Incident response provider'),
      body: tr(
        "Sans équipe de réponse interne, contractualisez à l'avance avec un prestataire : délai d'intervention, astreinte, périmètre. La qualification PRIS de l'ANSSI garantit un niveau d'exigence éprouvé ; elle n'est pas imposée par les textes, mais c'est le premier critère de choix.",
        'Without an internal response team, contract a provider in advance: response time, on-call, scope. ANSSI’s PRIS qualification guarantees a proven standard; it is not required by law, but it is the first selection criterion.',
      ),
      link: { label: tr('Liste des PRIS qualifiés', 'List of qualified PRIS'), url: 'https://cyber.gouv.fr/prestataires-de-reponse-aux-incidents-de-securite-pris' },
    },
    {
      id: 'csirt',
      icon: <MapPin size={16} />,
      title: tr('CSIRT territorial', 'Regional CSIRT'),
      body: tr(
        "Pour les PME, ETI, collectivités et associations : une réponse de premier niveau, de proximité, et une orientation vers des prestataires, la CNIL ou les forces de l'ordre.",
        'For SMEs, mid-caps, local authorities and associations: local first-level response, and referral to providers, the CNIL or law enforcement.',
      ),
      link: { label: tr('Trouver le CSIRT de sa région', 'Find your regional CSIRT'), url: 'https://www.cert.ssi.gouv.fr/csirt/csirt-territoriaux/' },
      highlight: small,
    },
    {
      id: '17cyber',
      icon: <LifeBuoy size={16} />,
      title: '17Cyber',
      body: tr(
        "Le guichet public d'assistance aux victimes (Cybermalveillance.gouv.fr) : diagnostic en ligne, conseils immédiats et mise en relation avec des prestataires de proximité.",
        'The public victim-assistance service (Cybermalveillance.gouv.fr): online diagnosis, immediate advice and referral to local providers.',
      ),
      link: { label: '17cyber.gouv.fr', url: 'https://17cyber.gouv.fr/' },
      highlight: small,
    },
    {
      id: 'certfr',
      icon: <Siren size={16} />,
      title: tr('CERT-FR', 'CERT-FR'),
      body: tr(
        "Destinataire des signalements NIS2 et CRA (voir plus haut). Il coordonne et peut appuyer les entités les plus sensibles, mais n'intervient pas à la place d'un prestataire pour contenir et remédier.",
        'Recipient of NIS2 and CRA reports (see above). It coordinates and may support the most sensitive entities, but does not replace a provider for containment and remediation.',
      ),
      link: { label: tr('En cas d’incident', 'In case of an incident'), url: 'https://cyber.gouv.fr/en-cas-dincident' },
    },
    {
      id: 'plainte',
      icon: <Gavel size={16} />,
      title: tr('Plainte sous 72 heures', 'Complaint within 72 hours'),
      body: tr(
        "Si l'entité est assurée contre le risque cyber, l'indemnisation d'une atteinte à ses systèmes est subordonnée à une plainte déposée au plus tard 72 heures après en avoir eu connaissance (police, gendarmerie ou procureur).",
        'If the entity has cyber insurance, compensation for an attack on its systems depends on a complaint filed no later than 72 hours after becoming aware of it (police, gendarmerie or public prosecutor).',
      ),
      link: { label: tr('Code des assurances, art. L. 12-10-1', 'Insurance Code, Art. L. 12-10-1'), url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047048152' },
    },
  ]

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm',
          provider ? 'bg-positive-wash' : 'bg-caution-wash',
        )}
      >
        <span className="text-ink-2">
          {provider
            ? tr(`Appui technique désigné : ${provider.name}${provider.phone ? `, ${provider.phone}` : ''}.`, `Technical support designated: ${provider.name}${provider.phone ? `, ${provider.phone}` : ''}.`)
            : tr(
                "Aucun appui technique désigné. Ajoutez à la chaîne d'escalade un contact « Réponse à incident » : l'équipe interne ou le prestataire à appeler.",
                'No technical support designated. Add an “Incident response” contact to the escalation chain: the internal team or the provider to call.',
              )}
        </span>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {resources.map((r) => (
          <li key={r.id} className={cn('flex gap-3 rounded-lg border p-4', r.highlight ? 'border-accent-line bg-accent-wash/40' : 'border-rule bg-surface')}>
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-raised text-ink-2 ring-1 ring-rule">{r.icon}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">{r.title}</span>
                {r.highlight ? <Tag tone="accent">{tr('Adapté à la taille de l’entité', 'Suited to the entity’s size')}</Tag> : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{r.body}</p>
              <a href={r.link.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                {r.link.label}
                <ExternalLink size={11} />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
