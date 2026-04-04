import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, DollarSign, Users, Dumbbell, BarChart2,
  PieChart, Settings, ChevronDown, ChevronLeft,
  ChevronRightIcon, BookOpen, CreditCard, Wallet, ClipboardList,
  UserCheck, CalendarDays, ListTodo, FileText, Activity,
  TrendingUp, Repeat2, Building2, Package, Banknote, UserCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'

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
      { label: 'Planos',             path: '/financas/planos',          icon: ClipboardList },
      { label: 'Folha de Pagamento', path: '/financas/folha-pagamento', icon: Banknote },
      { label: 'Fornecedores',       path: '/financas/fornecedores',    icon: Building2 },
      { label: 'Serviços/Produtos',  path: '/financas/servicos',        icon: Package },
    ],
  },
  {
    id: 'operacional',
    label: 'Operacional',
    icon: Users,
    permission: 'operacional',
    children: [
      { label: 'Alunos',       path: '/operacional/alunos',       icon: Users },
      { label: 'Funcionários', path: '/operacional/funcionarios', icon: UserCheck },
      { label: 'Turmas',       path: '/operacional/turmas',       icon: CalendarDays },
      { label: 'Agendamentos', path: '/operacional/agendamentos', icon: ListTodo },
    ],
  },
  {
    id: 'tecnico',
    label: 'Técnico',
    icon: Dumbbell,
    permission: 'tecnico',
    children: [
      { label: 'Ministrar Aula',   path: '/tecnico/ministrar-aula', icon: Activity },
      { label: 'Fichas de Treino', path: '/tecnico/fichas',         icon: FileText },
      { label: 'Exercícios',       path: '/tecnico/exercicios',     icon: Dumbbell },
      { label: 'Reposições',       path: '/tecnico/reposicoes',     icon: Repeat2 },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    icon: BarChart2,
    children: [
      { label: 'Frequência',       path: '/relatorios/frequencia',     icon: UserCheck },
      { label: 'Pressão Arterial', path: '/relatorios/pressao',        icon: Activity },
      { label: 'Contas a Pagar',   path: '/relatorios/contas-pagar',   icon: CreditCard },
      { label: 'Contas a Receber', path: '/relatorios/contas-receber', icon: Wallet },
      { label: 'Livro Caixa',      path: '/relatorios/livro-caixa',    icon: BookOpen },
    ],
  },
  {
    id: 'graficos',
    label: 'Gráficos',
    icon: PieChart,
    children: [
      { label: 'Financeiro', path: '/graficos/financeiro', icon: TrendingUp },
      { label: 'Alunos',     path: '/graficos/alunos',     icon: Users },
      { label: 'Frequência', path: '/graficos/frequencia', icon: BarChart2 },
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
    ],
  },
]

export function Sidebar({ collapsed, onToggle }) {
  const [openMenus, setOpenMenus] = useState({ financas: true })
  const location = useLocation()
  const { canAccessFinanceiro, canAccessTecnico, canAccessOperacional, isAdmin } = useAuthStore()

  const canAccess = (permission) => {
    if (!permission) return true
    if (permission === 'admin')       return isAdmin()
    if (permission === 'financeiro')  return canAccessFinanceiro()
    if (permission === 'tecnico')     return canAccessTecnico()
    if (permission === 'operacional') return canAccessOperacional()
    return true
  }

  const toggleMenu = (id) => {
    if (collapsed) return
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
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-border shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-fluir flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">F</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-none text-gradient truncate">Studio Fluir</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sistema</p>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-gradient-fluir flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-xs">F</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {MENU.filter(item => canAccess(item.permission)).map(item => {
          if (!item.children) {
            return (
              <NavLink
                key={item.id}
                to={item.path}
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

      {/* Toggle */}
      <div className="p-2 border-t border-border shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-fluir-dark-3 hover:text-foreground transition-colors"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed
            ? <ChevronRightIcon className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />
          }
        </button>
      </div>
    </aside>
  )
}
