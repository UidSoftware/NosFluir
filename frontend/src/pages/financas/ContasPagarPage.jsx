import { useState } from 'react'
import { CreditCard, Plus, Pencil, Trash2, Eye, AlertTriangle } from 'lucide-react'
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

const ENDPOINT = '/contas-pagar/'
const KEY      = 'contas-pagar'

const STATUS_OPTS = [
  { value: 'all', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'cancelado', label: 'Cancelado' },
]

function ContaForm({ conta, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: conta ? {
      pag_descricao:      conta.pag_descricao,
      pag_valor_unitario: conta.pag_valor_unitario || '',
      pag_quantidade:     conta.pag_quantidade || 1,
      pag_data_vencimento: conta.pag_data_vencimento || '',
      pag_data_pagamento:  conta.pag_data_pagamento || '',
      pag_status:         conta.pag_status || 'pendente',
      for_id:             conta.for_id ? String(conta.for_id) : '',
      pag_observacoes:    conta.pag_observacoes || '',
    } : { pag_quantidade: 1, pag_status: 'pendente' },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending
  const status = watch('pag_status')

  const { data: fornecedores } = useQuery({
    queryKey: ['fornecedores-select'],
    queryFn: () => api.get('/fornecedores/', { params: { page_size: 100 } }).then(r => r.data.results),
  })

  const onSubmit = (data) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (cleaned.for_id) cleaned.for_id = parseInt(cleaned.for_id)
    if (conta) update.mutate({ id: conta.id, data: cleaned })
    else       create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Descrição" required error={errors.pag_descricao?.message}>
        <Input {...register('pag_descricao', { required: 'Descrição obrigatória' })} placeholder="Aluguel do espaço" disabled={busy} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Valor Unitário (R$)" required error={errors.pag_valor_unitario?.message}>
          <Input type="number" step="0.01" {...register('pag_valor_unitario', { required: 'Valor obrigatório' })} placeholder="0.00" disabled={busy} />
        </FormField>
        <FormField label="Quantidade">
          <Input type="number" {...register('pag_quantidade')} placeholder="1" disabled={busy} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Vencimento" required error={errors.pag_data_vencimento?.message}>
          <Input type="date" {...register('pag_data_vencimento', { required: 'Data obrigatória' })} disabled={busy} />
        </FormField>
        <FormField label="Status">
          <Select value={watch('pag_status')} onValueChange={v => setValue('pag_status', v)} disabled={busy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {status === 'pago' && (
        <FormField label="Data do Pagamento" required error={errors.pag_data_pagamento?.message}>
          <Input type="date" {...register('pag_data_pagamento', { required: status === 'pago' ? 'Data obrigatória ao marcar como pago' : false })} disabled={busy} />
        </FormField>
      )}

      <FormField label="Fornecedor">
        <Select value={watch('for_id') || ''} onValueChange={v => setValue('for_id', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar fornecedor..." /></SelectTrigger>
          <SelectContent>
            {fornecedores?.map(f => (
              <SelectItem key={f.id} value={String(f.id)}>{f.for_nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Observações">
        <Input {...register('pag_observacoes')} placeholder="Observações opcionais" disabled={busy} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : conta ? 'Salvar Alterações' : 'Cadastrar Conta'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ContasPagarPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Conta excluída.' })

  const handleSearch = (q) => {
    const f = {}
    if (q) f.search = q
    if (statusFilter) f.status = statusFilter
    setFilters(f)
  }

  const handleStatusChange = (v) => {
    setStatusFilter(v)
    setFilters(v && v !== 'all' ? { pag_status: v } : {})
  }

  const today = new Date().toISOString().split('T')[0]
  const isVencida = (r) => r.pag_status === 'pendente' && r.pag_data_vencimento < today

  const columns = [
    {
      key: 'pag_descricao', header: 'Descrição',
      render: r => (
        <div className="flex items-center gap-2">
          {isVencida(r) && <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
          <span className="font-medium">{r.pag_descricao}</span>
        </div>
      ),
    },
    { key: 'pag_valor_total',     header: 'Valor',       render: r => formatCurrency(r.pag_valor_total) },
    { key: 'pag_data_vencimento', header: 'Vencimento',  render: r => formatDate(r.pag_data_vencimento) },
    { key: 'pag_status',          header: 'Status',      render: r => <StatusBadge status={r.pag_status} /> },
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
        title="Contas a Pagar"
        description="Controle de contas e despesas"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Nova Conta</Button>}
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por descrição..." onSearch={handleSearch}>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Todos status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </SearchFilter>

          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhuma conta cadastrada." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected ? 'Editar Conta' : 'Nova Conta a Pagar'}</DialogTitle></DialogHeader>
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
