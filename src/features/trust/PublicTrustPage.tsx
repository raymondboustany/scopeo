import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { Eye, Link2Off } from 'lucide-react'
import { Mark } from '@/components/layout/Brand'
import { Disclaimer, EmptyState, Tag } from '@/components/ui/primitives'
import { usePublicView } from '@/lib/queries'
import { ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { SnapshotView } from './SnapshotView'

/** Page publique du Trust Center — lecture seule, sans session. */
export default function PublicTrustPage() {
  const { token } = useParams()
  const { data, error, isLoading } = usePublicView(token)

  return (
    <div className="stage min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md border border-rule-2 bg-raised">
              <Mark size={18} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink">Scopeo</span>
          </Link>
          <Tag tone="accent">
            <Eye size={11} /> Trust Center — lecture seule
          </Tag>
        </header>

        {isLoading ? (
          <div className="h-64" />
        ) : error || !data ? (
          <EmptyState icon={<Link2Off size={20} />} title="Ce lien n'est pas ou plus actif">
            {error instanceof ApiError && error.status === 0
              ? 'Le serveur qui héberge cette page ne répond pas.'
              : "Le partage a pu être désactivé ou le lien renouvelé par son propriétaire. Demandez-lui un lien à jour."}
          </EmptyState>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-accent">
                Posture réglementaire déclarée
                {data.is_demo ? <Tag>Démonstration</Tag> : null}
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{data.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
                Textes européens applicables et avancement déclaré sur les exigences qu'ils imposent. Mise à jour le{' '}
                {formatDate(data.updated_at)}.
              </p>
            </div>
            {data.snapshot ? (
              <SnapshotView name={data.name} snapshot={data.snapshot} />
            ) : (
              <EmptyState title="Aucune donnée publiée pour l'instant">Le cadrage de cette entité n'est pas encore terminé.</EmptyState>
            )}
            <Disclaimer />
          </motion.div>
        )}
      </div>
    </div>
  )
}
