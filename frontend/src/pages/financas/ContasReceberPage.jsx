import { useState } from 'react'
import { Wallet, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import api from '@/services/api'

const ENDPOINT = '/contas-receber/'
const KEY      = 'contas-receber'

function ContaForm({ conta, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: conta ? {
      rec_descricao:      conta.rec_descricao,
      rec_valor_unitario: conta.rec_valor_unitario || '',
      rec_quantidade:     conta.rec_quantidade || 1,
      rec_desconto:       conta.rec_desconto || '',
      rec_data_vencimento: conta.rec_data_vencimento || '',
      rec_data_recebimento: conta.rec_data_recebimento || '',
      rec_status:         conta.rec_status || 'pendente',
      aluno_id:           conta.aluno_id ? String(conta.aluno_id) : '',
    } : { rec_quantidade: 1, rec_status: 'pendente' },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending
  const status = watch('rec_status')

  // Total em tempo real: (qtd × unit) - desconto
  const qtd     = parseFloat(watch('rec_quantidade') || 1)
  const unit    = parseFloat(watch('rec_valor_unitario') || 0)
  const desc    = parseFloat(watch('rec_desconto') || 0)
  const total   = Math.max(0, qtd * unit - desc)

  const { data: alunos } = useQuery({
    queryKey: ['alunos-select'],
    queryFn: () => api.get('/alunos/', { params: { page_size: 100 } }).then(r => r.data.results),
  })

  const onSubmit = (data) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (cleaned.aluno_id) cleaned.aluno_id = parseInt(cleaned.aluno_id)
    if (conta) update.mutate({ id: conta.id, data: cleaned })
    else       create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Descrição" required error={errors.rec_descricao?.message}>
        <Input {...register('rec_descricao', { required: 'Descrição obrigatória' })} placeholder="Mensalidade Pilates" disabled={busy} />
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="Valor Unit. (R$)" required>
          <Input type="number" step="0.01" {...register('rec_valor_unitario', { required: true })} placeholder="0.00" disabled={busy} />
        </FormField>
        <FormField label="Qtd">
          <Input type="number" {...register('rec_quantidade')} placeholder="1" disabled={busy} />
        </FormField>
        <FormField label="Desconto (R$)">
          <Input type="number" step="0.01" {...register('rec_desconto')} placeholder="0.00" disabled={busy} />
        </FormField>
      </div>

      {/* Total em tempo real */}
      <div className="rounded-lg bg-fluir-dark-3 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Total calculado:</span>
        <span className="text-sm font-semibold text-fluir-cyan">{formatCurrency(total)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Vencimento" required>
          <Input type="date" {...register('rec_data_vencimento', { required: true })} disabled={busy} />
        </FormField>
        <FormField label="Status">
          <Select value={watch('rec_status')} onValueChange={v => setValue('rec_status', v)} disabled={busy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {status === 'recebido' && (
        <FormField label="Data do Recebimento" required>
          <Input type="date" {...register('rec_data_recebimento', { required: status === 'recebido' })} disabled={busy} />
        </FormField>
      )}

      <FormField label="Aluno">
        <Select value={watch('aluno_id') || '__none__'} onValueChange={v => setValue('aluno_id', v)} disabled={busy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" disabled className="text-muted-foreground italic">Selecionar aluno...</SelectItem>
            {alunos?.map(a => (
              <SelectItem key={a.id} value={String(a.id)}>{a.alu_nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : conta ? 'Salvar Alterações' : 'Cadastrar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ContasReceberPage() {
  const [modalOpen, setModalOpen]       = useState(false)
  const [selected, setSelected]         = useState(null)
  const [deleteId, setDeleteId]         = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Conta excluída.' })

  const today   = new Date().toISOString().split('T')[0]
  const isVencida = (r) => r.rec_status === 'pendente' && r.rec_data_vencimento < today

  const handleStatusChange = (v) => {
    setStatusFilter(v)
    setFilters(v && v !== 'all' ? { rec_status: v } : {})
  }

  const columns = [
    {
      key: 'rec_descricao', header: 'Descrição',
      render: r => (
        <div className="flex items-center gap-2">
          {isVencida(r) && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
          <span className="font-medium">{r.rec_descricao}</span>
        </div>
      ),
    },
    { key: 'rec_valor_total',      header: 'Total',      render: r => formatCurrency(r.rec_valor_total) },
    { key: 'rec_data_vencimento',  header: 'Vencimento', render: r => formatDate(r.rec_data_vencimento) },
    { key: 'rec_status',           header: 'Status',     render: r => <StatusBadge status={r.rec_status} /> },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contas a Receber"
        description="Controle de recebimentos e mensalidades"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Nova Conta</Button>}
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por descrição..." onSearch={q => setFilters(q ? { search: q } : {})}>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Todos status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </SearchFilter>

          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhuma conta cadastrada." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected ? 'Editar Conta' : 'Nova Conta a Receber'}</DialogTitle></DialogHeader>
          <ContaForm conta={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Conta" description="Tem certeza que deseja excluir esta conta?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
