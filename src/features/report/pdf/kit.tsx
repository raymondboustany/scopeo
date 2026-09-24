/* eslint-disable react-refresh/only-export-components -- module chargé à la demande, hors rechargement à chaud */
import type { ReactNode } from 'react'
import { Circle, Font, Line, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import type { CoverageLevel, RegulationId } from '@/types/domain'
import type { Distribution } from '../reportData'
import { LOCALE, tr } from '@/i18n'

/**
 * Boîte à outils des rapports PDF.
 *
 * Règles de mise en page, appliquées partout :
 *  - un titre ne termine jamais une page (`minPresenceAhead`) ;
 *  - un bloc court (carte, ligne de tableau, encadré) ne se coupe pas ;
 *  - aucun saut de page forcé : le contenu s'enchaîne, sans grands blancs ;
 *  - toute chaîne passe par `clean`, la police standard ne couvrant que le
 *    jeu WinAnsi (les espaces insécables fines du français, notamment).
 */

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------

// Pas de césure automatique : un mot coupé en fin de ligne fait négligé
// dans un document destiné à la direction.
Font.registerHyphenationCallback((word) => [word])

const WINANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')
const REPLACE: Record<string, string> = {
  '\u202f': ' ',
  '\u2009': ' ',
  '\u2007': ' ',
  '\u2011': '-',
  '\u2010': '-',
  '\u2192': '->',
  '\u2264': '<=',
  '\u2265': '>=',
  '\u2248': '~',
  '\u2212': '-',
  '\u2217': '*',
}

export function clean(s: string | null | undefined): string {
  if (!s) return ''
  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0)!
    if (REPLACE[ch] !== undefined) out += REPLACE[ch]
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || code === 0x0a || WINANSI_EXTRA.has(ch)) out += ch
    else out += ''
  }
  return out
}

export const eur = (n: number) => {
  const en = LOCALE === 'en-GB'
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    const v = m.toLocaleString(LOCALE, { maximumFractionDigits: m < 10 ? 1 : 0 }).replace(/[\u202f\u00a0]/g, ' ')
    return en ? `€${v}M` : `${v} M€`
  }
  return en ? `€${Math.round(n / 1000)}k` : `${Math.round(n / 1000)} k€`
}
/** Ligne de méta d'ouverture : qui, pour qui, quand. */
export function missionMeta(profile: { mode?: string; legalName?: string; siren?: string; lead?: string; sponsor?: string }, entityName: string): string[] {
  const out: string[] = []
  if (profile.legalName && profile.legalName !== entityName) out.push(profile.legalName)
  if (profile.siren) out.push(`SIREN ${profile.siren}`)
  if (profile.lead) out.push(`${profile.mode === 'interne' ? tr('Piloté par', 'Led by') : tr('Établi par', 'Prepared by')} ${profile.lead}`)
  if (profile.sponsor) out.push(`${tr("À l'attention de", 'For the attention of')} ${profile.sponsor}`)
  return out
}

export const pct = (r: number) => (LOCALE === 'en-GB' ? `${Math.round(r * 100)}%` : `${Math.round(r * 100)} %`)
export const dateFr = (d: Date | string) =>
  new Date(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })

// ---------------------------------------------------------------------------
// Palette imprimée
// ---------------------------------------------------------------------------

export const C = {
  ink: '#16181D',
  ink2: '#454A55',
  ink3: '#7A808C',
  rule: '#E3E5EA',
  rule2: '#CDD1D8',
  wash: '#F5F6F8',
  accent: '#5B45E0',
  accentWash: '#F1EFFD',
  positive: '#12875A',
  caution: '#C77800',
  critical: '#C8372D',
  neutral: '#D6D9DF',
}

export const REG_HEX: Record<RegulationId, string> = { RGPD: '#3D68BF', NIS2: '#008C99', DORA: '#946F00', CRA: '#9C2F63', AIACT: '#4F7A1F' }
export const REG_NAME: Record<RegulationId, string> = { RGPD: tr('RGPD', 'GDPR'), NIS2: 'NIS2 (ReCyF)', DORA: 'DORA', CRA: 'CRA', AIACT: 'AI Act' }
export const LEVEL_HEX: Record<CoverageLevel, string> = { en_place: C.positive, partiel: C.caution, absent: C.critical, non_evalue: C.neutral }
export const LEVEL_LABEL: Record<CoverageLevel, string> = {
  en_place: tr('En place', 'In place'),
  partiel: tr('Partiel', 'Partial'),
  absent: tr('Absent', 'Missing'),
  non_evalue: tr('Non évalué', 'Not assessed'),
}

export const S = StyleSheet.create({
  page: { paddingTop: 54, paddingBottom: 52, paddingHorizontal: 44, fontFamily: 'Helvetica', fontSize: 8.8, color: C.ink },
  firstPage: { paddingTop: 40 },
  small: { fontSize: 7.8, color: C.ink2, lineHeight: 1.4 },
  muted: { color: C.ink3 },
  bold: { fontFamily: 'Helvetica-Bold' },
  label: { fontSize: 6.8, lineHeight: 1.3, letterSpacing: 0.8, color: C.ink3, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  row: { flexDirection: 'row' },
  card: { borderWidth: 0.8, borderColor: C.rule, borderRadius: 4, padding: 10 },
})

// ---------------------------------------------------------------------------
// Page, en-tête et pied courants
// ---------------------------------------------------------------------------

const PAGE_H = 841.89

export function ReportPage({ title, entity, children }: { title: string; entity: string; children: ReactNode }) {
  return (
    <Page size="A4" style={S.page}>
      <View
        fixed
        style={{ position: 'absolute', top: 22, left: 44, right: 44 }}
        render={({ pageNumber }) =>
          pageNumber === 1 ? null : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.6, borderBottomColor: C.rule, paddingBottom: 5 }}>
              <Text style={[S.small, S.muted]}>{clean(title)}</Text>
              <Text style={[S.small, S.muted]}>{clean(entity)}</Text>
            </View>
          )
        }
      />
      {children}
      <View fixed style={{ position: 'absolute', top: PAGE_H - 34, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.6, borderTopColor: C.rule, paddingTop: 5 }}>
        <Text style={[S.small, S.muted, { fontSize: 6.8 }]}>
          {clean(tr("Scopeo · Plateforme d'aide au cadrage, pas un avis juridique.", 'Scopeo · A scoping aid, not legal advice.'))}
        </Text>
        <Text style={[S.small, S.muted, { fontSize: 6.8 }]} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  )
}

/** Bandeau d'ouverture du document : marque, type de document, entité. */
export function DocHeader({ kind, title, entity, meta }: { kind: string; title: string; entity: string; meta: string[] }) {
  return (
    <View style={{ marginBottom: 11 }}>
      <View style={[S.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={[S.row, { alignItems: 'center', gap: 6 }]}>
          <BrandMark size={16} />
          <Text style={[S.bold, { fontSize: 8.5 }]}>Scopeo</Text>
        </View>
        <Text style={[S.label, { color: C.accent }]}>{clean(kind)}</Text>
      </View>
      <View style={{ height: 1.2, backgroundColor: C.ink, marginTop: 8, marginBottom: 10 }} />
      <Text style={[S.label]}>{clean(title)}</Text>
      <Text style={{ fontSize: 21, lineHeight: 1.15, fontFamily: 'Helvetica-Bold', marginTop: 3, color: C.ink }}>{clean(entity)}</Text>
      <Text style={[S.small, S.muted, { marginTop: 4 }]}>{clean(meta.filter(Boolean).join('   ·   '))}</Text>
    </View>
  )
}

/** Logo, repris du dessin de l'interface (grille de 24). */
export function BrandMark({ size = 16 }: { size?: number }) {
  const nodes = [
    { x: 12, y: 6.5, c: REG_HEX.RGPD },
    { x: 17.2, y: 10.3, c: REG_HEX.NIS2 },
    { x: 15.2, y: 16.4, c: REG_HEX.DORA },
    { x: 8.8, y: 16.4, c: REG_HEX.CRA },
    { x: 6.8, y: 10.3, c: REG_HEX.AIACT },
  ]
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {['M3 8V3h5', 'M16 3h5v5', 'M21 16v5h-5', 'M8 21H3v-5'].map((d) => (
        <Path key={d} d={d} stroke={C.ink} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {nodes.map((n) => (
        <Line key={`l${n.x}${n.y}`} x1={n.x} y1={n.y} x2={12} y2={12} stroke={C.ink3} strokeWidth={1} />
      ))}
      {nodes.map((n) => (
        <Circle key={`c${n.x}${n.y}`} cx={n.x} cy={n.y} r={1.7} fill={n.c} />
      ))}
      <Circle cx={12} cy={12} r={2.3} fill={C.accent} />
    </Svg>
  )
}

// ---------------------------------------------------------------------------
// Titres : jamais orphelins
// ---------------------------------------------------------------------------

export function H2({ n, children }: { n?: string; children: string }) {
  return (
    <View minPresenceAhead={70} style={{ marginTop: 14, marginBottom: 7, flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingBottom: 4 }}>
      {n ? <Text style={{ fontSize: 9, lineHeight: 1.2, marginBottom: 1.5, color: C.accent, fontFamily: 'Helvetica-Bold' }}>{n}</Text> : null}
      <Text style={{ fontSize: 12.5, lineHeight: 1.2, fontFamily: 'Helvetica-Bold' }}>{clean(children)}</Text>
    </View>
  )
}

export function H3({ children, aside }: { children: string; aside?: string }) {
  return (
    <View minPresenceAhead={36} style={[S.row, { justifyContent: 'space-between', marginTop: 10, marginBottom: 5 }]}>
      <Text style={S.label}>{clean(children)}</Text>
      {aside ? <Text style={[S.small, S.muted]}>{clean(aside)}</Text> : null}
    </View>
  )
}

export function P({ children, style }: { children: string; style?: Style }) {
  return <Text style={[{ marginBottom: 5, color: C.ink2, fontSize: 8.8, lineHeight: 1.45 }, style ?? {}]}>{clean(children)}</Text>
}

// ---------------------------------------------------------------------------
// Chiffres
// ---------------------------------------------------------------------------

export function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <View style={[S.card, { flex: 1, paddingVertical: 8 }]} wrap={false}>
      <Text style={S.label}>{clean(label)}</Text>
      <Text style={{ fontSize: 16, lineHeight: 1.2, fontFamily: 'Helvetica-Bold', marginTop: 4, marginBottom: 1, color: tone ?? C.ink }}>{clean(value)}</Text>
      {note ? <Text style={[S.small, S.muted, { marginTop: 1 }]}>{clean(note)}</Text> : null}
    </View>
  )
}

export function Ring({ value, size = 84, label }: { value: number; size?: number; label?: string }) {
  const stroke = size * 0.11
  const r = (size - stroke) / 2
  const cx = size / 2
  const p = Math.max(0, Math.min(0.9999, value))
  const a = p * Math.PI * 2 - Math.PI / 2
  const d = `M ${cx} ${cx - r} A ${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${cx + r * Math.cos(a)} ${cx + r * Math.sin(a)}`
  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cx} r={r} stroke={C.rule} strokeWidth={stroke} fill="none" />
          {p > 0.001 ? <Path d={d} stroke={C.accent} strokeWidth={stroke} fill="none" strokeLinecap="round" /> : null}
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: size * 0.22, lineHeight: 1.1, fontFamily: 'Helvetica-Bold' }}>{pct(value)}</Text>
        </View>
      </View>
      {label ? <Text style={[S.small, S.muted, { marginTop: 4, textAlign: 'center' }]}>{clean(label)}</Text> : null}
    </View>
  )
}

/** Barre horizontale étiquetée, pour comparer des parts entre elles. */
export function BarRow({ label, value, color, labelWidth = 92, suffix }: { label: string; value: number; color: string; labelWidth?: number; suffix?: string }) {
  return (
    <View style={[S.row, { alignItems: 'center', marginBottom: 5 }]} wrap={false}>
      <Text style={{ width: labelWidth, fontSize: 8, color: C.ink2 }}>{clean(label)}</Text>
      <View style={{ flex: 1, height: 6, backgroundColor: '#EEF0F3', borderRadius: 3 }}>
        <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
      </View>
      <Text style={{ width: 52, textAlign: 'right', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{clean(suffix ?? pct(value))}</Text>
    </View>
  )
}

const ORDER: CoverageLevel[] = ['en_place', 'partiel', 'absent', 'non_evalue']

/** Répartition des niveaux déclarés, en barre empilée à 100 %. */
export function StackedBar({ label, dist, labelWidth = 92 }: { label?: string; dist: Distribution; labelWidth?: number }) {
  const total = ORDER.reduce((n, k) => n + dist[k], 0) || 1
  return (
    <View style={[S.row, { alignItems: 'center', marginBottom: 5 }]} wrap={false}>
      {label ? <Text style={{ width: labelWidth, fontSize: 8, color: C.ink2 }}>{clean(label)}</Text> : null}
      <View style={[S.row, { flex: 1, height: 9, borderRadius: 2, overflow: 'hidden' }]}>
        {ORDER.filter((k) => dist[k] > 0).map((k) => (
          <View key={k} style={{ width: `${(dist[k] / total) * 100}%`, backgroundColor: LEVEL_HEX[k], height: 9 }} />
        ))}
      </View>
      <Text style={{ width: 52, textAlign: 'right', fontSize: 7.5, color: C.ink3 }}>{total} {tr('exig.', 'req.')}</Text>
    </View>
  )
}

export function Legend() {
  return (
    <View style={[S.row, { gap: 12, marginTop: 2 }]}>
      {ORDER.map((k) => (
        <View key={k} style={[S.row, { alignItems: 'center', gap: 4 }]}>
          <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: LEVEL_HEX[k] }} />
          <Text style={[S.small, { fontSize: 7 }]}>{LEVEL_LABEL[k]}</Text>
        </View>
      ))}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Tableaux : une ligne ne se coupe jamais
// ---------------------------------------------------------------------------

export interface Col {
  title: string
  width: number | string
  align?: 'left' | 'right' | 'center'
}

export function Table({ cols, rows, zebra = true, lead }: { cols: Col[]; rows: ReactNode[][]; zebra?: boolean; lead?: ReactNode }) {
  const header = (
    <View style={[S.row, { borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingBottom: 3 }]}>
      {cols.map((c, i) => (
        <Text key={i} style={[S.label, { width: c.width, textAlign: c.align ?? 'left', paddingRight: 4 }]}>
          {clean(c.title)}
        </Text>
      ))}
    </View>
  )
  const row = (r: ReactNode[], ri: number) => (
    <View
      key={ri}
      wrap={false}
      style={[S.row, { paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.rule, backgroundColor: zebra && ri % 2 ? C.wash : undefined }]}
    >
      {r.map((cell, ci) => (
        <View key={ci} style={{ width: cols[ci].width, paddingRight: 4, alignItems: cols[ci].align === 'right' ? 'flex-end' : cols[ci].align === 'center' ? 'center' : 'flex-start' }}>
          {typeof cell === 'string' || typeof cell === 'number' ? <Text style={{ fontSize: 8, lineHeight: 1.35 }}>{clean(String(cell))}</Text> : cell}
        </View>
      ))}
    </View>
  )
  // Rendu à plat, sans conteneur : un bloc insécable imbriqué dans une vue
  // qui change de page provoque des chevauchements dans le moteur PDF.
  // Le titre, l'en-tête et la première ligne forment un bloc insécable :
  // un tableau ne commence jamais seul en bas de page.
  return (
    <>
      <View wrap={false}>
        {lead}
        {header}
        {rows.length > 0 ? row(rows[0], 0) : null}
      </View>
      {rows.slice(1).map((r, i) => row(r, i + 1))}
      <View style={{ height: 6 }} />
    </>
  )
}

/** Garde ensemble un titre et le bloc qui le suit. */
export function Keep({ children }: { children: ReactNode }) {
  return <View wrap={false}>{children}</View>
}

export function RegTag({ id }: { id: RegulationId }) {
  return <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: REG_HEX[id] }}>{REG_NAME[id]}</Text>
}

export function LevelTag({ level }: { level: CoverageLevel }) {
  return (
    <View style={[S.row, { alignItems: 'center', gap: 3 }]}>
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: LEVEL_HEX[level] }} />
      <Text style={{ fontSize: 7.5, color: C.ink2 }}>{LEVEL_LABEL[level]}</Text>
    </View>
  )
}

export function Note({ children, tone = 'accent', title }: { children: string; tone?: 'accent' | 'neutral'; title?: string }) {
  return (
    <View
      wrap={false}
      style={{
        backgroundColor: tone === 'accent' ? C.accentWash : C.wash,
        borderLeftWidth: 2.5,
        borderLeftColor: tone === 'accent' ? C.accent : C.rule2,
        padding: 9,
        borderRadius: 2,
        marginBottom: 8,
      }}
    >
      {title ? <Text style={[S.bold, { fontSize: 8.5, marginBottom: 2 }]}>{clean(title)}</Text> : null}
      <Text style={{ fontSize: 9.2, lineHeight: 1.45, color: C.ink }}>{clean(children)}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Nuage de priorisation : score contre charge
// ---------------------------------------------------------------------------

const WAVE_HEX = ['#5B45E0', '#3D68BF', '#008C99', '#9AA0AA']

export function PriorityScatter({ items, width = 507, height = 170 }: { items: { rank: number; score: number; effort: number; wave: number }[]; width?: number; height?: number }) {
  if (items.length === 0) return null
  const pad = { l: 28, r: 10, t: 8, b: 20 }
  const scores = items.map((i) => i.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const x = (e: number) => pad.l + ((e - 1) / 4) * (width - pad.l - pad.r)
  const y = (s: number) => pad.t + (1 - (max === min ? 0.5 : (s - min) / (max - min))) * (height - pad.t - pad.b)
  // Décalage horizontal pour les points de même charge, afin qu'ils ne se masquent pas.
  const seen = new Map<number, number>()
  return (
    <View wrap={false} style={{ marginVertical: 4 }}>
      <View style={{ width, height, position: 'relative' }}>
        <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke={C.rule2} strokeWidth={0.8} />
          <Line x1={pad.l} y1={pad.t} x2={pad.l} y2={height - pad.b} stroke={C.rule2} strokeWidth={0.8} />
          {[1, 2, 3, 4, 5].map((e) => (
            <Line key={e} x1={x(e)} y1={pad.t} x2={x(e)} y2={height - pad.b} stroke={C.rule} strokeWidth={0.4} strokeDasharray="2 3" />
          ))}
        </Svg>
        {items.map((it) => {
          const k = seen.get(it.effort) ?? 0
          seen.set(it.effort, k + 1)
          const dx = ((k % 5) - 2) * 13
          return (
            <View
              key={it.rank}
              style={{
                position: 'absolute',
                left: x(it.effort) + dx - 6,
                top: y(it.score) - 6,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: WAVE_HEX[it.wave - 1],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 5.8, lineHeight: 1, color: '#FFFFFF', fontFamily: 'Helvetica-Bold', textAlign: 'center', width: 12 }}>{it.rank}</Text>
            </View>
          )
        })}
        {[1, 2, 3, 4, 5].map((e) => (
          <Text key={e} style={{ position: 'absolute', left: x(e) - 6, top: height - pad.b + 5, width: 12, textAlign: 'center', fontSize: 6.5, color: C.ink3 }}>
            {e}
          </Text>
        ))}
        <Text style={{ position: 'absolute', left: 0, top: pad.t - 2, fontSize: 6.5, color: C.ink3 }}>{tr('Priorité', 'Priority')}</Text>
      </View>
      <View style={[S.row, { justifyContent: 'space-between', marginTop: 3 }]}>
        <View style={[S.row, { gap: 10 }]}>
          {WAVE_HEX.map((c, i) => (
            <View key={c} style={[S.row, { alignItems: 'center', gap: 3 }]}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: c }} />
              <Text style={[S.small, { fontSize: 7 }]}>{tr('Vague', 'Wave')} {i + 1}</Text>
            </View>
          ))}
        </View>
        <Text style={[S.small, S.muted, { fontSize: 7 }]}>{clean(tr('Charge de mise en œuvre, de 1 (faible) à 5 (lourde)', 'Implementation effort, from 1 (light) to 5 (heavy)'))}</Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Badge de certification ISO 27001
// ---------------------------------------------------------------------------

export function IsoCertBadge({ valid, until }: { valid: boolean; until?: string }) {
  const color = valid ? C.positive : C.caution
  const label = valid ? tr('Certifié ISO 27001', 'ISO 27001 certified') : tr('Certificat ISO 27001 expiré', 'ISO 27001 certificate expired')
  const when = until ? (valid ? tr(`valide jusqu'au ${dateFr(until)}`, `valid until ${dateFr(until)}`) : tr(`expiré le ${dateFr(until)}`, `expired on ${dateFr(until)}`)) : ''
  return (
    <View wrap={false} style={[S.row, { alignItems: 'center', gap: 6, borderWidth: 0.9, borderColor: color, borderRadius: 3, paddingVertical: 4, paddingHorizontal: 7, alignSelf: 'flex-start' }]}>
      <Svg width={9} height={9} viewBox="0 0 24 24">
        <Path d="M20 6 9 17l-5-5" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color }}>{clean(label)}</Text>
      {when ? <Text style={{ fontSize: 7.5, color: C.ink2 }}>{clean(when)}</Text> : null}
    </View>
  )
}
