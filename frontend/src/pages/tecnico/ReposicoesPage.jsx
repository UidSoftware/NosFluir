import { useState } from 'react'
import { Repeat2, AlertTriangle, ClipboardCheck } from 'lucide-react'
import { useList } from '@/hooks/useApi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input, FormField, Badge } from '@/components/ui/primitives'
import { formatDate } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const ENDPOINT = '/creditos/'
const KEY      = 'creditos-reposicao'

const DIAS_PARA_EXPIRAR = 7

// ─── Modal de justificativa retroativa ───────────────────────────────────────
function ModalJustificar({ falta, onClose, onSuccess }) {
  const [tipo, setTipo]         = useState('justificada')
  const [quando, setQuando]     = useState('')
  const [obs, setObs]           = useState('')
  const [busy, setBusy]         = useState(false)

  const handleSubmit = async () => {
    if (!quando) {
      toast({ title: 'Informe quando o aluno avisou.', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      await api.post('/avisos-falta/', {
        aluno:               falta.alu,
        turma:               falta.tur,
        avi_tipo:            tipo,
        avi_data_hora_aviso: quando,
        avi_data_aula:       falta.aul_data,
        avi_observacoes:     obs || null,
      })
      await api.patch(`/ministrar-aula/${falta.miau_id}/`, { miau_tipo_falta: 'justificada' })
      toast({ title: 'Falta justificada. Crédito gerado se elegível.', variant: 'success' })
      onSuccess()
      onClose()
    } catch (e) {
      const msg = e.response?.data?.detail || Object.values(e.response?.data || {})?.[0]?.[0] || 'Erro ao justificar falta.'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Justificar Falta — {falta.alu_nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">
            {falta.tur_nome} · {formatDate(falta.aul_data)}
            {falta.aul_modalidade && (
              <Badge className="ml-2" variant={falta.aul_modalidade === 'pilates' ? 'secondary' : 'default'}>
                {falta.aul_modalidade === 'pilates' ? 'Pilates' : 'Funcional'}
              </Badge>
            )}
          </p>

          <FormField label="Tipo *">
            <Select value={tipo} onValueChange={setTipo} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="justificada">Justificada</SelectItem>
                <SelectItem value="atestado">Atestado Médico</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Quando o aluno avisou? *">
            <Input
              type="datetime-local"
              value={quando}
              onChange={e => setQuando(e.target.value)}
              disabled={busy}
            />
          </FormField>

          <FormField label="Observações">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              rows={2}
              placeholder="Opcional..."
              value={obs}
              onChange={e => setObs(e.target.value)}
              disabled={busy}
            />
          </FormField>

          <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
            O sistema calculará a antecedência e gerará crédito automaticamente se dentro das regras.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? 'Salvando...' : 'Justificar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Listagem de faltas sem justificativa ─────────────────────────────────────
function FaltasSemJustificativa() {
  const [page, setPage]           = useState(1)
  const [faltaSel, setFaltaSel]   = useState(null)
  const queryClient               = useQueryClient()

  const { data: resp, isLoading } = useQuery({
    queryKey: ['faltas-sem-justificativa', page],
    queryFn: () => api.get('/faltas-sem-justificativa/', { params: { page } }).then(r => r.data),
  })

  const faltas     = resp?.results ?? []
  const count      = resp?.count ?? 0
  const totalPages = Math.ceil(count / 20)

  const columns = [
    {
      key: 'alu_nome', header: 'Aluno',
      render: r => <span className="font-medium">{r.alu_nome}</span>,
    },
    {
      key: 'tur_nome', header: 'Turma',
      render: r => <span className="text-sm">{r.tur_nome}</span>,
    },
    {
      key: 'aul_data', header: 'Data',
      render: r => <span className="text-sm">{formatDate(r.aul_data)}</span>,
    },
    {
      key: 'acao', header: '',
      cellClassName: 'w-28',
      render: r => (
        <Button size="sm" variant="outline" onClick={() => setFaltaSel(r)}>
          <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
          Justificar
        </Button>
      ),
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={faltas}
        isLoading={isLoading}
        emptyMessage="Nenhuma falta sem justificativa registrada."
      />
      <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />

      {faltaSel && (
        <ModalJustificar
          falta={faltaSel}
          onClose={() => setFaltaSel(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['faltas-sem-justificativa'] })}
        />
      )}
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ReposicoesPage() {
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)

  const handleStatusFilter = (v) => {
    setStatusFilter(v)
    if (v && v !== 'all' && v !== 'sem_justificativa') {
      setFilters({ cred_status: v })
    } else {
      setFilters({})
    }
  }

  const today = new Date()
  const expirandoBreve = (dateStr) => {
    if (!dateStr) return false
    const diff = (new Date(dateStr) - today) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= DIAS_PARA_EXPIRAR
  }

  const columns = [
    {
      key: 'alu_nome', header: 'Aluno',
      render: r => <span className="font-medium">{r.alu_nome || '—'}</span>,
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
      key: 'aula_reposicao', header: 'Reposição',
      render: r => r.cred_status === 'usado' ? `Aula #${r.aula_reposicao}` : '—',
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reposições"
        description="Créditos de reposição e faltas sem justificativa"
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter
            placeholder="Buscar por aluno..."
            onSearch={q => setFilters(q ? { search: q } : {})}
            disabled={statusFilter === 'sem_justificativa'}
          >
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Todos status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="usado">Usado</SelectItem>
                <SelectItem value="expirado">Expirado</SelectItem>
                <SelectItem value="sem_justificativa">Sem Justificativa</SelectItem>
              </SelectContent>
            </Select>
          </SearchFilter>

          {statusFilter === 'sem_justificativa' ? (
            <FaltasSemJustificativa />
          ) : (
            <>
              <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum crédito de reposição encontrado." />
              <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
