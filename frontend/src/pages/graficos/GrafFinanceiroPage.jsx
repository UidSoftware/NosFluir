import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/primitives'
import { formatCurrency } from '@/lib/utils'
import api from '@/services/api'

const COLORS = ['#5D5CE0', '#01E2CD', '#f59e0b', '#ef4444', '#10b981']

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
  const { data: caixa, isLoading } = useQuery({
    queryKey: ['graf-financeiro'],
    queryFn: () => api.get('/livro-caixa/', { params: { page_size: 100 } }).then(r => r.data.results),
  })

  // Agrupar por mês
  const byMonth = {}
  caixa?.forEach(item => {
    const [y, m] = (item.lica_data_lancamento || '').split('-')
    if (!y || !m) return
    const key = `${m}/${y}`
    if (!byMonth[key]) byMonth[key] = { mes: key, entradas: 0, saidas: 0 }
    const val = parseFloat(item.lica_valor || 0)
    if (item.lica_tipo_lancamento === 'entrada') byMonth[key].entradas += val
    else byMonth[key].saidas += val
  })
  const lineData = Object.values(byMonth).slice(-6)

  return (
    <div className="space-y-5">
      <PageHeader title="Gráficos Financeiros" description="Análise visual das movimentações" />

      <Card>
        <CardHeader>
          <CardTitle>Entradas × Saídas por Mês</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252244" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke={COLORS[1]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saidas"   name="Saídas"   stroke={COLORS[3]} strokeWidth={2} dot={false} />
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
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entradas" name="Entradas" fill={COLORS[1]} radius={[4,4,0,0]} />
                <Bar dataKey="saidas"   name="Saídas"   fill={COLORS[3]} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
