import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * État de session.
 *
 * Seuls des pointeurs vivent ici : quel profil est ouvert, quelle entité est
 * chargée, comment l'interface est disposée. Les données elles-mêmes sont au
 * serveur, source unique de vérité — rien ne peut diverger entre deux onglets
 * ou deux sessions.
 */

interface SessionState {
  userId: string | null
  entityId: string | null
  /** Identifiant du profil invité de ce navigateur, conservé pour être retrouvé. */
  guestId: string | null
  sidebarCollapsed: boolean
  theme: 'light' | 'dark'
  notesOpen: boolean
  tourOpen: boolean
  tourStep: number

  signIn: (userId: string, entityId?: string | null) => void
  signOut: () => void
  setGuestId: (id: string | null) => void
  selectEntity: (entityId: string | null) => void
  toggleSidebar: () => void
  toggleTheme: () => void
  setNotesOpen: (open: boolean) => void
  openTour: (step?: number) => void
  closeTour: () => void
  setTourStep: (step: number) => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      entityId: null,
      guestId: null,
      sidebarCollapsed: false,
      theme: 'light',
      notesOpen: false,
      tourOpen: false,
      tourStep: 0,

      signIn: (userId, entityId = null) => set({ userId, entityId }),
      signOut: () => set({ userId: null, entityId: null, tourOpen: false }),
      setGuestId: (guestId) => set({ guestId }),
      selectEntity: (entityId) => set({ entityId }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setNotesOpen: (notesOpen) => set({ notesOpen }),
      openTour: (step = 0) => set({ tourOpen: true, tourStep: step }),
      closeTour: () => set({ tourOpen: false }),
      setTourStep: (tourStep) => set({ tourStep }),
    }),
    {
      name: 'scopeo:session',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        userId: s.userId,
        entityId: s.entityId,
        guestId: s.guestId,
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
      }),
    },
  ),
)
