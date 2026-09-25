import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * État de session.
 *
 * Seuls des pointeurs vivent ici : quel profil est ouvert, quelle entité est
 * chargée, comment l'interface est disposée. L'authentification elle-même est
 * portée par un cookie de session que le serveur vérifie à chaque requête ;
 * les données sont au serveur, source unique de vérité.
 */

interface SessionState {
  userId: string | null
  entityId: string | null
  /** Dernier nom de profil utilisé sur ce navigateur, pour préremplir la connexion. */
  lastName: string
  sidebarCollapsed: boolean
  theme: 'light' | 'dark'
  notesOpen: boolean
  tourOpen: boolean
  tourStep: number
  /** Parcours affiché : celui de l'application ou celui de l'espace d'administration. */
  tourKind: 'app' | 'admin'

  signIn: (userId: string, entityId?: string | null) => void
  signOut: () => void
  setLastName: (name: string) => void
  selectEntity: (entityId: string | null) => void
  toggleSidebar: () => void
  toggleTheme: () => void
  setNotesOpen: (open: boolean) => void
  openTour: (step?: number, kind?: 'app' | 'admin') => void
  closeTour: () => void
  setTourStep: (step: number) => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      entityId: null,
      lastName: '',
      sidebarCollapsed: false,
      theme: 'light',
      notesOpen: false,
      tourOpen: false,
      tourStep: 0,
      tourKind: 'app',

      signIn: (userId, entityId = null) => set({ userId, entityId }),
      signOut: () => set({ userId: null, entityId: null, tourOpen: false }),
      setLastName: (lastName) => set({ lastName }),
      selectEntity: (entityId) => set({ entityId }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setNotesOpen: (notesOpen) => set({ notesOpen }),
      openTour: (step = 0, kind = 'app') => set({ tourOpen: true, tourStep: step, tourKind: kind }),
      closeTour: () => set({ tourOpen: false }),
      setTourStep: (tourStep) => set({ tourStep }),
    }),
    {
      name: 'scopeo:session',
      version: 4,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        userId: s.userId,
        entityId: s.entityId,
        lastName: s.lastName,
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
      }),
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<SessionState>
        // Avant l'authentification, un identifiant de profil suffisait à ouvrir
        // une session : il ne vaut plus rien sans cookie, on repart de zéro.
        return { ...p, userId: null, entityId: null, lastName: p.lastName ?? '' } as SessionState
      },
    },
  ),
)
