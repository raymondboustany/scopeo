import { LANG, tr } from '@/i18n'

/**
 * Signalement d'un problème ou d'une idée depuis la plateforme.
 *
 * Rien n'est envoyé automatiquement : la plateforme fonctionne en local, sans
 * service tiers. Le signalement se prépare ici, puis l'utilisateur le transmet
 * lui-même : en ouvrant une issue GitHub pré-remplie, ou en copiant le texte
 * pour l'envoyer par le canal de son choix.
 *
 * Aucune donnée de cadrage n'est jointe (réponses, entités, contacts). Les
 * informations techniques facultatives se limitent à la version, la langue,
 * l'écran et le navigateur.
 */

export const APP_VERSION = '2.1.0'
export const REPO_URL = 'https://github.com/raymondboustany/scopeo'

export type FeedbackKind = 'bug' | 'idee' | 'corpus'

export const FEEDBACK_KINDS: { value: FeedbackKind; label: string; hint: string }[] = [
  { value: 'bug', label: tr('Un problème', 'A problem'), hint: tr('Un bug, un affichage incorrect, quelque chose qui ne marche pas', 'A bug, a wrong display, something that does not work') },
  { value: 'idee', label: tr('Une idée ou une fonction manquante', 'An idea or a missing feature'), hint: tr('Ce que vous aimeriez pouvoir faire', 'What you would like to be able to do') },
  { value: 'corpus', label: tr('Une erreur dans le contenu réglementaire', 'An error in the regulatory content'), hint: tr('Une règle, une date ou un article à corriger, avec sa source', 'A rule, date or article to correct, with its source') },
]

export interface FeedbackDraft {
  kind: FeedbackKind
  title: string
  message: string
  source: string
  includeTechnical: boolean
}

export interface TechnicalInfo {
  version: string
  language: string
  screen: string
  browser: string
}

export function technicalInfo(screen: string, userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): TechnicalInfo {
  return { version: APP_VERSION, language: LANG, screen, browser: userAgent }
}

const TEMPLATE: Record<FeedbackKind, string> = {
  bug: 'bug_report.yml',
  idee: 'feature_request.yml',
  corpus: 'regulatory_update.yml',
}

/** Champ de l'issue GitHub qui reçoit le texte libre, selon le modèle. */
const MESSAGE_FIELD: Record<FeedbackKind, string> = { bug: 'description', idee: 'problem', corpus: 'change' }

const LABEL: Record<FeedbackKind, string> = {
  bug: tr('Problème', 'Problem'),
  idee: tr('Idée', 'Idea'),
  corpus: tr('Contenu réglementaire', 'Regulatory content'),
}

/** Texte du signalement, tel qu'il est copié. */
export function feedbackText(d: FeedbackDraft, tech: TechnicalInfo): string {
  const lines = [`[Scopeo] ${LABEL[d.kind]}${d.title.trim() ? `: ${d.title.trim()}` : ''}`, '', d.message.trim()]
  if (d.kind === 'corpus' && d.source.trim()) lines.push('', `${tr('Source officielle', 'Official source')}: ${d.source.trim()}`)
  if (d.includeTechnical) {
    lines.push(
      '',
      '---',
      `${tr('Version', 'Version')}: ${tech.version}`,
      `${tr('Langue', 'Language')}: ${tech.language}`,
      `${tr('Écran', 'Screen')}: ${tech.screen}`,
      `${tr('Navigateur', 'Browser')}: ${tech.browser}`,
    )
  }
  return lines.join('\n')
}

// Les adresses trop longues sont refusées par les navigateurs et par GitHub.
const MAX_MESSAGE = 3500

/** Adresse d'une issue GitHub pré-remplie à partir du signalement. */
export function githubIssueUrl(d: FeedbackDraft, tech: TechnicalInfo): string {
  const params = new URLSearchParams()
  params.set('template', TEMPLATE[d.kind])
  if (d.title.trim()) params.set('title', d.title.trim().slice(0, 120))
  params.set(MESSAGE_FIELD[d.kind], d.message.trim().slice(0, MAX_MESSAGE))
  if (d.kind === 'corpus' && d.source.trim()) params.set('source', d.source.trim().slice(0, 500))
  if (d.includeTechnical && d.kind === 'bug') {
    params.set('version', tech.version)
    params.set('env', tech.browser.slice(0, 300))
  }
  return `${REPO_URL}/issues/new?${params.toString()}`
}

export function canSubmit(d: FeedbackDraft): boolean {
  return d.message.trim().length >= 10 && (d.kind !== 'corpus' || d.source.trim().length > 0)
}
