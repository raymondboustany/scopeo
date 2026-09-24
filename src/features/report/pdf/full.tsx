import { CORPUS_DATE_LONG } from '@/data/meta'
import { Fragment } from 'react'
import { Document, Text, View } from '@react-pdf/renderer'
import type { ReportData } from '../reportData'
import { RECYF_VERSION } from '../reportData'
import { COLON, LANG, tr } from '@/i18n'
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
  IsoCertBadge,
  S,
  StackedBar,
  Table,
} from './kit'

/**
 * Rapport de cadrage complet, pour le comité, le conseil ou l'équipe projet.
 *
 * Il expose ce que la note de synthèse résume : le fondement de chaque verdict, le
 * périmètre retenu, l'état de couverture, les points de friction entre textes,
 * le plan de traitement et la préparation au signalement.
 */
export function FullReport({ d }: { d: ReportData }) {
  const cov = d.coverage
  const title = tr('Rapport de cadrage réglementaire', 'Regulatory scoping report')
  // Numérotation calculée d'avance : la section des frictions n'existe que
  // si les textes applicables divergent réellement.
  const order = ['qualif', 'perim', 'couv', ...(d.frictions.length > 0 ? ['frict'] : []), 'plan', 'signal', 'echeancier', ...(d.notes.length > 0 ? ['journal'] : []), 'methode']
  const sec = (k: string) => String(order.indexOf(k) + 1).padStart(2, '0')
  const gaps = d.items.filter((i) => i.coverage === 'absent' || i.coverage === 'partiel')

  return (
    <Document title={clean(`${title}${COLON}${d.entity.name}`)} author="Scopeo" language={LANG}>
      <ReportPage title={title} entity={d.entity.name}>
        <DocHeader
          kind={tr('Rapport complet', 'Full report')}
          title={title}
          entity={d.entity.name}
          meta={[d.entity.sector ?? '', ...missionMeta(d.profile, d.entity.name), tr(`Établi le ${dateFr(d.generatedAt)}`, `Prepared on ${dateFr(d.generatedAt)}`)]}
        />
        <MissionContext d={d} />

        {/* Synthèse ----------------------------------------------------- */}
        <H2>{tr('Synthèse', 'Summary')}</H2>
        {d.iso?.certified ? (
          <View style={{ marginBottom: 8 }}>
            <IsoCertBadge valid={d.iso.certificateValid} until={d.iso.profile.validUntil} />
          </View>
        ) : null}
        <Note>{d.headline}</Note>
        <View style={[S.row, { gap: 8, marginBottom: 10 }]}>
          <Kpi label={tr('Obligations', 'Obligations')} value={String(d.totals.obligations)} note={tr(`${d.totals.requirements} exigences élémentaires`, `${d.totals.requirements} elementary requirements`)} />
          <Kpi label={tr('Exigences unifiées', 'Unified requirements')} value={String(cov.themes)} note={tr(`dont ${cov.evaluated} évaluées`, `${cov.evaluated} assessed`)} />
          <Kpi label={tr('Couverture', 'Coverage')} value={pct(cov.score)} note={tr('partiel compté pour moitié', 'partial counts for half')} tone={C.accent} />
          <Kpi label={tr('Sanction maximale', 'Maximum penalty')} value={d.maxExposure ? eur(d.maxExposure.eur) : tr('n.c.', 'n/a')} note={d.maxExposure ? tr(`Plafond ${REG_NAME[d.maxExposure.regulation]}`, `${REG_NAME[d.maxExposure.regulation]} cap`) : ''} />
        </View>
        <View style={[S.row, { gap: 18 }]} wrap={false}>
          <Ring value={cov.score} size={92} label={tr('couverture globale', 'overall coverage')} />
          <View style={{ flex: 1 }}>
            <H3>{tr('Couverture par texte', 'Coverage by text')}</H3>
            {cov.byRegulation.map((r) => (
              <BarRow key={r.regulation} label={REG_NAME[r.regulation]} value={r.score} color={REG_HEX[r.regulation]} labelWidth={66} />
            ))}
            <H3>{tr('Répartition par texte', 'Breakdown by text')}</H3>
            {cov.byRegulation.map((r) => (
              <StackedBar key={r.regulation} label={REG_NAME[r.regulation]} dist={r.distribution} labelWidth={66} />
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
                      <H2 n={sec('qualif')}>{tr('Qualification au regard de chaque texte', 'Scoping against each text')}</H2>
                      <P>
                        {tr(
                          "Chaque verdict est accompagné des conditions d'application examinées. Les réserves signalent ce qui reste à confirmer hors de la plateforme ; les montants sont les plafonds légaux, valorisés sur le chiffre d'affaires déclaré.",
                          'Each verdict comes with the conditions of application examined. Caveats flag what remains to be confirmed outside the platform; amounts are the legal caps, applied to the declared turnover.',
                        )}
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
                {v.qualification ? clean(` · ${v.qualification}`) : ''}
              </Text>
            </View>
                </>
              }
              cols={[
                { title: tr('Fondement', 'Legal basis'), width: '20%' },
                { title: tr('Condition examinée', 'Condition examined'), width: '64%' },
                { title: tr('État', 'Status'), width: '16%', align: 'right' },
              ]}
              rows={v.basis.map((b) => [
                <Text key="a" style={{ fontSize: 7.5, color: C.ink3 }}>{clean(b.article)}</Text>,
                <View key="b">
                  <Text style={[S.bold, { fontSize: 8 }]}>{clean(b.label)}</Text>
                  <Text style={[S.small, { fontSize: 7.5 }]}>{clean(b.detail)}</Text>
                </View>,
                <Text key="c" style={{ fontSize: 7.8, color: b.met ? C.positive : C.ink3 }}>{b.met ? tr('Remplie', 'Met') : tr('Non remplie', 'Not met')}</Text>,
              ])}
            />
            {v.exposure || v.caveats.length > 0 ? (
              <View wrap={false} style={{ paddingLeft: 7 }}>
                {v.exposure ? (
                  <Text style={[S.small, { marginBottom: 2 }]}>
                    <Text style={S.bold}>{tr('Exposition : ', 'Exposure: ')}</Text>
                    {clean(`${v.exposure.maxEur ? eur(v.exposure.maxEur) : tr('régime national', 'national regime')}. ${v.exposure.formula}`)}
                  </Text>
                ) : null}
                {v.caveats.map((c, i) => (
                  <Text key={i} style={[S.small, { color: C.caution }]}>
                    {clean(`${tr('Réserve', 'Caveat')}${COLON}${c}`)}
                  </Text>
                ))}
              </View>
            ) : null}
            <View style={{ height: 6 }} />
          </Fragment>
        ))}

        {/* 2. Périmètre --------------------------------------------------- */}
        <Table
          lead={<H2 n={sec('perim')}>{tr("Périmètre d'obligations retenu", 'Obligations in scope')}</H2>}
          cols={[
            { title: tr('Texte', 'Text'), width: '34%' },
            { title: tr('Obligations retenues', 'Obligations kept'), width: '22%', align: 'right' },
            { title: tr('Exigences élémentaires', 'Elementary requirements'), width: '24%', align: 'right' },
            { title: tr('Écartées', 'Excluded'), width: '20%', align: 'right' },
          ]}
          rows={[
            ...d.perimeter.map((p) => [<RegTag key="r" id={p.regulation} />, String(p.kept), String(p.requirements), String(p.excluded)]),
            [
              <Text key="t" style={[S.bold, { fontSize: 8 }]}>{tr('Total', 'Total')}</Text>,
              <Text key="a" style={[S.bold, { fontSize: 8 }]}>{d.totals.obligations}</Text>,
              <Text key="b" style={[S.bold, { fontSize: 8 }]}>{d.totals.requirements}</Text>,
              <Text key="c" style={[S.bold, { fontSize: 8 }]}>{d.totals.excluded}</Text>,
            ],
          ]}
        />
        {d.doraPrevails ? (
          <P>
            {tr(
              'Entité financière : DORA remplace les obligations de gestion des risques et de notification de NIS2 (article 4 de NIS2). Les obligations correspondantes de NIS2 sont comptées comme écartées.',
              "Financial entity: DORA replaces NIS2's risk-management and notification obligations (Article 4 of NIS2). The corresponding NIS2 obligations are counted as excluded.",
            )}
          </P>
        ) : null}
        {d.measures ? (
          <P>
            {tr(
              `Exigences NIS2 détaillées par le ReCyF (v${RECYF_VERSION}, ANSSI, document de travail) : ${d.measures.total} mesures attendues, dont ${d.measures.en_place} en place, ${d.measures.partiel} partielles et ${d.measures.absent} absentes.`,
              `NIS2 requirements detailed by the ReCyF (v${RECYF_VERSION}, ANSSI, working document): ${d.measures.total} measures expected, ${d.measures.en_place} in place, ${d.measures.partiel} partial and ${d.measures.absent} missing.`,
            )}
          </P>
        ) : null}

        {/* 3. Couverture --------------------------------------------------- */}
        <Keep>
        <H2 n={sec('couv')}>{tr('État de couverture déclaré', 'Reported coverage')}</H2>
        <View style={[S.row, { gap: 20 }]}>
          <View style={{ flex: 1 }}>
            <H3>{tr('Par domaine', 'By domain')}</H3>
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
            <H3>{tr('Ensemble', 'Overall')}</H3>
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
        {d.iso ? (
          <P>
            {tr(
              `Démarche ISO/IEC 27001 déclarée : ${d.iso.profile.status === 'certifie' ? 'certifiée' : d.iso.profile.status === 'conforme' ? 'conforme sans certification' : d.iso.profile.status === 'partiel' ? 'partielle' : 'aucune'}${d.iso.profile.perimeter === 'partiel' ? ', sur une partie seulement du périmètre (pré-remplissage désactivé)' : ''}. ${d.iso.controlsAssessed} contrôles de l'annexe A renseignés ; ${d.iso.prefilled} exigence${d.iso.prefilled > 1 ? 's' : ''} unifiée${d.iso.prefilled > 1 ? 's' : ''} pré-remplie${d.iso.prefilled > 1 ? 's' : ''} à partir des contrôles mis en œuvre${d.iso.exclusions > 0 ? ` ; ${d.iso.exclusions} exigence${d.iso.exclusions > 1 ? 's' : ''} obligatoire${d.iso.exclusions > 1 ? 's' : ''} dont le contrôle correspondant a été exclu de la démarche` : ''}.`,
              `Declared ISO/IEC 27001 status: ${d.iso.profile.status === 'certifie' ? 'certified' : d.iso.profile.status === 'conforme' ? 'compliant, not certified' : d.iso.profile.status === 'partiel' ? 'partial' : 'none'}${d.iso.profile.perimeter === 'partiel' ? ', covering only part of the scope (pre-filling turned off)' : ''}. ${d.iso.controlsAssessed} Annex A controls filled in; ${d.iso.prefilled} unified requirement${d.iso.prefilled > 1 ? 's' : ''} pre-filled from implemented controls${d.iso.exclusions > 0 ? `; ${d.iso.exclusions} mandatory requirement${d.iso.exclusions > 1 ? 's' : ''} whose matching control was excluded from the initiative` : ''}.`,
            )}
          </P>
        ) : null}
        {gaps.length > 0 ? (
          <>
            <Table
              lead={<H3 aside={tr(`${gaps.length} exigences`, `${gaps.length} requirements`)}>{tr('Écarts constatés', 'Gaps observed')}</H3>}
              cols={[
                { title: tr('Rang', 'Rank'), width: '7%' },
                { title: tr('Exigence unifiée', 'Unified requirement'), width: d.tracking ? '43%' : '55%' },
                { title: tr('Textes', 'Texts'), width: d.tracking ? '22%' : '25%' },
                { title: tr('Niveau', 'Level'), width: '13%' },
                ...(d.tracking ? [{ title: tr('Porteur', 'Owner'), width: '15%' }] : []),
              ]}
              rows={gaps.map((g) => [
                String(g.rank),
                clean(g.theme.title),
                clean(g.regulations.map((r) => REG_NAME[r]).join(' · ')),
                <LevelTag key="l" level={g.coverage} />,
                ...(d.tracking ? [clean(g.owner ?? tr('à désigner', 'to assign'))] : []),
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
                    <H2 n={sec('frict')}>{tr('Points de friction entre textes', 'Friction points between texts')}</H2>
                    <P>
                      {tr(
                        "Sur ces sujets, les textes applicables ne se recouvrent pas : ils divergent, ou l'un prime sur l'autre. Une lecture texte par texte y conduit à une erreur de dimensionnement.",
                        'On these subjects, the applicable texts do not overlap: they diverge, or one prevails over the other. Reading them text by text leads to mis-sizing.',
                      )}
                    </P>
                  </>
                ) : null}
              <View style={{ borderLeftWidth: 2, borderLeftColor: f.relation === tr('Divergence', 'Divergence') ? C.critical : C.caution, paddingLeft: 8, marginBottom: 7 }}>
                <Text style={[S.bold, { fontSize: 9 }]}>
                  {clean(f.title)}
                  <Text style={{ fontFamily: 'Helvetica', fontSize: 7.5, color: C.ink3 }}>{`   ${f.code} · ${f.relation}`}</Text>
                </Text>
                <Text style={[S.small, { marginTop: 1.5 }]}>{clean(f.summary)}</Text>
                {f.rule ? <Text style={[S.small, { marginTop: 1.5, color: C.ink }]}>{clean(`${tr('Règle retenue', 'Rule applied')}${COLON}${f.rule}`)}</Text> : null}
              </View>
              </View>
            ))}
          </>
        ) : null}

        {/* 5. Plan --------------------------------------------------------- */}
        <Keep>
        <H2 n={sec('plan')}>{tr('Plan de traitement', 'Treatment plan')}</H2>
        <P>
          {tr(
            `L'ordre résulte d'une pondération explicite (${d.weights.map((w) => `${w.label.toLowerCase()} ${w.value}`).join(', ')}), corrigée des antériorités techniques. Les horizons sont indicatifs ; c'est la séquence qui engage.`,
            `The order results from an explicit weighting (${d.weights.map((w) => `${w.label.toLowerCase()} ${w.value}`).join(', ')}), adjusted for technical prerequisites. Horizons are indicative; the sequence is what commits.`,
          )}
        </P>
        <H3>{tr('Priorité et charge de chaque exigence', 'Priority and effort of each requirement')}</H3>
        <PriorityScatter items={d.items.map((i) => ({ rank: i.rank, score: i.score, effort: i.theme.effort, wave: i.wave }))} />
        </Keep>
        {d.waves.map((w) => (
          <Fragment key={w.n}>
            <Table
              lead={
                <>
                  <H3 aside={tr(`${w.horizon} · ${w.items.length} exigence${w.items.length > 1 ? 's' : ''}`, `${w.horizon} · ${w.items.length} requirement${w.items.length > 1 ? 's' : ''}`)}>{w.label}</H3>
                  <Text style={[S.small, S.muted, { marginBottom: 3 }]}>{clean(w.intent)}</Text>
                </>
              }
              cols={[
                { title: tr('Rang', 'Rank'), width: '7%' },
                { title: tr('Exigence et action attendue', 'Requirement and expected action'), width: '53%' },
                { title: tr('Textes', 'Texts'), width: '18%' },
                { title: tr('Aujourd’hui', 'Today'), width: '12%' },
                { title: tr('Charge', 'Effort'), width: '10%', align: 'right' },
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
          lead={<H2 n={sec('signal')}>{tr('Préparation au signalement', 'Reporting readiness')}</H2>}
          cols={[
            { title: tr('Texte', 'Text'), width: '15%' },
            { title: tr('Autorité', 'Authority'), width: '29%' },
            { title: tr('Étapes et délais', 'Steps and deadlines'), width: '56%' },
          ]}
          rows={d.notification.map((nt) => [
            <RegTag key="r" id={nt.regulation} />,
            clean(nt.viaDora ? tr('Notifié au titre de DORA', 'Reported under DORA') : nt.authority),
            clean(nt.viaDora ? tr('Article 4 de NIS2 : DORA prime pour une entité financière.', 'Article 4 of NIS2: DORA prevails for a financial entity.') : nt.steps.map((s) => `${s.step} ${s.delay}`).join('  ·  ')),
          ])}
        />
        {d.notification.some((nt) => nt.regulation === 'DORA') ? (
          <Text style={[S.small, S.muted, { fontSize: 7.2, marginBottom: 5 }]}>
            {clean(tr('* DORA : 4 h après la classification comme incident majeur, et au plus tard 24 h après la détection (règlement délégué 2025/301).', '* DORA: 4 h after classification as a major incident, and no later than 24 h after detection (Delegated Regulation 2025/301).'))}
          </Text>
        ) : null}
        <View style={[S.row, { gap: 16 }]} wrap={false}>
          <View style={{ flex: 1 }}>
            <H3>{tr('État de préparation', 'Readiness')}</H3>
            {d.readiness.map((r) => (
              <View key={r.label} style={[S.row, { gap: 5, marginBottom: 3 }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 2.5, backgroundColor: r.ok ? C.positive : C.caution }} />
                <Text style={{ flex: 1, fontSize: 8 }}>{clean(r.label)}</Text>
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <H3>{tr("Chaîne d'escalade", 'Escalation chain')}</H3>
            {d.contacts.length === 0 ? (
              <Text style={[S.small, { color: C.caution }]}>{tr('Aucun contact renseigné.', 'No contact entered.')}</Text>
            ) : (
              d.contacts.map((c, i) => (
                <Text key={i} style={{ fontSize: 8, marginBottom: 3 }}>
                  <Text style={S.bold}>{`${i + 1}. ${clean(c.role)}`}</Text>
                  {clean(` : ${c.name}${c.title ? `, ${c.title}` : ''}`)}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* 7. Échéancier -------------------------------------------------- */}
        {d.upcoming.length > 0 ? (
          <Table
            lead={<H2 n={sec('echeancier')}>{tr('Échéancier', 'Timeline')}</H2>}
            cols={[
              { title: tr('Date', 'Date'), width: '17%' },
              { title: tr('Texte', 'Text'), width: '15%' },
              { title: tr('Jalon', 'Milestone'), width: '68%' },
            ]}
            rows={d.upcoming.map((m) => [
              clean(dateFr(m.date)),
              m.regulation === 'TRANSVERSE' ? tr('Transverse', 'Cross-cutting') : <RegTag key="r" id={m.regulation} />,
              <View key="j">
                <Text style={[S.bold, { fontSize: 8 }]}>{clean(m.title)}</Text>
                <Text style={[S.small, { fontSize: 7.3 }]}>{clean(m.detail)}</Text>
              </View>,
            ])}
          />
        ) : (
          <Keep>
            <H2 n={sec('echeancier')}>{tr('Échéancier', 'Timeline')}</H2>
            <P>{tr("Aucun jalon à venir ne concerne l'entité.", 'No upcoming milestone concerns the entity.')}</P>
          </Keep>
        )}
        {d.duties.length > 0 ? (
          <>
            <Table
              lead={<H3>{tr('Charges récurrentes', 'Recurring duties')}</H3>}
              cols={[
                { title: tr('Texte', 'Text'), width: '15%' },
                { title: tr('Obligation', 'Obligation'), width: '57%' },
                { title: tr('Fréquence', 'Frequency'), width: '28%' },
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
                        <H2 n={sec('journal')}>{tr("Journal d'entretien", 'Interview log')}</H2>
                        <P>{tr('Points relevés pendant le cadrage. Les vérifications et preuves listées restent ouvertes à la date du rapport.', 'Points raised during scoping. The checks and evidence listed remain open as of the report date.')}</P>
                      </>
                    ) : null}
                    <H3 aside={`${d.notes.filter((n) => n.tag === t).length}`}>{NOTE_TITLE[t]}</H3>
                  </>
                }
                cols={[
                  { title: tr('Objet', 'Subject'), width: '32%' },
                  { title: tr('Note', 'Note'), width: '68%' },
                ]}
                rows={d.notes
                  .filter((n) => n.tag === t)
                  .map((n) => [<Text key="a" style={{ fontSize: 7.6, color: C.ink3 }}>{clean(n.anchor.kind === 'general' ? tr('Général', 'General') : n.anchor.label)}</Text>, clean(n.text)])}
              />
            ))
          : null}

        {/* 8. Méthode ------------------------------------------------------ */}
        <View wrap={false}>
          <H2 n={sec('methode')}>{tr('Méthode, réserves et sources', 'Method, caveats and sources')}</H2>
          <P>
            {tr(
              "Nature du document : un livrable de cadrage. Il établit un périmètre probable et un ordre de traitement ; il ne constitue ni un audit de conformité, ni un avis juridique. Les conclusions reposent sur les éléments déclarés, dont l'exactitude n'est pas vérifiée.",
              'Nature of the document: a scoping deliverable. It establishes a likely scope and a treatment order; it is neither a compliance audit nor legal advice. Conclusions rely on the information provided, whose accuracy is not verified.',
            )}
          </P>
          <P>
            {tr(
              "Qualifications relevant d'un tiers : la désignation comme entité critique (article 3 § 1 f de NIS2), l'identification pour les tests de pénétration fondés sur la menace (DORA) et l'inscription sur la liste nationale des entités essentielles et importantes relèvent des autorités compétentes.",
              'Qualifications for a third party to decide: designation as a critical entity (Article 3(1)(f) NIS2), identification for threat-led penetration testing (DORA) and listing as an essential or important entity are for the competent authorities.',
            )}
          </P>
          <P>
            {tr(
              `État du droit arrêté au ${CORPUS_DATE_LONG} : NIS2 n'est pas transposée en France ; ses exigences sont détaillées par le ReCyF, document de travail de l'ANSSI. Le CRA impose la déclaration des vulnérabilités activement exploitées depuis le 11 septembre 2026 et s'applique pleinement le 11 décembre 2027. L'AI Act s'applique par paliers ; l'Omnibus IA a reporté les systèmes à haut risque au 2 décembre 2027 (annexe III) et au 2 août 2028 (annexe I).`,
              `Law as of ${CORPUS_DATE_LONG}: NIS2 has not been transposed in France; its requirements are detailed by the ReCyF, an ANSSI working document. The CRA has required reporting of actively exploited vulnerabilities since 11 September 2026 and fully applies on 11 December 2027. The AI Act applies in stages; the AI Omnibus postponed high-risk systems to 2 December 2027 (Annex III) and 2 August 2028 (Annex I).`,
            )}
          </P>
        <H3>{tr('Sources', 'Sources')}</H3>
        {[
          ...d.verdicts.map((v) => `${v.reference}${COLON}${v.name}`),
          tr('Règlement délégué (UE) 2025/301 : notification des incidents majeurs liés aux TIC', 'Delegated Regulation (EU) 2025/301: reporting of major ICT-related incidents'),
          tr('Règlement (UE) 2026/1744 : Omnibus numérique sur l’IA', 'Regulation (EU) 2026/1744: Digital Omnibus on AI'),
          tr(`Référentiel Cyber France (ReCyF) v${RECYF_VERSION} : ANSSI, 17 mars 2026`, `French cyber framework (ReCyF) v${RECYF_VERSION}: ANSSI, 17 March 2026`),
        ].map((s) => (
          <Text key={s} style={[S.small, { marginBottom: 1.5 }]}>
            {clean(`· ${s}`)}
          </Text>
        ))}
        </View>
      </ReportPage>
    </Document>
  )
}

const NOTE_ORDER = ['verifier', 'preuve', 'hypothese', 'decision', 'note'] as const
const NOTE_TITLE: Record<string, string> = {
  verifier: tr('Points à vérifier', 'Points to check'),
  preuve: tr('Preuves demandées', 'Evidence requested'),
  hypothese: tr('Hypothèses retenues', 'Assumptions made'),
  decision: tr('Décisions prises', 'Decisions taken'),
  note: tr('Observations', 'Observations'),
}

/** Contexte de la mission : repris de la fiche entité, seulement ce qui est renseigné. */
function MissionContext({ d }: { d: ReportData }) {
  const p = d.profile
  const period = p.startDate || p.reportDate ? [p.startDate ? dateFr(p.startDate) : '…', p.reportDate ? dateFr(p.reportDate) : '…'].join(' → ') : ''
  const rows: [string, string][] = (
    [
      [p.mode === 'interne' ? tr('Projet', 'Project') : tr('Mission', 'Engagement'), p.missionRef ?? ''],
      [tr('Objectif', 'Objective'), p.objective ?? ''],
      [tr('Période', 'Period'), period],
      [p.mode === 'interne' ? tr('Pilote', 'Lead') : tr('Consultant', 'Consultant'), p.lead ?? ''],
      [tr('Commanditaire', 'Sponsor'), p.sponsor ?? ''],
      [tr('Groupe', 'Group'), p.group ?? ''],
      [tr('Périmètre', 'Scope'), d.entity.scopeNote],
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
          <Text style={[S.label, { width: 92, paddingTop: 1 }]}>{p.mode === 'interne' ? tr('Équipe', 'Team') : tr('Interlocuteurs', 'Contacts')}</Text>
          <Text style={{ flex: 1, fontSize: 8.6, color: C.ink2, lineHeight: 1.4 }}>
            {clean(people.map((s) => `${s.name}${s.role ? ` (${s.role})` : ''}`).join(' · '))}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
