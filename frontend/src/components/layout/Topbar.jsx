import { useState, useEffect } from 'react'
import { LogOut, Menu, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useNavigate, useLocation } from 'react-router-dom'

const ROUTE_NAMES = {
  '/dashboard':                   'Dashboard',
  '/operacional/alunos':          'Alunos',
  '/operacional/funcionarios':    'Funcionários',
  '/operacional/turmas':          'Turmas',
  '/operacional/avisos-falta':    'Avisos de Falta',
  '/operacional/agendamentos':    'Agendamentos',
  '/tecnico/experimental':        'Experimental',
  '/tecnico/aulas':               'Aulas',
  '/tecnico/ministrar-aula':      'Ministrar Aula',
  '/tecnico/programa-turma':      'Programa de Turma',
  '/tecnico/fichas':              'Fichas de Treino',
  '/tecnico/exercicios':          'Exercícios',
  '/tecnico/reposicoes':          'Reposições',
  '/financas/minhas-contas':      'Minhas Contas',
  '/financas/livro-caixa':        'Livro Caixa',
  '/financas/contas-pagar':       'Contas a Pagar',
  '/financas/contas-receber':     'Contas a Receber',
  '/financas/folha-pagamento':    'Folha de Pagamento',
  '/financas/fornecedores':       'Fornecedores',
  '/financas/transferencia':      'Transferências',
  '/financas/configuracao':       'Configuração Financeira',
  '/pagamentos/planos':           'Planos',
  '/pagamentos/pedidos':          'Pedidos',
  '/pagamentos/produtos':         'Produtos',
  '/pagamentos/servicos':         'Serviços',
  '/relatorios/frequencia':       'Rel. Frequência',
  '/relatorios/pressao':          'Rel. Pressão',
  '/relatorios/contas-pagar':     'Rel. Contas a Pagar',
  '/relatorios/contas-receber':   'Rel. Contas a Receber',
  '/relatorios/livro-caixa':      'Rel. Livro Caixa',
  '/relatorios/evolucao-carga':   'Evolução de Carga',
  '/relatorios/planos':           'Rel. Planos',
  '/relatorios/dre':              'DRE',
  '/relatorios/fluxo-caixa':      'Fluxo de Caixa',
  '/relatorios/extrato':          'Extrato por Conta',
  '/graficos/financeiro':         'Gráfico Financeiro',
  '/graficos/alunos':             'Gráfico Alunos',
  '/graficos/frequencia':         'Gráfico Frequência',
  '/graficos/evolucao-pse':       'Evolução PSE',
  '/configuracao/usuarios':       'Usuários',
  '/configuracao/profissoes':     'Profissões',
  '/configuracao/aparelhos':      'Aparelhos',
  '/configuracao/acessorios':     'Acessórios',
}

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
  const location = useLocation()
  const [isDark, setIsDark] = useTheme()

  // Resolve nome da rota atual — sem o basename /sistema
  const pathname = location.pathname
  const nomePagina = ROUTE_NAMES[pathname] || null

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

      {/* Centro: nome da página no mobile / logo no desktop */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {/* Mobile: mostra nome da página atual se disponível */}
        {nomePagina ? (
          <span className="text-sm font-semibold md:hidden truncate max-w-[180px]">{nomePagina}</span>
        ) : (
          <div className="flex items-center gap-2 md:hidden">
            <img
              src="/static/landing/Icone-401x401-Sem-Fundo.png"
              alt="Studio Fluir"
              className="w-8 h-8 rounded-lg object-contain"
            />
            <p className="text-xs font-semibold leading-none text-gradient">Studio Fluir</p>
          </div>
        )}
        {/* Desktop: sempre mostra logo */}
        <div className="hidden md:flex items-center gap-2">
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
