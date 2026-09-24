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
  BadgeCheck,
} from 'lucide-react'
import { tr } from '@/i18n'

/**
 * Plan de navigation, dans l'ordre de l'exercice : cadrer, consulter,
 * piloter, réagir, restituer.
 */

export interface NavEntry {
  to: string
  label: string
  icon: ReactNode
  group: string
  /** Désactivé tant qu'aucune entité n'est chargée. */
  needsEntity?: boolean
  /** Masqué tant que la qualification de l'entité n'est pas terminée. */
  needsQualification?: boolean
  /** Ancre du parcours guidé. */
  tour?: string
}

const I = 16

export const NAV: NavEntry[] = [
  { to: '/app', label: tr('Tableau de bord', 'Dashboard'), icon: <LayoutDashboard size={I} />, group: 'cadrage', tour: 'nav-dashboard' },
  { to: '/app/entites', label: tr('Entités', 'Entities'), icon: <Building2 size={I} />, group: 'cadrage', tour: 'nav-entities' },
  { to: '/app/fiche', label: tr('Fiche entité', 'Entity profile'), icon: <IdCard size={I} />, group: 'cadrage', needsEntity: true, tour: 'nav-fiche' },
  { to: '/app/qualification', label: tr('Qualification', 'Scoping'), icon: <ScanSearch size={I} />, group: 'cadrage', needsEntity: true, tour: 'nav-qualification' },
  { to: '/app/corpus', label: tr('Corpus', 'Corpus'), icon: <Library size={I} />, group: 'referentiel' },
  { to: '/app/croisements', label: tr('Croisements', 'Crosswalk'), icon: <GitCompareArrows size={I} />, group: 'referentiel' },
  { to: '/app/evaluation', label: tr('Évaluation', 'Assessment'), icon: <Gauge size={I} />, group: 'pilotage', needsEntity: true, tour: 'nav-evaluation' },
  { to: '/app/iso27001', label: 'ISO 27001', icon: <BadgeCheck size={I} />, group: 'pilotage', needsEntity: true, needsQualification: true },
  { to: '/app/priorisation', label: tr('Priorisation', 'Prioritisation'), icon: <ListOrdered size={I} />, group: 'pilotage', needsEntity: true },
  { to: '/app/feuille-de-route', label: tr('Feuille de route', 'Roadmap'), icon: <Route size={I} />, group: 'pilotage', needsEntity: true },
  { to: '/app/echeancier', label: tr('Échéancier', 'Timeline'), icon: <CalendarClock size={I} />, group: 'pilotage', tour: 'nav-timeline' },
  { to: '/app/signalement', label: tr('Qui notifier', 'Who to notify'), icon: <RadioTower size={I} />, group: 'reaction', needsEntity: true, tour: 'nav-incidents' },
  { to: '/app/rapport', label: tr('Rapport', 'Report'), icon: <FileText size={I} />, group: 'restitution', needsEntity: true, tour: 'nav-report' },
  { to: '/app/trust', label: 'Trust Center', icon: <ShieldCheck size={I} />, group: 'restitution', needsEntity: true },
  { to: '/app/parametres', label: tr('Profil et données', 'Profile and data'), icon: <Settings size={I} />, group: 'restitution' },
]

export const NAV_GROUPS = [
  { id: 'cadrage', label: tr('Cadrage', 'Scoping') },
  { id: 'referentiel', label: tr('Référentiel', 'Reference') },
  { id: 'pilotage', label: tr('Pilotage', 'Steering') },
  { id: 'reaction', label: tr('Préparation', 'Readiness') },
  { id: 'restitution', label: tr('Restitution', 'Reporting') },
]
