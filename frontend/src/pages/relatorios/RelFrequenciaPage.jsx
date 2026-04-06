import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Input, FormField, Skeleton } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatCurrency } from '@/lib/utils'
import api from '@/services/api'

export default function RelFrequenciaPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [page, setPage]             = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['rel-frequencia', dataInicio, dataFim, page],
    queryFn: () => api.get('/aulas/', {
      params: { data_inicio: dataInicio || undefined, data_fim: dataFim || undefined, page },
    }).then(r => r.data),
  })

  const items      = data?.results ?? []
  const count      = data?.count ?? 0
  const totalPages = Math.ceil(count / 20) || 1

  const totalPresentes  = items.filter(r => r.aul_tipo_presenca === 'regular').length
  const totalFaltas     = items.filter(r => r.aul_tipo_presenca === 'falta').length
  const totalReposicoes = items.filter(r => r.aul_tipo_presenca === 'reposicao').length

  const columns = [
    { key: 'alu_nome',          header: 'Aluno',    render: r => r.alu_nome || r.alu },
    { key: 'tur_nome',          header: 'Turma',    render: r => r.tur_nome || '—' },
    { key: 'aul_data',          header: 'Data',     render: r => formatDate(r.aul_data) },
    { key: 'aul_tipo_presenca', header: 'Presença', render: r => <StatusBadge status={r.aul_tipo_presenca} /> },
    { key: 'aul_pressao_inicio', header: 'P.A. Início', render: r => r.aul_pressao_inicio || '—' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Relatório de Frequência" description="Histórico de presenças e faltas" />

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <FormField label="Data Início" className="min-w-[140px]">
              <Input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPage(1) }} />
            </FormField>
            <FormField label="Data Fim" className="min-w-[140px]">
              <Input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPage(1) }} />
            </FormField>
          </div>

          {/* Totalizadores */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Presenças',  value: totalPresentes,  color: 'text-emerald-400' },
              { label: 'Faltas',     value: totalFaltas,     color: 'text-red-400' },
              { label: 'Reposições', value: totalReposicoes, color: 'text-blue-400' },
            ].map(t => (
              <div key={t.label} className="rounded-lg bg-fluir-dark-3 px-4 py-3">
                <p className="text-xs text-muted-foreground">{t.label}</p>
                <p className={`text-lg font-semibold ${t.color}`}>{t.value}</p>
              </div>
            ))}
          </div>

          <DataTable columns={columns} data={items} isLoading={isLoading} emptyMessage="Nenhum registro no período." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
