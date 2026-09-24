import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Download, KeyRound, Languages, LogOut, Trash2, Upload, UserRound } from 'lucide-react'
import { Button, Dialog, Input, SegmentedControl, Select } from '@/components/ui/controls'
import { Callout, Card, CardHeader, PageHeader, Tag } from '@/components/ui/primitives'
import { useChangePassword, useCurrentUser, useDeleteUser, useEntities, useLogout, useUpdateUser, queryClient, keys, flushAll } from '@/lib/queries'
import { useSession } from '@/lib/store'
import { api } from '@/lib/api'
import { useScoping } from '@/lib/hooks'
import { slugify } from '@/lib/utils'
import { LANG, setLang, tr, type Lang } from '@/i18n'
import type { EntityRecord, UserRole } from '@/types/domain'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'consultant', label: tr('Consultant, plusieurs clients', 'Consultant, several clients') },
  { value: 'dpo', label: tr('Délégué à la protection des données', 'Data protection officer') },
  { value: 'rssi', label: tr('RSSI', 'CISO') },
  { value: 'juriste', label: tr('Juriste, conformité', 'Legal, compliance') },
  { value: 'dirigeant', label: tr('Direction', 'Executive') },
  { value: 'auditeur', label: tr('Auditeur', 'Auditor') },
  { value: 'autre', label: tr('Autre', 'Other') },
]

/** Format d'échange d'une entité : ce qu'il faut pour la recréer ailleurs, rien de plus. */
interface EntityExport {
  format: 'scopeo/entity'
  version: 1 | 2
  exportedAt: string
  entity: Pick<EntityRecord, 'name' | 'scope_note' | 'answers' | 'coverage' | 'measures' | 'weights' | 'contacts'> &
    Partial<Pick<EntityRecord, 'profile' | 'notes' | 'iso_controls'>>
}

export default function SettingsPage() {
  const { data: user } = useCurrentUser()
  const { data: entities = [] } = useEntities()
  const { entity } = useScoping()
  const update = useUpdateUser()
  const del = useDeleteUser()
  const logout = useLogout()
  const changePassword = useChangePassword()
  const selectEntity = useSession((s) => s.selectEntity)
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState<{ name: string; role: UserRole; organisation: string; email: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [pw, setPw] = useState({ current: '', password: '', confirm: '' })
  const [pwDone, setPwDone] = useState(false)
  const [importMsg, setImportMsg] = useState<{ tone: 'positive' | 'critical'; text: string } | null>(null)

  if (!user) return null
  const form = draft ?? { name: user.name, role: user.role, organisation: user.organisation, email: user.email }
  const dirty = draft !== null

  const save = async () => {
    await update.mutateAsync({ id: user.id, patch: form })
    setDraft(null)
  }

  const exportEntity = () => {
    if (!entity) return
    const payload: EntityExport = {
      format: 'scopeo/entity',
      version: 2,
      exportedAt: new Date().toISOString(),
      entity: {
        name: entity.name,
        scope_note: entity.scope_note,
        answers: entity.answers,
        coverage: entity.coverage,
        measures: entity.measures,
        weights: entity.weights,
        contacts: entity.contacts,
        profile: entity.profile,
        notes: entity.notes,
        // La déclaration d'applicabilité déposée reste sur le poste : seules les saisies partent.
        iso_controls: { ...(entity.iso_controls ?? {}), soa: undefined },
      },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${slugify(entity.name)}.scopeo.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const importEntity = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Partial<EntityExport>
      if (data.format !== 'scopeo/entity' || !data.entity?.name) {
        throw new Error(tr('Ce fichier n’est pas un export d’entité Scopeo.', 'This file is not a Scopeo entity export.'))
      }
      const e = data.entity
      const created = await api.createEntity(user.id, { name: e.name, scope_note: e.scope_note ?? '', answers: e.answers ?? {}, profile: e.profile ?? {} })
      const saved = await api.updateEntity(created.id, {
        coverage: e.coverage ?? {},
        measures: e.measures ?? {},
        weights: e.weights ?? {},
        contacts: e.contacts ?? [],
        notes: e.notes ?? [],
        iso_controls: e.iso_controls ?? {},
      })
      queryClient.setQueryData(keys.entity(saved.id), saved)
      await queryClient.invalidateQueries({ queryKey: keys.entities(user.id) })
      selectEntity(saved.id)
      setImportMsg({
        tone: 'positive',
        text: tr(`« ${saved.name} » importée comme nouvelle entité, sans toucher aux autres.`, `"${saved.name}" imported as a new entity, without affecting the others.`),
      })
    } catch (err) {
      setImportMsg({ tone: 'critical', text: err instanceof Error ? err.message : tr('Import impossible.', 'Import failed.') })
    }
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwDone(false)
    try {
      await changePassword.mutateAsync({ current: pw.current, password: pw.password, confirm: pw.confirm })
      setPw({ current: '', password: '', confirm: '' })
      setPwDone(true)
    } catch {
      setPw((p) => ({ ...p, current: '' }))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tr('Restitution', 'Reporting')}
        title={tr('Profil et données', 'Profile and data')}
        lead={tr("Votre profil, votre mot de passe, vos entités et l'emplacement de vos données.", 'Your profile, your password, your entities and where your data lives.')}
      />

      {user.is_guest ? (
        <Callout tone="caution" title={tr('Session invitée', 'Guest session')}>
          {tr(
            "Le mode invité sert à découvrir la plateforme : il n'a pas de mot de passe, et ses entités sont effacées à la déconnexion. Pour conserver votre travail, exportez l'entité puis importez-la dans un profil protégé par mot de passe.",
            'Guest mode is for discovering the platform: it has no password, and its entities are erased on sign-out. To keep your work, export the entity and import it into a password-protected profile.',
          )}
        </Callout>
      ) : null}

      {user.is_guest ? null : (
        <Card>
          <CardHeader
            title={tr('Profil', 'Profile')}
            subtitle={tr(`${user.entity_count} entité${user.entity_count > 1 ? 's' : ''}`, `${user.entity_count} entit${user.entity_count > 1 ? 'ies' : 'y'}`)}
            icon={<UserRound size={16} />}
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Nom du profil', 'Profile name')}</span>
              <Input value={form.name} onChange={(e) => setDraft({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Fonction', 'Role')}</span>
              <Select value={form.role} onValueChange={(v) => setDraft({ ...form, role: v as UserRole })} options={ROLES} ariaLabel={tr('Fonction', 'Role')} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Organisation', 'Organisation')}</span>
              <Input value={form.organisation} onChange={(e) => setDraft({ ...form, organisation: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Courriel', 'Email')}</span>
              <Input type="email" value={form.email} onChange={(e) => setDraft({ ...form, email: e.target.value })} />
            </label>
          </div>
          {update.error ? <p className="px-5 pb-3 text-xs text-critical">{update.error.message}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-rule bg-raised px-5 py-3">
            <Button variant="primary" disabled={!dirty || !form.name.trim() || update.isPending} onClick={save}>
              {tr('Enregistrer', 'Save')}
            </Button>
          </div>
        </Card>
      )}

      {user.is_guest ? null : (
        <Card>
          <CardHeader
            title={tr('Mot de passe', 'Password')}
            subtitle={tr(
              'Haché avec bcrypt : il n’est jamais conservé en clair. Le changer ferme les autres sessions ouvertes.',
              'Hashed with bcrypt: it is never stored in plain text. Changing it closes other open sessions.',
            )}
            icon={<KeyRound size={16} />}
          />
          <form onSubmit={submitPassword} className="grid gap-4 p-5 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Mot de passe actuel', 'Current password')}</span>
              <Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Nouveau mot de passe', 'New password')}</span>
              <Input type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Confirmation', 'Confirmation')}</span>
              <Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-3">
              <span className="text-2xs text-ink-3">
                {changePassword.error ? (
                  <span className="text-critical">{changePassword.error.message}</span>
                ) : pwDone ? (
                  <span className="text-positive">{tr('Mot de passe modifié.', 'Password changed.')}</span>
                ) : (
                  tr('Au moins 10 caractères.', 'At least 10 characters.')
                )}
              </span>
              <Button type="submit" disabled={!pw.current || pw.password.length < 10 || pw.password !== pw.confirm || changePassword.isPending}>
                {tr('Changer le mot de passe', 'Change password')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader title={tr('Langue de l’interface', 'Interface language')} icon={<Languages size={16} />} />
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="max-w-xl text-xs leading-relaxed text-ink-3">
            {tr(
              'Les textes réglementaires cités restent ceux de la version française publiée au Journal officiel ; les traductions anglaises de l’interface et du corpus sont fournies pour la lecture.',
              'Quoted regulatory texts remain the French version published in the Official Journal; English translations of the interface and corpus are provided for reading.',
            )}
          </p>
          <SegmentedControl<Lang>
            ariaLabel={tr('Langue', 'Language')}
            value={LANG}
            onChange={async (l) => {
              await flushAll()
              setLang(l)
            }}
            options={[
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title={tr("Échange d'entités", 'Entity exchange')}
          subtitle={tr('Transférer une entité vers un autre poste, ou la reprendre plus tard', 'Move an entity to another machine, or pick it up later')}
          icon={<Database size={16} />}
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <Button icon={<Download size={14} />} onClick={exportEntity} disabled={!entity}>
              {entity ? tr(`Exporter « ${entity.name} »`, `Export "${entity.name}"`) : tr('Exporter l’entité ouverte', 'Export the open entity')}
            </Button>
            <Button icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
              {tr('Importer une entité', 'Import an entity')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importEntity(f)
                e.target.value = ''
              }}
            />
          </div>
          {importMsg ? <Callout tone={importMsg.tone}>{importMsg.text}</Callout> : null}
          <p className="text-xs leading-relaxed text-ink-3">
            {tr(
              "L'export contient les réponses, l'évaluation, la fiche, les notes, la démarche ISO 27001, les pondérations et les contacts. L'import crée toujours une nouvelle entité : il n'écrase jamais une entité existante. Le lien public et la déclaration d'applicabilité déposée ne sont pas transférés.",
              'The export contains the answers, the assessment, the profile, the notes, the ISO 27001 data, the weights and the contacts. Import always creates a new entity: it never overwrites an existing one. The public link and the uploaded Statement of Applicability are not transferred.',
            )}
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title={tr('Où sont vos données', 'Where your data lives')} icon={<Database size={16} />} />
        <div className="space-y-2 p-5 text-sm leading-relaxed text-ink-2">
          <p>
            {tr(
              "Tout est enregistré dans une base SQLite sur ce poste, par le serveur local de la plateforme : ",
              "Everything is stored in a SQLite database on this machine, by the platform's local server: ",
            )}
            <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs text-ink">server/data/scopeo.db</code>{' '}
            {tr('(modifiable par la variable', '(configurable with the')} <code className="font-mono text-xs">SCOPEO_DATA_DIR</code>
            {tr(').', ' variable).')}
          </p>
          <p>
            {tr(
              "Aucune donnée ne quitte le poste. La vue du Trust Center, en démonstration, n'est consultable que depuis cette machine.",
              'No data leaves the machine. The Trust Center view, still a demo, can only be opened from this machine.',
            )}
          </p>
          <p className="text-ink-3">
            {tr(
              `${entities.length} entité${entities.length > 1 ? 's' : ''} rattachée${entities.length > 1 ? 's' : ''} à ce profil.`,
              `${entities.length} entit${entities.length > 1 ? 'ies' : 'y'} linked to this profile.`,
            )}
          </p>
        </div>
      </Card>

      <Card className="border-critical-line">
        <CardHeader title={tr('Zone sensible', 'Danger zone')} />
        <div className="flex flex-wrap gap-2 p-5">
          <Button
            icon={<LogOut size={14} />}
            onClick={async () => {
              await logout()
              navigate('/')
            }}
          >
            {tr('Se déconnecter', 'Sign out')}
          </Button>
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setDeleting(true)}>
            {tr('Supprimer le profil et ses entités', 'Delete the profile and its entities')}
          </Button>
          {user.is_guest ? <Tag tone="caution">{tr('Invité', 'Guest')}</Tag> : null}
        </div>
      </Card>

      <Dialog
        open={deleting}
        onOpenChange={(v) => {
          setDeleting(v)
          if (!v) setDeletePassword('')
        }}
        title={tr('Supprimer ce profil ?', 'Delete this profile?')}
        description={tr(
          `Le profil « ${user.name} » et ses ${user.entity_count} entité(s) seront définitivement supprimés, avec leurs liens publics.`,
          `The profile "${user.name}" and its ${user.entity_count} entit${user.entity_count > 1 ? 'ies' : 'y'} will be permanently deleted, with their public links.`,
        )}
        footer={
          <>
            <Button onClick={() => setDeleting(false)}>{tr('Annuler', 'Cancel')}</Button>
            <Button
              variant="danger"
              icon={<Trash2 size={13} />}
              disabled={del.isPending || (!user.is_guest && !deletePassword)}
              onClick={async () => {
                try {
                  await del.mutateAsync({ id: user.id, password: deletePassword })
                  navigate('/')
                } catch {
                  setDeletePassword('')
                }
              }}
            >
              {tr('Supprimer définitivement', 'Delete permanently')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">{tr('Pensez à exporter les entités que vous souhaitez conserver.', 'Remember to export the entities you want to keep.')}</p>
        {user.is_guest ? null : (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Confirmez avec votre mot de passe', 'Confirm with your password')}</span>
            <Input type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
          </label>
        )}
        {del.error ? <p className="mt-2 text-xs text-critical">{del.error.message}</p> : null}
      </Dialog>
    </div>
  )
}
