import { useQuery } from '@tanstack/react-query'
import { Card, PageHeader } from '@/components/ui/primitives'
import { api } from '@/lib/api'
import { LOCALE, tr } from '@/i18n'

const ACTIONS: Record<string, string> = {
  account_created_admin: tr('Premier compte créé (administrateur)', 'First account created (administrator)'),
  account_created: tr('Profil créé depuis la page de connexion', 'Profile created from the sign-in page'),
  account_created_ldap: tr("Compte créé par l'annuaire", 'Account created through the directory'),
  account_deleted_self: tr('Profil supprimé par son titulaire', 'Profile deleted by its owner'),
  user_created: tr('Compte créé', 'Account created'),
  user_deleted: tr('Compte supprimé', 'Account deleted'),
  user_disabled: tr('Compte suspendu', 'Account suspended'),
  user_enabled: tr('Compte réactivé', 'Account reactivated'),
  admin_granted: tr('Rôle administrateur attribué', 'Administrator role granted'),
  admin_revoked: tr('Rôle administrateur retiré', 'Administrator role removed'),
  password_reset: tr('Mot de passe provisoire attribué', 'Temporary password issued'),
  password_changed: tr('Mot de passe changé', 'Password changed'),
  mfa_enabled: tr('Double authentification activée', 'Two-factor authentication turned on'),
  mfa_disabled: tr('Double authentification désactivée', 'Two-factor authentication turned off'),
  mfa_reset: tr("Double authentification désactivée par l'administrateur", 'Two-factor authentication turned off by the administrator'),
  mfa_codes_renewed: tr('Codes de récupération renouvelés', 'Recovery codes renewed'),
  mfa_recovery_code_used: tr('Code de récupération utilisé', 'Recovery code used'),
  settings_updated: tr('Réglages modifiés', 'Settings changed'),
  ldap_enabled: tr('Annuaire LDAP activé', 'LDAP directory turned on'),
  ldap_disabled: tr('Annuaire LDAP désactivé', 'LDAP directory turned off'),
  ldap_updated: tr('Annuaire LDAP modifié', 'LDAP directory changed'),
  sso_enabled: tr('Connexion unique activée', 'Single sign-on turned on'),
  sso_disabled: tr('Connexion unique désactivée', 'Single sign-on turned off'),
  sso_updated: tr('Connexion unique modifiée', 'Single sign-on changed'),
  account_created_sso: tr('Compte créé par la connexion unique', 'Account created through single sign-on'),
  admin_granted_auto: tr('Rôle administrateur attribué automatiquement', 'Administrator role granted automatically'),
  admin_recovered: tr('Accès administrateur rétabli depuis le serveur', 'Administrator access restored from the server'),
  api_token_created: tr("Jeton d'API créé", 'API token created'),
  api_token_revoked: tr("Jeton d'API révoqué", 'API token revoked'),
  backup_downloaded: tr('Sauvegarde téléchargée', 'Backup downloaded'),
}

const FMT = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AuditPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['admin', 'audit'], queryFn: api.admin.audit })
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr('Administration', 'Administration')}
        title={tr('Journal', 'Log')}
        lead={tr(
          'Les actions d’administration et les changements de sécurité des comptes, du plus récent au plus ancien. Les mille derniers événements sont conservés.',
          'Administration actions and account security changes, newest first. The last thousand events are kept.',
        )}
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead className="bg-raised">
              <tr className="border-b border-rule">
                {[tr('Date', 'Date'), tr('Événement', 'Event'), tr('Objet', 'Subject'), tr('Par', 'By')].map((h) => (
                  <th key={h} scope="col" className="label-caps px-4 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-3">
                    {tr('Chargement…', 'Loading…')}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-3">
                    {tr('Aucun événement pour l’instant.', 'No events yet.')}
                  </td>
                </tr>
              ) : null}
              {data.map((e) => (
                <tr key={e.id} className="border-b border-rule last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-ink-3">{FMT.format(new Date(e.at))}</td>
                  <td className="px-4 py-2.5 text-ink">
                    {ACTIONS[e.action] ?? e.action}
                    {e.detail && ['settings_updated', 'api_token_created', 'api_token_revoked'].includes(e.action) ? <span className="ml-1.5 font-mono text-2xs text-ink-3">{e.detail}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">{e.target}</td>
                  <td className="px-4 py-2.5 text-ink-2">{e.actor || tr('Système', 'System')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
