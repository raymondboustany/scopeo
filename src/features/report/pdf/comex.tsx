import { Document, Text, View } from '@react-pdf/renderer'
import type { ReportData } from '../reportData'
import { BarRow, C, clean, dateFr, DocHeader, eur, H2, H3, IsoCertBadge, Keep, Kpi, LEVEL_LABEL, missionMeta, Legend, Note, pct, REG_HEX, REG_NAME, ReportPage, Ring, S, StackedBar, Table } from './kit'
import { COLON, LANG, tr } from '@/i18n'

/**
 * Note au comité de direction (résumé exécutif), deux pages.
 *
 * Elle répond, dans l'ordre, aux questions d'un dirigeant : où en est-on,
 * qu'est-ce qui nous expose, par quoi commencer, que doit-on décider. Le
 * détail juridique et la méthode relèvent du rapport complet.
 */
export function ComexReport({ d }: { d: ReportData }) {
  const cov = d.coverage
  const top = d.items.slice(0, 3)
  const title = tr('Note au comité de direction', 'Executive summary')

  return (
    <Document title={clean(`${title}${COLON}${d.entity.name}`)} author="Scopeo" language={LANG}>
      <ReportPage title={title} entity={d.entity.name}>
        <DocHeader
          kind={tr('Diffusion restreinte', 'Restricted distribution')}
          title={title}
          entity={d.entity.name}
          meta={[d.entity.sector ?? '', ...missionMeta(d.profile, d.entity.name), tr(`Établie le ${dateFr(d.generatedAt)}`, `Prepared on ${dateFr(d.generatedAt)}`)]}
        />

        {d.iso?.certified ? (
          <View style={{ marginBottom: 8 }}>
            <IsoCertBadge valid={d.iso.certificateValid} until={d.iso.profile.validUntil} />
          </View>
        ) : null}

        <Note>{d.headline}</Note>

        {/* Indicateurs */}
        <View style={[S.row, { gap: 8, marginBottom: 4 }]}>
          <Kpi label={tr('Textes applicables', 'Applicable texts')} value={`${d.applicable.length} / 5`} note={d.applicable.map((r) => REG_NAME[r]).join(' · ') || tr('aucun', 'none')} />
          <Kpi label={tr('Couverture', 'Coverage')} value={pct(cov.score)} note={tr(`${cov.evaluated} / ${cov.themes} exigences évaluées`, `${cov.evaluated} / ${cov.themes} requirements assessed`)} tone={C.accent} />
          <Kpi label={tr('Sans aucune mesure', 'With no measure')} value={String(cov.distribution.absent)} note={tr('exigences unifiées', 'unified requirements')} tone={cov.distribution.absent > 0 ? C.critical : C.positive} />
          <Kpi
            label={tr('Sanction maximale', 'Maximum penalty')}
            value={d.maxExposure ? eur(d.maxExposure.eur) : tr('n.c.', 'n/a')}
            note={d.maxExposure ? tr(`Plafond ${REG_NAME[d.maxExposure.regulation]}`, `${REG_NAME[d.maxExposure.regulation]} cap`) : tr('Non valorisée', 'Not quantified')}
          />
        </View>

        {/* Couverture */}
        <Keep>
        <H2>{tr('Où en est-on', 'Where we stand')}</H2>
        <View style={[S.row, { gap: 16 }]}>
          <Ring value={cov.score} size={78} label={tr('partiel compté pour moitié', 'partial counts for half')} />
          <View style={{ flex: 1 }}>
            <H3>{tr('Par texte', 'By text')}</H3>
            {cov.byRegulation.map((r) => (
              <BarRow key={r.regulation} label={REG_NAME[r.regulation]} value={r.score} color={REG_HEX[r.regulation]} labelWidth={66} />
            ))}
            <H3>{tr('Répartition des niveaux', 'Breakdown of levels')}</H3>
            <StackedBar dist={cov.distribution} labelWidth={0} />
            <Legend />
          </View>
        </View>
        </Keep>

        {/* Exposition */}
        <Table
          lead={<H2>{tr('Ce qui nous expose', 'What exposes us')}</H2>}
          cols={[
            { title: tr('Texte', 'Text'), width: '18%' },
            { title: tr('Qualification retenue', 'Scoping outcome'), width: '42%' },
            { title: tr('Couverture', 'Coverage'), width: '14%', align: 'right' },
            { title: tr('Sanction plafond', 'Penalty cap'), width: '26%', align: 'right' },
          ]}
          rows={d.verdicts
            .filter((v) => v.applies)
            .map((v) => [
              <Text key="t" style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: REG_HEX[v.regulation] }}>{REG_NAME[v.regulation]}</Text>,
              clean(v.qualification ?? v.status),
              pct(cov.byRegulation.find((b) => b.regulation === v.regulation)?.score ?? 0),
              v.exposure?.maxEur ? eur(v.exposure.maxEur) : tr('Régime national', 'National regime'),
            ])}
        />

        {/* Priorités */}
        {top.map((p, i) => (
          <View key={p.themeId} wrap={false}>
          {i === 0 ? <H2>{tr('Par quoi commencer', 'Where to start')}</H2> : null}
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
                  [
                    `${tr("Aujourd'hui", 'Today')}${COLON}${LEVEL_LABEL[p.coverage].toLowerCase()}`,
                    ...(d.tracking ? [p.owner ? `${tr('Porteur', 'Owner')}${COLON}${p.owner}` : tr('Porteur à désigner', 'Owner to be assigned')] : []),
                    `${tr('Charge', 'Effort')} ${p.theme.effort}/5`,
                  ].join('   ·   '),
                )}
              </Text>
            </View>
          </View>
          </View>
        ))}

        {/* Feuille de route */}
        <Keep>
        <H2>{tr('Feuille de route', 'Roadmap')}</H2>
        <View style={[S.row, { gap: 6 }]}>
          {d.waves.map((w) => (
            <View key={w.n} style={{ flex: 1, borderTopWidth: 2, borderTopColor: w.n === 1 ? C.accent : C.rule2, paddingTop: 5 }}>
              <Text style={[S.bold, { fontSize: 8.5 }]}>{clean(`${w.label} · ${w.horizon}`)}</Text>
              <Text style={[S.small, S.muted, { marginBottom: 3 }]}>{tr(`${w.items.length} exigence${w.items.length > 1 ? 's' : ''}`, `${w.items.length} requirement${w.items.length > 1 ? 's' : ''}`)}</Text>
              {w.items.slice(0, 3).map((it) => (
                <Text key={it.themeId} style={[S.small, { fontSize: 7.4 }]}>
                  {clean(`· ${it.theme.title}`)}
                </Text>
              ))}
              {w.items.length > 3 ? <Text style={[S.small, S.muted, { fontSize: 7.2 }]}>{tr(`et ${w.items.length - 3} autres`, `and ${w.items.length - 3} more`)}</Text> : null}
            </View>
          ))}
        </View>
        </Keep>

        {/* Domaines */}
        <Keep>
        <H2>{tr('Où sont les faiblesses', 'Where the weaknesses are')}</H2>
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
          {i === 0 ? <H2>{tr('Décisions attendues', 'Decisions required')}</H2> : null}
          <View style={[S.row, { gap: 7, marginBottom: 4 }]}>
            <Text style={[S.bold, { width: 12, color: C.accent }]}>{i + 1}.</Text>
            <Text style={{ flex: 1, fontSize: 9 }}>{clean(t)}</Text>
          </View>
          </View>
        ))}

        {/* Calendrier et signalement */}
        <View style={[S.row, { gap: 14, marginTop: 6 }]}>
          <View style={{ flex: 1.2 }}>
            <H3>{tr('Prochaines échéances', 'Upcoming deadlines')}</H3>
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
            <H3>{tr('Si un incident survenait', 'Should an incident occur')}</H3>
            {d.notification.map((n) => (
              <View key={n.regulation} wrap={false} style={[S.row, { gap: 6, marginBottom: 4 }]}>
                <Text style={{ width: 60, fontSize: 7.8, fontFamily: 'Helvetica-Bold', color: REG_HEX[n.regulation] }}>{REG_NAME[n.regulation]}</Text>
                <Text style={{ flex: 1, fontSize: 7.8 }}>
                  {clean(n.viaDora ? tr('Notifié au titre de DORA', 'Reported under DORA') : `${n.authority.split(' (')[0].split(',')[0]} · ${tr('dès', 'from')} ${n.steps[0].delay.replace('*', '')}`)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Arbitrages, à compléter en séance */}
        <View wrap={false}>
          <H2>{tr('Arbitrages du comité', 'Committee decisions')}</H2>
          <View style={[S.row, { borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingBottom: 3 }]}>
            {[tr('N°', 'No.'), tr('Décision prise', 'Decision taken'), tr('Porteur', 'Owner'), tr('Échéance', 'Due date')].map((h, i) => (
              <Text key={h} style={[S.label, { width: ['8%', '56%', '18%', '18%'][i] }]}>{clean(h)}</Text>
            ))}
          </View>
          {d.decisions.slice(0, 4).map((_, i) => (
            <View key={i} style={[S.row, { height: 22, borderBottomWidth: 0.5, borderBottomColor: C.rule, alignItems: 'center' }]}>
              <Text style={[S.small, S.muted, { width: '8%' }]}>{i + 1}</Text>
            </View>
          ))}
          <Text style={[S.small, S.muted, { marginTop: 5, fontSize: 7.2 }]}>
            {clean(tr('Date du comité : ____________________    Présenté par : ____________________', 'Committee date: ____________________    Presented by: ____________________'))}
          </Text>
        </View>

        <Text style={[S.small, S.muted, { marginTop: 10, fontSize: 7 }]}>
          {clean(
            tr(
              "Établie à partir des éléments déclarés et de l'état du droit à la date indiquée. Elle ne remplace ni l'analyse d'un conseil, ni la position de l'autorité compétente. Détail, fondements et méthode : rapport de cadrage complet.",
              'Prepared from the information provided and the law as of the date shown. It replaces neither advice from counsel nor the position of the competent authority. Details, legal bases and method: full scoping report.',
            ),
          )}
        </Text>
      </ReportPage>
    </Document>
  )
}
