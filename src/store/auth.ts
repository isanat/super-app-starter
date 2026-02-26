import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'ADMIN' | 'DIRECTOR' | 'MUSICIAN' | 'SINGER' | 'INSTRUMENTALIST'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  avatar?: string
  role: UserRole
  churchId?: string
  churchName?: string
  instruments?: string[]
  vocals?: string[]
  isActive: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'louvor-conectado-auth',
    }
  )
)

// Mock user for development
export const mockDirectorUser: User = {
  id: '1',
  email: 'diretor@igreja.com',
  name: 'João Silva',
  phone: '(11) 99999-9999',
  role: 'DIRECTOR',
  churchId: '1',
  churchName: 'IASD Central',
  isActive: true,
}

export const mockMusicianUser: User = {
  id: '2',
  email: 'musico@igreja.com',
  name: 'Maria Santos',
  phone: '(11) 98888-8888',
  role: 'MUSICIAN',
  churchId: '1',
  churchName: 'IASD Central',
  instruments: ['violao', 'guitarra', 'piano'],
  vocals: ['soprano'],
  isActive: true,
}
