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

const fmtData = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}`
}

const MODALIDADE_OPTS = [
  { value: null,        label: 'Todos' },
  { value: 'funcional', label: 'Funcional' },
  { value: 'pilates',   label: 'Pilates' },
]

export default function GrafEvolucaoPsePage() {
  const [turId, setTurId] = useState('')
  const [modalidade, setModalidade] = useState(null)

  const { data: turmas } = useQuery({
    queryKey: ['turmas-select-pse'],
    queryFn: () => fetchAll('/turmas/'),
    staleTime: 5 * 60 * 1000,
  })

  const { data: registros, isLoading } = useQuery({
    queryKey: ['evolucao-pse', turId, modalidade],
    queryFn: () => api.get('/relatorios/evolucao-pse/', {
      params: { tur: turId, ...(modalidade ? { modalidade } : {}) },
    }).then(r => r.data),
    enabled: !!turId,
  })

  // Eixo X = posição da ficha no ciclo (1, 2, 3...), linhas por ciclo
  // Isso permite comparar a mesma ficha entre ciclos → ver condicionamento
  const ciclos = [...new Set((registros || []).map(r => r.ciclo ?? 1))].sort((a, b) => a - b)

  const posicoes = [...new Set((registros || []).map(r => r.posicao).filter(v => v != null))].sort((a, b) => a - b)

  // Usa posicao como chave; fitr_nome como label do eixo X
  const chartData = posicoes.map(pos => {
    const ref = (registros || []).find(r => r.posicao === pos)
    const nome = ref?.fitr_nome ?? `Ficha ${pos}`
    // Extrai só o título da ficha (remove prefixo "Aula N.N- ")
    const label = nome.replace(/^Aula\s+[\d.]+\s*[-–]\s*/i, '').trim() || nome
    const ponto = { label, posicao: pos }
    ciclos.forEach(ciclo => {
      const reg = (registros || []).find(r => r.posicao === pos && (r.ciclo ?? 1) === ciclo)
      ponto[`Ciclo ${ciclo}`] = reg?.pse_medio ?? null
      if (reg) {
        ponto[`_total_${ciclo}`] = reg.total
        ponto[`_data_${ciclo}`]  = reg.data
      }
    })
    return ponto
  })

  const turNome = turmas?.find(t => String(t.tur_id) === turId)?.tur_nome || ''

  return (
    <div className="space-y-5">
      <PageHeader
        title="Evolução de PSE"
        description="Percepção Subjetiva de Esforço (Borg 6–20) por aula"
      />

      <div className="flex flex-wrap items-end gap-4">
        <FormField label="Turma" className="max-w-xs">
          <Select value={turId || '__none__'} onValueChange={v => setTurId(v === '__none__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar turma..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar turma...</SelectItem>
              {turmas?.map(t => <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        <div className="flex gap-1 pb-0.5">
          {MODALIDADE_OPTS.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setModalidade(opt.value)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                modalidade === opt.value
                  ? opt.value === 'funcional' ? 'bg-fluir-cyan/20 text-fluir-cyan border border-fluir-cyan/40'
                    : opt.value === 'pilates' ? 'bg-fluir-purple/20 text-fluir-purple border border-fluir-purple/40'
                    : 'bg-muted text-foreground border border-border'
                  : 'text-muted-foreground border border-border/50 hover:border-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!turId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Selecione uma turma para visualizar a evolução de PSE por aula.
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
              {turNome} — PSE médio por aula
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
                  formatter={(val, name, props) => {
                    if (val == null) return ['—', name]
                    const total = props.payload[`_total_${name}`]
                    const data  = props.payload[`_data_${name}`]
                    const dataFmt = data ? ` · ${fmtData(data)}` : ''
                    return [`${val.toFixed(1)} (${total} alunos${dataFmt})`, name]
                  }}
                  labelFormatter={l => `Ficha: ${l}`}
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
              Escala de Borg: 6 = nenhum esforço · 20 = máximo. Queda ao longo das aulas indica condicionamento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
