import { BadgeCheck, TriangleAlert } from 'lucide-react'
import { Tooltip } from '@/components/ui/controls'
import { isoCertificateValid } from '@/engines/scores'
import { cn, formatDate } from '@/lib/utils'
import { tr } from '@/i18n'
import type { IsoProfile } from '@/types/domain'

/**
 * Badge « Certifié ISO 27001 ». Il n'apparaît que pour un statut certifié ;
 * un certificat dont la date de validité est passée est signalé comme expiré
 * plutôt que présenté comme valide.
 */
export function IsoBadge({ iso, className, size = 'md' }: { iso: IsoProfile | undefined; className?: string; size?: 'sm' | 'md' }) {
  if (iso?.status !== 'certifie') return null
  const valid = isoCertificateValid(iso)
  const until = iso.validUntil ? formatDate(iso.validUntil) : null
  const label = valid ? tr('Certifié ISO 27001', 'ISO 27001 certified') : tr('Certificat ISO 27001 expiré', 'ISO 27001 certificate expired')
  const detail = until
    ? valid
      ? tr(`Valide jusqu'au ${until}`, `Valid until ${until}`)
      : tr(`Expiré le ${until}`, `Expired on ${until}`)
    : tr('Date de validité non renseignée', 'Validity date not provided')
  return (
    <Tooltip content={detail}>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border font-semibold',
          size === 'sm' ? 'h-6 px-2 text-2xs' : 'h-8 px-2.5 text-xs',
          valid ? 'border-positive-line bg-positive-wash text-positive' : 'border-caution-line bg-caution-wash text-caution',
          className,
        )}
      >
        {valid ? <BadgeCheck size={size === 'sm' ? 12 : 14} /> : <TriangleAlert size={size === 'sm' ? 12 : 14} />}
        {label}
        {until ? <span className="font-normal opacity-80">· {until}</span> : null}
      </span>
    </Tooltip>
  )
}
