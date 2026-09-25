import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, PlugZap, Plus, Trash2 } from 'lucide-react'
import { Button, Dialog, Input, Select } from '@/components/ui/controls'
import { Card, CardHeader } from '@/components/ui/primitives'
import { api } from '@/lib/api'
import { copyText, formatDateShort } from '@/lib/utils'
import { tr } from '@/i18n'

const DURATIONS = [
  { value: '30', label: tr('30 jours', '30 days') },
  { value: '90', label: tr('90 jours', '90 days') },
  { value: '365', label: tr('1 an', '1 year') },
  { value: '0', label: tr('Sans échéance', 'No expiry') },
]

/**
 * Jetons d'accès personnels : relier ses entités à un script ou à une autre
 * plateforme (GRC, tableau de bord) par l'API, sans partager son mot de passe.
 */
export function ApiTokensCard() {
  const qc = useQueryClient()
  const { data: tokens = [] } = useQuery({ queryKey: ['tokens'], queryFn: api.tokens })
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [days, setDays] = useState('90')
  const [issued, setIssued] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const refresh = () => qc.invalidateQueries({ queryKey: ['tokens'] })

  const create = useMutation({
    mutationFn: () => api.createToken(name.trim(), Number(days)),
    onSuccess: (t) => {
      setIssued(t.token)
      setCreating(false)
      setName('')
      void refresh()
    },
  })
  const revoke = useMutation({ mutationFn: (id: string) => api.revokeToken(id), onSuccess: () => void refresh() })

  return (
    <Card>
      <CardHeader
        title={tr("Jetons d'API", 'API tokens')}
        subtitle={tr(
          "Pour relier vos entités à un script ou à une autre plateforme. Un jeton agit en votre nom, sur vos seules entités, sans accès à l'administration ni à la sécurité du compte.",
          'To connect your entities to a script or another platform. A token acts on your behalf, on your entities only, without access to administration or account security.',
        )}
        icon={<PlugZap size={16} />}
        aside={
          <Button size="sm" icon={<Plus size={13} />} onClick={() => setCreating(true)}>
            {tr('Nouveau jeton', 'New token')}
          </Button>
        }
      />
      <div className="p-5">
        {tokens.length === 0 ? (
          <p className="text-xs text-ink-3">{tr('Aucun jeton pour l’instant.', 'No tokens yet.')}</p>
        ) : (
          <ul className="divide-y divide-rule rounded-lg border border-rule">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{t.name}</span>
                  <span className="block text-2xs text-ink-3">
                    <code className="font-mono">{t.prefix}…</code>
                    {' · '}
                    {tr('créé le', 'created')} {formatDateShort(t.created_at)}
                    {' · '}
                    {t.expires_at ? `${tr('expire le', 'expires')} ${formatDateShort(t.expires_at)}` : tr('sans échéance', 'no expiry')}
                    {' · '}
                    {t.last_used_at ? `${tr('dernier usage', 'last used')} ${formatDateShort(t.last_used_at)}` : tr('jamais utilisé', 'never used')}
                  </span>
                </span>
                <Button size="sm" variant="danger" icon={<Trash2 size={13} />} disabled={revoke.isPending} onClick={() => revoke.mutate(t.id)}>
                  {tr('Révoquer', 'Revoke')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-2xs leading-relaxed text-ink-3">
          {tr('Usage : en-tête', 'Usage: header')} <code className="font-mono">Authorization: Bearer scp_…</code>
          {tr(' ; description des routes :', '; route description:')} <code className="font-mono">/api/openapi.json</code>.
        </p>
      </div>

      <Dialog
        open={creating}
        onOpenChange={setCreating}
        title={tr("Nouveau jeton d'API", 'New API token')}
        footer={
          <>
            <Button onClick={() => setCreating(false)}>{tr('Annuler', 'Cancel')}</Button>
            <Button variant="primary" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
              {tr('Créer', 'Create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Nom', 'Name')}</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('Export vers la GRC', 'Export to GRC')} autoFocus />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-2">{tr('Validité', 'Validity')}</span>
            <Select value={days} onValueChange={setDays} options={DURATIONS} ariaLabel={tr('Validité', 'Validity')} />
          </label>
        </div>
        {create.error ? <p role="alert" className="mt-3 text-xs text-critical">{create.error.message}</p> : null}
      </Dialog>

      <Dialog
        open={issued !== null}
        onOpenChange={(v) => {
          if (!v) {
            setIssued(null)
            setCopied(false)
          }
        }}
        title={tr('Votre jeton', 'Your token')}
        description={tr('Il ne sera plus affiché. Conservez-le dans un coffre de secrets.', 'It will not be shown again. Keep it in a secrets vault.')}
        footer={
          <Button variant="primary" onClick={() => setIssued(null)}>
            {tr('Terminé', 'Done')}
          </Button>
        }
      >
        <div className="flex items-center gap-2 rounded-lg border border-rule bg-raised p-3">
          <code className="flex-1 break-all font-mono text-xs text-ink">{issued}</code>
          <Button
            size="sm"
            icon={copied ? <Check size={13} /> : <Copy size={13} />}
            onClick={async () => {
              if (await copyText(issued ?? '')) setCopied(true)
            }}
          >
            {copied ? tr('Copié', 'Copied') : tr('Copier', 'Copy')}
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}
