import { useState, useEffect } from 'react'
import { LogOut, Menu, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useNavigate } from 'react-router-dom'

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') !== 'light'
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.add('light')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  return [isDark, setIsDark]
}

export function Topbar({ onMenuClick }) {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useTheme()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-14 flex items-center px-5 border-b border-border bg-fluir-dark-2/80 backdrop-blur-sm shrink-0">
      {/* Hambúrguer só no mobile */}
      <button
        className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-fluir-dark-3 transition-colors"
        onClick={onMenuClick}
      >
        <Menu size={20} />
      </button>

      {/* Logo + nome centralizado */}
      <div className="flex-1 flex items-center justify-center gap-2">
        <img
          src="/static/landing/Icone-401x401-Sem-Fundo.png"
          alt="Studio Fluir"
          className="w-8 h-8 rounded-lg object-contain"
        />
        <div>
          <p className="text-xs font-semibold leading-none text-gradient">Studio Fluir</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Sistema</p>
        </div>
      </div>

      {/* Botões direita */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsDark(d => !d)}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-fluir-dark-3 hover:text-foreground transition-colors"
          title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-fluir-dark-3 hover:text-foreground transition-colors"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
