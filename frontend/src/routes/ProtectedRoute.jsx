import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

function isAuthenticated() {
  return !!localStorage.getItem('access_token')
}

export function ProtectedRoute() {
  const location = useLocation()
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}

export function PublicRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}

export function PerfilRoute({ perfisPermitidos }) {
  const user = useAuthStore(s => s.user)
  const isLoading = useAuthStore(s => s.isLoading)

  // aguarda init() do AppLayout resolver antes de avaliar permissão
  if (isLoading || !user) return null

  const grupos = user.groups || []
  const temAcesso = user.is_superuser || grupos.some(g => perfisPermitidos.includes(g))
  if (!temAcesso) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
