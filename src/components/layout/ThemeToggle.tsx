import { Languages, Moon, Sun } from 'lucide-react'
import { useSession } from '@/lib/store'
import { Tooltip } from '@/components/ui/controls'
import { LANG, setLang, tr } from '@/i18n'
import { flushAll } from '@/lib/queries'
import { cn } from '@/lib/utils'

/** Bascule entre thème clair et thème sombre. */
export function ThemeToggle() {
  const theme = useSession((s) => s.theme)
  const toggle = useSession((s) => s.toggleTheme)
  const label = theme === 'light' ? tr('Passer en thème sombre', 'Switch to dark theme') : tr('Passer en thème clair', 'Switch to light theme')
  return (
    <Tooltip content={label}>
      <button onClick={toggle} aria-label={label} className="flex size-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-tint hover:text-ink">
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    </Tooltip>
  )
}

/**
 * Bascule de langue. Les saisies en attente sont enregistrées avant le
 * rechargement qui applique la nouvelle langue.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const next = LANG === 'fr' ? 'en' : 'fr'
  const label = LANG === 'fr' ? 'Switch to English' : 'Passer en français'
  return (
    <Tooltip content={label}>
      <button
        onClick={async () => {
          await flushAll()
          setLang(next)
        }}
        aria-label={label}
        lang={next}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3 transition-colors hover:bg-tint hover:text-ink',
          className,
        )}
      >
        <Languages size={15} />
        {next}
      </button>
    </Tooltip>
  )
}
