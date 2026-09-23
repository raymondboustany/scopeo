import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Download, LogOut, Trash2, Upload, UserRound } from 'lucide-react'
import { Button, Dialog, Input, Select } from '@/components/ui/controls'
import { Callout, Card, CardHeader, PageHeader, Tag } from '@/components/ui/primitives'
import { useCurrentUser, useDeleteUser, useEntities, useUpdateUser, queryClient, keys } from '@/lib/queries'
import { useSession } from '@/lib/store'
import { api } from '@/lib/api'
import { useScoping } from '@/lib/hooks'
import { slugify } from '@/lib/utils'
import type { EntityRecord, UserRole } from '@/types/domain'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'consultant', label: 'Consultant — plusieurs clients' },
  { value: 'dpo', label: 'Délégué à la protection des données' },
  { value: 'rssi', label: 'RSSI' },
  { value: 'juriste', label: 'Juriste, conformité' },
  { value: 'dirigeant', label: 'Direction' },
  { value: 'auditeur', label: 'Auditeur' },
  { value: 'autre', label: 'Autre' },
]

/** Format d'échange d'une entité : ce qu'il faut pour la recréer ailleurs, rien de plus. */
interface EntityExport {
  format: 'scopeo/entity'
  version: 1
  exportedAt: string
  entity: Pick<EntityRecord, 'name' | 'scope_note' | 'answers' | 'coverage' | 'measures' | 'weights' | 'contacts'>
}

export default function SettingsPage() {
  const { data: user } = useCurrentUser()
  const { data: entities = [] } = useEntities()
  const { entity } = useScoping()
  const update = useUpdateUser()
  const del = useDeleteUser()
  const signOut = useSession((s) => s.signOut)
  const setGuestId = useSession((s) => s.setGuestId)
  const selectEntity = useSession((s) => s.selectEntity)
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState<{ name: string; role: UserRole; organisation: string; email: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ tone: 'positive' | 'critical'; text: string } | null>(null)

  if (!user) return null
  const form = draft ?? { name: user.name, role: user.role, organisation: user.organisation, email: user.email }
  const dirty = draft !== null

  const save = async (extra?: { is_guest?: boolean }) => {
    await update.mutateAsync({ id: user.id, patch: { ...form, ...extra } })
    if (extra?.is_guest === false) setGuestId(null)
    setDraft(null)
  }

  const exportEntity = () => {
    if (!entity) return
    const payload: EntityExport = {
      format: 'scopeo/entity',
      version: 1,
      exportedAt: new Date().toISOString(),
      entity: {
        name: entity.name,
        scope_note: entity.scope_note,
        answers: entity.answers,
        coverage: entity.coverage,
        measures: entity.measures,
        weights: entity.weights,
        contacts: entity.contacts,
      },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${slugify(entity.name)}.erm.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const importEntity = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Partial<EntityExport>
      if (data.format !== 'scopeo/entity' || !data.entity?.name) throw new Error('Ce fichier n’est pas un export d’entité Scopeo.')
      const e = data.entity
      const created = await api.createEntity(user.id, { name: e.name, scope_note: e.scope_note ?? '', answers: e.answers ?? {} })
      const saved = await api.updateEntity(created.id, {
        coverage: e.coverage ?? {},
        measures: e.measures ?? {},
        weights: e.weights ?? {},
        contacts: e.contacts ?? [],
      })
      queryClient.setQueryData(keys.entity(saved.id), saved)
      await queryClient.invalidateQueries({ queryKey: keys.entities(user.id) })
      selectEntity(saved.id)
      setImportMsg({ tone: 'positive', text: `« ${saved.name} » importée comme nouvelle entité, sans toucher aux autres.` })
    } catch (err) {
      setImportMsg({ tone: 'critical', text: err instanceof Error ? err.message : 'Import impossible.' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Restitution" title="Profil et données" lead="Votre profil, vos entités et l'emplacement de vos données." />

      {user.is_guest ? (
        <Callout tone="caution" title="Session invitée">
          Vos entités sont enregistrées, mais le profil invité n'apparaît pas dans la liste des profils de l'accueil : seul ce navigateur le
          retrouve. Donnez-lui un nom pour le conserver durablement.
        </Callout>
      ) : null}

      <Card>
        <CardHeader title="Profil" subtitle={`${user.entity_count} entité${user.entity_count > 1 ? 's' : ''}`} icon={<UserRound size={16} />} aside={user.is_guest ? <Tag tone="caution">Invité</Tag> : null} />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">Nom</span>
            <Input value={form.name} onChange={(e) => setDraft({ ...form, name: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">Rôle</span>
            <Select value={form.role} onValueChange={(v) => setDraft({ ...form, role: v as UserRole })} options={ROLES} ariaLabel="Rôle" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">Organisation</span>
            <Input value={form.organisation} onChange={(e) => setDraft({ ...form, organisation: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">Courriel</span>
            <Input type="email" value={form.email} onChange={(e) => setDraft({ ...form, email: e.target.value })} />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-sunken px-5 py-3">
          {user.is_guest ? (
            <Button variant="primary" disabled={!form.name.trim() || form.name === 'Invité' || update.isPending} onClick={() => save({ is_guest: false })}>
              Conserver comme profil
            </Button>
          ) : (
            <Button variant="primary" disabled={!dirty || !form.name.trim() || update.isPending} onClick={() => save()}>
              Enregistrer
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Échange d'entités" subtitle="Transférer une entité vers un autre poste, ou la reprendre plus tard" icon={<Database size={16} />} />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <Button icon={<Download size={14} />} onClick={exportEntity} disabled={!entity}>
              Exporter {entity ? `« ${entity.name} »` : 'l’entité ouverte'}
            </Button>
            <Button icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
              Importer une entité
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
            L'export contient les réponses, l'évaluation, les pondérations et les contacts. L'import crée toujours une nouvelle entité : il
            n'écrase jamais une entité existante. Les incidents et le lien public ne sont pas transférés.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Où sont vos données" icon={<Database size={16} />} />
        <div className="space-y-2 p-5 text-sm leading-relaxed text-ink-2">
          <p>
            Tout est enregistré dans une base SQLite sur ce poste, par le serveur local de l'application :{' '}
            <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs text-ink">server/data/scopeo.db</code> (modifiable
            par la variable <code className="font-mono text-xs">SCOPEO_DATA_DIR</code>).
          </p>
          <p>
            Aucune donnée ne quitte le poste, à l'exception de la vue publique du Trust Center lorsque vous choisissez de partager un lien — et
            encore n'est-elle accessible qu'aux personnes qui peuvent joindre ce serveur.
          </p>
          <p className="text-ink-3">{entities.length} entité{entities.length > 1 ? 's' : ''} rattachée{entities.length > 1 ? 's' : ''} à ce profil.</p>
        </div>
      </Card>

      <Card className="border-critical-line">
        <CardHeader title="Zone sensible" />
        <div className="flex flex-wrap gap-2 p-5">
          <Button
            icon={<LogOut size={14} />}
            onClick={() => {
              signOut()
              navigate('/')
            }}
          >
            Changer de profil
          </Button>
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setDeleting(true)}>
            Supprimer le profil et ses entités
          </Button>
        </div>
      </Card>

      <Dialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Supprimer ce profil ?"
        description={`Le profil « ${user.name} » et ses ${user.entity_count} entité(s) seront définitivement supprimés, avec leurs incidents et liens publics.`}
        footer={
          <>
            <Button onClick={() => setDeleting(false)}>Annuler</Button>
            <Button
              variant="danger"
              icon={<Trash2 size={13} />}
              disabled={del.isPending}
              onClick={async () => {
                await del.mutateAsync(user.id)
                if (user.is_guest) setGuestId(null)
                signOut()
                navigate('/')
              }}
            >
              Supprimer définitivement
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">Pensez à exporter les entités que vous souhaitez conserver.</p>
      </Dialog>
    </div>
  )
}
