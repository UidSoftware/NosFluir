import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import api from '@/services/api'

const COLORS = ['#5D5CE0', '#01E2CD', '#f59e0b', '#ef4444', '#10b981']

const MESES_NOMES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CustomTooltip = ({ active, payload, label }) => {
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

export default function GrafFinanceiroPage() {
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1

  const [filtroMes, setFiltroMes] = useState('all')
  const [filtroAno, setFiltroAno] = useState(String(anoAtual))

  const ANOS = [String(anoAtual - 2), String(anoAtual - 1), String(anoAtual)]

  const { data: caixa, isLoading } = useQuery({
    queryKey: ['graf-financeiro', filtroAno],
    queryFn: () => api.get('/livro-caixa/', {
      params: {
        page_size: 500,
        lica_data_lancamento__gte: filtroAno + '-01-01',
        lica_data_lancamento__lte: filtroAno + '-12-31',
      }
    }).then(r => r.data.results),
  })

  // Agrupar por mes
  const byMonth = {}
  caixa?.forEach(item => {
    const [y, m] = (item.lica_data_lancamento || '').split('-')
    if (!y || !m) return
    // Filtrar por mes se selecionado
    if (filtroMes !== 'all' && m !== filtroMes.padStart(2, '0')) return
    const key = m + '/' + y
    if (!byMonth[key]) byMonth[key] = { mes: key, entradas: 0, saidas: 0 }
    const val = parseFloat(item.lica_valor || 0)
    if (item.lica_tipo_lancamento === 'entrada') byMonth[key].entradas += val
    else byMonth[key].saidas += val
  })

  const lineData = Object.entries(byMonth)
    .sort(([a], [b]) => {
      const [ma, ya] = a.split('/')
      const [mb, yb] = b.split('/')
      return (ya + ma).localeCompare(yb + mb)
    })
    .map(([, v]) => v)

  const manyPoints = lineData.length >= 6

  return (
    <div className="space-y-5">
      <PageHeader title="Graficos Financeiros" description="Analise visual das movimentacoes" />

      {/* Filtros de periodo */}
      <div className="flex flex-wrap gap-3">
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Mes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {MESES_NOMES.map((nome, idx) => (
              <SelectItem key={idx+1} value={String(idx+1)}>{nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroAno} onValueChange={setFiltroAno}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            {ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entradas x Saidas por Mes</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252244" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  angle={manyPoints ? -30 : 0}
                  textAnchor={manyPoints ? 'end' : 'middle'}
                  height={manyPoints ? 45 : 30}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => 'R$' + (v/1000).toFixed(0) + 'k'} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="entradas"
                  name="Entradas"
                  stroke={COLORS[1]}
                  strokeWidth={2}
                  dot={lineData.length < 6 ? { r: 3, fill: '#01E2CD' } : false}
                />
                <Line
                  type="monotone"
                  dataKey="saidas"
                  name="Saidas"
                  stroke={COLORS[3]}
                  strokeWidth={2}
                  dot={lineData.length < 6 ? { r: 3, fill: '#ef4444' } : false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparativo Mensal (Barras)</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252244" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  angle={manyPoints ? -30 : 0}
                  textAnchor={manyPoints ? 'end' : 'middle'}
                  height={manyPoints ? 45 : 30}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => 'R$' + (v/1000).toFixed(0) + 'k'} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entradas" name="Entradas" fill={COLORS[1]} radius={[4,4,0,0]} />
                <Bar dataKey="saidas"   name="Saidas"   fill={COLORS[3]} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
