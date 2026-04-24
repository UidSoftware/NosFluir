import { LogOut, Menu } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useNavigate } from 'react-router-dom'

export function Topbar({ onMenuClick }) {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-14 flex items-center justify-between px-5 border-b border-border bg-fluir-dark-2/80 backdrop-blur-sm shrink-0">
      {/* Hambúrguer só no mobile */}
      <button
        className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-fluir-dark-3 transition-colors"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </button>
      <div className="hidden md:block" />

      {/* Botão sair */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-fluir-dark-3 hover:text-foreground transition-colors"
        title="Sair"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  )
}
