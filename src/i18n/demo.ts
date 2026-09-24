import type { EntityRecord, EntitySummary } from '@/types/domain'
import { LANG } from '@/i18n'
import EN from './en/demo.json'

/**
 * Version anglaise de l'entité de démonstration.
 *
 * Le serveur ne connaît qu'une démonstration, rédigée en français. Les textes
 * libres (périmètre, fiche, notes, porteurs) sont remplacés à l'affichage
 * quand l'interface est en anglais, et à la copie pour que l'entité copiée
 * reste dans la langue de l'utilisateur.
 */

type Localizable = Pick<EntityRecord, 'scope_note' | 'profile' | 'contacts' | 'notes' | 'coverage' | 'iso_controls'>

const NOTES = EN.notes as unknown as Record<string, [string, string]>
const CONTACTS = EN.contacts as Record<string, string>
const OWNERS = EN.owners as Record<string, string>
const STAKEHOLDERS = EN.stakeholders as Record<string, string>
const ISO = EN.iso as Record<string, string>

export function englishDemoFields(e: Localizable): Localizable {
  return {
    scope_note: EN.scope_note,
    profile: {
      ...e.profile,
      ...EN.profile,
      stakeholders: e.profile?.stakeholders?.map((s) => ({ ...s, role: STAKEHOLDERS[s.role] ?? s.role })),
    },
    contacts: e.contacts.map((c) => ({ ...c, title: CONTACTS[c.id] ?? c.title })),
    notes: e.notes.map((n) => {
      const t = NOTES[n.id]
      return t ? { ...n, text: t[0], anchor: { ...n.anchor, label: t[1] } } : n
    }),
    coverage: Object.fromEntries(
      Object.entries(e.coverage).map(([k, v]) => [k, v.owner ? { ...v, owner: OWNERS[v.owner] ?? v.owner } : v]),
    ),
    iso_controls: {
      ...e.iso_controls,
      controls: Object.fromEntries(
        Object.entries(e.iso_controls?.controls ?? {}).map(([k, v]) => [k, ISO[k] ? { ...v, justification: ISO[k] } : v]),
      ),
    },
  }
}

export function localizeDemo(e: EntityRecord): EntityRecord {
  if (LANG !== 'en' || !e.is_demo) return e
  return { ...e, ...englishDemoFields(e) }
}

export function localizeDemoSummary(e: EntitySummary): EntitySummary {
  if (LANG !== 'en' || !e.is_demo) return e
  return { ...e, scope_note: EN.scope_note }
}
