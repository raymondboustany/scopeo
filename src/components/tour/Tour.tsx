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

const STEPS: Step[] = [
  {
    id: 'bienvenue',
    title: tr('Une plateforme de cadrage, en amont', 'A scoping platform, upstream'),
    body: tr("Scopeo établit ce qui s'applique à une organisation au titre du RGPD, de NIS2 (détaillée par le ReCyF), de DORA, du CRA et de l'AI Act, où une action unique satisfait plusieurs textes, et dans quel ordre traiter le reste. Elle intervient avant une plateforme de suivi de conformité au long cours, pas à sa place. Et ce n'est pas un avis juridique : elle structure une décision, elle ne la prend pas.", 'Scopeo establishes what applies to an organisation under the GDPR, NIS2 (detailed by the French ReCyF), DORA, the CRA and the AI Act, where a single action satisfies several texts, and in which order to handle the rest. It comes before a long-term compliance tracking platform, not in its place. And it is not legal advice: it structures a decision, it does not take it.'),
  },
  {
    id: 'navigation',
    title: tr("La navigation suit l'exercice", 'Navigation follows the exercise'),
    body: tr('Cadrer, consulter le référentiel, piloter, préparer, restituer. Le bouton en bas replie le panneau pour ne garder que les icônes.', 'Scope, browse the reference, steer, prepare, report. The button at the bottom collapses the panel to icons only.'),
    target: 'sidebar',
  },
  {
    id: 'entites',
    title: tr('Une entité par organisation cadrée', 'One entity per organisation scoped'),
    body: tr('Un profil peut suivre plusieurs entités : plusieurs clients, ou plusieurs filiales. Chacune est enregistrée séparément ; en créer une nouvelle ne touche jamais aux autres.', 'A profile can follow several entities: several clients, or several subsidiaries. Each is stored separately; creating a new one never affects the others.'),
    target: 'entity-switcher',
  },
  {
    id: 'fiche',
    title: tr('La fiche entité', 'The entity profile'),
    body: tr('Client ou organisation interne : société, mission, interlocuteurs. Ces informations ouvrent les rapports et ne sont jamais publiées.', 'Client or internal organisation: company, engagement, contacts. This information opens the reports and is never published.'),
    target: 'nav-fiche',
  },
  {
    id: 'qualification',
    title: tr('Tout part de la qualification', 'Everything starts with scoping'),
    body: tr("Une trentaine de questions, chacune rattachée à l'article qu'elle sert à établir, puis une question facultative sur votre démarche ISO 27001. Si une réponse change, la plateforme montre ce qui apparaît et ce qui disparaît dans le périmètre.", 'About thirty questions, each tied to the article it helps establish, then an optional question on your ISO 27001 status. If an answer changes, the platform shows what enters and leaves the scope.'),
    target: 'nav-qualification',
  },
  {
    id: 'score',
    title: tr('Le score se lit avec son dénominateur', 'Read the score with its denominator'),
    body: tr("L'anneau donne la part des exigences unifiées déclarées en place, et chaque référentiel a son sous-score. Une exigence partielle compte pour moitié.", 'The ring shows the share of unified requirements reported in place, and each framework has its own sub-score. A partial requirement counts for half.'),
    target: 'score-ring',
    route: '/app',
  },
  {
    id: 'incidents',
    title: tr('Qui prévenir, et dans quels délais', 'Who to notify, and how fast'),
    body: tr("Selon les textes applicables, la plateforme désigne les autorités à notifier, leurs délais et la chaîne d'escalade interne. Une information utile dès aujourd'hui, même avant la mise en conformité.", 'Depending on the applicable texts, the platform names the authorities to notify, their deadlines and the internal escalation chain. Useful from day one, even before compliance work.'),
    target: 'incident-section',
    route: '/app',
  },
  {
    id: 'echeancier',
    title: tr('Le calendrier réglementaire', 'The regulatory calendar'),
    body: tr("Une frise que l'on zoome et filtre. Le prochain jalon qui concerne l'entité clignote jusqu'à ce qu'il soit consulté.", 'A timeline you can zoom and filter. The next milestone that concerns the entity blinks until it has been viewed.'),
    target: 'nav-timeline',
  },
  {
    id: 'restitution',
    title: tr('Restituer à la direction', 'Report to management'),
    body: tr('Trois PDF : une note COMEX de deux pages pour décider, le rapport de cadrage complet pour instruire, et une fiche réflexe incident à diffuser en interne.', 'Three PDFs: a two-page executive note to decide, the full scoping report to investigate, and an incident quick-reference sheet for internal use.'),
    target: 'nav-report',
  },
  {
    id: 'notes',
    title: tr('Des notes attachées à leur contexte', 'Notes attached to their context'),
    body: tr("L'icône de bulle, à côté d'une question, d'une exigence ou d'un article, ajoute une note étiquetée : à vérifier, hypothèse, décision, preuve demandée. Le journal d'entretien les rassemble (Alt + N) et le rapport complet reprend les points ouverts.", 'The speech bubble next to a question, a requirement or an article adds a tagged note: to check, assumption, decision, evidence requested. The interview log gathers them (Alt + N) and the full report lists open points.'),
    target: 'notes',
  },
  {
    id: 'recherche',
    title: tr('Tout le corpus à portée de clavier', 'The whole corpus at your fingertips'),
    body: tr("Ctrl K (ou ⌘ K) cherche dans les articles, les exigences, les croisements, le ReCyF et les contrôles ISO 27001. Le point d'interrogation relance ce parcours ; le sélecteur de langue passe l'interface en anglais.", 'Ctrl K (or ⌘ K) searches articles, requirements, crosswalk themes, the ReCyF and ISO 27001 controls. The question mark restarts this tour; the language switch changes the interface language.'),
    target: 'search',
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
    if (user && !user.onboarded) updateUser.mutate({ id: user.id, patch: { onboarded: true } })
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
