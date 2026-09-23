import { Document, Text, View } from '@react-pdf/renderer'
import type { ReportData } from '../reportData'
import { BarRow, C, clean, dateFr, DocHeader, eur, H2, H3, Keep, Kpi, missionMeta, Legend, Note, pct, REG_HEX, REG_NAME, ReportPage, Ring, S, StackedBar, Table } from './kit'

/**
 * Note au comité de direction — deux pages.
 *
 * Elle répond, dans l'ordre, aux questions d'un dirigeant : où en est-on,
 * qu'est-ce qui nous expose, par quoi commencer, que doit-on décider. Le
 * détail juridique et la méthode relèvent du rapport complet.
 */
export function ComexReport({ d }: { d: ReportData }) {
  const cov = d.coverage
  const top = d.items.slice(0, 3)
  const title = 'Note au comité de direction'

  return (
    <Document title={clean(`${title} — ${d.entity.name}`)} author="Scopeo" language="fr">
      <ReportPage title={title} entity={d.entity.name}>
        <DocHeader
          kind="Diffusion restreinte"
          title={title}
          entity={d.entity.name}
          meta={[d.entity.sector ?? '', ...missionMeta(d.profile, d.entity.name), `Établie le ${dateFr(d.generatedAt)}`]}
        />

        <Note>{d.headline}</Note>

        {/* Indicateurs */}
        <View style={[S.row, { gap: 8, marginBottom: 4 }]}>
          <Kpi label="Textes applicables" value={`${d.applicable.length} / 4`} note={d.applicable.map((r) => REG_NAME[r]).join(' · ') || '—'} />
          <Kpi label="Couverture" value={pct(cov.score)} note={`${cov.evaluated} / ${cov.themes} exigences évaluées`} tone={C.accent} />
          <Kpi label="Sans aucune mesure" value={String(cov.distribution.absent)} note="exigences unifiées" tone={cov.distribution.absent > 0 ? C.critical : C.positive} />
          <Kpi
            label="Sanction maximale"
            value={d.maxExposure ? eur(d.maxExposure.eur) : '—'}
            note={d.maxExposure ? `Plafond ${REG_NAME[d.maxExposure.regulation]}` : 'Non valorisée'}
          />
        </View>

        {/* Couverture */}
        <Keep>
        <H2>Où en est-on</H2>
        <View style={[S.row, { gap: 16 }]}>
          <Ring value={cov.score} size={78} label="partiel compté pour moitié" />
          <View style={{ flex: 1 }}>
            <H3>Par texte</H3>
            {cov.byRegulation.map((r) => (
              <BarRow key={r.regulation} label={REG_NAME[r.regulation]} value={r.score} color={REG_HEX[r.regulation]} labelWidth={46} />
            ))}
            <H3>Répartition des niveaux</H3>
            <StackedBar dist={cov.distribution} labelWidth={0} />
            <Legend />
          </View>
        </View>
        </Keep>

        {/* Exposition */}
        <Table
          lead={<H2>Ce qui nous expose</H2>}
          cols={[
            { title: 'Texte', width: '14%' },
            { title: 'Qualification retenue', width: '46%' },
            { title: 'Couverture', width: '14%', align: 'right' },
            { title: 'Sanction plafond', width: '26%', align: 'right' },
          ]}
          rows={d.verdicts
            .filter((v) => v.applies)
            .map((v) => [
              <Text key="t" style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: REG_HEX[v.regulation] }}>{REG_NAME[v.regulation]}</Text>,
              clean(v.qualification ?? v.status),
              pct(cov.byRegulation.find((b) => b.regulation === v.regulation)?.score ?? 0),
              v.exposure?.maxEur ? eur(v.exposure.maxEur) : 'Régime national',
            ])}
        />

        {/* Priorités */}
        {top.map((p, i) => (
          <View key={p.themeId} wrap={false}>
          {i === 0 ? <H2>Par quoi commencer</H2> : null}
          <View style={[S.row, { gap: 9, paddingVertical: 5, borderBottomWidth: i < top.length - 1 ? 0.5 : 0, borderBottomColor: C.rule }]}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 8 }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={[S.row, { justifyContent: 'space-between' }]}>
                <Text style={[S.bold, { fontSize: 9.5 }]}>{clean(p.theme.title)}</Text>
                <Text style={[S.small, S.muted]}>{p.regulations.map((r) => REG_NAME[r]).join(' + ')}</Text>
              </View>
              <Text style={[S.small, { marginTop: 1.5 }]}>{clean(p.theme.unifiedAction)}</Text>
              <Text style={[S.small, S.muted, { marginTop: 1.5, fontSize: 7.2 }]}>
                {clean(
                  [`Aujourd'hui : ${p.coverage === 'non_evalue' ? 'non évalué' : p.coverage === 'en_place' ? 'en place' : p.coverage === 'partiel' ? 'partiel' : 'absent'}`, ...(d.tracking ? [p.owner ? `Porteur : ${p.owner}` : 'Porteur à désigner'] : []), `Charge ${p.theme.effort}/5`].join('   ·   '),
                )}
              </Text>
            </View>
          </View>
          </View>
        ))}

        {/* Feuille de route */}
        <Keep>
        <H2>Feuille de route</H2>
        <View style={[S.row, { gap: 6 }]}>
          {d.waves.map((w) => (
            <View key={w.n} style={{ flex: 1, borderTopWidth: 2, borderTopColor: w.n === 1 ? C.accent : C.rule2, paddingTop: 5 }}>
              <Text style={[S.bold, { fontSize: 8.5 }]}>{clean(`${w.label} · ${w.horizon}`)}</Text>
              <Text style={[S.small, S.muted, { marginBottom: 3 }]}>{`${w.items.length} exigence${w.items.length > 1 ? 's' : ''}`}</Text>
              {w.items.slice(0, 3).map((it) => (
                <Text key={it.themeId} style={[S.small, { fontSize: 7.4 }]}>
                  {clean(`— ${it.theme.title}`)}
                </Text>
              ))}
              {w.items.length > 3 ? <Text style={[S.small, S.muted, { fontSize: 7.2 }]}>{`et ${w.items.length - 3} autres`}</Text> : null}
            </View>
          ))}
        </View>
        </Keep>

        {/* Domaines */}
        <Keep>
        <H2>Où sont les faiblesses</H2>
        <View style={[S.row, { gap: 22 }]}>
          {[cov.byDomain.slice(0, Math.ceil(cov.byDomain.length / 2)), cov.byDomain.slice(Math.ceil(cov.byDomain.length / 2))].map((col, ci) => (
            <View key={ci} style={{ flex: 1 }}>
              {col.map((dm) => (
                <BarRow key={dm.label} label={dm.label} value={dm.score} labelWidth={74} color={dm.score >= 0.75 ? C.positive : dm.score >= 0.4 ? C.caution : C.critical} />
              ))}
            </View>
          ))}
        </View>
        </Keep>

        {/* Décisions */}
        {d.decisions.map((t, i) => (
          <View key={i} wrap={false}>
          {i === 0 ? <H2>Décisions attendues</H2> : null}
          <View style={[S.row, { gap: 7, marginBottom: 4 }]}>
            <Text style={[S.bold, { width: 12, color: C.accent }]}>{i + 1}.</Text>
            <Text style={{ flex: 1, fontSize: 9 }}>{clean(t)}</Text>
          </View>
          </View>
        ))}

        {/* Calendrier et signalement */}
        <View style={[S.row, { gap: 14, marginTop: 6 }]}>
          <View style={{ flex: 1.2 }}>
            <H3>Prochaines échéances</H3>
            {d.milestones.map((m) => (
              <View key={m.id} wrap={false} style={[S.row, { gap: 6, marginBottom: 4 }]}>
                <Text style={{ width: 74, fontSize: 7.8, fontFamily: 'Helvetica-Bold', color: m.regulation === 'TRANSVERSE' ? C.ink2 : REG_HEX[m.regulation] }}>
                  {clean(dateFr(m.date))}
                </Text>
                <Text style={{ flex: 1, fontSize: 7.8 }}>{clean(m.title)}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <H3>Si un incident survenait</H3>
            {d.notification.map((n) => (
              <View key={n.regulation} wrap={false} style={[S.row, { gap: 6, marginBottom: 4 }]}>
                <Text style={{ width: 30, fontSize: 7.8, fontFamily: 'Helvetica-Bold', color: REG_HEX[n.regulation] }}>{REG_NAME[n.regulation]}</Text>
                <Text style={{ flex: 1, fontSize: 7.8 }}>
                  {clean(n.viaDora ? 'Notifié au titre de DORA' : `${n.authority.split(' — ')[0]} · dès ${n.steps[0].delay.replace('*', '')}`)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Arbitrages — à compléter en séance */}
        <View wrap={false}>
          <H2>Arbitrages du comité</H2>
          <View style={[S.row, { borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingBottom: 3 }]}>
            {['N°', 'Décision prise', 'Porteur', 'Échéance'].map((h, i) => (
              <Text key={h} style={[S.label, { width: ['8%', '56%', '18%', '18%'][i] }]}>{clean(h)}</Text>
            ))}
          </View>
          {d.decisions.slice(0, 4).map((_, i) => (
            <View key={i} style={[S.row, { height: 22, borderBottomWidth: 0.5, borderBottomColor: C.rule, alignItems: 'center' }]}>
              <Text style={[S.small, S.muted, { width: '8%' }]}>{i + 1}</Text>
            </View>
          ))}
          <Text style={[S.small, S.muted, { marginTop: 5, fontSize: 7.2 }]}>
            {clean('Date du comité : ____________________    Présenté par : ____________________')}
          </Text>
        </View>

        <Text style={[S.small, S.muted, { marginTop: 10, fontSize: 7 }]}>
          {clean(
            "Établie à partir des éléments déclarés et de l'état du droit à la date indiquée. Elle ne remplace ni l'analyse d'un conseil, ni la position de l'autorité compétente. Détail, fondements et méthode : rapport de cadrage complet.",
          )}
        </Text>
      </ReportPage>
    </Document>
  )
}
