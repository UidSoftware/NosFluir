import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Input, FormField } from '@/components/ui/primitives'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/services/api'

export default function RelLivroCaixaPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [page, setPage]             = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['rel-livro-caixa', dataInicio, dataFim, page],
    queryFn: () => api.get('/livro-caixa/', {
      params: { data_inicio: dataInicio || undefined, data_fim: dataFim || undefined, page },
    }).then(r => r.data),
  })

  const items      = data?.results ?? []
  const count      = data?.count ?? 0
  const totalPages = Math.ceil(count / 20) || 1

  const totalEntradas = items.filter(r => r.lica_tipo_lancamento === 'entrada').reduce((s, r) => s + parseFloat(r.lica_valor || 0), 0)
  const totalSaidas   = items.filter(r => r.lica_tipo_lancamento === 'saida').reduce((s, r) => s + parseFloat(r.lica_valor || 0), 0)
  const saldo         = totalEntradas - totalSaidas

  const columns = [
    { key: 'lica_tipo_lancamento', header: 'Tipo',      render: r => <StatusBadge status={r.lica_tipo_lancamento} /> },
    { key: 'lica_historico',       header: 'Histórico', render: r => r.lica_historico },
    {
      key: 'lica_valor', header: 'Valor',
      render: r => (
        <span className={r.lica_tipo_lancamento === 'entrada' ? 'text-emerald-400' : 'text-red-400'}>
          {r.lica_tipo_lancamento === 'entrada' ? '+' : '-'}{formatCurrency(r.lica_valor)}
        </span>
      ),
    },
    { key: 'lica_data_lancamento', header: 'Data', render: r => formatDate(r.lica_data_lancamento) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Relatório — Livro Caixa" />
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
          <DataTable columns={columns} data={items} isLoading={isLoading} emptyMessage="Nenhum lançamento no período." />
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
            <div className="flex items-center gap-4 text-sm">
              <span>Entradas: <span className="text-emerald-400 font-medium">{formatCurrency(totalEntradas)}</span></span>
              <span>Saídas: <span className="text-red-400 font-medium">{formatCurrency(totalSaidas)}</span></span>
              <span>Saldo: <span className={cn('font-semibold', saldo >= 0 ? 'text-emerald-400' : 'text-red-400')}>{formatCurrency(saldo)}</span></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
