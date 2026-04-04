import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Input, FormField } from '@/components/ui/primitives'
import { formatDate } from '@/lib/utils'
import api from '@/services/api'

export default function RelPressaoPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [page, setPage]             = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['rel-pressao', dataInicio, dataFim, page],
    queryFn: () => api.get('/tecnico/aulas/', {
      params: {
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
        page,
        has_pressao: true,
      },
    }).then(r => r.data),
  })

  const items      = data?.results ?? []
  const count      = data?.count ?? 0
  const totalPages = Math.ceil(count / 20) || 1

  const columns = [
    { key: 'aluno_nome',         header: 'Aluno',      render: r => r.aluno_nome || r.aluno_id },
    { key: 'aul_data',           header: 'Data',        render: r => formatDate(r.aul_data) },
    { key: 'aul_pressao_inicio', header: 'P.A. Início', render: r => r.aul_pressao_inicio || '—' },
    { key: 'aul_pressao_fim',    header: 'P.A. Fim',    render: r => r.aul_pressao_fim || '—' },
    { key: 'aul_intensidade',    header: 'Intensidade', render: r => r.aul_intensidade != null ? `${r.aul_intensidade}/10` : '—' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Relatório de Pressão Arterial" description="Histórico de medições de P.A. por aluno" />
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
          <DataTable columns={columns} data={items} isLoading={isLoading} emptyMessage="Nenhum registro no período." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
