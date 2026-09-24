import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_VERSION, canSubmit, feedbackText, githubIssueUrl, technicalInfo, type FeedbackDraft } from './feedback'

const tech = technicalInfo('/app/evaluation', 'TestBrowser/1.0')
const draft = (patch: Partial<FeedbackDraft> = {}): FeedbackDraft => ({
  kind: 'bug',
  title: "L'écran se fige",
  message: 'Le tableau ne se charge plus après un clic.',
  source: '',
  includeTechnical: true,
  ...patch,
})

describe('signalement depuis la plateforme', () => {
  it('annonce la même version que package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string }
    expect(APP_VERSION).toBe(pkg.version)
  })

  it('exige un message d’au moins dix caractères', () => {
    expect(canSubmit(draft({ message: 'court' }))).toBe(false)
    expect(canSubmit(draft())).toBe(true)
  })

  it('exige une source officielle pour une erreur de contenu réglementaire', () => {
    expect(canSubmit(draft({ kind: 'corpus' }))).toBe(false)
    expect(canSubmit(draft({ kind: 'corpus', source: 'https://eur-lex.europa.eu/eli/reg/2024/2847/oj' }))).toBe(true)
  })

  it('joint uniquement les informations techniques, jamais de données de cadrage', () => {
    const text = feedbackText(draft(), tech)
    expect(text).toContain('/app/evaluation')
    expect(text).toContain('TestBrowser/1.0')
    expect(text).not.toMatch(/entit[ée]|contact|r[ée]ponse/i)
  })

  it('omet les informations techniques si l’utilisateur le demande', () => {
    const text = feedbackText(draft({ includeTechnical: false }), tech)
    expect(text).not.toContain('TestBrowser')
    expect(githubIssueUrl(draft({ includeTechnical: false }), tech)).not.toContain('TestBrowser')
  })

  it('pré-remplit le bon modèle d’issue GitHub selon la nature du signalement', () => {
    expect(githubIssueUrl(draft(), tech)).toContain('template=bug_report.yml')
    expect(githubIssueUrl(draft({ kind: 'idee' }), tech)).toContain('template=feature_request.yml')
    const corpus = githubIssueUrl(draft({ kind: 'corpus', source: 'https://eur-lex.europa.eu/x' }), tech)
    expect(corpus).toContain('template=regulatory_update.yml')
    expect(corpus).toContain('source=')
  })

  it('borne la longueur de l’adresse', () => {
    expect(githubIssueUrl(draft({ message: 'x'.repeat(20_000) }), tech).length).toBeLessThan(6000)
  })
})
