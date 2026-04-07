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
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

const ENDPOINT = '/contas-receber/'
const KEY      = 'contas-receber'

function ContaForm({ conta, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: conta ? {
      rec_descricao:        conta.rec_descricao,
      rec_valor_unitario:   conta.rec_valor_unitario || '',
      rec_quantidade:       conta.rec_quantidade || 1,
      rec_desconto:         conta.rec_desconto || '',
      rec_data_emissao:     conta.rec_data_emissao ? conta.rec_data_emissao.split('T')[0] : '',
      rec_data_vencimento:  conta.rec_data_vencimento ? conta.rec_data_vencimento.split('T')[0] : '',
      rec_data_recebimento: conta.rec_data_recebimento ? conta.rec_data_recebimento.split('T')[0] : '',
      rec_status:           conta.rec_status || 'pendente',
      alu:                  conta.alu ? String(conta.alu) : '',
      serv:                 conta.serv ? String(conta.serv) : '',
      rec_forma_recebimento: conta.rec_forma_recebimento || '',
      rec_plano_tipo:       conta.rec_plano_tipo || '',
    } : {
      rec_quantidade: 1,
      rec_status: 'pendente',
      rec_data_emissao: new Date().toISOString().split('T')[0],
    },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending
  const status = watch('rec_status')

  // Total em tempo real: (qtd × unit) - desconto
  const qtd   = parseFloat(watch('rec_quantidade') || 1)
  const unit  = parseFloat(watch('rec_valor_unitario') || 0)
  const desc  = parseFloat(watch('rec_desconto') || 0)
  const total = Math.max(0, qtd * unit - desc)

  const { data: alunos } = useQuery({
    queryKey: ['alunos-select'],
    queryFn: () => api.get('/alunos/').then(r => r.data.results),
  })

  const { data: servicos } = useQuery({
    queryKey: ['servicos-select'],
    queryFn: () => api.get('/servicos-produtos/', { params: { serv_ativo: true } }).then(r => r.data.results),
  })

  const onSubmit = (data) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    const aluId = cleaned.alu && cleaned.alu !== '__none__' ? parseInt(cleaned.alu) : null
    if (!aluId) {
      toast({ title: 'Selecione o aluno.', variant: 'destructive' })
      return
    }
    cleaned.alu  = aluId
    cleaned.serv = cleaned.serv && cleaned.serv !== '__none__' ? parseInt(cleaned.serv) : null
    cleaned.rec_plano_tipo = cleaned.rec_plano_tipo && cleaned.rec_plano_tipo !== '__none__' ? cleaned.rec_plano_tipo : null
    if (conta) update.mutate({ id: conta.rec_id, data: cleaned })
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
        <FormField label="Emissão" required>
          <Input type="date" {...register('rec_data_emissao', { required: true })} disabled={busy} />
        </FormField>
        <FormField label="Vencimento" required>
          <Input type="date" {...register('rec_data_vencimento', { required: true })} disabled={busy} />
        </FormField>
      </div>

      <FormField label="Status">
        <Select value={watch('rec_status')} onValueChange={v => setValue('rec_status', v)} disabled={busy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {status === 'recebido' && (
        <>
          <FormField label="Data do Recebimento" required>
            <Input type="date" {...register('rec_data_recebimento', { required: true })} disabled={busy} />
          </FormField>
          <FormField label="Forma de Recebimento">
            <Input {...register('rec_forma_recebimento')} placeholder="Pix, Dinheiro, Cartão..." disabled={busy} />
          </FormField>
        </>
      )}

      <FormField label="Aluno" required>
        <Select value={watch('alu') || '__none__'} onValueChange={v => setValue('alu', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar aluno..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar aluno...</SelectItem>
            {alunos?.map(a => (
              <SelectItem key={a.alu_id} value={String(a.alu_id)}>{a.alu_nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Serviço/Produto">
        <Select value={watch('serv') || '__none__'} onValueChange={v => setValue('serv', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar serviço (opcional)..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
            {servicos?.map(s => (
              <SelectItem key={s.serv_id} value={String(s.serv_id)}>{s.serv_nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Tipo de Plano">
        <Select value={watch('rec_plano_tipo') || '__none__'} onValueChange={v => setValue('rec_plano_tipo', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Tipo de plano..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="trimestral">Trimestral</SelectItem>
            <SelectItem value="semestral">Semestral</SelectItem>
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
    { key: 'alu_nome',            header: 'Aluno',      render: r => r.alu_nome || '—' },
    { key: 'rec_valor_total',     header: 'Total',      render: r => formatCurrency(r.rec_valor_total) },
    { key: 'rec_data_vencimento', header: 'Vencimento', render: r => formatDate(r.rec_data_vencimento) },
    { key: 'rec_status',          header: 'Status',     render: r => <StatusBadge status={r.rec_status} /> },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.rec_id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></Button>
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
