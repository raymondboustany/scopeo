import { Suspense, useEffect, useRef, type ReactNode } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, CircleHelp, History, LogOut, Network, SlidersHorizontal, UsersRound } from 'lucide-react'
import { Mark } from '@/components/layout/Brand'
import { LanguageToggle, ThemeToggle } from '@/components/layout/ThemeToggle'
import { Tooltip } from '@/components/ui/controls'
import { Tour } from '@/components/tour/Tour'
import { ForcedPasswordChange } from '@/components/auth/fields'
import { useCurrentUser, useLogout, useUpdateUser } from '@/lib/queries'
import { useSession } from '@/lib/store'
import { cn } from '@/lib/utils'
import { tr } from '@/i18n'

/**
 * Espace d'administration, séparé de l'application : sa propre navigation,
 * ses propres écrans. L'interface n'est qu'un confort : chaque route
 * `/api/admin` vérifie elle-même le rôle.
 */

const NAV: { to: string; label: string; icon: ReactNode; tour: string }[] = [
  { to: '/admin', label: tr('Comptes', 'Accounts'), icon: <UsersRound size={16} />, tour: 'admin-nav-users' },
  { to: '/admin/annuaire', label: tr('Annuaire LDAP', 'LDAP directory'), icon: <Network size={16} />, tour: 'admin-nav-ldap' },
  { to: '/admin/reglages', label: tr('Réglages', 'Settings'), icon: <SlidersHorizontal size={16} />, tour: 'admin-nav-settings' },
  { to: '/admin/journal', label: tr('Journal', 'Log'), icon: <History size={16} />, tour: 'admin-nav-audit' },
]

function Loading() {
  return (
    <div className="flex h-64 items-center justify-center gap-3 text-sm text-ink-3">
      <span className="size-4 animate-spin rounded-full border-2 border-rule-2 border-t-accent" aria-hidden />
      {tr('Chargement…', 'Loading…')}
    </div>
  )
}

export default function AdminLayout() {
  const userId = useSession((s) => s.userId)
  const openTour = useSession((s) => s.openTour)
  const { data: user, isLoading } = useCurrentUser()
  const updateUser = useUpdateUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Première visite : le parcours de l'espace d'administration s'ouvre une fois.
  // Marqué vu dès l'ouverture : le profil relu ne doit pas annuler l'affichage.
  const firstVisit = Boolean(user?.is_admin && !user.admin_onboarded && !user.must_change_password)
  const tourStarted = useRef(false)
  useEffect(() => {
    if (!firstVisit || !user || tourStarted.current) return
    tourStarted.current = true
    updateUser.mutate({ id: user.id, patch: { admin_onboarded: true } })
    setTimeout(() => openTour(0, 'admin'), 400)
  }, [firstVisit, user, updateUser, openTour])

  useEffect(() => {
    document.getElementById('admin-scroll')?.scrollTo({ top: 0 })
  }, [pathname])

  if (!userId) return <Navigate to="/" replace />
  if (isLoading || !user) return <Loading />
  if (!user.is_admin) return <Navigate to="/app" replace />
  if (user.must_change_password) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="w-full max-w-md rounded-xl border border-rule bg-surface p-7 shadow-panel">
          <ForcedPasswordChange user={user} onDone={() => undefined} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-frame lg:h-screen lg:overflow-hidden">
      <nav aria-label={tr("Navigation de l'administration", 'Administration navigation')} className="no-print hidden w-[15.5rem] shrink-0 flex-col bg-chrome lg:flex">
        <div className="flex h-[var(--bar)] items-center gap-2.5 px-4">
          <Mark size={26} />
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-ink">Scopeo</span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-accent">{tr('Administration', 'Administration')}</span>
          </span>
        </div>
        <ul className="flex-1 space-y-0.5 px-3 pt-4">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.to === '/admin'}
                data-tour={n.tour}
                className={({ isActive }) =>
                  cn(
                    'group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors',
                    isActive ? 'font-medium text-ink' : 'text-ink-2 hover:bg-tint hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <motion.span
                        layoutId="admin-nav-active"
                        className="absolute inset-0 rounded-md bg-surface shadow-xs ring-1 ring-rule-2"
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    ) : null}
                    <span className={cn('relative shrink-0', isActive ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2')}>{n.icon}</span>
                    <span className="relative truncate">{n.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="space-y-1 p-3">
          <button
            data-tour="admin-back"
            onClick={() => navigate('/app')}
            className="flex h-9 w-full items-center gap-2.5 rounded-md border border-rule-2 bg-surface px-2.5 text-[13px] font-medium text-ink shadow-xs transition-colors hover:border-rule-3"
          >
            <ArrowLeft size={15} className="text-ink-3" />
            {tr('Revenir à Scopeo', 'Back to Scopeo')}
          </button>
          <button
            onClick={async () => {
              await logout()
              navigate('/')
            }}
            className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-xs text-ink-3 transition-colors hover:bg-tint hover:text-ink"
          >
            <LogOut size={14} />
            {tr('Se déconnecter', 'Sign out')}
          </button>
        </div>
      </nav>

      <div
        id="admin-scroll"
        className="flex min-w-0 flex-1 flex-col bg-paper lg:my-2 lg:mr-2 lg:overflow-y-auto lg:rounded-xl lg:border lg:border-rule lg:shadow-panel"
      >
        <header className="no-print sticky top-0 z-30 flex h-[var(--bar)] shrink-0 items-center justify-between gap-3 border-b border-rule bg-paper/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-ink-3">
            <span className="font-medium text-ink">{tr('Administration', 'Administration')}</span>
            <span aria-hidden>·</span>
            <span className="truncate">{user.name}</span>
            {/* Navigation compacte pour les fenêtres étroites */}
            <span className="ml-3 flex gap-1 lg:hidden">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === '/admin'} className={({ isActive }) => cn('rounded-md p-1.5', isActive ? 'bg-surface text-accent shadow-xs' : 'text-ink-3')} aria-label={n.label}>
                  {n.icon}
                </NavLink>
              ))}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Tooltip content={tr('Guide de l’administration', 'Administration guide')}>
              <button
                onClick={() => openTour(0, 'admin')}
                className="flex size-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-tint hover:text-ink"
                aria-label={tr('Relancer le guide de l’administration', 'Replay the administration guide')}
              >
                <CircleHelp size={17} />
              </button>
            </Tooltip>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mx-auto w-full max-w-[72rem]"
          >
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
      <Tour />
    </div>
  )
}
