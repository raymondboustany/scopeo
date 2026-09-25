import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useSession } from '@/lib/store'
import { useCurrentUser, useUpdateUser } from '@/lib/queries'
import { Button } from '@/components/ui/controls'
import { Mark } from '@/components/layout/Brand'
import { cn } from '@/lib/utils'
import { tr } from '@/i18n'

/**
 * Parcours guidé.
 *
 * Chaque étape désigne un élément réel de l'interface, par son attribut
 * `data-tour`, et l'isole sous un projecteur. Si l'élément n'est pas
 * visible (écran étroit, entité absente), l'étape s'affiche au centre plutôt
 * que de pointer dans le vide.
 */

interface Step {
  id: string
  title: string
  body: string
  target?: string
  route?: string
}

/** Parcours de l'application : l'essentiel pour mener un cadrage ou un diagnostic. */
const APP_STEPS: Step[] = [
  {
    id: 'bienvenue',
    title: tr('Une plateforme de cadrage, en amont', 'A scoping platform, upstream'),
    body: tr(
      "Scopeo établit ce qui s'applique à une organisation (RGPD, NIS2 détaillée par le ReCyF, DORA, CRA, AI Act), où une action couvre plusieurs textes, et dans quel ordre traiter le reste. Elle structure une décision ; ce n'est pas un avis juridique.",
      'Scopeo establishes what applies to an organisation (GDPR, NIS2 detailed by the French ReCyF, DORA, CRA, AI Act), where one action covers several texts, and in which order to handle the rest. It structures a decision; it is not legal advice.',
    ),
  },
  {
    id: 'methode',
    title: tr('Le déroulé d’une mission', 'How an engagement runs'),
    body: tr(
      "La navigation suit l'exercice. En entretien : fiche entité, qualification, puis évaluation de l'existant. Ensuite : priorisation, préparation au signalement et rapports. Le bouton en bas replie le panneau.",
      'Navigation follows the exercise. During interviews: entity profile, scoping, then assessment of the current state. Afterwards: prioritisation, incident readiness and reports. The button at the bottom collapses the panel.',
    ),
    target: 'sidebar',
  },
  {
    id: 'entites',
    title: tr('Une entité par organisation cadrée', 'One entity per organisation scoped'),
    body: tr(
      "Un client, une filiale, ou votre propre organisation : chaque entité est enregistrée séparément et se choisit ici. L'exemple Finexa permet de s'entraîner sans rien casser.",
      'A client, a subsidiary, or your own organisation: each entity is stored separately and selected here. The Finexa example lets you practise without breaking anything.',
    ),
    target: 'entity-switcher',
  },
  {
    id: 'qualification',
    title: tr('Tout part de la qualification', 'Everything starts with scoping'),
    body: tr(
      "Chaque question est rattachée à l'article qu'elle sert à établir ; la dernière, facultative, porte sur ISO 27001. Si une réponse change, la plateforme montre ce qui entre dans le périmètre et ce qui en sort.",
      'Each question is tied to the article it helps establish; the last one, optional, covers ISO 27001. If an answer changes, the platform shows what enters and leaves the scope.',
    ),
    target: 'nav-qualification',
  },
  {
    id: 'evaluation',
    title: tr("Évaluer l'existant", 'Assess the current state'),
    body: tr(
      'Pour chaque exigence : en place, partiel ou absent. Une entité certifiée ou conforme ISO 27001 peut pré-remplir les exigences correspondantes, à vérifier une par une.',
      'For each requirement: in place, partial or missing. An ISO 27001 certified or compliant entity can pre-fill the matching requirements, to be checked one by one.',
    ),
    target: 'nav-evaluation',
  },
  {
    id: 'score',
    title: tr('Le score se lit avec son dénominateur', 'Read the score with its denominator'),
    body: tr(
      "L'anneau donne la part des exigences déclarées en place, avec un sous-score par texte. Une exigence partielle compte pour moitié.",
      'The ring shows the share of requirements reported in place, with a sub-score per text. A partial requirement counts for half.',
    ),
    target: 'score-ring',
    route: '/app',
  },
  {
    id: 'priorisation',
    title: tr('Prioriser en quatre phases', 'Prioritise in four phases'),
    body: tr(
      "Les écarts sont ordonnés selon leur urgence et leur poids, puis répartis de 0 à 3 mois jusqu'à plus de 12 mois. Les pondérations restent ajustables.",
      'Gaps are ordered by urgency and weight, then spread from 0 to 3 months to beyond 12 months. Weights remain adjustable.',
    ),
    target: 'nav-priorities',
  },
  {
    id: 'incidents',
    title: tr('Qui prévenir, et dans quels délais', 'Who to notify, and how fast'),
    body: tr(
      "Autorités à notifier, délais, chaîne d'escalade interne et appui technique à solliciter : une information utile dès aujourd'hui, avant même la mise en conformité.",
      'Authorities to notify, deadlines, internal escalation chain and technical support to call on: useful from day one, even before compliance work.',
    ),
    target: 'incident-section',
    route: '/app',
  },
  {
    id: 'restitution',
    title: tr('Restituer', 'Report'),
    body: tr(
      'Trois PDF : une note de direction de deux pages pour décider, le rapport de cadrage complet, et une fiche réflexe incident à diffuser en interne.',
      'Three PDFs: a two-page executive note to decide, the full scoping report, and an incident quick-reference sheet for internal use.',
    ),
    target: 'nav-report',
  },
  {
    id: 'notes',
    title: tr('Des notes attachées à leur contexte', 'Notes attached to their context'),
    body: tr(
      "La bulle, à côté d'une question ou d'une exigence, ajoute une note étiquetée (à vérifier, hypothèse, décision, preuve demandée). Le journal d'entretien les rassemble (Alt + N) et le rapport reprend les points ouverts.",
      'The speech bubble next to a question or requirement adds a tagged note (to check, assumption, decision, evidence requested). The interview log gathers them (Alt + N) and the report lists open points.',
    ),
    target: 'notes',
  },
  {
    id: 'recherche',
    title: tr('Chercher, revoir ce guide', 'Search, replay this guide'),
    body: tr(
      'Ctrl K cherche dans les articles, les exigences, le ReCyF et les contrôles ISO 27001. Le point d’interrogation relance ce guide ; la double authentification se règle dans Profil et données.',
      'Ctrl K searches articles, requirements, the ReCyF and ISO 27001 controls. The question mark replays this guide; two-factor authentication is set in Profile and data.',
    ),
    target: 'search',
  },
]

/** Parcours de l'espace d'administration, montré à la première visite. */
const ADMIN_STEPS: Step[] = [
  {
    id: 'admin-bienvenue',
    title: tr("L'espace d'administration", 'The administration space'),
    body: tr(
      "Ici, vous gérez les accès à Scopeo : comptes, annuaire LDAP, réglages et journal. Vous n'y voyez jamais le contenu des cadrages : les entités de chacun restent privées.",
      'Here you manage access to Scopeo: accounts, LDAP directory, settings and log. You never see scoping content here: everyone’s entities stay private.',
    ),
    route: '/admin',
  },
  {
    id: 'admin-comptes',
    title: tr('Les comptes', 'Accounts'),
    body: tr(
      "Créez un compte avec un mot de passe provisoire, que la personne remplace à sa première connexion. Vous pouvez aussi suspendre un compte, nommer un autre administrateur, ou désactiver la double authentification d'un compte bloqué.",
      'Create an account with a temporary password, which the person replaces at first sign-in. You can also suspend an account, appoint another administrator, or turn off two-factor authentication for a locked-out account.',
    ),
    target: 'admin-nav-users',
    route: '/admin',
  },
  {
    id: 'admin-ldap',
    title: tr("L'annuaire de l'organisation", 'The organisation directory'),
    body: tr(
      "Reliez Scopeo à Active Directory ou OpenLDAP : un onglet de connexion apparaît alors sur la page d'accueil. Le bouton Tester vérifie chaque étape avant l'activation.",
      'Connect Scopeo to Active Directory or OpenLDAP: a sign-in tab then appears on the home page. The Test button checks each step before you switch it on.',
    ),
    target: 'admin-nav-ldap',
  },
  {
    id: 'admin-reglages',
    title: tr('Les réglages', 'Settings'),
    body: tr(
      'Ouvrir ou fermer la création libre de profils, autoriser le mode invité, fixer la durée des sessions.',
      'Open or close self-service profile creation, allow guest mode, set the session length.',
    ),
    target: 'admin-nav-settings',
  },
  {
    id: 'admin-journal',
    title: tr('Le journal', 'The log'),
    body: tr(
      'Chaque action d’administration et chaque changement de sécurité d’un compte y est daté, avec son auteur.',
      'Every administration action and every account security change is dated there, with its author.',
    ),
    target: 'admin-nav-audit',
  },
  {
    id: 'admin-retour',
    title: tr('Revenir à Scopeo', 'Back to Scopeo'),
    body: tr(
      'Hors de cet espace, vous utilisez Scopeo comme tout autre profil. Le point d’interrogation relance ce guide.',
      'Outside this space, you use Scopeo like any other profile. The question mark replays this guide.',
    ),
    target: 'admin-back',
  },
]

const PAD = 8

function useTargetRect(selector: string | undefined, step: number) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useLayoutEffect(() => {
    if (!selector) return
    let frame = 0
    let tries = 0
    let last = ''
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`)
      const r = el?.getBoundingClientRect()
      const visible = Boolean(el && r && r.width > 0 && r.height > 0)
      if (visible && tries === 0) el!.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      // On ne provoque un rendu que si la cible a réellement bougé.
      const sig = visible ? `${Math.round(r!.left)},${Math.round(r!.top)},${Math.round(r!.width)},${Math.round(r!.height)}` : 'none'
      if (sig !== last) {
        last = sig
        setRect(visible ? r! : null)
      }
      tries += 1
      // La page cible peut se charger en différé : on continue de mesurer
      // quelques instants, puis on suit les défilements et redimensionnements.
      frame = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(frame)
  }, [selector, step])
  // Une étape sans cible s'affiche au centre, quelle que soit la dernière mesure.
  return selector ? rect : null
}

export function Tour() {
  const open = useSession((s) => s.tourOpen)
  const step = useSession((s) => s.tourStep)
  const setStep = useSession((s) => s.setTourStep)
  const close = useSession((s) => s.closeTour)
  const kind = useSession((s) => s.tourKind)
  const STEPS = kind === 'admin' ? ADMIN_STEPS : APP_STEPS
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: user } = useCurrentUser()
  const updateUser = useUpdateUser()

  const current = STEPS[Math.min(step, STEPS.length - 1)]
  const rect = useTargetRect(open ? current.target : undefined, step)

  useEffect(() => {
    if (open && current.route && pathname !== current.route) navigate(current.route)
  }, [open, current.route, pathname, navigate])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowRight') setStep(Math.min(STEPS.length - 1, step + 1))
      if (e.key === 'ArrowLeft') setStep(Math.max(0, step - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function finish() {
    close()
    if (!user) return
    if (kind === 'admin' && !user.admin_onboarded) updateUser.mutate({ id: user.id, patch: { admin_onboarded: true } })
    if (kind === 'app' && !user.onboarded) updateUser.mutate({ id: user.id, patch: { onboarded: true } })
  }

  const last = step >= STEPS.length - 1

  // Position de la carte : sous la cible, ou au-dessus si la place manque.
  const cardW = 360
  // Pas de transform CSS ici : motion pilote déjà la transformation de la carte.
  let cardStyle: React.CSSProperties = { left: 'max(16px, calc(50% - 180px))', top: '26vh' }
  if (rect) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const right = rect.right + PAD + 16
    const placeRight = right + cardW < vw && rect.height > 200
    if (placeRight) {
      cardStyle = { left: right, top: Math.max(16, Math.min(vh - 280, rect.top)) }
    } else {
      const below = rect.bottom + PAD + 14
      const top = below + 260 < vh ? below : Math.max(16, rect.top - PAD - 14 - 250)
      cardStyle = { left: Math.max(16, Math.min(vw - cardW - 16, rect.left + rect.width / 2 - cardW / 2)), top }
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={tr('Parcours guidé', 'Guided tour')}
        >
          {/* Voile percé autour de la cible */}
          <svg className="absolute inset-0 h-full w-full" onClick={finish}>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                {rect ? (
                  <motion.rect
                    initial={false}
                    animate={{ x: rect.left - PAD, y: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    rx={12}
                    fill="black"
                  />
                ) : null}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgb(6 8 11 / 0.74)" mask="url(#tour-mask)" />
          </svg>

          {rect ? (
            <motion.div
              className="pointer-events-none absolute rounded-xl border-2 border-accent"
              initial={false}
              animate={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              style={{ boxShadow: '0 0 0 4px rgb(124 92 255 / 0.16)' }}
            />
          ) : null}

          <motion.div
            key={current.id}
            className="absolute w-[min(360px,calc(100vw-32px))] rounded-lg border border-rule-2 bg-overlay p-5 shadow-modal"
            style={cardStyle}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-2xs font-medium text-accent">
                <Mark size={12} />
                {tr(`Étape ${step + 1} sur ${STEPS.length}`, `Step ${step + 1} of ${STEPS.length}`)}
              </span>
              <button onClick={finish} className="rounded-md p-1 text-ink-3 hover:bg-tint hover:text-ink" aria-label={tr('Quitter le parcours', 'Exit the tour')}>
                <X size={15} />
              </button>
            </div>

            <h2 className="text-lg font-semibold text-ink">{current.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{current.body}</p>

            {/* Progression cliquable */}
            <div className="mt-4 flex items-center gap-1.5" role="tablist" aria-label={tr('Étapes du parcours', 'Tour steps')}>
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === step}
                  aria-label={tr(`Étape ${i + 1} : ${s.title}`, `Step ${i + 1}: ${s.title}`)}
                  onClick={() => setStep(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === step ? 'w-6 bg-accent' : i < step ? 'w-3 bg-accent/50 hover:bg-accent/70' : 'w-3 bg-rule-3 hover:bg-ink-4',
                  )}
                />
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button onClick={finish} className="text-xs text-ink-3 hover:text-ink">
                {tr('Passer', 'Skip')}
              </button>
              <div className="flex gap-2">
                {step > 0 ? (
                  <Button size="sm" icon={<ArrowLeft size={13} />} onClick={() => setStep(step - 1)}>
                    {tr('Précédent', 'Previous')}
                  </Button>
                ) : null}
                <Button size="sm" variant="primary" onClick={() => (last ? finish() : setStep(step + 1))}>
                  {last ? tr('Terminer', 'Finish') : tr('Suivant', 'Next')}
                  {last ? null : <ArrowRight size={13} />}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
