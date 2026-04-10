import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, FormField, Skeleton } from '@/components/ui/primitives'
import api from '@/services/api'

const COLORS = ['#5D5CE0', '#01E2CD', '#f59e0b', '#ef4444', '#10b981']

export default function GrafFrequenciaPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')

  const { data: aulas, isLoading } = useQuery({
    queryKey: ['graf-frequencia', dataInicio, dataFim],
    queryFn: () => api.get('/ministrar-aula/', {
      params: { data_inicio: dataInicio || undefined, data_fim: dataFim || undefined, page_size: 500 },
    }).then(r => r.data.results),
  })

  // Por tipo de presença
  const countPresenca = { presente: 0, falta: 0, reposicao: 0 }
  const byMonth = {}
  aulas?.forEach(a => {
    if (a.miau_tipo_presenca) countPresenca[a.miau_tipo_presenca] = (countPresenca[a.miau_tipo_presenca] || 0) + 1
    const [y, m] = (a.miau_data || '').split('-')
    if (y && m) {
      const key = `${m}/${y}`
      if (!byMonth[key]) byMonth[key] = { mes: key, presente: 0, falta: 0, reposicao: 0 }
      if (a.miau_tipo_presenca) byMonth[key][a.miau_tipo_presenca] = (byMonth[key][a.miau_tipo_presenca] || 0) + 1
    }
  })

  const barData  = [
    { name: 'Presente',  value: countPresenca.presente,  fill: COLORS[1] },
    { name: 'Falta',     value: countPresenca.falta,     fill: COLORS[3] },
    { name: 'Reposição', value: countPresenca.reposicao, fill: COLORS[0] },
  ]
  const lineData = Object.values(byMonth).slice(-6)

  return (
    <div className="space-y-5">
      <PageHeader title="Gráficos de Frequência" description="Evolução de presenças e faltas" />

      <div className="flex flex-wrap gap-3">
        <FormField label="Data Início" className="min-w-[140px]">
          <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </FormField>
        <FormField label="Data Fim" className="min-w-[140px]">
          <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Presenças × Faltas</CardTitle></CardHeader>
          <CardContent className="pb-5">
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252244" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Total" radius={[4,4,0,0]}>
                    {barData.map((entry, i) => (
                      <Bar key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Evolução Mensal</CardTitle></CardHeader>
          <CardContent className="pb-5">
            {isLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252244" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="presente"  name="Presente"  stroke={COLORS[1]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="falta"     name="Falta"     stroke={COLORS[3]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reposicao" name="Reposição" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
