import { LogOut, ChevronDown, Menu } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuthStore } from '@/store/useAuthStore'
import { useNavigate } from 'react-router-dom'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = getInitials(user?.first_name || user?.email || '')
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.email || 'Usuário'

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

      {/* Avatar + dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fluir-dark-3 transition-colors group">
            <div className="w-7 h-7 rounded-full bg-gradient-fluir flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {initials}
            </div>
            <span className="text-xs font-medium text-foreground hidden sm:block max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown className="w-3 h-3 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-[180px] rounded-xl border border-border bg-card p-1 shadow-xl animate-in fade-in-0 zoom-in-95"
          >
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-xs font-medium truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>

            <DropdownMenu.Item
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground',
                'hover:bg-fluir-dark-3 hover:text-foreground cursor-pointer outline-none transition-colors'
              )}
              onSelect={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  )
}
