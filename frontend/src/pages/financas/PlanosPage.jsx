import { useState } from 'react'
import { ClipboardList, Plus, Pencil, Trash2 } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
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

const ENDPOINT = '/planos-pagamentos/'
const KEY      = 'planos'

function PlanoForm({ plano, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: plano ? {
      aluno_id:            plano.aluno_id ? String(plano.aluno_id) : '',
      serv_id:             plano.serv_id ? String(plano.serv_id) : '',
      plan_valor:          plano.plan_valor || '',
      plan_dia_vencimento: plano.plan_dia_vencimento || '',
      plan_data_inicio:    plano.plan_data_inicio || '',
      plan_data_fim:       plano.plan_data_fim || '',
    } : {},
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

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
    if (cleaned.aluno_id) cleaned.aluno_id = parseInt(cleaned.aluno_id)
    if (cleaned.serv_id)  cleaned.serv_id  = parseInt(cleaned.serv_id)
    if (plano) update.mutate({ id: plano.id, data: cleaned })
    else       create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Aluno" required error={errors.aluno_id?.message}>
        <Select value={watch('aluno_id') || '__none__'} onValueChange={v => setValue('aluno_id', v)} disabled={busy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar aluno...</SelectItem>
            {alunos?.map(a => (
              <SelectItem key={a.id} value={String(a.id)}>{a.alu_nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Serviço/Produto" required>
        <Select value={watch('serv_id') || '__none__'} onValueChange={v => setValue('serv_id', v)} disabled={busy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar serviço...</SelectItem>
            {servicos?.map(s => (
              <SelectItem key={s.id} value={String(s.id)}>{s.serv_nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Valor (R$)" required>
          <Input type="number" step="0.01" {...register('plan_valor', { required: true })} placeholder="350.00" disabled={busy} />
        </FormField>
        <FormField label="Dia de Vencimento">
          <Input type="number" min="1" max="31" {...register('plan_dia_vencimento')} placeholder="10" disabled={busy} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Data Início">
          <Input type="date" {...register('plan_data_inicio')} disabled={busy} />
        </FormField>
        <FormField label="Data Fim">
          <Input type="date" {...register('plan_data_fim')} disabled={busy} />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : plano ? 'Salvar Alterações' : 'Criar Plano'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function PlanosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Plano excluído.' })

  const columns = [
    { key: 'aluno_nome',         header: 'Aluno',       render: r => <span className="font-medium">{r.aluno_nome || r.aluno_id}</span> },
    { key: 'servico_nome',       header: 'Serviço',     render: r => r.servico_nome || r.serv_id || '—' },
    { key: 'plan_valor',         header: 'Valor',       render: r => formatCurrency(r.plan_valor) },
    { key: 'plan_dia_vencimento',header: 'Venc. dia',   render: r => r.plan_dia_vencimento ? `dia ${r.plan_dia_vencimento}` : '—' },
    { key: 'plan_data_inicio',   header: 'Início',      render: r => formatDate(r.plan_data_inicio) },
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
        title="Planos de Pagamento"
        description="Gestão de planos e mensalidades dos alunos"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo Plano</Button>}
      />
      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar..." onSearch={q => setFilters(q ? { search: q } : {})} />
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum plano cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Plano' : 'Novo Plano de Pagamento'}</DialogTitle></DialogHeader>
          <PlanoForm plano={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Plano" description="Tem certeza que deseja excluir este plano?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
