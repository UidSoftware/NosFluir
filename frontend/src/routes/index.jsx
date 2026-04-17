import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, PublicRoute, PerfilRoute } from './ProtectedRoute'

// Auth
import LoginPage from '@/pages/auth/LoginPage'

// Dashboard
import Dashboard from '@/pages/Dashboard'

// Finanças
import LivroCaixaPage         from '@/pages/financas/LivroCaixaPage'
import ContasPagarPage        from '@/pages/financas/ContasPagarPage'
import ContasReceberPage      from '@/pages/financas/ContasReceberPage'
import PlanosPage             from '@/pages/financas/PlanosPage'
import FolhaPagamentoPage     from '@/pages/financas/FolhaPagamentoPage'
import FornecedoresPage       from '@/pages/financas/FornecedoresPage'
import ServicosPage           from '@/pages/financas/ServicosPage'

// Operacional
import AlunosPage             from '@/pages/operacional/AlunosPage'
import FuncionariosPage       from '@/pages/operacional/FuncionariosPage'
import TurmasPage             from '@/pages/operacional/TurmasPage'
import AgendamentosPage       from '@/pages/operacional/AgendamentosPage'

// Técnico
import AulasPage              from '@/pages/tecnico/AulasPage'
import MinistrarAulaPage      from '@/pages/tecnico/MinistrarAulaPage'
import ProgramaTurmaPage      from '@/pages/tecnico/ProgramaTurmaPage'
import FichasTreinoPage       from '@/pages/tecnico/FichasTreinoPage'
import ExerciciosPage         from '@/pages/tecnico/ExerciciosPage'
import ReposicoesPage         from '@/pages/tecnico/ReposicoesPage'

// Relatórios
import RelFrequenciaPage      from '@/pages/relatorios/RelFrequenciaPage'
import RelPressaoPage         from '@/pages/relatorios/RelPressaoPage'
import RelContasPagarPage     from '@/pages/relatorios/RelContasPagarPage'
import RelContasReceberPage   from '@/pages/relatorios/RelContasReceberPage'
import RelLivroCaixaPage      from '@/pages/relatorios/RelLivroCaixaPage'
import RelEvolucaoCargaPage   from '@/pages/relatorios/RelEvolucaoCargaPage'

// Gráficos
import GrafFinanceiroPage     from '@/pages/graficos/GrafFinanceiroPage'
import GrafAlunosPage         from '@/pages/graficos/GrafAlunosPage'
import GrafFrequenciaPage     from '@/pages/graficos/GrafFrequenciaPage'
import GrafEvolucaoPsePage    from '@/pages/graficos/GrafEvolucaoPsePage'

// Configuração
import UsuariosPage           from '@/pages/configuracao/UsuariosPage'
import ProfissoesPage         from '@/pages/configuracao/ProfissoesPage'
import AparelhosPage          from '@/pages/configuracao/AparelhosPage'
import AcessoriosPage         from '@/pages/configuracao/AcessoriosPage'

export const router = createBrowserRouter(
  [
    // ── Rotas públicas ─────────────────────────────────────────────────────
    {
      element: <PublicRoute />,
      children: [
        { path: '/login', element: <LoginPage /> },
      ],
    },

    // ── Rotas protegidas ───────────────────────────────────────────────────
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { index: true,        element: <Navigate to="/dashboard" replace /> },
            { path: '/dashboard', element: <Dashboard /> },

            // ── Finanças (Financeiro + Admin) ─────────────────────────────────
            {
              element: <PerfilRoute perfisPermitidos={['Administrador', 'Financeiro']} />,
              children: [
                { path: '/financas/livro-caixa',      element: <LivroCaixaPage /> },
                { path: '/financas/contas-pagar',     element: <ContasPagarPage /> },
                { path: '/financas/contas-receber',   element: <ContasReceberPage /> },
                { path: '/financas/planos',           element: <PlanosPage /> },
                { path: '/financas/folha-pagamento',  element: <FolhaPagamentoPage /> },
                { path: '/financas/fornecedores',     element: <FornecedoresPage /> },
                { path: '/financas/servicos',         element: <ServicosPage /> },
                { path: '/relatorios/contas-pagar',   element: <RelContasPagarPage /> },
                { path: '/relatorios/contas-receber', element: <RelContasReceberPage /> },
                { path: '/relatorios/livro-caixa',    element: <RelLivroCaixaPage /> },
                { path: '/graficos/financeiro',       element: <GrafFinanceiroPage /> },
              ],
            },

            // ── Técnico (Professor + Admin) ────────────────────────────────
            // Evolução de Carga fica em Relatórios mas acesso Professor+Admin
            {
              element: <PerfilRoute perfisPermitidos={['Administrador', 'Professor']} />,
              children: [
                { path: '/relatorios/evolucao-carga', element: <RelEvolucaoCargaPage /> },
                { path: '/graficos/evolucao-pse',     element: <GrafEvolucaoPsePage /> },
              ],
            },
            {
              element: <PerfilRoute perfisPermitidos={['Administrador', 'Professor']} />,
              children: [
                { path: '/tecnico/aulas',             element: <AulasPage /> },
                { path: '/tecnico/ministrar-aula',    element: <MinistrarAulaPage /> },
                { path: '/tecnico/programa-turma',    element: <ProgramaTurmaPage /> },
                { path: '/tecnico/fichas',            element: <FichasTreinoPage /> },
                { path: '/tecnico/exercicios',        element: <ExerciciosPage /> },
                { path: '/tecnico/reposicoes',        element: <ReposicoesPage /> },
              ],
            },

            // ── Operacional (Recepcionista + Professor + Admin) ────────────
            {
              element: <PerfilRoute perfisPermitidos={['Administrador', 'Recepcionista', 'Professor']} />,
              children: [
                { path: '/operacional/alunos',        element: <AlunosPage /> },
                { path: '/operacional/funcionarios',  element: <FuncionariosPage /> },
                { path: '/operacional/turmas',        element: <TurmasPage /> },
                { path: '/operacional/agendamentos',  element: <AgendamentosPage /> },
                { path: '/relatorios/frequencia',     element: <RelFrequenciaPage /> },
                { path: '/relatorios/pressao',        element: <RelPressaoPage /> },
                { path: '/graficos/alunos',           element: <GrafAlunosPage /> },
                { path: '/graficos/frequencia',       element: <GrafFrequenciaPage /> },
              ],
            },

            // ── Configuração (Admin) ───────────────────────────────────────
            {
              element: <PerfilRoute perfisPermitidos={['Administrador']} />,
              children: [
                { path: '/configuracao/usuarios',     element: <UsuariosPage /> },
                { path: '/configuracao/profissoes',   element: <ProfissoesPage /> },
                { path: '/configuracao/aparelhos',    element: <AparelhosPage /> },
                { path: '/configuracao/acessorios',   element: <AcessoriosPage /> },
              ],
            },
          ],
        },
      ],
    },

    // Fallback
    { path: '*', element: <Navigate to="/dashboard" replace /> },
  ],
  { basename: '/sistema' }
)
