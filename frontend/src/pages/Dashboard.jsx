import { useQuery } from '@tanstack/react-query'
import { Users, DollarSign, TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/primitives'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import api from '@/services/api'

function StatCard({ title, value, sub, icon: Icon, color = 'purple', isLoading }) {
  const colors = {
    purple: 'bg-fluir-purple/10 text-fluir-purple',
    cyan:   'bg-fluir-cyan/10 text-fluir-cyan',
    green:  'bg-emerald-500/10 text-emerald-400',
    red:    'bg-red-500/10 text-red-400',
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-6 w-24 mt-2" />
            ) : (
              <p className="text-xl font-semibold mt-1 truncate">{value}</p>
            )}
            {sub && !isLoading && (
              <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
            )}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentItem({ label, value, date, badge }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {date && <p className="text-[11px] text-muted-foreground">{formatDate(date)}</p>}
      </div>
      <div className="shrink-0 ml-3 text-right">
        {value && <p className="text-sm font-medium">{value}</p>}
        {badge}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { canAccessFinanceiro } = useAuthStore()

  const { data: alunos, isLoading: loadingAlunos } = useQuery({
    queryKey: ['dashboard-alunos'],
    queryFn: () => api.get('/alunos/', { params: { page_size: 1 } }).then(r => r.data),
  })

  const { data: turmas, isLoading: loadingTurmas } = useQuery({
    queryKey: ['dashboard-turmas'],
    queryFn: () => api.get('/turmas/', { params: { page_size: 1 } }).then(r => r.data),
  })

  const { data: contasPagar, isLoading: loadingPagar } = useQuery({
    queryKey: ['dashboard-contas-pagar'],
    queryFn: () => api.get('/contas-pagar/', { params: { page_size: 5, status: 'pendente' } }).then(r => r.data),
    enabled: canAccessFinanceiro(),
  })

  const { data: contasReceber, isLoading: loadingReceber } = useQuery({
    queryKey: ['dashboard-contas-receber'],
    queryFn: () => api.get('/contas-receber/', { params: { page_size: 5, status: 'pendente' } }).then(r => r.data),
    enabled: canAccessFinanceiro(),
  })

  const { data: livroCaixa, isLoading: loadingCaixa } = useQuery({
    queryKey: ['dashboard-livro-caixa'],
    queryFn: () => api.get('/livro-caixa/', { params: { page_size: 5 } }).then(r => r.data),
    enabled: canAccessFinanceiro(),
  })

  const totalPagar   = contasPagar?.results?.reduce((s, r) => s + parseFloat(r.pag_valor_total || 0), 0) ?? 0
  const totalReceber = contasReceber?.results?.reduce((s, r) => s + parseFloat(r.rec_valor_total || 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-base font-semibold">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Visão geral do Studio Fluir</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Alunos"
          value={alunos?.count ?? '—'}
          icon={Users}
          color="purple"
          isLoading={loadingAlunos}
        />
        <StatCard
          title="Turmas Ativas"
          value={turmas?.count ?? '—'}
          icon={Calendar}
          color="cyan"
          isLoading={loadingTurmas}
        />
        {canAccessFinanceiro() && (
          <>
            <StatCard
              title="A Pagar (pendente)"
              value={formatCurrency(totalPagar)}
              sub={`${contasPagar?.count ?? 0} conta(s)`}
              icon={TrendingDown}
              color="red"
              isLoading={loadingPagar}
            />
            <StatCard
              title="A Receber (pendente)"
              value={formatCurrency(totalReceber)}
              sub={`${contasReceber?.count ?? 0} conta(s)`}
              icon={TrendingUp}
              color="green"
              isLoading={loadingReceber}
            />
          </>
        )}
      </div>

      {/* Listas recentes */}
      {canAccessFinanceiro() && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Últimos lançamentos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-fluir-cyan" />
                Últimos Lançamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {loadingCaixa ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full mb-2" />)
              ) : livroCaixa?.results?.length ? (
                livroCaixa.results.map(item => (
                  <RecentItem
                    key={item.id}
                    label={item.lica_descricao || 'Lançamento'}
                    date={item.lica_data}
                    value={
                      <span className={item.lica_tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}>
                        {item.lica_tipo === 'entrada' ? '+' : '-'}{formatCurrency(item.lica_valor)}
                      </span>
                    }
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhum lançamento.</p>
              )}
            </CardContent>
          </Card>

          {/* Contas a pagar próximas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-red-400" />
                Próximas Contas a Pagar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {loadingPagar ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full mb-2" />)
              ) : contasPagar?.results?.length ? (
                contasPagar.results.map(item => (
                  <RecentItem
                    key={item.id}
                    label={item.pag_descricao || 'Conta'}
                    date={item.pag_data_vencimento}
                    value={formatCurrency(item.pag_valor_total)}
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma conta pendente.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
