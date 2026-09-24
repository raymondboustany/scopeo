import { Document, Text, View } from '@react-pdf/renderer'
import type { ReportData } from '../reportData'
import { C, clean, dateFr, DocHeader, H2, Keep, missionMeta, Note, REG_HEX, REG_NAME, ReportPage, S, Table } from './kit'
import { COLON, LANG, tr } from '@/i18n'

/**
 * Fiche réflexe en cas d'incident.
 *
 * Une page à afficher ou diffuser en interne dès le cadrage : les obligations
 * de notification s'appliquent aujourd'hui, même tant que la mise en
 * conformité est en cours. Qui appeler, qui notifier, dans quel délai.
 */
const REFLEXES = [
  tr("Noter l'heure exacte de la prise de connaissance : c'est elle qui fait courir les délais.", 'Record the exact time you became aware: it starts the clocks.'),
  tr('Appeler la chaîne d’escalade dans l’ordre, sans attendre d’avoir toutes les informations.', 'Call the escalation chain in order, without waiting to have all the information.'),
  tr(
    'Qualifier rapidement : données personnelles touchées ? service perturbé ? incident majeur au sens de DORA ? vulnérabilité d’un produit exploitée ? système d’IA à haut risque en cause ?',
    'Qualify quickly: personal data affected? service disrupted? major incident under DORA? product vulnerability exploited? high-risk AI system involved?',
  ),
  tr('Préserver les traces (journaux, postes, sauvegardes) avant toute remise en état.', 'Preserve traces (logs, workstations, backups) before any restoration.'),
  tr("Notifier d'abord, compléter ensuite : chaque régime prévoit une notification initiale puis des rapports de suivi.", 'Notify first, complete later: each regime provides for an initial notification then follow-up reports.'),
  tr('Tenir une main courante horodatée de toutes les décisions et de tous les échanges.', 'Keep a timestamped log of all decisions and exchanges.'),
]

export function ReflexeSheet({ d }: { d: ReportData }) {
  const title = tr('Fiche réflexe en cas d’incident', 'Incident quick-reference sheet')
  return (
    <Document title={clean(`${title}${COLON}${d.entity.name}`)} author="Scopeo" language={LANG}>
      <ReportPage title={title} entity={d.entity.name}>
        <DocHeader kind={tr('À diffuser en interne', 'For internal distribution')} title={title} entity={d.entity.name} meta={[...missionMeta(d.profile, d.entity.name), tr(`Établie le ${dateFr(d.generatedAt)}`, `Prepared on ${dateFr(d.generatedAt)}`)]} />

        <Note>
          {tr(
            "Les obligations de notification s'appliquent dès aujourd'hui, même si la mise en conformité est encore en cours. Au moindre doute sur un incident, déclencher la chaîne d'escalade : le délai le plus court se compte en heures.",
            'Notification duties apply today, even while compliance work is still under way. At the slightest doubt about an incident, trigger the escalation chain: the shortest deadline is counted in hours.',
          )}
        </Note>

        <Keep>
          <H2 n="1">{tr("Qui appeler, dans l'ordre", 'Who to call, in order')}</H2>
          {d.contacts.length === 0 ? (
            <Text style={[S.small, { color: C.critical }]}>{tr("Aucun contact renseigné : à compléter dans la plateforme (page Qui notifier).", 'No contact entered: to complete in the platform (Who to notify page).')}</Text>
          ) : (
            d.contacts.map((c, i) => (
              <View key={i} style={[S.row, { alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.rule }]}>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 8, fontFamily: 'Helvetica-Bold', lineHeight: 1 }}>{i + 1}</Text>
                </View>
                <Text style={{ width: 70, fontSize: 8.5, fontFamily: 'Helvetica-Bold' }}>{clean(c.role)}</Text>
                <Text style={{ flex: 1, fontSize: 8.5 }}>
                  {clean(c.name)}
                  {c.title ? <Text style={{ color: C.ink3 }}>{clean(`, ${c.title}`)}</Text> : null}
                </Text>
                <Text style={{ width: 120, fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>{clean(c.phone)}</Text>
                <Text style={{ width: 130, fontSize: 7.8, color: C.ink2, textAlign: 'right' }}>{clean(c.email)}</Text>
              </View>
            ))
          )}
        </Keep>

        <Table
          lead={<H2 n="2">{tr('Qui notifier, et dans quel délai', 'Who to notify, and how fast')}</H2>}
          cols={[
            { title: tr('Texte', 'Text'), width: '13%' },
            { title: tr('Autorité', 'Authority'), width: '25%' },
            { title: tr('Délai après prise de connaissance', 'Deadline after becoming aware'), width: '37%' },
            { title: tr('Canal', 'Channel'), width: '25%' },
          ]}
          rows={d.notification.map((n) => [
            <Text key="r" style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: REG_HEX[n.regulation] }}>{REG_NAME[n.regulation]}</Text>,
            <View key="a" style={{ width: '100%' }}>
              <Text style={[S.bold, { fontSize: 8 }]}>{clean(n.viaDora ? tr('Via DORA', 'Via DORA') : n.authority)}</Text>
              {n.viaDora ? null : <Text style={[S.small, { fontSize: 7.2 }]}>{clean(n.channel)}</Text>}
            </View>,
            <View key="d" style={{ width: "100%" }}>
              {n.viaDora ? (
                <Text style={{ fontSize: 7.8, color: C.ink2 }}>{clean(tr('Entité financière : DORA remplace la notification NIS2 (article 4 de NIS2).', 'Financial entity: DORA replaces NIS2 notification (Article 4 of NIS2).'))}</Text>
              ) : (
                n.steps.map((st) => (
                  <View key={st.step} style={[S.row, { gap: 6, marginBottom: 1.5, alignItems: 'flex-start' }]}>
                    <Text style={{ width: 58, fontSize: 7.8, fontFamily: 'Helvetica-Bold' }}>{clean(st.delay)}</Text>
                    <Text style={{ flex: 1, fontSize: 7.8, color: C.ink2 }}>{clean(st.step)}</Text>
                  </View>
                ))
              )}
            </View>,
            <View key="c">
              {n.viaDora ? (
                <Text style={{ fontSize: 7.8, color: C.ink3 }}> </Text>
              ) : (
                <>
                  {n.phone ? <Text style={{ fontSize: 7.8, fontFamily: 'Helvetica-Bold' }}>{clean(n.phone)}</Text> : null}
                  {n.email ? <Text style={{ fontSize: 7.4, color: C.ink2 }}>{clean(n.email)}</Text> : null}
                  <Text style={{ fontSize: 7.4, color: C.ink2 }}>{clean(host(n.url))}</Text>
                </>
              )}
            </View>,
          ])}
        />
        {d.notification.some((n) => n.regulation === 'DORA') ? (
          <Text style={[S.small, S.muted, { fontSize: 7.2, marginBottom: 4 }]}>
            {clean(tr('* DORA : 4 h après la classification comme incident majeur, et au plus tard 24 h après la détection.', '* DORA: 4 h after classification as a major incident, and no later than 24 h after detection.'))}
          </Text>
        ) : null}
        {d.applicable.includes('NIS2') && !d.doraPrevails ? (
          <Text style={[S.small, S.muted, { fontSize: 7.2, marginBottom: 4 }]}>
            {clean(tr("NIS2 : tant que la loi de transposition n'est pas promulguée, le signalement au CERT-FR est recommandé, avec les délais de la directive.", "NIS2: until the transposition act is enacted, reporting to CERT-FR is recommended, using the directive's deadlines."))}
          </Text>
        ) : null}
        {d.applicable.includes('AIACT') ? (
          <Text style={[S.small, S.muted, { fontSize: 7.2, marginBottom: 4 }]}>
            {clean(tr("AI Act : signalement des incidents graves exigible à l'application du régime des systèmes à haut risque (2 décembre 2027 pour l'annexe III) ; autorité française en cours de désignation.", 'AI Act: serious-incident reporting applies once the high-risk regime applies (2 December 2027 for Annex III); French authority being designated.'))}
          </Text>
        ) : null}

        <Keep>
          <H2 n="3">{tr('Les bons réflexes', 'The right reflexes')}</H2>
          {REFLEXES.map((r, i) => (
            <View key={i} style={[S.row, { gap: 7, marginBottom: 4 }]}>
              <Text style={[S.bold, { width: 12, color: C.accent, fontSize: 9 }]}>{i + 1}.</Text>
              <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.4 }}>{clean(r)}</Text>
            </View>
          ))}
        </Keep>
      </ReportPage>
    </Document>
  )
}

/** Nom de domaine seul : une adresse complète déborderait de la colonne. */
function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
