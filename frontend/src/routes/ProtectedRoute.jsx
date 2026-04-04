import { Navigate, Outlet, useLocation } from 'react-router-dom'

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
