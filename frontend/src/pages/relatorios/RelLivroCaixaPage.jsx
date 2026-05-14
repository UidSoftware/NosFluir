import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Input, FormField } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import { fetchAll } from '@/hooks/useApi'

export default function RelLivroCaixaPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [tipo, setTipo]             = useState('all')
  const [conta, setConta]           = useState('all')
  const [page, setPage]             = useState(1)

  const { data: contas = [] } = useQuery({
    queryKey: ['contas-select'],
    queryFn: () => fetchAll('/contas/'),
  })

  const params = {
    page,
    ordering: '-lica_data_lancamento',
    ...(dataInicio                  && { data_inicio: dataInicio }),
    ...(dataFim                     && { data_fim: dataFim }),
    ...(tipo  !== 'all'             && { lica_tipo_lancamento: tipo }),
    ...(conta !== 'all'             && { conta }),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['rel-livro-caixa', params],
    queryFn: () => api.get('/livro-caixa/', { params }).then(r => r.data),
  })

  const totaisParams = { ...params }
  delete totaisParams.page
  const { data: totais } = useQuery({
    queryKey: ['rel-livro-caixa-totais', totaisParams],
    queryFn: () => api.get('/livro-caixa/totais/', { params: totaisParams }).then(r => r.data),
  })

  const items      = data?.results ?? []
  const count      = data?.count   ?? 0
  const totalPages = Math.ceil(count / 20) || 1

  const totalEntradas = totais?.total_entradas ?? 0
  const totalSaidas   = totais?.total_saidas   ?? 0
  const saldo         = totais?.saldo          ?? 0

  const resetPage = () => setPage(1)

  const columns = [
    { key: 'lica_data_lancamento', header: 'Data',      render: r => formatDate(r.lica_data_lancamento) },
    { key: 'conta_nome',           header: 'Conta',     render: r => <span className="text-muted-foreground">{r.conta_nome || '—'}</span> },
    { key: 'lica_historico',       header: 'Histórico', render: r => r.lica_historico },
    { key: 'plano_contas_nome',    header: 'Categoria', render: r => r.plano_contas_nome || r.lica_categoria || '—' },
    { key: 'lica_tipo_lancamento', header: 'Tipo',      render: r => <StatusBadge status={r.lica_tipo_lancamento} /> },
    {
      key: 'lica_valor', header: 'Valor',
      render: r => (
        <span className={r.lica_tipo_lancamento === 'entrada' ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
          {r.lica_tipo_lancamento === 'entrada' ? '+' : '-'}{formatCurrency(r.lica_valor)}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Relatório — Livro Caixa" />
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <FormField label="Data Início" className="min-w-[140px]">
              <Input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); resetPage() }} />
            </FormField>
            <FormField label="Data Fim" className="min-w-[140px]">
              <Input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); resetPage() }} />
            </FormField>
            <FormField label="Tipo">
              <Select value={tipo} onValueChange={v => { setTipo(v); resetPage() }}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entrada">Entradas</SelectItem>
                  <SelectItem value="saida">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Conta">
              <Select value={conta} onValueChange={v => { setConta(v); resetPage() }}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {contas.map(c => (
                    <SelectItem key={c.cont_id} value={String(c.cont_id)}>{c.cont_nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <DataTable columns={columns} data={items} isLoading={isLoading} emptyMessage="Nenhum lançamento no período." />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
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
