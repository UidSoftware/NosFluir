import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Input, FormField } from '@/components/ui/primitives'
import { formatDate, formatCurrency } from '@/lib/utils'
import api from '@/services/api'

export default function RelContasReceberPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [page, setPage]             = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['rel-contas-receber', dataInicio, dataFim, page],
    queryFn: () => api.get('/contas-receber/', {
      params: { data_inicio: dataInicio || undefined, data_fim: dataFim || undefined, page },
    }).then(r => r.data),
  })

  const items      = data?.results ?? []
  const count      = data?.count ?? 0
  const totalPages = Math.ceil(count / 20) || 1
  const totalGeral = items.reduce((s, r) => s + parseFloat(r.rec_valor_total || 0), 0)

  const columns = [
    { key: 'rec_descricao',       header: 'Descrição',  render: r => r.rec_descricao },
    { key: 'aluno_nome',          header: 'Aluno',       render: r => r.aluno_nome || '—' },
    { key: 'rec_valor_total',     header: 'Total',       render: r => formatCurrency(r.rec_valor_total) },
    { key: 'rec_data_vencimento', header: 'Vencimento',  render: r => formatDate(r.rec_data_vencimento) },
    { key: 'rec_status',          header: 'Status',      render: r => <StatusBadge status={r.rec_status} /> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Relatório — Contas a Receber" />
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
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
            <div className="text-sm font-medium">Total: <span className="text-emerald-400">{formatCurrency(totalGeral)}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
