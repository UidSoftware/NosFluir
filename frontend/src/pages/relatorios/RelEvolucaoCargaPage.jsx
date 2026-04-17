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

const COLORS = ['#01E2CD', '#5D5CE0', '#f59e0b', '#ef4444', '#10b981']

const parseCarga = (carga) => {
  if (!carga) return null
  const m = String(carga).match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

export default function RelEvolucaoCargaPage() {
  const [aluId, setAluId] = useState('')
  const [exeId, setExeId] = useState('')

  const { data: alunos } = useQuery({
    queryKey: ['alunos-select-evolucao'],
    queryFn: () => fetchAll('/alunos/'),
    staleTime: 5 * 60 * 1000,
  })

  const { data: exercicios } = useQuery({
    queryKey: ['exercicios-select-evolucao'],
    queryFn: () => fetchAll('/exercicios/'),
    staleTime: 5 * 60 * 1000,
  })

  const { data: registros, isLoading, isFetching } = useQuery({
    queryKey: ['evolucao-carga', aluId, exeId],
    queryFn: () => api.get('/relatorios/evolucao-carga/', { params: { alu: aluId, exe: exeId } })
      .then(r => r.data),
    enabled: !!aluId && !!exeId,
  })

  const chartData = (registros || []).map(r => ({
    label:      `C${r.ciclo ?? '?'}-P${r.posicao ?? '?'}`,
    carga:      parseCarga(r.carga),
    cargaTexto: r.carga || '—',
    series:     r.series,
    repeticoes: r.repeticoes,
    obs:        r.observacoes,
    data:       r.data,
  }))

  const temDados = chartData.some(d => d.carga !== null)

  const exeNome = exercicios?.find(e => String(e.exe_id) === exeId)?.exe_nome || ''

  return (
    <div className="space-y-5">
      <PageHeader
        title="Evolução de Carga"
        description="Progressão de carga por exercício ao longo dos ciclos"
      />

      <div className="flex flex-wrap gap-4">
        <FormField label="Aluno" className="min-w-[200px]">
          <Select value={aluId || '__none__'} onValueChange={v => setAluId(v === '__none__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar aluno..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar aluno...</SelectItem>
              {alunos?.map(a => <SelectItem key={a.alu_id} value={String(a.alu_id)}>{a.alu_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Exercício" className="min-w-[220px]">
          <Select value={exeId || '__none__'} onValueChange={v => setExeId(v === '__none__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar exercício..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar exercício...</SelectItem>
              {exercicios?.map(e => <SelectItem key={e.exe_id} value={String(e.exe_id)}>{e.exe_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {!aluId || !exeId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Selecione um aluno e um exercício para visualizar a evolução.
          </CardContent>
        </Card>
      ) : isLoading || isFetching ? (
        <Skeleton className="h-64 w-full" />
      ) : chartData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Nenhum registro encontrado para esse aluno e exercício.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {exeNome} — evolução de carga
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              {temDados ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#252244" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} unit="kg" allowDecimals={false} />
                    <Tooltip
                      formatter={(val, name, props) => [
                        `${props.payload.cargaTexto}  (${props.payload.series ?? '—'}x${props.payload.repeticoes ?? '—'})`,
                        'Carga',
                      ]}
                      labelFormatter={l => `Aula: ${l}`}
                      contentStyle={{ background: '#1a1833', border: '1px solid #2d2b55', fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="carga"
                      name="Carga (kg)"
                      stroke={COLORS[0]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Cargas registradas em texto (ex: faixa amarela) — não é possível plotar gráfico.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tabela de registros */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Registros detalhados</CardTitle></CardHeader>
            <CardContent className="pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="pb-2 pr-4">Ciclo</th>
                      <th className="pb-2 pr-4">Posição</th>
                      <th className="pb-2 pr-4">Data</th>
                      <th className="pb-2 pr-4">Séries × Reps</th>
                      <th className="pb-2 pr-4">Carga</th>
                      <th className="pb-2">Obs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {chartData.map((r, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="py-2 pr-4">{r.label.split('-')[0].replace('C','Ciclo ')}</td>
                        <td className="py-2 pr-4">{r.label.split('-')[1]?.replace('P','Pos ')}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {r.data ? new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="py-2 pr-4">{r.series != null && r.repeticoes != null ? `${r.series}×${r.repeticoes}` : '—'}</td>
                        <td className="py-2 pr-4 font-medium">{r.cargaTexto}</td>
                        <td className="py-2 text-muted-foreground italic text-xs">{r.obs || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
