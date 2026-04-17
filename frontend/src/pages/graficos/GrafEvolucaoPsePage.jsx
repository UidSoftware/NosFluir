import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, Skeleton } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchAll } from '@/hooks/useApi'
import api from '@/services/api'

const COLORS = ['#01E2CD', '#5D5CE0', '#f59e0b', '#ef4444', '#10b981', '#f97316', '#8b5cf6']

export default function GrafEvolucaoPsePage() {
  const [turId, setTurId] = useState('')

  const { data: turmas } = useQuery({
    queryKey: ['turmas-select-pse'],
    queryFn: () => fetchAll('/turmas/'),
    staleTime: 5 * 60 * 1000,
  })

  const { data: registros, isLoading } = useQuery({
    queryKey: ['evolucao-pse', turId],
    queryFn: () => api.get('/relatorios/evolucao-pse/', { params: { tur: turId } })
      .then(r => r.data),
    enabled: !!turId,
  })

  // Pivotar: [{posicao: 1, "Ciclo 1": 12.5, "Ciclo 2": 11.0}, ...]
  const ciclos = [...new Set((registros || []).map(r => r.ciclo).filter(Boolean))].sort((a, b) => a - b)
  const posicoes = [...new Set((registros || []).map(r => r.posicao).filter(Boolean))].sort((a, b) => a - b)

  const chartData = posicoes.map(pos => {
    const ponto = { label: `Pos ${pos}` }
    ciclos.forEach(ciclo => {
      const reg = registros?.find(r => r.posicao === pos && r.ciclo === ciclo)
      ponto[`Ciclo ${ciclo}`] = reg?.pse_medio ?? null
    })
    return ponto
  })

  const turNome = turmas?.find(t => String(t.tur_id) === turId)?.tur_nome || ''

  return (
    <div className="space-y-5">
      <PageHeader
        title="Evolução de PSE"
        description="Percepção Subjetiva de Esforço (Borg 6–20) por ciclo"
      />

      <FormField label="Turma" className="max-w-xs">
        <Select value={turId || '__none__'} onValueChange={v => setTurId(v === '__none__' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar turma..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar turma...</SelectItem>
            {turmas?.map(t => <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      {!turId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Selecione uma turma para visualizar a evolução de PSE por ciclo.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : chartData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Nenhum dado de PSE registrado para esta turma.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {turNome} — PSE médio por posição do ciclo
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252244" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis
                  domain={[6, 20]}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  ticks={[6, 8, 10, 12, 14, 16, 18, 20]}
                />
                <Tooltip
                  formatter={(val) => val != null ? [val.toFixed(1), 'PSE médio'] : ['—', 'PSE médio']}
                  contentStyle={{ background: '#1a1833', border: '1px solid #2d2b55', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {ciclos.map((ciclo, i) => (
                  <Line
                    key={ciclo}
                    type="monotone"
                    dataKey={`Ciclo ${ciclo}`}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Escala de Borg: 6 = nenhum esforço · 20 = máximo. Queda ao longo dos ciclos indica condicionamento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
