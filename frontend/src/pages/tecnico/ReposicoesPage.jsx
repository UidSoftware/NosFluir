import { useState } from 'react'
import { Repeat2, AlertTriangle } from 'lucide-react'
import { useList } from '@/hooks/useApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ENDPOINT = '/tecnico/creditos-reposicao/'
const KEY      = 'creditos-reposicao'

const DIAS_PARA_EXPIRAR = 7

export default function ReposicoesPage() {
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)

  const handleStatusFilter = (v) => {
    setStatusFilter(v)
    setFilters(v ? { cred_status: v } : {})
  }

  const today    = new Date()
  const expirandoBreve = (dateStr) => {
    if (!dateStr) return false
    const diff = (new Date(dateStr) - today) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= DIAS_PARA_EXPIRAR
  }

  const columns = [
    {
      key: 'aluno_nome', header: 'Aluno',
      render: r => <span className="font-medium">{r.aluno_nome || r.aluno_id}</span>,
    },
    {
      key: 'cred_data_geracao', header: 'Gerado em',
      render: r => formatDate(r.cred_data_geracao),
    },
    {
      key: 'cred_data_expiracao', header: 'Expira em',
      render: r => (
        <div className="flex items-center gap-1.5">
          {expirandoBreve(r.cred_data_expiracao) && r.cred_status === 'disponivel' && (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span className={cn(
            expirandoBreve(r.cred_data_expiracao) && r.cred_status === 'disponivel' ? 'text-amber-400' : ''
          )}>
            {formatDate(r.cred_data_expiracao)}
          </span>
        </div>
      ),
    },
    {
      key: 'cred_status', header: 'Status',
      render: r => <StatusBadge status={r.cred_status} />,
    },
    {
      key: 'aula_reposicao', header: 'Usado em',
      render: r => r.cred_status === 'usado' ? formatDate(r.aula_reposicao_data) : '—',
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reposições"
        description="Créditos de reposição disponíveis, usados e expirados"
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por aluno..." onSearch={q => setFilters(q ? { search: q } : {})}>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Todos status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="usado">Usado</SelectItem>
                <SelectItem value="expirado">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </SearchFilter>

          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum crédito de reposição encontrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
