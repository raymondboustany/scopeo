import { CORPUS_DATE_LONG } from '@/data/meta'
import { Fragment } from 'react'
import { Document, Text, View } from '@react-pdf/renderer'
import type { ReportData } from '../reportData'
import { RECYF_VERSION } from '../reportData'
import {
  BarRow,
  C,
  clean,
  dateFr,
  DocHeader,
  eur,
  H2,
  H3,
  Keep,
  Kpi,
  Legend,
  missionMeta,
  LevelTag,
  Note,
  P,
  pct,
  PriorityScatter,
  REG_HEX,
  REG_NAME,
  RegTag,
  ReportPage,
  Ring,
  S,
  StackedBar,
  Table,
} from './kit'

/**
 * Rapport de cadrage complet — pour le comité, le conseil ou l'équipe projet.
 *
 * Il expose ce que la note COMEX résume : le fondement de chaque verdict, le
 * périmètre retenu, l'état de couverture, les points de friction entre textes,
 * le plan de traitement et la préparation au signalement.
 */
export function FullReport({ d }: { d: ReportData }) {
  const cov = d.coverage
  const title = 'Rapport de cadrage réglementaire'
  // Numérotation calculée d'avance : la section des frictions n'existe que
  // si les textes applicables divergent réellement.
  const order = ['qualif', 'perim', 'couv', ...(d.frictions.length > 0 ? ['frict'] : []), 'plan', 'signal', 'echeancier', ...(d.notes.length > 0 ? ['journal'] : []), 'methode']
  const sec = (k: string) => String(order.indexOf(k) + 1).padStart(2, '0')
  const gaps = d.items.filter((i) => i.coverage === 'absent' || i.coverage === 'partiel')

  return (
    <Document title={clean(`${title} — ${d.entity.name}`)} author="Scopeo" language="fr">
      <ReportPage title={title} entity={d.entity.name}>
        <DocHeader
          kind="Rapport complet"
          title={title}
          entity={d.entity.name}
          meta={[d.entity.sector ?? '', ...missionMeta(d.profile, d.entity.name), `Établi le ${dateFr(d.generatedAt)}`]}
        />
        <MissionContext d={d} />

        {/* Synthèse ----------------------------------------------------- */}
        <H2>Synthèse</H2>
        <Note>{d.headline}</Note>
        <View style={[S.row, { gap: 8, marginBottom: 10 }]}>
          <Kpi label="Obligations" value={String(d.totals.obligations)} note={`${d.totals.requirements} exigences élémentaires`} />
          <Kpi label="Exigences unifiées" value={String(cov.themes)} note={`dont ${cov.evaluated} évaluées`} />
          <Kpi label="Couverture" value={pct(cov.score)} note="partiel compté pour moitié" tone={C.accent} />
          <Kpi label="Sanction maximale" value={d.maxExposure ? eur(d.maxExposure.eur) : '—'} note={d.maxExposure ? `Plafond ${REG_NAME[d.maxExposure.regulation]}` : ''} />
        </View>
        <View style={[S.row, { gap: 18 }]} wrap={false}>
          <Ring value={cov.score} size={92} label="couverture globale" />
          <View style={{ flex: 1 }}>
            <H3>Couverture par texte</H3>
            {cov.byRegulation.map((r) => (
              <BarRow key={r.regulation} label={REG_NAME[r.regulation]} value={r.score} color={REG_HEX[r.regulation]} labelWidth={46} />
            ))}
            <H3>Répartition par texte</H3>
            {cov.byRegulation.map((r) => (
              <StackedBar key={r.regulation} label={REG_NAME[r.regulation]} dist={r.distribution} labelWidth={46} />
            ))}
            <Legend />
          </View>
        </View>

        {/* 1. Qualification ------------------------------------------- */}
        {d.verdicts.map((v, vi) => (
          <Fragment key={v.regulation}>
            <Table
              zebra={false}
              lead={
                <>
                  {vi === 0 ? (
                    <>
                      <H2 n={sec('qualif')}>Qualification au regard de chaque texte</H2>
                      <P>
                        Chaque verdict est accompagné des conditions d'application examinées. Les réserves signalent ce qui reste à confirmer
                        hors de l'outil ; les montants sont les plafonds légaux, valorisés sur le chiffre d'affaires déclaré.
                      </P>
                    </>
                  ) : null}
            <View
              style={[S.row, { justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.wash, paddingVertical: 5, paddingHorizontal: 7, borderLeftWidth: 2.5, borderLeftColor: v.applies ? REG_HEX[v.regulation] : C.rule2 }]}
            >
              <Text style={[S.bold, { fontSize: 9.5 }]}>
                {REG_NAME[v.regulation]}
                <Text style={{ fontFamily: 'Helvetica', color: C.ink3, fontSize: 8 }}>{`   ${clean(v.reference)}`}</Text>
              </Text>
              <Text style={{ fontSize: 8.5 }}>
                <Text style={S.bold}>{clean(v.status)}</Text>
                {v.qualification ? clean(` — ${v.qualification}`) : ''}
              </Text>
            </View>
                </>
              }
              cols={[
                { title: 'Fondement', width: '20%' },
                { title: 'Condition examinée', width: '64%' },
                { title: 'État', width: '16%', align: 'right' },
              ]}
              rows={v.basis.map((b) => [
                <Text key="a" style={{ fontSize: 7.5, color: C.ink3 }}>{clean(b.article)}</Text>,
                <View key="b">
                  <Text style={[S.bold, { fontSize: 8 }]}>{clean(b.label)}</Text>
                  <Text style={[S.small, { fontSize: 7.5 }]}>{clean(b.detail)}</Text>
                </View>,
                <Text key="c" style={{ fontSize: 7.8, color: b.met ? C.positive : C.ink3 }}>{b.met ? 'Remplie' : 'Non remplie'}</Text>,
              ])}
            />
            {v.exposure || v.caveats.length > 0 ? (
              <View wrap={false} style={{ paddingLeft: 7 }}>
                {v.exposure ? (
                  <Text style={[S.small, { marginBottom: 2 }]}>
                    <Text style={S.bold}>Exposition : </Text>
                    {clean(`${v.exposure.maxEur ? eur(v.exposure.maxEur) : 'régime national'} — ${v.exposure.formula}`)}
                  </Text>
                ) : null}
                {v.caveats.map((c, i) => (
                  <Text key={i} style={[S.small, { color: C.caution }]}>
                    {clean(`Réserve : ${c}`)}
                  </Text>
                ))}
              </View>
            ) : null}
            <View style={{ height: 6 }} />
          </Fragment>
        ))}

        {/* 2. Périmètre --------------------------------------------------- */}
        <Table
          lead={<H2 n={sec('perim')}>Périmètre d'obligations retenu</H2>}
          cols={[
            { title: 'Texte', width: '34%' },
            { title: 'Obligations retenues', width: '22%', align: 'right' },
            { title: 'Exigences élémentaires', width: '24%', align: 'right' },
            { title: 'Écartées', width: '20%', align: 'right' },
          ]}
          rows={[
            ...d.perimeter.map((p) => [<RegTag key="r" id={p.regulation} />, String(p.kept), String(p.requirements), String(p.excluded)]),
            [
              <Text key="t" style={[S.bold, { fontSize: 8 }]}>Total</Text>,
              <Text key="a" style={[S.bold, { fontSize: 8 }]}>{d.totals.obligations}</Text>,
              <Text key="b" style={[S.bold, { fontSize: 8 }]}>{d.totals.requirements}</Text>,
              <Text key="c" style={[S.bold, { fontSize: 8 }]}>{d.totals.excluded}</Text>,
            ],
          ]}
        />
        {d.doraPrevails ? (
          <P>
            Entité financière : DORA remplace les obligations de gestion des risques et de notification de NIS 2 (article 4 de NIS 2). Les
            obligations correspondantes de NIS 2 sont comptées comme écartées.
          </P>
        ) : null}
        {d.measures ? (
          <P>{`Détail d'implémentation de l'ANSSI (ReCyF v${RECYF_VERSION}) : ${d.measures.total} mesures attendues, dont ${d.measures.en_place} en place, ${d.measures.partiel} partielles et ${d.measures.absent} absentes.`}</P>
        ) : null}

        {/* 3. Couverture --------------------------------------------------- */}
        <Keep>
        <H2 n={sec('couv')}>État de couverture déclaré</H2>
        <View style={[S.row, { gap: 20 }]}>
          <View style={{ flex: 1 }}>
            <H3>Par domaine</H3>
            {cov.byDomain.map((dm) => (
              <BarRow
                key={dm.label}
                label={dm.label}
                value={dm.score}
                color={dm.score >= 0.75 ? C.positive : dm.score >= 0.4 ? C.caution : C.critical}
                labelWidth={78}
              />
            ))}
          </View>
          <View style={{ width: 170 }}>
            <H3>Ensemble</H3>
            <StackedBar dist={cov.distribution} labelWidth={0} />
            {(['en_place', 'partiel', 'absent', 'non_evalue'] as const).map((k) => (
              <View key={k} style={[S.row, { justifyContent: 'space-between', marginTop: 3 }]}>
                <LevelTag level={k} />
                <Text style={[S.bold, { fontSize: 8 }]}>{cov.distribution[k]}</Text>
              </View>
            ))}
          </View>
        </View>
        </Keep>
        {gaps.length > 0 ? (
          <>
            <Table
              lead={<H3 aside={`${gaps.length} exigences`}>Écarts constatés</H3>}
              cols={[
                { title: 'Rang', width: '7%' },
                { title: 'Exigence unifiée', width: d.tracking ? '43%' : '55%' },
                { title: 'Textes', width: d.tracking ? '22%' : '25%' },
                { title: 'Niveau', width: '13%' },
                ...(d.tracking ? [{ title: 'Porteur', width: '15%' }] : []),
              ]}
              rows={gaps.map((g) => [
                String(g.rank),
                clean(g.theme.title),
                clean(g.regulations.map((r) => REG_NAME[r]).join(' · ')),
                <LevelTag key="l" level={g.coverage} />,
                ...(d.tracking ? [clean(g.owner ?? '—')] : []),
              ])}
            />
          </>
        ) : null}

        {/* 4. Frictions ------------------------------------------------------ */}
        {d.frictions.length > 0 ? (
          <>
            {d.frictions.map((f, fi) => (
              <View key={f.code} wrap={false}>
                {fi === 0 ? (
                  <>
                    <H2 n={sec('frict')}>Points de friction entre textes</H2>
                    <P>
                      Sur ces sujets, les textes applicables ne se recouvrent pas : ils divergent, ou l'un prime sur l'autre. Une lecture texte
                      par texte y conduit à une erreur de dimensionnement.
                    </P>
                  </>
                ) : null}
              <View style={{ borderLeftWidth: 2, borderLeftColor: f.relation === 'Divergence' ? C.critical : C.caution, paddingLeft: 8, marginBottom: 7 }}>
                <Text style={[S.bold, { fontSize: 9 }]}>
                  {clean(f.title)}
                  <Text style={{ fontFamily: 'Helvetica', fontSize: 7.5, color: C.ink3 }}>{`   ${f.code} · ${f.relation}`}</Text>
                </Text>
                <Text style={[S.small, { marginTop: 1.5 }]}>{clean(f.summary)}</Text>
                {f.rule ? <Text style={[S.small, { marginTop: 1.5, color: C.ink }]}>{clean(`Règle retenue : ${f.rule}`)}</Text> : null}
              </View>
              </View>
            ))}
          </>
        ) : null}

        {/* 5. Plan --------------------------------------------------------- */}
        <Keep>
        <H2 n={sec('plan')}>Plan de traitement</H2>
        <P>
          {`L'ordre résulte d'une pondération explicite (${d.weights.map((w) => `${w.label.toLowerCase()} ${w.value}`).join(', ')}), corrigée des antériorités techniques. Les horizons sont indicatifs ; c'est la séquence qui engage.`}
        </P>
        <H3>Priorité et charge de chaque exigence</H3>
        <PriorityScatter items={d.items.map((i) => ({ rank: i.rank, score: i.score, effort: i.theme.effort, wave: i.wave }))} />
        </Keep>
        {d.waves.map((w) => (
          <Fragment key={w.n}>
            <Table
              lead={
                <>
                  <H3 aside={`${w.horizon} · ${w.items.length} exigence${w.items.length > 1 ? 's' : ''}`}>{w.label}</H3>
                  <Text style={[S.small, S.muted, { marginBottom: 3 }]}>{clean(w.intent)}</Text>
                </>
              }
              cols={[
                { title: 'Rang', width: '7%' },
                { title: 'Exigence et action attendue', width: '53%' },
                { title: 'Textes', width: '18%' },
                { title: 'Aujourd’hui', width: '12%' },
                { title: 'Charge', width: '10%', align: 'right' },
              ]}
              rows={w.items.map((it) => [
                String(it.rank),
                <View key="e">
                  <Text style={[S.bold, { fontSize: 8 }]}>{clean(it.theme.title)}</Text>
                  <Text style={[S.small, { fontSize: 7.3 }]}>{clean(it.theme.unifiedAction)}</Text>
                </View>,
                clean(it.regulations.map((r) => REG_NAME[r]).join(' · ')),
                <LevelTag key="l" level={it.coverage} />,
                `${it.theme.effort}/5`,
              ])}
            />
          </Fragment>
        ))}

        {/* 6. Signalement ------------------------------------------------ */}
        <Table
          lead={<H2 n={sec('signal')}>Préparation au signalement</H2>}
          cols={[
            { title: 'Texte', width: '11%' },
            { title: 'Autorité', width: '31%' },
            { title: 'Étapes et délais', width: '58%' },
          ]}
          rows={d.notification.map((nt) => [
            <RegTag key="r" id={nt.regulation} />,
            clean(nt.viaDora ? 'Notifié au titre de DORA' : nt.authority),
            clean(nt.viaDora ? 'Article 4 de NIS 2 : DORA prime pour une entité financière.' : nt.steps.map((s) => `${s.step} ${s.delay}`).join('  ·  ')),
          ])}
        />
        {d.notification.some((nt) => nt.regulation === 'DORA') ? (
          <Text style={[S.small, S.muted, { fontSize: 7.2, marginBottom: 5 }]}>
            {clean('* DORA : 4 h après la classification comme incident majeur, et au plus tard 24 h après la détection (règlement délégué 2025/301).')}
          </Text>
        ) : null}
        <View style={[S.row, { gap: 16 }]} wrap={false}>
          <View style={{ flex: 1 }}>
            <H3>État de préparation</H3>
            {d.readiness.map((r) => (
              <View key={r.label} style={[S.row, { gap: 5, marginBottom: 3 }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 2.5, backgroundColor: r.ok ? C.positive : C.caution }} />
                <Text style={{ flex: 1, fontSize: 8 }}>{clean(r.label)}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <H3>Chaîne d'escalade</H3>
            {d.contacts.length === 0 ? (
              <Text style={[S.small, { color: C.caution }]}>Aucun contact renseigné.</Text>
            ) : (
              d.contacts.map((c, i) => (
                <Text key={i} style={{ fontSize: 8, marginBottom: 3 }}>
                  <Text style={S.bold}>{`${i + 1}. ${clean(c.role)}`}</Text>
                  {clean(` — ${c.name}${c.title ? `, ${c.title}` : ''}`)}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* 7. Échéancier -------------------------------------------------- */}
        {d.upcoming.length > 0 ? (
          <Table
            lead={<H2 n={sec('echeancier')}>Échéancier</H2>}
            cols={[
              { title: 'Date', width: '17%' },
              { title: 'Texte', width: '12%' },
              { title: 'Jalon', width: '71%' },
            ]}
            rows={d.upcoming.map((m) => [
              clean(dateFr(m.date)),
              m.regulation === 'TRANSVERSE' ? 'Transverse' : <RegTag key="r" id={m.regulation} />,
              <View key="j">
                <Text style={[S.bold, { fontSize: 8 }]}>{clean(m.title)}</Text>
                <Text style={[S.small, { fontSize: 7.3 }]}>{clean(m.detail)}</Text>
              </View>,
            ])}
          />
        ) : (
          <Keep>
            <H2 n={sec('echeancier')}>Échéancier</H2>
            <P>Aucun jalon à venir ne concerne l'entité.</P>
          </Keep>
        )}
        {d.duties.length > 0 ? (
          <>
            <Table
              lead={<H3>Charges récurrentes</H3>}
              cols={[
                { title: 'Texte', width: '12%' },
                { title: 'Obligation', width: '60%' },
                { title: 'Fréquence', width: '28%' },
              ]}
              rows={d.duties.map((u) => [<RegTag key="r" id={u.regulation} />, clean(u.title), clean(u.cadence)])}
            />
          </>
        ) : null}

        {/* Journal d'entretien ------------------------------------------ */}
        {d.notes.length > 0
          ? NOTE_ORDER.filter((t) => d.notes.some((n) => n.tag === t)).map((t, ti) => (
              <Table
                key={t}
                lead={
                  <>
                    {ti === 0 ? (
                      <>
                        <H2 n={sec('journal')}>Journal d'entretien</H2>
                        <P>Points relevés pendant le cadrage. Les vérifications et preuves listées restent ouvertes à la date du rapport.</P>
                      </>
                    ) : null}
                    <H3 aside={`${d.notes.filter((n) => n.tag === t).length}`}>{NOTE_TITLE[t]}</H3>
                  </>
                }
                cols={[
                  { title: 'Objet', width: '32%' },
                  { title: 'Note', width: '68%' },
                ]}
                rows={d.notes
                  .filter((n) => n.tag === t)
                  .map((n) => [<Text key="a" style={{ fontSize: 7.6, color: C.ink3 }}>{clean(n.anchor.kind === 'general' ? 'Général' : n.anchor.label)}</Text>, clean(n.text)])}
              />
            ))
          : null}

        {/* 8. Méthode ------------------------------------------------------ */}
        <View wrap={false}>
          <H2 n={sec('methode')}>Méthode, réserves et sources</H2>
          <P>
            Nature du document : un outil de cadrage. Il établit un périmètre probable et un ordre de traitement ; il ne constitue ni un audit
            de conformité, ni un avis juridique. Les conclusions reposent sur les éléments déclarés, dont l'exactitude n'est pas vérifiée.
          </P>
          <P>
            Qualifications relevant d'un tiers : la désignation comme entité critique (article 3 § 1 f de NIS 2), l'identification pour les
            tests de pénétration fondés sur la menace (DORA) et l'inscription sur la liste nationale des entités essentielles et importantes
            relèvent des autorités compétentes.
          </P>
          <P>
            {`État du droit arrêté au ${CORPUS_DATE_LONG} : NIS 2 n'est pas transposée en France. Le CRA impose la déclaration des vulnérabilités activement exploitées depuis le 11 septembre 2026 et s'applique pleinement le 11 décembre 2027.`}
          </P>
        <H3>Sources</H3>
        {[
          ...d.verdicts.map((v) => `${v.reference} — ${v.name}`),
          'Règlement délégué (UE) 2025/301 — notification des incidents majeurs liés aux TIC',
          `Référentiel Cyber France (ReCyF) v${RECYF_VERSION} — ANSSI, 17 mars 2026`,
        ].map((s) => (
          <Text key={s} style={[S.small, { marginBottom: 1.5 }]}>
            {clean(`— ${s}`)}
          </Text>
        ))}
        </View>
      </ReportPage>
    </Document>
  )
}

const NOTE_ORDER = ['verifier', 'preuve', 'hypothese', 'decision', 'note'] as const
const NOTE_TITLE: Record<string, string> = {
  verifier: 'Points à vérifier',
  preuve: 'Preuves demandées',
  hypothese: 'Hypothèses retenues',
  decision: 'Décisions prises',
  note: 'Observations',
}

/** Contexte de la mission : repris de la fiche entité, seulement ce qui est renseigné. */
function MissionContext({ d }: { d: ReportData }) {
  const p = d.profile
  const period = p.startDate || p.reportDate ? [p.startDate ? dateFr(p.startDate) : '…', p.reportDate ? dateFr(p.reportDate) : '…'].join(' → ') : ''
  const rows: [string, string][] = (
    [
      [p.mode === 'interne' ? 'Projet' : 'Mission', p.missionRef ?? ''],
      ['Objectif', p.objective ?? ''],
      ['Période', period],
      [p.mode === 'interne' ? 'Pilote' : 'Consultant', p.lead ?? ''],
      ['Commanditaire', p.sponsor ?? ''],
      ['Groupe', p.group ?? ''],
      ['Périmètre', d.entity.scopeNote],
    ] as [string, string][]
  ).filter(([, v]) => v.trim())
  const people = (p.stakeholders ?? []).filter((s) => s.name.trim())
  if (rows.length === 0 && people.length === 0) return null
  return (
    <View wrap={false} style={{ marginBottom: 6 }}>
      {rows.map(([k, v]) => (
        <View key={k} style={[S.row, { marginBottom: 2.5 }]}>
          <Text style={[S.label, { width: 92, paddingTop: 1 }]}>{clean(k)}</Text>
          <Text style={{ flex: 1, fontSize: 8.6, color: C.ink2, lineHeight: 1.4 }}>{clean(v)}</Text>
        </View>
      ))}
      {people.length > 0 ? (
        <View style={[S.row, { marginTop: 2 }]}>
          <Text style={[S.label, { width: 92, paddingTop: 1 }]}>{p.mode === 'interne' ? 'Équipe' : 'Interlocuteurs'}</Text>
          <Text style={{ flex: 1, fontSize: 8.6, color: C.ink2, lineHeight: 1.4 }}>
            {clean(people.map((s) => `${s.name}${s.role ? ` (${s.role})` : ''}`).join(' · '))}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
