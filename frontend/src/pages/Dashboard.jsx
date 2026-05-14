import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  DollarSign, TrendingUp, TrendingDown, Users, Calendar,
  Activity, Wallet, Package, RefreshCw, Dumbbell,
  ChevronRight, UserCheck,
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

function StatCard({ title, value, sub, icon: Icon, color = 'purple', isLoading }) {
  const colors = {
    purple: 'bg-fluir-purple/10 text-fluir-purple',
    cyan:   'bg-fluir-cyan/10 text-fluir-cyan',
    green:  'bg-emerald-500/10 text-emerald-400',
    red:    'bg-red-500/10 text-red-400',
    amber:  'bg-amber-500/10 text-amber-400',
  }
  return (
    <Card>
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

  // Saldo total das contas
  const saldoTotal = contas?.reduce((s, c) => s + parseFloat(c.saldo_atual || 0), 0) ?? 0

  // Totais pendentes
  const totalPagar   = pagarData?.results?.reduce((s, r) => s + parseFloat(r.pag_valor_total || 0), 0) ?? 0
  const totalReceber = receberData?.results?.reduce((s, r) => s + parseFloat(r.rec_valor_total || 0), 0) ?? 0

  // Resultado do mês atual via livro-caixa
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

  // Gráfico — agrupa por mês, últimos 3
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

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Financeiro"
        subtitle="Contas, fluxo e pendências"
        icon={Wallet}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-400"
      />

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(saldoTotal)}
          sub={`${contas?.length ?? 0} conta(s)`}
          icon={Wallet}
          color="cyan"
          isLoading={loadContas}
        />
        <StatCard
          title="A Pagar Pendente"
          value={formatCurrency(totalPagar)}
          sub={`${pagarData?.count ?? 0} conta(s)`}
          icon={TrendingDown}
          color="red"
          isLoading={loadPagar}
        />
        <StatCard
          title="A Receber Pendente"
          value={formatCurrency(totalReceber)}
          sub={`${receberData?.count ?? 0} conta(s)`}
          icon={TrendingUp}
          color="green"
          isLoading={loadReceber}
        />
        <StatCard
          title="Resultado do Mês"
          value={formatCurrency(resultadoMes)}
          sub={resultadoMes >= 0 ? '↑ Positivo' : '↓ Negativo'}
          icon={Activity}
          color={resultadoMes >= 0 ? 'green' : 'red'}
          isLoading={loadLcx}
        />
      </div>

      {/* Gráfico + Próximas a Pagar */}
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

      {/* Próximas a Receber + Alertas Estoque */}
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
      </div>
    </div>
  )
}

// ── Seção Técnico / Operacional ───────────────────────────────────────────────

function SecaoTecnico() {
  const hoje = hojeISO()

  const { data: alunos, isLoading: loadAlunos } = useQuery({
    queryKey: ['dash-alunos'],
    queryFn: () => api.get('/alunos/', { params: { page_size: 1 } }).then(r => r.data),
  })

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

  const totalPresentes = aulasHoje?.reduce((s, a) => s + (a.total_presentes ?? 0), 0) ?? 0

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Técnico / Operacional"
        subtitle="Alunos, aulas e agendamentos"
        icon={Dumbbell}
        iconBg="bg-fluir-purple/10"
        iconColor="text-fluir-purple"
      />

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total de Alunos"
          value={alunos?.count ?? '—'}
          icon={Users}
          color="purple"
          isLoading={loadAlunos}
        />
        <StatCard
          title="Turmas Ativas"
          value={turmas?.count ?? '—'}
          icon={Calendar}
          color="cyan"
          isLoading={loadTurmas}
        />
        <StatCard
          title="Aulas Hoje"
          value={loadAulas ? '—' : (aulasHoje?.length ?? 0)}
          sub={aulasHoje?.length ? `${totalPresentes} presença(s)` : 'nenhuma programada'}
          icon={Activity}
          color={aulasHoje?.length ? 'green' : 'amber'}
          isLoading={loadAulas}
        />
        <StatCard
          title="Créditos Disponíveis"
          value={creditos?.count ?? '—'}
          sub="reposições"
          icon={RefreshCw}
          color="amber"
          isLoading={loadCreditos}
        />
      </div>

      {/* Aulas de hoje + Experimentais pendentes */}
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
      {/* Boas-vindas */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">
            {saudacao}, {primeiroNome}!
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{dataFormatada}</p>
        </div>
        <Badge variant="outline" className="text-[11px] shrink-0 hidden sm:flex">
          Studio Fluir
        </Badge>
      </div>

      {showFinanceiro && <SecaoFinanceiro />}
      {showTecnico    && <SecaoTecnico />}

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
