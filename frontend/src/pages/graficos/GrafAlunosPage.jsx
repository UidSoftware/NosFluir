import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/primitives'
import api from '@/services/api'

const COLORS = ['#5D5CE0', '#01E2CD', '#f59e0b', '#ef4444', '#10b981']

export default function GrafAlunosPage() {
  const { data: turmasData, isLoading: loadingT } = useQuery({
    queryKey: ['graf-alunos-turmas'],
    queryFn: () => api.get('/operacional/turma-alunos/', { params: { page_size: 500 } }).then(r => r.data.results),
  })

  const { data: alunos, isLoading: loadingA } = useQuery({
    queryKey: ['graf-alunos-all'],
    queryFn: () => api.get('/operacional/alunos/', { params: { page_size: 500 } }).then(r => r.data.results),
  })

  // Alunos por turma
  const countByTurma = {}
  turmasData?.forEach(ta => {
    const nome = ta.turma_nome || `Turma ${ta.turma_id}`
    countByTurma[nome] = (countByTurma[nome] || 0) + 1
  })
  const turmaBarData = Object.entries(countByTurma).map(([name, value]) => ({ name, value }))

  // Faixa etária
  const now = new Date()
  const faixas = { 'Até 25': 0, '26-40': 0, '41-55': 0, '56+': 0 }
  alunos?.forEach(a => {
    if (!a.alu_data_nascimento) return
    const age = Math.floor((now - new Date(a.alu_data_nascimento)) / (1000 * 60 * 60 * 24 * 365))
    if (age <= 25)       faixas['Até 25']++
    else if (age <= 40)  faixas['26-40']++
    else if (age <= 55)  faixas['41-55']++
    else                 faixas['56+']++
  })
  const pieData = Object.entries(faixas).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-5">
      <PageHeader title="Gráficos de Alunos" description="Distribuição por turma e faixa etária" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Alunos por Turma</CardTitle></CardHeader>
          <CardContent className="pb-5">
            {loadingT ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={turmaBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#252244" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Alunos" fill={COLORS[0]} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Faixa Etária</CardTitle></CardHeader>
          <CardContent className="pb-5">
            {loadingA ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
