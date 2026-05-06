import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { useList } from '@/hooks/useApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const ENDPOINT = '/livro-caixa/'
const KEY      = 'livro-caixa'

export default function LivroCaixaPage() {
  const [tipoFilter, setTipoFilter] = useState('all')
  const [activeFilters, setActiveFilters] = useState({})

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)

  const { data: totais } = useQuery({
    queryKey: ['livro-caixa-totais', activeFilters],
    queryFn: () => api.get('/livro-caixa/totais/', { params: activeFilters }).then(r => r.data),
  })

  const totalEntradas = totais?.total_entradas ?? 0
  const totalSaidas   = totais?.total_saidas   ?? 0
  const saldoAtual    = totais?.saldo           ?? 0

  const handleTipoChange = (v) => {
    setTipoFilter(v)
    const f = v && v !== 'all' ? { lica_tipo_lancamento: v } : {}
    setActiveFilters(prev => ({ ...prev, lica_tipo_lancamento: f.lica_tipo_lancamento }))
    setFilters(f)
  }

  const handleSearch = (q) => {
    const f = q ? { search: q } : {}
    setActiveFilters(prev => ({ ...prev, search: q || undefined }))
    setFilters(f)
  }

  const columns = [
    {
      key: 'lica_tipo_lancamento', header: 'Tipo', cellClassName: 'w-28',
      render: r => <StatusBadge status={r.lica_tipo_lancamento} />,
    },
    {
      key: 'lica_historico', header: 'Histórico',
      render: r => (
        <div>
          <span className="font-medium">{r.lica_historico}</span>
          {r.conta_nome && <p className="text-[10px] text-muted-foreground">{r.conta_nome}{r.conta_dest_nome ? ` → ${r.conta_dest_nome}` : ''}</p>}
        </div>
      ),
    },
    { key: 'lica_categoria',    header: 'Categoria', render: r => r.plano_contas_nome || r.lica_categoria || '—' },
    {
      key: 'lica_valor', header: 'Valor',
      render: r => (
        <span className={cn('font-medium', r.lica_tipo_lancamento === 'entrada' ? 'text-emerald-400' : 'text-red-400')}>
          {r.lica_tipo_lancamento === 'entrada' ? '+' : '-'}{formatCurrency(r.lica_valor)}
        </span>
      ),
    },
    { key: 'lica_data_lancamento', header: 'Data', render: r => formatDate(r.lica_data_lancamento) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Livro Caixa"
        description="Registro automático de todas as movimentações financeiras"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Entradas</p>
              <p className="text-sm font-semibold text-emerald-400">{formatCurrency(totalEntradas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Saídas</p>
              <p className="text-sm font-semibold text-red-400">{formatCurrency(totalSaidas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-fluir-purple/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-fluir-purple" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Saldo Global</p>
              <p className={cn('text-sm font-semibold', saldoAtual >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {formatCurrency(saldoAtual)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por histórico..." onSearch={handleSearch}>
            <Select value={tipoFilter} onValueChange={handleTipoChange}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </SearchFilter>

          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum lançamento encontrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
