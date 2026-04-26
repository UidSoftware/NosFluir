import { useState, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, DollarSign, Users, Dumbbell, BarChart2,
  PieChart, Settings, Settings2, ChevronDown, ChevronLeft,
  ChevronRightIcon, BookOpen, CreditCard, Wallet, ClipboardList,
  UserCheck, CalendarDays, ListTodo, FileText, Activity,
  TrendingUp, Repeat2, Building2, Package, Banknote, UserCog, BellOff,
  Camera, ArrowLeftRight, ShoppingCart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'
import Avatar from '@/components/Avatar'

const MENU = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'financas',
    label: 'Finanças',
    icon: DollarSign,
    permission: 'financeiro',
    children: [
      { label: 'Livro Caixa',        path: '/financas/livro-caixa',     icon: BookOpen },
      { label: 'Contas a Pagar',     path: '/financas/contas-pagar',    icon: CreditCard },
      { label: 'Contas a Receber',   path: '/financas/contas-receber',  icon: Wallet },
      { label: 'Planos de Pagamentos', path: '/financas/planos',         icon: ClipboardList },
      { label: 'Folha de Pagamento', path: '/financas/folha-pagamento', icon: Banknote },
      { label: 'Fornecedores',       path: '/financas/fornecedores',    icon: Building2 },
      { label: 'Serviços/Produtos',  path: '/financas/servicos',        icon: Package },
      { label: 'Pedidos',             path: '/financas/pedidos',         icon: ShoppingCart },
      { label: 'Transferência',       path: '/financas/transferencia',   icon: ArrowLeftRight },
      { label: 'Configuração',       path: '/financas/configuracao',    icon: Settings2 },
    ],
  },
  {
    id: 'operacional',
    label: 'Operacional',
    icon: Users,
    permission: 'operacional',
    children: [
      { label: 'Alunos',         path: '/operacional/alunos',        icon: Users },
      { label: 'Funcionários',   path: '/operacional/funcionarios',  icon: UserCheck },
      { label: 'Turmas',         path: '/operacional/turmas',        icon: CalendarDays },
      { label: 'Faltas',          path: '/operacional/avisos-falta', icon: BellOff },
      { label: 'Agendamentos',   path: '/operacional/agendamentos',  icon: ListTodo },
    ],
  },
  {
    id: 'tecnico',
    label: 'Técnico',
    icon: Dumbbell,
    permission: 'tecnico',
    children: [
      { label: 'Aulas',                path: '/tecnico/aulas',            icon: CalendarDays },
      { label: 'Ministrar Aula',     path: '/tecnico/ministrar-aula',   icon: Activity },
      { label: 'Programa das Turmas', path: '/tecnico/programa-turma',  icon: ClipboardList },
      { label: 'Fichas de Treino',   path: '/tecnico/fichas',           icon: FileText },
      { label: 'Exercícios',         path: '/tecnico/exercicios',       icon: Dumbbell },
      { label: 'Reposições',         path: '/tecnico/reposicoes',       icon: Repeat2 },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: BarChart2,
    children: [
      { label: 'Frequência',       path: '/relatorios/frequencia',     icon: UserCheck },
      { label: 'Pressão Arterial', path: '/relatorios/pressao',        icon: Activity },
      { label: 'Evolução de Carga', path: '/relatorios/evolucao-carga', icon: TrendingUp },
      { label: 'Planos',           path: '/relatorios/planos',         icon: ClipboardList },
      { label: 'Contas a Pagar',   path: '/relatorios/contas-pagar',   icon: CreditCard },
      { label: 'Contas a Receber', path: '/relatorios/contas-receber', icon: Wallet },
      { label: 'Livro Caixa',      path: '/relatorios/livro-caixa',    icon: BookOpen },
      { label: 'DRE',              path: '/relatorios/dre',            icon: BarChart2 },
      { label: 'Fluxo de Caixa',   path: '/relatorios/fluxo-caixa',   icon: TrendingUp },
      { label: 'Extrato por Conta',path: '/relatorios/extrato',        icon: FileText },
    ],
  },
  {
    id: 'graficos',
    label: 'Gráficos',
    icon: PieChart,
    children: [
      { label: 'Financeiro',    path: '/graficos/financeiro',   icon: TrendingUp },
      { label: 'Alunos',       path: '/graficos/alunos',       icon: Users },
      { label: 'Frequência',   path: '/graficos/frequencia',   icon: BarChart2 },
      { label: 'Evolução PSE', path: '/graficos/evolucao-pse', icon: Activity },
    ],
  },
  {
    id: 'configuracao',
    label: 'Configuração',
    icon: Settings,
    permission: 'admin',
    children: [
      { label: 'Usuários',   path: '/configuracao/usuarios',   icon: UserCog },
      { label: 'Profissões', path: '/configuracao/profissoes', icon: ClipboardList },
      { label: 'Aparelhos',  path: '/configuracao/aparelhos',  icon: Dumbbell },
      { label: 'Acessórios', path: '/configuracao/acessorios', icon: Package },
    ],
  },
]

export function Sidebar({ collapsed, onToggle }) {
  const [openMenus, setOpenMenus] = useState({})
  const location = useLocation()
  const { user, setUser, canAccessFinanceiro, canAccessTecnico, canAccessOperacional, isAdmin } = useAuthStore()
  const inputFotoRef = useRef(null)

  const nomeCompleto = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : ''

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
    } catch (err) {
      const detalhe = err.response?.data?.error || err.response?.status || err.message || 'desconhecido'
      toast({ title: `Erro upload: ${detalhe}`, variant: 'destructive' })
    }
    event.target.value = ''
  }

  const handleNavClick = () => {
    if (window.innerWidth < 1024) onToggle()
  }

  const canAccess = (permission) => {
    if (!permission) return true
    if (permission === 'admin')       return isAdmin()
    if (permission === 'financeiro')  return canAccessFinanceiro()
    if (permission === 'tecnico')     return canAccessTecnico()
    if (permission === 'operacional') return canAccessOperacional()
    return true
  }

  const toggleMenu = (id) => {
    if (collapsed) {
      onToggle()
      setOpenMenus(prev => ({ ...prev, [id]: true }))
      return
    }
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const isActive    = (path) => location.pathname.startsWith(path)
  const hasActive   = (children) => children?.some(c => isActive(c.path))

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-fluir-dark-2 border-r border-border',
        'transition-all duration-300 ease-in-out overflow-hidden shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Perfil — avatar + nome + email (só expandido) */}
      {!collapsed && (
        <div className="flex flex-col items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <div className="relative group">
            <Avatar nome={nomeCompleto} fotoUrl={user?.foto_url} tamanho={56} />
            <button
              onClick={() => inputFotoRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
              title="Trocar foto"
            >
              <Camera size={16} className="text-white" />
            </button>
          </div>
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleUploadFoto}
          />
          <p className="text-sm font-semibold text-foreground text-center leading-tight">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-xs text-muted-foreground text-center truncate w-full">
            {user?.email}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {MENU.filter(item => canAccess(item.permission)).map(item => {
          if (!item.children) {
            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-fluir-purple/20 text-fluir-purple'
                    : 'text-muted-foreground hover:bg-fluir-dark-3 hover:text-foreground'
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          }

          const active = hasActive(item.children)
          const open   = openMenus[item.id]

          return (
            <div key={item.id}>
              <button
                onClick={() => toggleMenu(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'text-fluir-purple'
                    : 'text-muted-foreground hover:bg-fluir-dark-3 hover:text-foreground'
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
                        open && 'rotate-180'
                      )}
                    />
                  </>
                )}
              </button>

              {!collapsed && open && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-border space-y-0.5">
                  {item.children.map(child => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      onClick={handleNavClick}
                      className={({ isActive }) => cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                        isActive
                          ? 'text-fluir-cyan font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-fluir-dark-3'
                      )}
                    >
                      <child.icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Fechar (só quando expandido) */}
      {!collapsed && (
        <div className="p-2 border-t border-border shrink-0">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-fluir-dark-3 hover:text-foreground transition-colors"
            title="Recolher menu"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  )
}
