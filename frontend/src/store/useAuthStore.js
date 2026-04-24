import { create } from 'zustand'
import { authService } from '@/services/auth.service'

export const useAuthStore = create((set, get) => ({
  user:      null,
  isLoading: false,

  // ── Inicializa usuário do localStorage ──────────────────────────────────
  init: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      set({ isLoading: true })
      const user = await authService.getUser()
      set({ user })
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    } finally {
      set({ isLoading: false })
    }
  },

  // ── Login ────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true })
    try {
      await authService.login(email, password)
      const user = await authService.getUser()
      set({ user })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail
        || err.response?.data?.non_field_errors?.[0]
        || 'Credenciais inválidas.'
      return { success: false, error: msg }
    } finally {
      set({ isLoading: false })
    }
  },

  // ── Logout ───────────────────────────────────────────────────────────────
  logout: async () => {
    await authService.logout()
    set({ user: null })
  },

  // ── Atualizar usuário na store ───────────────────────────────────────────
  setUser: (updater) => set(state => ({
    user: typeof updater === 'function' ? updater(state.user) : updater,
  })),

  // ── Permissões ───────────────────────────────────────────────────────────
  isAdmin: () => {
    const { user } = get()
    return user?.is_superuser || user?.groups?.includes('Administrador') || false
  },

  canAccessFinanceiro: () => {
    const { user } = get()
    if (!user) return false
    if (user.is_superuser) return true
    const groups = user.groups || []
    return groups.includes('Administrador') || groups.includes('Financeiro')
  },

  canAccessTecnico: () => {
    const { user } = get()
    if (!user) return false
    if (user.is_superuser) return true
    const groups = user.groups || []
    return groups.includes('Administrador') || groups.includes('Professor')
  },

  canAccessOperacional: () => {
    const { user } = get()
    if (!user) return false
    if (user.is_superuser) return true
    const groups = user.groups || []
    return (
      groups.includes('Administrador') ||
      groups.includes('Recepcionista') ||
      groups.includes('Professor')
    )
  },
}))
