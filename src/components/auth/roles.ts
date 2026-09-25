import type { UserRole } from '@/types/domain'
import { tr } from '@/i18n'

/** Fonctions proposées pour un profil : celles des personnes qui mènent ou éclairent un cadrage. */
export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'consultant', label: tr('Consultant', 'Consultant') },
  { value: 'rssi', label: tr('RSSI', 'CISO') },
  { value: 'conformite', label: tr('Responsable GRC, conformité', 'GRC, compliance manager') },
  { value: 'risques', label: tr('Gestionnaire des risques', 'Risk manager') },
  { value: 'dpo', label: tr('Délégué à la protection des données', 'Data protection officer') },
  { value: 'juriste', label: tr('Juriste', 'Legal counsel') },
  { value: 'dirigeant', label: tr('Direction', 'Executive') },
  { value: 'auditeur', label: tr('Auditeur', 'Auditor') },
  { value: 'autre', label: tr('Autre', 'Other') },
]

/** Libellé court, pour le menu du profil et la liste des comptes. */
export const ROLE_SHORT: Record<UserRole, string> = {
  consultant: tr('Consultant', 'Consultant'),
  rssi: tr('RSSI', 'CISO'),
  conformite: tr('GRC, conformité', 'GRC, compliance'),
  risques: tr('Risques', 'Risk'),
  dpo: 'DPO',
  juriste: tr('Juriste', 'Legal counsel'),
  dirigeant: tr('Direction', 'Executive'),
  auditeur: tr('Auditeur', 'Auditor'),
  autre: tr('Utilisateur', 'User'),
}
