import { Suspense, lazy, useEffect } from 'react'
import { createHashRouter, Navigate, Outlet, RouterProvider, useLocation, useRouteError } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { AppShell } from '@/components/layout/AppShell'
import { Button, TooltipProvider } from '@/components/ui/controls'
import { EmptyState } from '@/components/ui/primitives'
import { queryClient, useCurrentEntity, useCurrentUser } from '@/lib/queries'
import { useSession } from '@/lib/store'
import { ApiError, setUnauthenticatedHandler } from '@/lib/api'
import { useSnapshotSync } from '@/lib/hooks'
import { ForcedPasswordChange } from '@/components/auth/fields'
import { tr } from '@/i18n'

const Landing = lazy(() => import('@/features/landing/LandingPage'))
const PublicTrust = lazy(() => import('@/features/trust/PublicTrustPage'))
const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage'))
const Entities = lazy(() => import('@/features/entities/EntitiesPage'))
const EntityProfile = lazy(() => import('@/features/entity/EntityProfilePage'))
const Qualification = lazy(() => import('@/features/qualification/QualificationPage'))
const Corpus = lazy(() => import('@/features/corpus/CorpusPage'))
const Crosswalk = lazy(() => import('@/features/crosswalk/CrosswalkPage'))
const Assessment = lazy(() => import('@/features/assessment/AssessmentPage'))
const Iso = lazy(() => import('@/features/iso/IsoPage'))
const Priorities = lazy(() => import('@/features/priorities/PrioritiesPage'))
const Roadmap = lazy(() => import('@/features/roadmap/RoadmapPage'))
const Timeline = lazy(() => import('@/features/timeline/TimelinePage'))
const Signalement = lazy(() => import('@/features/signalement/SignalementPage'))
const Report = lazy(() => import('@/features/report/ReportPage'))
const TrustSettings = lazy(() => import('@/features/trust/TrustSettingsPage'))
const Settings = lazy(() => import('@/features/settings/SettingsPage'))
const AdminLayout = lazy(() => import('@/features/admin/AdminLayout'))
const AdminUsers = lazy(() => import('@/features/admin/UsersPage'))
const AdminLdap = lazy(() => import('@/features/admin/LdapPage'))
const AdminSso = lazy(() => import('@/features/admin/SsoPage'))
const AdminSettings = lazy(() => import('@/features/admin/SettingsAdminPage'))
const AdminAudit = lazy(() => import('@/features/admin/AuditPage'))

// Une session expirée ou révoquée ramène à l'écran de connexion.
setUnauthenticatedHandler(() => {
  useSession.getState().signOut()
  queryClient.clear()
})

function Loading() {
  return (
    <div className="flex h-64 items-center justify-center gap-3 text-sm text-ink-3">
      <span className="size-4 animate-spin rounded-full border-2 border-rule-2 border-t-accent" aria-hidden />
      {tr('Chargement…', 'Loading…')}
    </div>
  )
}

function useScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
}

/** Garde de l'application : sans session valide, on revient à l'écran de connexion. */
function AppLayout() {
  useScrollReset()
  const userId = useSession((s) => s.userId)
  const signOut = useSession((s) => s.signOut)
  const selectEntity = useSession((s) => s.selectEntity)
  const { data: user, error, isLoading } = useCurrentUser()
  const entity = useCurrentEntity()

  useEffect(() => {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) signOut()
  }, [error, signOut])
  // Une entité supprimée ailleurs ne doit pas bloquer l'accès.
  useEffect(() => {
    if (entity.error instanceof ApiError && entity.error.status === 404) selectEntity(null)
  }, [entity.error, selectEntity])

  if (!userId) return <Navigate to="/" replace />
  if (error instanceof ApiError && error.status === 0) return <ServerDown />
  // Mot de passe provisoire : rien d'autre n'est accessible avant de l'avoir remplacé.
  if (user?.must_change_password) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="w-full max-w-md rounded-xl border border-rule bg-surface p-7 shadow-panel">
          <ForcedPasswordChange user={user} onDone={() => undefined} />
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <SnapshotSync />
      {isLoading || !user ? (
        <Loading />
      ) : (
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      )}
    </AppShell>
  )
}

function SnapshotSync() {
  useSnapshotSync()
  return null
}

function Bare() {
  useScrollReset()
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <Outlet />
    </Suspense>
  )
}

function ServerDown() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <EmptyState
        title={tr('Le serveur local ne répond pas', 'The local server is not responding')}
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            {tr('Réessayer', 'Retry')}
          </Button>
        }
      >
        {tr(
          "La plateforme ne joint pas son serveur. Sur un serveur d'équipe, prévenez l'administrateur ; sur ce poste, lancez-le avec ",
          'The platform cannot reach its server. On a team server, contact the administrator; on this machine, start it with ',
        )}
        <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs text-ink">npm run dev</code>
        {tr(' puis rechargez.', ' then reload.')}
      </EmptyState>
    </div>
  )
}

function ErrorScreen() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : tr("Une erreur inattendue s'est produite.", 'An unexpected error occurred.')
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <EmptyState
        title={tr("L'écran n'a pas pu être affiché", 'This screen could not be displayed')}
        action={
          <Button variant="primary" onClick={() => (window.location.hash = '#/app')}>
            {tr('Revenir au tableau de bord', 'Back to the dashboard')}
          </Button>
        }
      >
        <p>{message}</p>
        <p className="mt-2">
          {tr(
            'Vos données sont enregistrées sur le serveur local et ne sont pas affectées.',
            'Your data is stored on the local server and is not affected.',
          )}
        </p>
      </EmptyState>
    </div>
  )
}

/*
 * Routage par fragment : l'application compilée est servie telle quelle par
 * le serveur local, sans règle de réécriture d'URL.
 */
const router = createHashRouter([
  {
    element: <Bare />,
    errorElement: <ErrorScreen />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/trust/:token', element: <PublicTrust /> },
    ],
  },
  {
    path: '/app',
    element: <AppLayout />,
    errorElement: <ErrorScreen />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'entites', element: <Entities /> },
      { path: 'fiche', element: <EntityProfile /> },
      { path: 'qualification', element: <Qualification /> },
      { path: 'corpus', element: <Corpus /> },
      { path: 'croisements', element: <Crosswalk /> },
      { path: 'evaluation', element: <Assessment /> },
      { path: 'iso27001', element: <Iso /> },
      { path: 'priorisation', element: <Priorities /> },
      { path: 'feuille-de-route', element: <Roadmap /> },
      { path: 'echeancier', element: <Timeline /> },
      { path: 'signalement', element: <Signalement /> },
      { path: 'incidents', element: <Navigate to="/app/signalement" replace /> },
      { path: 'rapport', element: <Report /> },
      { path: 'trust', element: <TrustSettings /> },
      { path: 'parametres', element: <Settings /> },
      { path: '*', element: <Navigate to="/app" replace /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<div className="min-h-screen bg-frame" />}>
        <AdminLayout />
      </Suspense>
    ),
    errorElement: <ErrorScreen />,
    children: [
      { index: true, element: <AdminUsers /> },
      { path: 'annuaire', element: <AdminLdap /> },
      { path: 'sso', element: <AdminSso /> },
      { path: 'reglages', element: <AdminSettings /> },
      { path: 'journal', element: <AdminAudit /> },
      { path: '*', element: <Navigate to="/admin" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  )
}
