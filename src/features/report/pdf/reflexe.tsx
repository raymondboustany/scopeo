import { Document, Text, View } from '@react-pdf/renderer'
import type { ReportData } from '../reportData'
import { C, clean, dateFr, DocHeader, H2, Keep, missionMeta, Note, REG_HEX, REG_NAME, ReportPage, S, Table } from './kit'

/**
 * Fiche réflexe — en cas d'incident.
 *
 * Une page à afficher ou diffuser en interne dès le cadrage : les obligations
 * de notification s'appliquent aujourd'hui, même tant que la mise en
 * conformité est en cours. Qui appeler, qui notifier, dans quel délai.
 */
const REFLEXES = [
  "Noter l'heure exacte de la prise de connaissance : c'est elle qui fait courir les délais.",
  'Appeler la chaîne d’escalade dans l’ordre, sans attendre d’avoir toutes les informations.',
  'Qualifier rapidement : données personnelles touchées ? service perturbé ? incident majeur au sens de DORA ? vulnérabilité d’un produit exploitée ?',
  'Préserver les traces (journaux, postes, sauvegardes) avant toute remise en état.',
  "Notifier d'abord, compléter ensuite : chaque régime prévoit une notification initiale puis des rapports de suivi.",
  'Tenir une main courante horodatée de toutes les décisions et de tous les échanges.',
]

export function ReflexeSheet({ d }: { d: ReportData }) {
  const title = 'Fiche réflexe — en cas d’incident'
  return (
    <Document title={clean(`${title} — ${d.entity.name}`)} author="Scopeo" language="fr">
      <ReportPage title={title} entity={d.entity.name}>
        <DocHeader kind="À diffuser en interne" title={title} entity={d.entity.name} meta={[...missionMeta(d.profile, d.entity.name), `Établie le ${dateFr(d.generatedAt)}`]} />

        <Note>
          Les obligations de notification s'appliquent dès aujourd'hui, même si la mise en conformité est encore en cours. Au moindre doute sur
          un incident, déclencher la chaîne d'escalade : le délai le plus court se compte en heures.
        </Note>

        <Keep>
          <H2 n="1">Qui appeler, dans l'ordre</H2>
          {d.contacts.length === 0 ? (
            <Text style={[S.small, { color: C.critical }]}>Aucun contact renseigné : à compléter dans l'outil (page Signalement).</Text>
          ) : (
            d.contacts.map((c, i) => (
              <View key={i} style={[S.row, { alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.rule }]}>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 8, fontFamily: 'Helvetica-Bold', lineHeight: 1 }}>{i + 1}</Text>
                </View>
                <Text style={{ width: 70, fontSize: 8.5, fontFamily: 'Helvetica-Bold' }}>{clean(c.role)}</Text>
                <Text style={{ flex: 1, fontSize: 8.5 }}>
                  {clean(c.name)}
                  {c.title ? <Text style={{ color: C.ink3 }}>{clean(` — ${c.title}`)}</Text> : null}
                </Text>
                <Text style={{ width: 120, fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>{clean(c.phone)}</Text>
                <Text style={{ width: 130, fontSize: 7.8, color: C.ink2, textAlign: 'right' }}>{clean(c.email)}</Text>
              </View>
            ))
          )}
        </Keep>

        <Table
          lead={<H2 n="2">Qui notifier, et dans quel délai</H2>}
          cols={[
            { title: 'Texte', width: '9%' },
            { title: 'Autorité', width: '27%' },
            { title: 'Délai après prise de connaissance', width: '38%' },
            { title: 'Canal', width: '26%' },
          ]}
          rows={d.notification.map((n) => [
            <Text key="r" style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: REG_HEX[n.regulation] }}>{REG_NAME[n.regulation]}</Text>,
            <View key="a" style={{ width: '100%' }}>
              <Text style={[S.bold, { fontSize: 8 }]}>{clean(n.viaDora ? 'Via DORA' : n.authority)}</Text>
              {n.viaDora ? null : <Text style={[S.small, { fontSize: 7.2 }]}>{clean(n.channel)}</Text>}
            </View>,
            <View key="d" style={{ width: "100%" }}>
              {n.viaDora ? (
                <Text style={{ fontSize: 7.8, color: C.ink2 }}>{clean('Entité financière : DORA remplace la notification NIS 2 (article 4 de NIS 2).')}</Text>
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
                <Text style={{ fontSize: 7.8, color: C.ink3 }}>—</Text>
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
            {clean('* DORA : 4 h après la classification comme incident majeur, et au plus tard 24 h après la détection.')}
          </Text>
        ) : null}
        {d.applicable.includes('NIS2') && !d.doraPrevails ? (
          <Text style={[S.small, S.muted, { fontSize: 7.2, marginBottom: 4 }]}>
            {clean("NIS 2 : tant que la loi de transposition n'est pas promulguée, le signalement au CERT-FR est recommandé, avec les délais de la directive.")}
          </Text>
        ) : null}

        <Keep>
          <H2 n="3">Les bons réflexes</H2>
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
