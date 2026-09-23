import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useSession } from '@/lib/store'
import { useCurrentUser, useUpdateUser } from '@/lib/queries'
import { Button } from '@/components/ui/controls'
import { Mark } from '@/components/layout/Brand'
import { cn } from '@/lib/utils'

/**
 * Parcours guidé.
 *
 * Chaque étape désigne un élément réel de l'interface — par son attribut
 * `data-tour` — et l'isole sous un projecteur. Si l'élément n'est pas
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
    title: 'Un outil de cadrage, en amont',
    body: "Scopeo établit ce qui s'applique à une organisation au titre du RGPD, de NIS 2, de DORA et du CRA, où une action unique satisfait plusieurs textes, et dans quel ordre traiter le reste. Il intervient avant un outil de suivi de conformité au long cours, pas à sa place. Et ce n'est pas un avis juridique : il structure une décision, il ne la prend pas.",
  },
  {
    id: 'navigation',
    title: 'La navigation suit l’exercice',
    body: "Cadrer, consulter le référentiel, piloter, préparer, restituer. Le bouton en bas replie le panneau pour ne garder que les icônes.",
    target: 'sidebar',
  },
  {
    id: 'entites',
    title: 'Une entité par organisation cadrée',
    body: "Un profil peut suivre plusieurs entités — plusieurs clients, ou plusieurs filiales. Chacune est enregistrée séparément : en créer une nouvelle ne touche jamais aux autres.",
    target: 'entity-switcher',
  },
  {
    id: 'fiche',
    title: 'La fiche entité',
    body: "Client ou organisation interne : société, mission, interlocuteurs. Ces informations ouvrent les rapports et ne sont jamais publiées.",
    target: 'nav-fiche',
  },
  {
    id: 'qualification',
    title: 'Tout part de la qualification',
    body: "Une trentaine de questions, chacune rattachée à l'article qu'elle sert à établir. Si une réponse change, l'outil montre ce qui apparaît et ce qui disparaît dans le périmètre.",
    target: 'nav-qualification',
  },
  {
    id: 'score',
    title: 'Le score se lit avec son dénominateur',
    body: "L'anneau donne la part des exigences unifiées déclarées en place, et chaque référentiel a son sous-score. Une exigence partielle compte pour moitié.",
    target: 'score-ring',
    route: '/app',
  },
  {
    id: 'incidents',
    title: 'Qui prévenir, et dans quels délais',
    body: "Selon les textes applicables, l'outil désigne les autorités à notifier, leurs délais et la chaîne d'escalade interne. Une information utile dès aujourd'hui, même avant la mise en conformité.",
    target: 'incident-section',
    route: '/app',
  },
  {
    id: 'echeancier',
    title: 'Le calendrier réglementaire',
    body: "Une frise que l'on zoome et filtre. Le prochain jalon qui concerne l'entité clignote jusqu'à ce qu'il soit consulté.",
    target: 'nav-timeline',
  },
  {
    id: 'restitution',
    title: 'Restituer à la direction',
    body: "Trois PDF : une note COMEX de deux pages pour décider, le rapport de cadrage complet pour instruire, et une fiche réflexe incident à diffuser en interne. Le Trust Center publie une vue en lecture seule, sans donnée sensible.",
    target: 'nav-report',
  },
  {
    id: 'notes',
    title: 'Des notes attachées à leur contexte',
    body: "L'icône de bulle, à côté d'une question, d'une exigence ou d'un article, ajoute une note étiquetée : à vérifier, hypothèse, décision, preuve demandée. Le journal d'entretien les rassemble (Alt + N) et le rapport complet reprend les points ouverts.",
    target: 'notes',
  },
  {
    id: 'recherche',
    title: 'Tout le corpus à portée de clavier',
    body: 'Ctrl K (ou ⌘ K) cherche dans les articles, les exigences, les croisements et le détail ANSSI. Le point d’interrogation relance ce parcours ; la lune bascule en thème sombre.',
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
          aria-label="Parcours guidé"
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
                Étape {step + 1} sur {STEPS.length}
              </span>
              <button onClick={finish} className="rounded-md p-1 text-ink-3 hover:bg-raised hover:text-ink" aria-label="Quitter le parcours">
                <X size={15} />
              </button>
            </div>

            <h2 className="text-lg font-semibold text-ink">{current.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{current.body}</p>

            {/* Progression cliquable */}
            <div className="mt-4 flex items-center gap-1.5" role="tablist" aria-label="Étapes du parcours">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === step}
                  aria-label={`Étape ${i + 1} : ${s.title}`}
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
                Passer
              </button>
              <div className="flex gap-2">
                {step > 0 ? (
                  <Button size="sm" icon={<ArrowLeft size={13} />} onClick={() => setStep(step - 1)}>
                    Précédent
                  </Button>
                ) : null}
                <Button size="sm" variant="primary" onClick={() => (last ? finish() : setStep(step + 1))}>
                  {last ? 'Terminer' : 'Suivant'}
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
