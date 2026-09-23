import { Moon, Sun } from 'lucide-react'
import { useSession } from '@/lib/store'
import { Tooltip } from '@/components/ui/controls'

/** Bascule entre thème clair et thème sombre. */
export function ThemeToggle() {
  const theme = useSession((s) => s.theme)
  const toggle = useSession((s) => s.toggleTheme)
  const label = theme === 'light' ? 'Passer en thème sombre' : 'Passer en thème clair'
  return (
    <Tooltip content={label}>
      <button onClick={toggle} aria-label={label} className="rounded-md p-2 text-ink-3 transition-colors hover:bg-raised hover:text-ink">
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    </Tooltip>
  )
}
