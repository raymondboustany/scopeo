import { Suspense, lazy, useEffect } from 'react'
import { createHashRouter, Navigate, Outlet, RouterProvider, useLocation, useRouteError } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { AppShell } from '@/components/layout/AppShell'
import { Button, TooltipProvider } from '@/components/ui/controls'
import { EmptyState } from '@/components/ui/primitives'
import { queryClient, useCurrentEntity, useCurrentUser } from '@/lib/queries'
import { useSession } from '@/lib/store'
import { ApiError } from '@/lib/api'
import { useSnapshotSync } from '@/lib/hooks'

const Landing = lazy(() => import('@/features/landing/LandingPage'))
const PublicTrust = lazy(() => import('@/features/trust/PublicTrustPage'))
const Dashboard = lazy(() => import('@/features/dashboard/DashboardPage'))
const Entities = lazy(() => import('@/features/entities/EntitiesPage'))
const EntityProfile = lazy(() => import('@/features/entity/EntityProfilePage'))
const Qualification = lazy(() => import('@/features/qualification/QualificationPage'))
const Corpus = lazy(() => import('@/features/corpus/CorpusPage'))
const Crosswalk = lazy(() => import('@/features/crosswalk/CrosswalkPage'))
const Assessment = lazy(() => import('@/features/assessment/AssessmentPage'))
const Priorities = lazy(() => import('@/features/priorities/PrioritiesPage'))
const Roadmap = lazy(() => import('@/features/roadmap/RoadmapPage'))
const Timeline = lazy(() => import('@/features/timeline/TimelinePage'))
const Signalement = lazy(() => import('@/features/signalement/SignalementPage'))
const Report = lazy(() => import('@/features/report/ReportPage'))
const TrustSettings = lazy(() => import('@/features/trust/TrustSettingsPage'))
const Settings = lazy(() => import('@/features/settings/SettingsPage'))

function Loading() {
  return (
    <div className="flex h-64 items-center justify-center gap-3 text-sm text-ink-3">
      <span className="size-4 animate-spin rounded-full border-2 border-rule-2 border-t-accent" aria-hidden />
      Chargement…
    </div>
  )
}

function useScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
}

/** Garde de l'application : sans profil ouvert, on revient à l'accueil. */
function AppLayout() {
  useScrollReset()
  const userId = useSession((s) => s.userId)
  const signOut = useSession((s) => s.signOut)
  const selectEntity = useSession((s) => s.selectEntity)
  const { data: user, error, isLoading } = useCurrentUser()
  const entity = useCurrentEntity()

  // Un profil ou une entité supprimés ailleurs ne doivent pas bloquer l'accès.
  useEffect(() => {
    if (error instanceof ApiError && error.status === 404) signOut()
  }, [error, signOut])
  useEffect(() => {
    if (entity.error instanceof ApiError && entity.error.status === 404) selectEntity(null)
  }, [entity.error, selectEntity])

  if (!userId) return <Navigate to="/" replace />
  if (error instanceof ApiError && error.status === 0) return <ServerDown />

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
        title="Le serveur local ne répond pas"
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        }
      >
        L'application enregistre vos données sur un serveur qui tourne sur ce poste. Lancez-le avec{' '}
        <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-xs text-ink">npm run dev</code> puis rechargez.
      </EmptyState>
    </div>
  )
}

function ErrorScreen() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : "Une erreur inattendue s'est produite."
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <EmptyState
        title="L'écran n'a pas pu être affiché"
        action={
          <Button variant="primary" onClick={() => (window.location.hash = '#/app')}>
            Revenir au tableau de bord
          </Button>
        }
      >
        <p>{message}</p>
        <p className="mt-2">Vos données sont enregistrées sur le serveur local et ne sont pas affectées.</p>
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
