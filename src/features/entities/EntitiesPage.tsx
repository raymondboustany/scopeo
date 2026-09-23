import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { Building2, Globe, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { Button, Dialog, Input, Textarea } from '@/components/ui/controls'
import { Card, EmptyState, PageHeader, Tag } from '@/components/ui/primitives'
import { useCopyDemo, useCreateEntity, useDeleteEntity, useEntities, keys, flushAll } from '@/lib/queries'
import { useSession } from '@/lib/store'
import { api } from '@/lib/api'
import { QUESTIONS, SECTOR_BY_VALUE } from '@/data/questionnaire'
import { cn, formatDate } from '@/lib/utils'
import type { EntitySummary } from '@/types/domain'

export default function EntitiesPage() {
  const { data: entities = [], isLoading } = useEntities()
  const current = useSession((s) => s.entityId)
  const selectEntity = useSession((s) => s.selectEntity)
  const copyDemo = useCopyDemo()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [creatingState, setCreatingState] = useState(false)
  // « ?nouvelle=1 » ouvre directement la création (lien depuis le tableau de bord).
  const creating = creatingState || params.get('nouvelle') === '1'
  const setCreating = (v: boolean) => {
    setCreatingState(v)
    if (!v && params.has('nouvelle')) setParams({}, { replace: true })
  }
  const [renaming, setRenaming] = useState<EntitySummary | null>(null)
  const [deleting, setDeleting] = useState<EntitySummary | null>(null)

  const open = async (id: string) => {
    await flushAll()
    selectEntity(id)
    navigate('/app')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Cadrage"
        title="Entités"
        lead="Une entité par organisation cadrée. Chacune est enregistrée séparément : ouvrir, renommer ou supprimer l'une ne touche jamais aux autres."
        actions={
          <>
            <Button
              icon={<Sparkles size={14} />}
              disabled={copyDemo.isPending}
              onClick={async () => {
                const e = await copyDemo.mutateAsync()
                await open(e.id)
              }}
            >
              Copier la démonstration
            </Button>
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCreating(true)}>
              Nouvelle entité
            </Button>
          </>
        }
      />

      {isLoading ? null : entities.length === 0 ? (
        <EmptyState
          icon={<Building2 size={20} />}
          title="Aucune entité pour ce profil"
          action={
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCreating(true)}>
              Créer la première
            </Button>
          }
        >
          Créez l'entité que vous souhaitez cadrer, ou copiez la démonstration pour explorer l'outil sur un cas complet.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial>
            {entities.map((e, i) => (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                exit={{ opacity: 0, scale: 0.97 }}
              >
                <EntityCard
                  entity={e}
                  active={e.id === current}
                  onOpen={() => open(e.id)}
                  onRename={() => setRenaming(e)}
                  onDelete={() => setDeleting(e)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            onClick={() => setCreating(true)}
            className="flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-rule-3 text-sm text-ink-3 transition-colors hover:border-accent-line hover:text-ink"
          >
            <Plus size={18} />
            Nouvelle entité
          </button>
        </div>
      )}

      <CreateDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(id) => {
          setCreating(false)
          selectEntity(id)
          navigate('/app/fiche')
        }}
      />
      {renaming ? <RenameDialog entity={renaming} onClose={() => setRenaming(null)} /> : null}
      {deleting ? (
        <DeleteDialog
          entity={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            if (deleting.id === current) selectEntity(null)
            setDeleting(null)
          }}
        />
      ) : null}
    </div>
  )
}

const REQUIRED = QUESTIONS.filter((q) => q.required).length

function EntityCard({
  entity,
  active,
  onOpen,
  onRename,
  onDelete,
}: {
  entity: EntitySummary
  active: boolean
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const sector = entity.sector ? SECTOR_BY_VALUE.get(entity.sector)?.label : null
  const progress = Math.min(1, entity.answered / Math.max(1, REQUIRED))
  return (
    <Card interactive className={cn('relative flex h-full flex-col p-5', active && 'ring-1 ring-accent-line')}>
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpen} className="flex min-w-0 items-start gap-3 text-left">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-wash text-base font-semibold text-accent">
            {entity.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold text-ink">{entity.name}</span>
            <span className="block truncate text-2xs text-ink-3">{sector ?? 'Secteur non renseigné'}</span>
          </span>
        </button>
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button className="rounded-md p-1.5 text-ink-3 hover:bg-raised hover:text-ink" aria-label={`Actions pour ${entity.name}`}>
              <MoreHorizontal size={15} />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content align="end" sideOffset={4} className="z-50 min-w-40 rounded-md border border-rule bg-surface p-1 shadow-pop">
              <Dropdown.Item onSelect={onRename} className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-sm text-ink-2 outline-none data-[highlighted]:bg-raised data-[highlighted]:text-ink">
                <Pencil size={13} /> Renommer
              </Dropdown.Item>
              <Dropdown.Item onSelect={onDelete} className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-sm text-critical outline-none data-[highlighted]:bg-critical-wash">
                <Trash2 size={13} /> Supprimer
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </div>

      {entity.scope_note ? <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink-2">{entity.scope_note}</p> : null}

      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex items-center justify-between text-2xs text-ink-3">
          <span>Qualification</span>
          <span className="tabular">{progress >= 1 ? 'terminée' : `${Math.round(progress * 100)} %`}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-overlay">
          <motion.div
            className={cn('h-full rounded-full', progress >= 1 ? 'bg-positive' : 'bg-accent')}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.7 }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {active ? <Tag tone="accent">Ouverte</Tag> : null}
          {entity.mode ? <Tag>{entity.mode === 'interne' ? 'Interne' : 'Client'}</Tag> : null}
          {entity.share_enabled ? (
            <Tag>
              <Globe size={10} /> Partagée
            </Tag>
          ) : null}
          <span className="ml-auto text-2xs text-ink-4">Modifiée le {formatDate(entity.updated_at)}</span>
        </div>
      </div>
    </Card>
  )
}

function CreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (id: string) => void
}) {
  const create = useCreateEntity()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<'client' | 'interne'>('client')
  const submit = async () => {
    const e = await create.mutateAsync({ name: name.trim(), scope_note: note.trim(), profile: { mode } })
    setName('')
    setNote('')
    onCreated(e.id)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nouvelle entité"
      description="L'organisation que vous allez cadrer. Sa fiche s'ouvre ensuite, puis la qualification."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim() || create.isPending}>
            Créer l'entité
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) void submit()
        }}
      >
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type de cadrage">
          {([
            ['client', 'Un client', 'Vous accompagnez une organisation tierce.'],
            ['interne', 'Mon organisation', 'Vous cadrez votre propre entreprise.'],
          ] as const).map(([v, label, hint]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={mode === v}
              onClick={() => setMode(v)}
              className={cn(
                'rounded-lg px-3 py-2.5 text-left transition-colors',
                mode === v ? 'bg-accent-wash ring-2 ring-accent' : 'bg-sunken hover:bg-overlay',
              )}
            >
              <span className={cn('block text-sm font-medium', mode === v ? 'text-accent-strong' : 'text-ink')}>{label}</span>
              <span className="block text-2xs text-ink-3">{hint}</span>
            </button>
          ))}
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Nom</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === 'client' ? 'Nom du client' : 'Nom de votre organisation'} autoFocus />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Périmètre (facultatif)</span>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce que couvre le cadrage : une filiale, un produit, un pays…" />
        </label>
      </form>
    </Dialog>
  )
}

function RenameDialog({ entity, onClose }: { entity: EntitySummary; onClose: () => void }) {
  const qc = useQueryClient()
  const userId = useSession((s) => s.userId)
  const [name, setName] = useState(entity.name)
  const [note, setNote] = useState(entity.scope_note)
  const rename = useMutation({
    mutationFn: () => api.updateEntity(entity.id, { name: name.trim(), scope_note: note.trim() }),
    onSuccess: (saved) => {
      qc.setQueryData(keys.entity(saved.id), saved)
      qc.invalidateQueries({ queryKey: keys.entities(userId!) })
      onClose()
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Renommer l'entité"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => rename.mutate()} disabled={!name.trim() || rename.isPending}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Nom</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-2">Périmètre</span>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
    </Dialog>
  )
}

function DeleteDialog({ entity, onClose, onDeleted }: { entity: EntitySummary; onClose: () => void; onDeleted: () => void }) {
  const del = useDeleteEntity()
  const [confirm, setConfirm] = useState('')
  return (
    <Dialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Supprimer « ${entity.name} » ?`}
      description="Réponses, évaluation, contacts, incidents et lien public seront supprimés. Les autres entités ne sont pas touchées."
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="danger"
            icon={<Trash2 size={13} />}
            disabled={confirm.trim() !== entity.name.trim() || del.isPending}
            onClick={async () => {
              await del.mutateAsync(entity.id)
              onDeleted()
            }}
          >
            Supprimer définitivement
          </Button>
        </>
      }
    >
      <label className="block">
        <span className="mb-1.5 block text-xs text-ink-2">
          Saisissez <strong className="text-ink">{entity.name}</strong> pour confirmer.
        </span>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoFocus />
      </label>
    </Dialog>
  )
}
