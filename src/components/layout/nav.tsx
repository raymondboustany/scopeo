import type { ReactNode } from 'react'
import {
  Building2,
  IdCard,
  CalendarClock,
  FileText,
  Gauge,
  GitCompareArrows,
  LayoutDashboard,
  Library,
  ListOrdered,
  Route,
  ScanSearch,
  Settings,
  ShieldCheck,
  RadioTower,
} from 'lucide-react'

/**
 * Plan de navigation — dans l'ordre de l'exercice : cadrer, consulter,
 * piloter, réagir, restituer.
 */

export interface NavEntry {
  to: string
  label: string
  icon: ReactNode
  group: string
  /** Désactivé tant qu'aucune entité n'est chargée. */
  needsEntity?: boolean
  /** Ancre du parcours guidé. */
  tour?: string
}

const I = 16

export const NAV: NavEntry[] = [
  { to: '/app', label: 'Tableau de bord', icon: <LayoutDashboard size={I} />, group: 'cadrage', tour: 'nav-dashboard' },
  { to: '/app/entites', label: 'Entités', icon: <Building2 size={I} />, group: 'cadrage', tour: 'nav-entities' },
  { to: '/app/fiche', label: 'Fiche entité', icon: <IdCard size={I} />, group: 'cadrage', needsEntity: true, tour: 'nav-fiche' },
  { to: '/app/qualification', label: 'Qualification', icon: <ScanSearch size={I} />, group: 'cadrage', needsEntity: true, tour: 'nav-qualification' },
  { to: '/app/corpus', label: 'Corpus', icon: <Library size={I} />, group: 'referentiel' },
  { to: '/app/croisements', label: 'Croisements', icon: <GitCompareArrows size={I} />, group: 'referentiel' },
  { to: '/app/evaluation', label: 'Évaluation', icon: <Gauge size={I} />, group: 'pilotage', needsEntity: true, tour: 'nav-evaluation' },
  { to: '/app/priorisation', label: 'Priorisation', icon: <ListOrdered size={I} />, group: 'pilotage', needsEntity: true },
  { to: '/app/feuille-de-route', label: 'Feuille de route', icon: <Route size={I} />, group: 'pilotage', needsEntity: true },
  { to: '/app/echeancier', label: 'Échéancier', icon: <CalendarClock size={I} />, group: 'pilotage', tour: 'nav-timeline' },
  { to: '/app/signalement', label: 'Qui notifier', icon: <RadioTower size={I} />, group: 'reaction', needsEntity: true, tour: 'nav-incidents' },
  { to: '/app/rapport', label: 'Rapport', icon: <FileText size={I} />, group: 'restitution', needsEntity: true, tour: 'nav-report' },
  { to: '/app/trust', label: 'Trust Center', icon: <ShieldCheck size={I} />, group: 'restitution', needsEntity: true },
  { to: '/app/parametres', label: 'Profil et données', icon: <Settings size={I} />, group: 'restitution' },
]

export const NAV_GROUPS = [
  { id: 'cadrage', label: 'Cadrage' },
  { id: 'referentiel', label: 'Référentiel' },
  { id: 'pilotage', label: 'Pilotage' },
  { id: 'reaction', label: 'Préparation' },
  { id: 'restitution', label: 'Restitution' },
]
