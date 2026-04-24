import { useRef } from 'react'
import { LogOut, ChevronDown, Menu, Camera } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuthStore } from '@/store/useAuthStore'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import Avatar from '@/components/Avatar'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

export function Topbar({ onMenuClick }) {
  const { user, setUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const inputFotoRef = useRef(null)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const handleUploadFoto = async (event) => {
    const arquivo = event.target.files[0]
    if (!arquivo) return

    if (arquivo.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande. Máximo 2MB.', variant: 'destructive' })
      event.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('foto', arquivo)

    try {
      const response = await api.post('/usuarios/upload-foto/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUser(prev => ({ ...prev, foto_url: response.data.foto_url }))
      toast({ title: 'Foto atualizada!' })
    } catch {
      toast({ title: 'Erro ao fazer upload. Tente novamente.', variant: 'destructive' })
    }

    event.target.value = ''
  }

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

      <input
        ref={inputFotoRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleUploadFoto}
      />

      {/* Avatar + dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fluir-dark-3 transition-colors group">
            <Avatar nome={displayName} fotoUrl={user?.foto_url} tamanho={28} />
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
              onSelect={() => inputFotoRef.current?.click()}
            >
              <Camera className="w-3.5 h-3.5" />
              Trocar foto
            </DropdownMenu.Item>

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
