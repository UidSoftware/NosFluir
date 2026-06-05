import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  DollarSign, TrendingUp, TrendingDown, Users, Calendar,
  Activity, Wallet, Package, RefreshCw, Dumbbell,
  ChevronRight, UserCheck, UserX, AlertTriangle, Briefcase, Gift,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, Skeleton } from '@/components/ui/primitives'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import api from '@/services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function horaStr(time) {
  if (!time) return '—'
  return time.slice(0, 5)
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const MODALIDADE_BADGE = {
  pilates:   { label: 'Pilates',   cls: 'bg-fluir-purple/20 text-fluir-purple border-fluir-purple/30' },
  funcional: { label: 'Funcional', cls: 'bg-fluir-cyan/20 text-fluir-cyan border-fluir-cyan/30' },
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg shrink-0 ${iconBg}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex-1 h-px bg-border/40 ml-1" />
    </div>
  )
}

function StatCard({ title, value, sub, icon: Icon, color = 'purple', isLoading, to }) {
  const colors = {
    purple: 'bg-fluir-purple/10 text-fluir-purple',
    cyan:   'bg-fluir-cyan/10 text-fluir-cyan',
    green:  'bg-emerald-500/10 text-emerald-400',
    red:    'bg-red-500/10 text-red-400',
    amber:  'bg-amber-500/10 text-amber-400',
  }
  const card = (
    <Card className={to ? 'cursor-pointer hover:ring-1 ring-fluir-purple/40 transition-all' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground leading-tight">{title}</p>
            {isLoading
              ? <Skeleton className="h-6 w-20 mt-2" />
              : <p className="text-lg font-semibold mt-1 truncate">{value}</p>
            }
            {sub && !isLoading && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
            )}
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
  if (to) return <Link to={to}>{card}</Link>
  return card
}

function ListaVazia({ msg }) {
  return <p className="text-xs text-muted-foreground py-4 text-center">{msg}</p>
}

function ListaLoader() {
  return Array.from({ length: 4 }).map((_, i) => (
    <Skeleton key={i} className="h-9 w-full mb-1.5" />
  ))
}

function ListRow({ label, sub, right }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      {right && <div className="shrink-0 ml-3">{right}</div>}
    </div>
  )
}

function CardLista({ title, icon: Icon, linkTo, children }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {linkTo && (
          <Link
            to={linkTo}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            Ver todos <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="px-5 pb-4 flex-1">{children}</CardContent>
    </Card>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── Barra de ocupação ─────────────────────────────────────────────────────────

function OccupancyBar({ count, max = 15 }) {
  const pct = Math.min((count / max) * 100, 100)
  const color = count >= 13 ? 'bg-red-400' : count >= 9 ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{count}/{max}</span>
    </div>
  )
}

// ── Seção Financeiro ──────────────────────────────────────────────────────────

function SecaoFinanceiro() {
  const hoje = hojeISO()
  const [anoAtual, mesAtual] = hoje.split('-').map(Number)

  const { data: contas, isLoading: loadContas } = useQuery({
    queryKey: ['dash-contas'],
    queryFn: () => api.get('/contas/', { params: { page_size: 20 } }).then(r => r.data.results),
  })

  const { data: pagarData, isLoading: loadPagar } = useQuery({
    queryKey: ['dash-pagar'],
    queryFn: () => api.get('/contas-pagar/', { params: { pag_status: 'pendente', page_size: 100 } }).then(r => r.data),
  })

  const { data: receberData, isLoading: loadReceber } = useQuery({
    queryKey: ['dash-receber'],
    queryFn: () => api.get('/contas-receber/', { params: { rec_status: 'pendente', page_size: 100 } }).then(r => r.data),
  })

  const { data: lcxData, isLoading: loadLcx } = useQuery({
    queryKey: ['dash-lcx'],
    queryFn: () => api.get('/livro-caixa/', { params: { page_size: 300 } }).then(r => r.data.results),
  })

  const { data: estoqueData, isLoading: loadEstoque } = useQuery({
    queryKey: ['dash-estoque'],
    queryFn: () => api.get('/produtos/alertas-estoque/').then(r => r.data),
  })

  const { data: folhaData, isLoading: loadFolha } = useQuery({
    queryKey: ['dash-folha', mesAtual, anoAtual],
    queryFn: () => api.get('/folha-pagamento/', {
      params: { fopa_mes_referencia: mesAtual, fopa_ano_referencia: anoAtual, page_size: 50 },
    }).then(r => r.data),
  })

  const saldoTotal    = contas?.reduce((s, c) => s + parseFloat(c.saldo_atual || 0), 0) ?? 0
  const totalPagar    = pagarData?.results?.reduce((s, r) => s + parseFloat(r.pag_valor_total || 0), 0) ?? 0
  const totalReceber  = receberData?.results?.reduce((s, r) => s + parseFloat(r.rec_valor_total || 0), 0) ?? 0

  let entradasMes = 0, saidasMes = 0
  lcxData?.forEach(item => {
    if (!item.lica_data_lancamento) return
    const [y, m] = item.lica_data_lancamento.split('-').map(Number)
    if (y === anoAtual && m === mesAtual) {
      const val = parseFloat(item.lica_valor || 0)
      if (item.lica_tipo_lancamento === 'entrada') entradasMes += val
      else saidasMes += val
    }
  })
  const resultadoMes = entradasMes - saidasMes

  const agrupado = {}
  lcxData?.forEach(item => {
    if (!item.lica_data_lancamento) return
    const [y, m] = item.lica_data_lancamento.split('-')
    const label = `${MESES[parseInt(m) - 1]}/${y.slice(2)}`
    if (!agrupado[label]) agrupado[label] = { _y: y, _m: m, mes: label, entradas: 0, saidas: 0 }
    const val = parseFloat(item.lica_valor || 0)
    if (item.lica_tipo_lancamento === 'entrada') agrupado[label].entradas += val
    else agrupado[label].saidas += val
  })
  const chartData = Object.values(agrupado)
    .sort((a, b) => a._y !== b._y ? a._y.localeCompare(b._y) : a._m.localeCompare(b._m))
    .slice(-3)

  const alertasEstoque = estoqueData?.results ?? []

  const totalFolha   = folhaData?.results?.reduce((s, f) => s + parseFloat(f.fopa_valor_liquido || 0), 0) ?? 0
  const folhaPendente = folhaData?.results?.filter(f => f.fopa_status === 'pendente') ?? []
  const totalFolhaPendente = folhaPendente.reduce((s, f) => s + parseFloat(f.fopa_valor_liquido || 0), 0)

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Financeiro"
        subtitle="Contas, fluxo, folha e pendências"
        icon={Wallet}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-400"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Saldo Total"
          to="/financas/contas"
          value={formatCurrency(saldoTotal)}
          sub={`${contas?.length ?? 0} conta(s)`}
          icon={Wallet}
          color="cyan"
          isLoading={loadContas}
        />
        <StatCard
          title="A Pagar Pendente"
          to="/financas/contas-pagar"
          value={formatCurrency(totalPagar)}
          sub={`${pagarData?.count ?? 0} conta(s)`}
          icon={TrendingDown}
          color="red"
          isLoading={loadPagar}
        />
        <StatCard
          title="A Receber Pendente"
          to="/financas/contas-receber"
          value={formatCurrency(totalReceber)}
          sub={`${receberData?.count ?? 0} conta(s)`}
          icon={TrendingUp}
          color="green"
          isLoading={loadReceber}
        />
        <StatCard
          title="Resultado do Mês"
          to="/financas/livro-caixa"
          value={formatCurrency(resultadoMes)}
          sub={resultadoMes >= 0 ? '↑ Positivo' : '↓ Negativo'}
          icon={Activity}
          color={resultadoMes >= 0 ? 'green' : 'red'}
          isLoading={loadLcx}
        />
        <StatCard
          title="Folha do Mês"
          to="/financas/folha-pagamento"
          value={formatCurrency(totalFolha)}
          sub={`${folhaData?.count ?? 0} funcionário(s)`}
          icon={Briefcase}
          color="amber"
          isLoading={loadFolha}
        />
        <StatCard
          title="Folha Pendente"
          to="/financas/folha-pagamento"
          value={formatCurrency(totalFolhaPendente)}
          sub={`${folhaPendente.length} pagamento(s) em aberto`}
          icon={AlertTriangle}
          color={totalFolhaPendente > 0 ? 'red' : 'green'}
          isLoading={loadFolha}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Entradas × Saídas — últimos 3 meses
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {loadLcx ? (
              <Skeleton className="h-44 w-full" />
            ) : chartData.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252244" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="entradas" name="Entradas" fill="#01E2CD" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="saidas"   name="Saídas"   fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ListaVazia msg="Sem lançamentos para exibir." />
            )}
          </CardContent>
        </Card>

        <CardLista title="Próximas a Pagar" icon={TrendingDown} linkTo="/financas/contas-pagar">
          {loadPagar
            ? <ListaLoader />
            : pagarData?.results?.length
              ? pagarData.results.slice(0, 5).map(r => (
                  <ListRow
                    key={r.pag_id}
                    label={r.forn_nome || r.cpa_nome_credor || r.pag_descricao || '—'}
                    sub={formatDate(r.pag_data_vencimento)}
                    right={
                      <span className="text-sm font-medium text-red-400">
                        {formatCurrency(r.pag_valor_total)}
                      </span>
                    }
                  />
                ))
              : <ListaVazia msg="Nenhuma conta pendente." />
          }
        </CardLista>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardLista title="Próximas a Receber" icon={TrendingUp} linkTo="/financas/contas-receber">
          {loadReceber
            ? <ListaLoader />
            : receberData?.results?.length
              ? receberData.results.slice(0, 5).map(r => (
                  <ListRow
                    key={r.rec_id}
                    label={r.alu_nome || r.rec_nome_pagador || r.rec_descricao || '—'}
                    sub={formatDate(r.rec_data_vencimento)}
                    right={
                      <span className="text-sm font-medium text-emerald-400">
                        {formatCurrency(r.rec_valor_total)}
                      </span>
                    }
                  />
                ))
              : <ListaVazia msg="Nenhum recebimento pendente." />
          }
        </CardLista>

        {(loadEstoque || alertasEstoque.length > 0) && (
          <CardLista title="Estoque Baixo" icon={Package} linkTo="/pagamentos/produtos">
            {loadEstoque
              ? <ListaLoader />
              : alertasEstoque.slice(0, 5).map(p => (
                  <ListRow
                    key={p.prod_id}
                    label={p.prod_nome}
                    sub={`Atual: ${p.prod_estoque_atual} · Mín: ${p.prod_estoque_minimo}`}
                    right={
                      <Badge variant="destructive" className="text-[10px]">
                        Baixo
                      </Badge>
                    }
                  />
                ))
            }
          </CardLista>
        )}

        {folhaPendente.length > 0 && (
          <CardLista title="Folha Pendente" icon={Briefcase} linkTo="/financas/folha-pagamento">
            {loadFolha
              ? <ListaLoader />
              : folhaPendente.slice(0, 5).map(f => (
                  <ListRow
                    key={f.fopa_id}
                    label={f.func_nome || '—'}
                    sub={`Ref: ${String(f.fopa_mes_referencia).padStart(2,'0')}/${f.fopa_ano_referencia}`}
                    right={
                      <span className="text-sm font-medium text-amber-400">
                        {formatCurrency(f.fopa_valor_liquido)}
                      </span>
                    }
                  />
                ))
            }
          </CardLista>
        )}
      </div>
    </div>
  )
}

// ── Seção Alunos ──────────────────────────────────────────────────────────────

function SecaoAlunos() {
  const hoje = hojeISO()
  const em30dias = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const { data: ativos, isLoading: loadAtivos } = useQuery({
    queryKey: ['dash-alunos-ativos'],
    queryFn: () => api.get('/alunos/', { params: { alu_ativo: true, page_size: 1 } }).then(r => r.data),
  })

  const { data: inativos, isLoading: loadInativos } = useQuery({
    queryKey: ['dash-alunos-inativos'],
    queryFn: () => api.get('/alunos/', { params: { alu_ativo: false, page_size: 1 } }).then(r => r.data),
  })

  const { data: planosVencendo, isLoading: loadVencendo } = useQuery({
    queryKey: ['dash-planos-vencendo', hoje, em30dias],
    queryFn: () => api.get('/aluno-plano/', {
      params: { aplano_ativo: true, aplano_data_fim__gte: hoje, aplano_data_fim__lte: em30dias, page_size: 10 },
    }).then(r => r.data),
  })

  const mesAtualAniv = new Date().getMonth() + 1

  const { data: aniversariantes, isLoading: loadAniversario } = useQuery({
    queryKey: ['dash-aniversariantes', mesAtualAniv],
    queryFn: () => api.get('/alunos/', {
      params: { alu_ativo: true, alu_data_nascimento__month: mesAtualAniv, page_size: 50, ordering: 'alu_data_nascimento' },
    }).then(r => r.data),
  })

  const { data: matriculas, isLoading: loadMatriculas } = useQuery({
    queryKey: ['dash-matriculas-ativas'],
    queryFn: () => api.get('/turma-alunos/', { params: { ativo: true, page_size: 200 } }).then(r => r.data.results),
  })

  const turmaOcupacao = {}
  matriculas?.forEach(m => {
    const key = m.tur_nome || String(m.tur)
    if (!turmaOcupacao[key]) turmaOcupacao[key] = { nome: key, count: 0 }
    turmaOcupacao[key].count++
  })
  const turmasList = Object.values(turmaOcupacao).sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Alunos"
        subtitle="Ativos, planos e ocupação das turmas"
        icon={Users}
        iconBg="bg-fluir-purple/10"
        iconColor="text-fluir-purple"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Alunos Ativos"
          to="/operacional/alunos"
          value={ativos?.count ?? '—'}
          icon={Users}
          color="purple"
          isLoading={loadAtivos}
        />
        <StatCard
          title="Alunos Inativos"
          to="/operacional/alunos"
          value={inativos?.count ?? '—'}
          icon={UserX}
          color="amber"
          isLoading={loadInativos}
        />
        <StatCard
          title="Planos Vencendo"
          to="/operacional/alunos"
          value={planosVencendo?.count ?? '—'}
          sub="nos próximos 30 dias"
          icon={AlertTriangle}
          color={planosVencendo?.count > 0 ? 'red' : 'green'}
          isLoading={loadVencendo}
        />
        <StatCard
          title="Matrículas em Turmas"
          to="/operacional/turmas"
          value={loadMatriculas ? '—' : (matriculas?.length ?? 0)}
          sub={`${turmasList.length} turma(s)`}
          icon={Calendar}
          color="cyan"
          isLoading={loadMatriculas}
        />
        <StatCard
          title="Aniversariantes do Mês"
          to="/operacional/alunos"
          value={aniversariantes?.count ?? '—'}
          sub={new Date().toLocaleString('pt-BR', { month: 'long' })}
          icon={Gift}
          color="purple"
          isLoading={loadAniversario}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardLista title={"Aniversariantes — " + new Date().toLocaleString('pt-BR', { month: 'long' })} icon={Gift}>
          {loadAniversario
            ? <ListaLoader />
            : aniversariantes?.results?.length
              ? aniversariantes.results.map(a => {
                  const dia = a.alu_data_nascimento?.slice(8, 10)
                  const isHoje = parseInt(dia) === new Date().getDate()
                  return (
                    <ListRow
                      key={a.alu_id}
                      label={a.alu_nome}
                      sub={"Dia " + dia}
                      right={
                        isHoje
                          ? <Badge className="text-[10px] bg-fluir-purple/20 text-fluir-purple border-fluir-purple/30">Hoje!</Badge>
                          : <span className="text-xs text-muted-foreground">dia {dia}</span>
                      }
                    />
                  )
                })
              : <ListaVazia msg="Nenhum aniversariante este mês." />
          }
        </CardLista>

        <CardLista title="Planos Vencendo em 30 dias" icon={AlertTriangle} linkTo="/operacional/alunos">
          {loadVencendo
            ? <ListaLoader />
            : planosVencendo?.results?.length
              ? planosVencendo.results.map(p => (
                  <ListRow
                    key={p.aplano_id}
                    label={p.alu_nome || '—'}
                    sub={`Vence: ${formatDate(p.aplano_data_fim)}`}
                    right={
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                        Vencendo
                      </Badge>
                    }
                  />
                ))
              : <ListaVazia msg="Nenhum plano vencendo nos próximos 30 dias." />
          }
        </CardLista>

        <CardLista title="Ocupação das Turmas" icon={UserCheck}>
          {loadMatriculas
            ? <ListaLoader />
            : turmasList.length
              ? turmasList.map(t => (
                  <ListRow
                    key={t.nome}
                    label={t.nome}
                    sub={`${t.count} aluno(s) matriculado(s)`}
                    right={<OccupancyBar count={t.count} />}
                  />
                ))
              : <ListaVazia msg="Nenhuma turma com matrículas ativas." />
          }
        </CardLista>
      </div>
    </div>
  )
}

// ── Seção Técnico / Operacional ───────────────────────────────────────────────

function SecaoTecnico() {
  const hoje = hojeISO()

  const { data: turmas, isLoading: loadTurmas } = useQuery({
    queryKey: ['dash-turmas'],
    queryFn: () => api.get('/turmas/', { params: { page_size: 1 } }).then(r => r.data),
  })

  const { data: aulasHoje, isLoading: loadAulas } = useQuery({
    queryKey: ['dash-aulas-hoje', hoje],
    queryFn: () => api.get('/aulas/', { params: { aul_data: hoje, page_size: 20 } }).then(r => r.data.results),
  })

  const { data: creditos, isLoading: loadCreditos } = useQuery({
    queryKey: ['dash-creditos'],
    queryFn: () => api.get('/creditos/', { params: { cred_status: 'disponivel', page_size: 1 } }).then(r => r.data),
  })

  const { data: experimentais, isLoading: loadExp } = useQuery({
    queryKey: ['dash-experimental'],
    queryFn: () => api.get('/agendamento-experimental/', { params: { age_status: 'pendente', page_size: 5 } }).then(r => r.data),
  })

  const { data: funcionarios, isLoading: loadFunc } = useQuery({
    queryKey: ['dash-funcionarios'],
    queryFn: () => api.get('/funcionarios/', { params: { page_size: 1 } }).then(r => r.data),
  })

  const totalPresentes = aulasHoje?.reduce((s, a) => s + (a.total_presentes ?? 0), 0) ?? 0

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Aulas & Equipe"
        subtitle="Programação, agendamentos e funcionários"
        icon={Dumbbell}
        iconBg="bg-fluir-cyan/10"
        iconColor="text-fluir-cyan"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Turmas Ativas"
          to="/operacional/turmas"
          value={turmas?.count ?? '—'}
          icon={Calendar}
          color="purple"
          isLoading={loadTurmas}
        />
        <StatCard
          title="Aulas Hoje"
          to="/tecnico/aulas"
          value={loadAulas ? '—' : (aulasHoje?.length ?? 0)}
          sub={aulasHoje?.length ? `${totalPresentes} presença(s)` : 'nenhuma programada'}
          icon={Activity}
          color={aulasHoje?.length ? 'green' : 'amber'}
          isLoading={loadAulas}
        />
        <StatCard
          title="Créditos Disponíveis"
          to="/tecnico/aulas"
          value={creditos?.count ?? '—'}
          sub="reposições"
          icon={RefreshCw}
          color="cyan"
          isLoading={loadCreditos}
        />
        <StatCard
          title="Funcionários"
          to="/operacional/funcionarios"
          value={funcionarios?.count ?? '—'}
          icon={Briefcase}
          color="amber"
          isLoading={loadFunc}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardLista title="Aulas de Hoje" icon={Activity} linkTo="/tecnico/aulas">
          {loadAulas
            ? <ListaLoader />
            : aulasHoje?.length
              ? aulasHoje.map(a => {
                  const mod = MODALIDADE_BADGE[a.aul_modalidade] ?? { label: a.aul_modalidade ?? '—', cls: 'bg-muted text-muted-foreground border-border' }
                  return (
                    <ListRow
                      key={a.aul_id}
                      label={a.tur_nome ?? a.aul_nome}
                      sub={a.func_nome ? `Prof. ${a.func_nome}` : undefined}
                      right={
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${mod.cls}`}>
                            {mod.label}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {horaStr(a.aul_hora_inicio)}
                          </span>
                        </div>
                      }
                    />
                  )
                })
              : <ListaVazia msg="Nenhuma aula programada para hoje." />
          }
        </CardLista>

        <CardLista
          title="Agend. Experimentais Pendentes"
          icon={UserCheck}
          linkTo="/tecnico/experimental"
        >
          {loadExp
            ? <ListaLoader />
            : experimentais?.results?.length
              ? experimentais.results.map(a => {
                  const mod = MODALIDADE_BADGE[a.age_modalidade] ?? { label: a.age_modalidade ?? '—', cls: 'bg-muted text-muted-foreground border-border' }
                  return (
                    <ListRow
                      key={a.age_id}
                      label={a.age_nome}
                      sub={`${formatDate(a.age_data_agendada)} · ${horaStr(a.age_hora_agendada)}`}
                      right={
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${mod.cls}`}>
                          {mod.label}
                        </span>
                      }
                    />
                  )
                })
              : <ListaVazia msg="Nenhum agendamento experimental pendente." />
          }
        </CardLista>
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, canAccessFinanceiro, canAccessTecnico, canAccessOperacional } = useAuthStore()

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = user?.first_name || user?.email?.split('@')[0] || 'usuário'

  const showFinanceiro = canAccessFinanceiro()
  const showTecnico    = canAccessTecnico() || canAccessOperacional()

  const dataFormatada = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold font-display">
            {saudacao}, {primeiroNome}!
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{dataFormatada}</p>
        </div>
        <Badge variant="outline" className="text-[11px] shrink-0 hidden sm:flex">
          Studio Fluir
        </Badge>
      </div>

      {showFinanceiro && <SecaoFinanceiro />}
      {(showTecnico || showFinanceiro) && <SecaoAlunos />}
      {showTecnico && <SecaoTecnico />}

      {!showFinanceiro && !showTecnico && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">Bem-vindo ao Studio Fluir.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Seu perfil ainda não tem acesso configurado. Fale com o administrador.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
