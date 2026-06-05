import { useState, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronDown, ChevronLeft,
  Camera,
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
    emoji: '📊',
    path: '/dashboard',
  },
  {
    id: 'financas',
    label: 'Finanças',
    emoji: '💰',
    permission: 'financeiro',
    children: [
      { label: '🏦 Minhas Contas',      path: '/financas/minhas-contas'   },
      { label: '💸 Contas a Pagar',     path: '/financas/contas-pagar'    },
      { label: '💵 Contas a Receber',   path: '/financas/contas-receber'  },
      { label: '💼 Folha de Pagamento', path: '/financas/folha-pagamento' },
      { label: '🏢 Fornecedores',       path: '/financas/fornecedores'    },
    ],
  },
  {
    id: 'pagamentos',
    label: 'Pagamentos',
    emoji: '🛒',
    permission: 'financeiro',
    children: [
      { label: '📋 Planos de Pagamento', path: '/pagamentos/planos'   },
      { label: '🛒 Pedidos',             path: '/pagamentos/pedidos'  },
      { label: '📦 Produtos',            path: '/pagamentos/produtos' },
      { label: '🔧 Serviços',            path: '/pagamentos/servicos' },
    ],
  },
  {
    id: 'operacional',
    label: 'Operacional',
    emoji: '👥',
    permission: 'operacional',
    children: [
      { label: '👥 Alunos',          path: '/operacional/alunos'        },
      { label: '👷 Funcionários',    path: '/operacional/funcionarios'  },
      { label: '🏋️ Turmas',          path: '/operacional/turmas'        },
      { label: '🔕 Faltas',          path: '/operacional/avisos-falta'  },
      { label: '🧪 Agendamentos',    path: '/operacional/agendamentos'  },
    ],
  },
  {
    id: 'tecnico',
    label: 'Técnico',
    emoji: '💪',
    permission: 'tecnico',
    children: [
      { label: '🧪 Experimental',         path: '/tecnico/experimental'   },
      { label: '📅 Aulas',               path: '/tecnico/aulas'          },
      { label: '🎯 Ministrar Aula',      path: '/tecnico/ministrar-aula' },
      { label: '📋 Programa das Turmas', path: '/tecnico/programa-turma' },
      { label: '📋 Fichas de Treino',    path: '/tecnico/fichas'         },
      { label: '💪 Exercícios',          path: '/tecnico/exercicios'     },
      { label: '🔄 Reposições',          path: '/tecnico/reposicoes'     },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    emoji: '📈',
    children: [
      { label: '👥 Frequência',        path: '/relatorios/frequencia'      },
      { label: '💗 Pressão Arterial',  path: '/relatorios/pressao'         },
      { label: '📊 Evolução de Carga', path: '/relatorios/evolucao-carga'  },
      { label: '📋 Planos',            path: '/relatorios/planos'          },
      { label: '💸 Contas a Pagar',    path: '/relatorios/contas-pagar'    },
      { label: '💵 Contas a Receber',  path: '/relatorios/contas-receber'  },
      { label: '📒 Livro Caixa',       path: '/relatorios/livro-caixa'     },
      { label: '📈 DRE',               path: '/relatorios/dre'             },
      { label: '🔄 Fluxo de Caixa',    path: '/relatorios/fluxo-caixa'    },
      { label: '📄 Extrato por Conta', path: '/relatorios/extrato'         },
    ],
  },
  {
    id: 'graficos',
    label: 'Gráficos',
    emoji: '📉',
    children: [
      { label: '💰 Financeiro',    path: '/graficos/financeiro'   },
      { label: '👥 Alunos',       path: '/graficos/alunos'       },
      { label: '📊 Frequência',   path: '/graficos/frequencia'   },
      { label: '📈 Evolução PSE', path: '/graficos/evolucao-pse' },
    ],
  },
  {
    id: 'configuracao',
    label: 'Configuração',
    emoji: '⚙️',
    permission: 'admin',
    children: [
      { label: '🔐 Usuários',   path: '/configuracao/usuarios'   },
      { label: '📋 Profissões', path: '/configuracao/profissoes' },
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

  const isActive  = (path) => location.pathname.startsWith(path)
  const hasActive = (children) => children?.some(c => isActive(c.path))

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-fluir-dark-2 border-r border-border',
        'transition-all duration-300 ease-in-out overflow-hidden shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Perfil */}
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
                <span className="text-base shrink-0" aria-hidden="true">{item.emoji}</span>
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
                <span className="text-base shrink-0" aria-hidden="true">{item.emoji}</span>
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
                      <span className="truncate">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Fechar */}
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
