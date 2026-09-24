import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Garde-fou de lisibilité : les couleurs du thème (theme.css) doivent tenir les
 * seuils WCAG 2.1 sur les fonds où elles servent, dans les deux thèmes.
 *   - texte : 4,5:1 ;
 *   - contour d'un champ ou d'un interrupteur : 3:1.
 * Un texte gris ou coloré qui devient trop pâle fait échouer ce test.
 */

type Rgb = [number, number, number]
const css = readFileSync('src/styles/theme.css', 'utf-8')

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start))
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/--c-([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

function parse(v: string): { rgb: Rgb; alpha: number } {
  const hex = v.match(/^#([0-9a-f]{6})$/i)
  if (hex) return { rgb: [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) as Rgb, alpha: 1 }
  const fn = v.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\s*\)$/)
  if (fn) return { rgb: [+fn[1], +fn[2], +fn[3]], alpha: fn[4] === undefined ? 1 : +fn[4] }
  throw new Error(`Couleur non reconnue : ${v}`)
}

const over = (fg: { rgb: Rgb; alpha: number }, bg: Rgb): Rgb => fg.rgb.map((c, i) => c * fg.alpha + bg[i] * (1 - fg.alpha)) as Rgb

function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const THEMES = { clair: block(':root {'), sombre: block(":root[data-theme='dark'] {") }

for (const [name, t] of Object.entries(THEMES)) {
  const solid = (k: string): Rgb => parse(t[k]).rgb
  const surfaces = ['paper', 'surface', 'sunken', 'raised', 'chrome', 'overlay'] as const

  describe(`thème ${name}`, () => {
    it('garde les encres lisibles sur toutes les surfaces (4,5:1)', () => {
      for (const ink of ['ink', 'ink-2', 'ink-3', 'ink-4']) {
        for (const s of surfaces) expect(contrast(solid(ink), solid(s)), `${ink} sur ${s}`).toBeGreaterThanOrEqual(4.5)
      }
    })

    it('garde les couleurs de texte des statuts lisibles sur les surfaces et leurs fonds teintés', () => {
      for (const k of ['positive', 'caution', 'critical', 'brass', 'accent']) {
        const text = solid(`${k}-text`)
        const washes = t[`${k}-wash`] ? [t[`${k}-wash`]] : []
        for (const s of surfaces) {
          expect(contrast(text, solid(s)), `${k} sur ${s}`).toBeGreaterThanOrEqual(4.5)
          for (const w of washes) expect(contrast(text, over(parse(w), solid(s))), `${k} sur son fond teinté (${s})`).toBeGreaterThanOrEqual(4.5)
        }
      }
    })

    it('garde les badges des référentiels lisibles', () => {
      for (const r of ['rgpd', 'nis2', 'dora', 'cra', 'aiact']) {
        for (const s of ['surface', 'raised', 'paper'] as const) {
          const wash = over(parse(t[`${r}-wash`]), solid(s))
          expect(contrast(solid(`${r}-ink`), wash), `${r} sur son fond teinté (${s})`).toBeGreaterThanOrEqual(4.5)
        }
      }
    })

    it('garde le texte du bouton principal lisible sur l’accent', () => {
      expect(contrast(solid('accent-ink'), solid('accent'))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(solid('accent-ink'), solid('accent-hover'))).toBeGreaterThanOrEqual(4.5)
    })

    it('donne aux champs et aux interrupteurs un contour d’au moins 3:1', () => {
      for (const s of ['paper', 'surface', 'sunken'] as const) expect(contrast(solid('edge'), solid(s)), `contour sur ${s}`).toBeGreaterThanOrEqual(3)
    })
  })
}
