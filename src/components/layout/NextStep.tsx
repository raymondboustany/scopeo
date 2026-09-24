import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { tr } from '@/i18n'

/**
 * Étape suivante du cadrage, en bas de page : l'utilisateur n'a jamais à
 * deviner où aller ensuite.
 */
export function NextStep({ to, label, hint }: { to: string; label: string; hint?: string }) {
  return (
    <Link
      to={to}
      className="group mt-2 flex items-center justify-between gap-4 rounded-lg border border-rule-2 bg-surface px-5 py-4 transition-colors hover:border-rule-3 hover:bg-tint"
    >
      <span className="min-w-0">
        <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-4">{tr('Étape suivante', 'Next step')}</span>
        <span className="mt-0.5 block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="block text-2xs text-ink-3">{hint}</span> : null}
      </span>
      <ArrowRight size={16} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
    </Link>
  )
}
