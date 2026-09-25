import { NotesButton, NotesDrawer } from '@/components/notes/NotesDrawer'
import { LanguageToggle, ThemeToggle } from './ThemeToggle'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { AnimatePresence, motion } from 'motion/react'
import {
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  CheckCheck,
  CloudUpload,
  LogOut,
  Menu,
  ShieldCheck,
  Plus,
  Search,
  TriangleAlert,
  UserRound,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Wordmark } from './Brand'
import { NAV, NAV_GROUPS, type NavEntry } from './nav'
import { CommandPalette } from './CommandPalette'
import { Tooltip } from '@/components/ui/controls'
import { useSession } from '@/lib/store'
import { useCurrentEntity, useCurrentUser, useEntities, useLogout, useSaveStatus, flushAll } from '@/lib/queries'
import { useScoping } from '@/lib/hooks'
import { tr } from '@/i18n'
import { Tour } from '@/components/tour/Tour'
import { FeedbackButton } from '@/components/feedback/FeedbackDialog'

const ROLE_LABEL: Record<string, string> = {
  consultant: tr('Consultant', 'Consultant'),
  dpo: tr('DPO', 'DPO'),
  rssi: tr('RSSI', 'CISO'),
  juriste: tr('Juriste', 'Legal counsel'),
  dirigeant: tr('Direction', 'Executive'),
  auditeur: tr('Auditeur', 'Auditor'),
  autre: tr('Utilisateur', 'User'),
}

/* ========================================================================== */

function NavItem({ entry, collapsed, disabled }: { entry: NavEntry; collapsed: boolean; disabled: boolean }) {
  if (disabled) {
    return (
      <Tooltip content={tr("Chargez d'abord une entité.", 'Load an entity first.')} side="right">
        <span
          className={cn(
            'flex h-8 cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 text-[13px] text-ink-4',
            collapsed && 'justify-center px-0',
          )}
        >
          <span className="shrink-0 opacity-60">{entry.icon}</span>
          {collapsed ? null : <span className="truncate">{entry.label}</span>}
        </span>
      </Tooltip>
    )
  }
  const link = (
    <NavLink
      to={entry.to}
      end={entry.to === '/app'}
      data-tour={entry.tour}
      className={({ isActive }) =>
        cn(
          'group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'font-medium text-ink' : 'text-ink-2 hover:bg-tint hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-0 rounded-md bg-surface shadow-xs ring-1 ring-rule-2"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          ) : null}
          <span className={cn('relative shrink-0 transition-colors [&_svg]:size-4', isActive ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2')}>
            {entry.icon}
          </span>
          {collapsed ? null : <span className="relative truncate">{entry.label}</span>}
        </>
      )}
    </NavLink>
  )
  return collapsed ? (
    <Tooltip content={entry.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  )
}

function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const collapsedPref = useSession((s) => s.sidebarCollapsed)
  const toggle = useSession((s) => s.toggleSidebar)
  const hasEntity = Boolean(useSession((s) => s.entityId))
  const { qualified } = useScoping()
  const collapsed = mobile ? false : collapsedPref

  return (
    <nav
      aria-label={tr('Navigation principale', 'Main navigation')}
      data-tour="sidebar"
      onClick={onNavigate}
      className={cn(
        'no-print flex h-full flex-col bg-chrome transition-[width] duration-300 ease-out',
        mobile && 'border-r border-rule',
        mobile ? 'w-72' : collapsed ? 'w-[var(--rail-collapsed)]' : 'w-[var(--rail)]',
      )}
    >
      <div className={cn('flex h-[var(--bar)] shrink-0 items-center', collapsed ? 'justify-center' : 'px-4')}>
        <Wordmark collapsed={collapsed} />
      </div>

      <div className={cn('flex-1 overflow-y-auto pb-4 pt-2', collapsed ? 'px-2' : 'px-3')}>
        {NAV_GROUPS.map((g) => (
          <div key={g.id} className="mb-5 last:mb-0">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-rule-2" aria-hidden />
            ) : (
              <div className="px-2.5 pb-1.5 text-[11px] font-medium text-ink-4">{g.label}</div>
            )}
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === g.id && (!n.needsQualification || qualified)).map((n) => (
                <li key={n.to}>
                  <NavItem entry={n} collapsed={collapsed} disabled={Boolean(n.needsEntity && !hasEntity)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {mobile ? null : (
        <div className={cn('p-2', collapsed ? 'flex justify-center' : '')}>
          <button
            onClick={toggle}
            aria-label={collapsed ? tr('Déplier la navigation', 'Expand navigation') : tr('Replier la navigation', 'Collapse navigation')}
            className={cn(
              'flex h-8 items-center gap-2 rounded-md px-2.5 text-xs text-ink-3 transition-colors hover:bg-tint hover:text-ink',
              collapsed ? 'justify-center' : 'w-full',
            )}
          >
            {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
            {collapsed ? null : tr('Replier', 'Collapse')}
          </button>
        </div>
      )}
    </nav>
  )
}

/* ========================================================================== */

function EntitySwitcher() {
  const { data: entities = [] } = useEntities()
  const { data: current } = useCurrentEntity()
  const selectEntity = useSession((s) => s.selectEntity)
  const navigate = useNavigate()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          data-tour="entity-switcher"
          className="inline-flex h-8 max-w-[16rem] items-center gap-2 rounded-md border border-rule-2 bg-surface px-2.5 text-[13px] text-ink shadow-xs transition-colors hover:border-rule-3 hover:bg-tint"
        >
          <span className={cn('size-2 shrink-0 rounded-full', current ? 'bg-positive' : 'bg-ink-4')} aria-hidden />
          <span className="truncate font-medium">{current?.name ?? tr('Aucune entité', 'No entity')}</span>
          <ChevronDown size={14} className="shrink-0 text-ink-3" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-50 w-72 rounded-xl border border-rule bg-surface p-1.5 shadow-pop">
          <div className="label-caps px-2 py-1.5">{tr('Entités de ce profil', 'Entities in this profile')}</div>
          {entities.length === 0 ? <p className="px-2 py-2 text-xs text-ink-3">{tr("Aucune entité pour l'instant.", 'No entities yet.')}</p> : null}
          {entities.map((e) => (
            <DropdownMenu.Item
              key={e.id}
              onSelect={() => {
                void flushAll()
                selectEntity(e.id)
              }}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-sm text-ink-2 outline-none data-[highlighted]:bg-tint data-[highlighted]:text-ink"
            >
              <span className="truncate">{e.name}</span>
              {e.id === current?.id ? <Check size={14} className="shrink-0 text-accent" /> : null}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1.5 h-px bg-rule-2" />
          <DropdownMenu.Item
            onSelect={() => navigate('/app/entites?nouvelle=1')}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-ink-2 outline-none data-[highlighted]:bg-tint data-[highlighted]:text-ink"
          >
            <Plus size={14} />
            {tr('Nouvelle entité', 'New entity')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function SaveIndicator() {
  const { state, error } = useSaveStatus()
  if (state === 'idle') return null
  const content =
    state === 'error' ? (
      <span className="flex items-center gap-1.5 text-critical">
        <TriangleAlert size={13} />
        {tr('Non enregistré', 'Not saved')}
      </span>
    ) : state === 'saved' ? (
      <span className="flex items-center gap-1.5 text-ink-3">
        <CheckCheck size={14} />
        {tr('Enregistré', 'Saved')}
      </span>
    ) : (
      <span className="flex items-center gap-1.5 text-ink-3">
        <CloudUpload size={14} className="animate-pulse" />
        {tr('Enregistrement…', 'Saving…')}
      </span>
    )
  return (
    <Tooltip content={error ?? tr('Chaque modification est enregistrée sur le serveur local.', 'Every change is saved to the local server.')}>
      <span className="hidden text-xs sm:inline-flex" role="status">
        {content}
      </span>
    </Tooltip>
  )
}

function UserMenu() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const openTour = useSession((s) => s.openTour)
  const navigate = useNavigate()
  // Le profil invité porte un nom technique en français : on l'affiche dans la langue de l'interface.
  const displayName = user?.is_guest ? tr('Invité', 'Guest') : (user?.name ?? '')

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="inline-flex h-8 items-center gap-2 rounded-md px-1.5 text-[13px] text-ink-2 transition-colors hover:bg-tint hover:text-ink">
          <span className="flex size-6 items-center justify-center rounded-full bg-accent bg-gradient-to-br from-[#8b74ff] to-[#5a3fe0] text-[11px] font-semibold text-white shadow-xs">
            {(displayName || '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden max-w-[8rem] truncate md:inline">{displayName}</span>
          <ChevronDown size={13} className="text-ink-3" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 w-60 rounded-xl border border-rule bg-surface p-1.5 shadow-pop">
          <div className="px-2 py-2">
            <div className="truncate text-sm font-medium text-ink">{displayName}</div>
            <div className="text-2xs text-ink-3">
              {user?.is_guest ? tr('Mode invité', 'Guest mode') : ROLE_LABEL[user?.role ?? 'autre']}
              {user?.is_admin ? ` · ${tr('administrateur', 'administrator')}` : ''}
              {user?.organisation ? ` · ${user.organisation}` : ''}
            </div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-rule-2" />
          {[
            ...(user?.is_admin
              ? [{ icon: <ShieldCheck size={14} />, label: tr('Administration', 'Administration'), onSelect: () => navigate('/admin') }]
              : []),
            { icon: <UserRound size={14} />, label: tr('Profil et données', 'Profile and data'), onSelect: () => navigate('/app/parametres') },
            { icon: <CircleHelp size={14} />, label: tr('Relancer le parcours guidé', 'Restart the guided tour'), onSelect: () => openTour(0) },
            {
              icon: <LogOut size={14} />,
              label: tr('Se déconnecter', 'Sign out'),
              onSelect: async () => {
                await logout()
                navigate('/')
              },
            },
          ].map((item) => (
            <DropdownMenu.Item
              key={item.label}
              onSelect={item.onSelect}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-ink-2 outline-none data-[highlighted]:bg-tint data-[highlighted]:text-ink"
            >
              <span className="text-ink-3">{item.icon}</span>
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/* ========================================================================== */

export function AppShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const openTour = useSession((s) => s.openTour)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-screen bg-paper lg:h-screen lg:overflow-hidden lg:bg-frame">
      <div className="sticky top-0 hidden h-screen lg:block">
        <Sidebar />
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <motion.div
              className="absolute inset-y-0 left-0"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
              <Sidebar mobile onNavigate={() => setMobileOpen(false)} />
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 rounded-md p-1.5 text-ink-3 hover:bg-tint"
                aria-label={tr('Fermer la navigation', 'Close navigation')}
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        id="main-scroll"
        className="flex min-w-0 flex-1 flex-col bg-paper lg:my-2 lg:mr-2 lg:overflow-y-auto lg:rounded-xl lg:border lg:border-rule lg:shadow-panel"
      >
        <header className="no-print sticky top-0 z-30 flex h-[var(--bar)] shrink-0 items-center justify-between gap-3 border-b border-rule bg-paper/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-ink-2 hover:bg-tint lg:hidden"
              aria-label={tr('Ouvrir la navigation', 'Open navigation')}
            >
              <Menu size={18} />
            </button>
            <EntitySwitcher />
            <SaveIndicator />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => setPaletteOpen(true)}
              data-tour="search"
              className="hidden h-8 w-56 items-center gap-2 rounded-md border border-rule-2 bg-surface pl-2.5 pr-1.5 text-[13px] text-ink-3 shadow-xs transition-colors hover:border-rule-3 hover:text-ink-2 sm:inline-flex"
            >
              <Search size={14} />
              <span className="flex-1 text-left">{tr('Rechercher…', 'Search…')}</span>
              <kbd className="rounded-[5px] border border-rule-2 bg-raised px-1.5 py-px font-sans text-[10px] font-medium text-ink-3">Ctrl K</kbd>
            </button>
            <Tooltip content={tr('Parcours guidé', 'Guided tour')}>
              <button
                onClick={() => openTour(0)}
                className="flex size-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-tint hover:text-ink"
                aria-label={tr('Relancer le parcours guidé', 'Restart the guided tour')}
              >
                <CircleHelp size={17} />
              </button>
            </Tooltip>
            <NotesButton />
            <FeedbackButton />
            <LanguageToggle />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
          {/*
           * Entrée animée seulement : attendre la sortie de l'écran précédent
           * (mode « wait ») bloque l'affichage lorsque l'écran suivant est
           * chargé en différé et suspend pendant la transition.
           */}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mx-auto w-full max-w-[84rem]"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <NotesDrawer />
      <Tour />
    </div>
  )
}
