import { useState } from 'react'
import { Banknote, Plus, Pencil, Trash2, AlertCircle, BookOpen } from 'lucide-react'
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
import { formatCurrency } from '@/lib/utils'
import api from '@/services/api'

const ENDPOINT = '/folha-pagamento/'
const KEY      = 'folha-pagamento'

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function FolhaForm({ folha, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: folha ? {
      func_id:          folha.func_id ? String(folha.func_id) : '',
      fopa_mes:         folha.fopa_mes ? String(folha.fopa_mes) : '',
      fopa_ano:         folha.fopa_ano || new Date().getFullYear(),
      fopa_salario_base: folha.fopa_salario_base || '',
      fopa_descontos:   folha.fopa_descontos || '',
      fopa_status:      folha.fopa_status || 'pendente',
    } : { fopa_ano: new Date().getFullYear(), fopa_status: 'pendente' },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const salBase  = parseFloat(watch('fopa_salario_base') || 0)
  const descontos = parseFloat(watch('fopa_descontos') || 0)
  const liquido   = Math.max(0, salBase - descontos)

  const { data: funcionarios } = useQuery({
    queryKey: ['funcionarios-select'],
    queryFn: () => api.get('/funcionarios/').then(r => r.data.results),
  })

  const onSubmit = (data) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (cleaned.func_id) cleaned.func_id = parseInt(cleaned.func_id)
    if (cleaned.fopa_mes) cleaned.fopa_mes = parseInt(cleaned.fopa_mes)
    cleaned.fopa_valor_liquido = liquido
    if (folha) update.mutate({ id: folha.id, data: cleaned })
    else       create.mutate(cleaned)
  }

  const isPago = watch('fopa_status') === 'pago'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Funcionário" required>
        <Select value={watch('func_id') || ''} onValueChange={v => setValue('func_id', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar funcionário..." /></SelectTrigger>
          <SelectContent>
            {funcionarios?.map(f => (
              <SelectItem key={f.id} value={String(f.id)}>{f.func_nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Mês" required>
          <Select value={watch('fopa_mes') || ''} onValueChange={v => setValue('fopa_mes', v)} disabled={busy}>
            <SelectTrigger><SelectValue placeholder="Mês..." /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Ano" required>
          <Input type="number" {...register('fopa_ano', { required: true })} placeholder="2026" disabled={busy} />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Salário Base (R$)" required>
          <Input type="number" step="0.01" {...register('fopa_salario_base', { required: true })} placeholder="3000.00" disabled={busy} />
        </FormField>
        <FormField label="Descontos (R$)">
          <Input type="number" step="0.01" {...register('fopa_descontos')} placeholder="0.00" disabled={busy} />
        </FormField>
      </div>

      <div className="rounded-lg bg-fluir-dark-3 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Valor Líquido:</span>
        <span className="text-sm font-semibold text-fluir-cyan">{formatCurrency(liquido)}</span>
      </div>

      <FormField label="Status">
        <Select value={watch('fopa_status')} onValueChange={v => setValue('fopa_status', v)} disabled={busy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {isPago && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-400">Lembre-se!</p>
            <p className="text-xs text-amber-300/80 mt-0.5">
              Após confirmar, crie manualmente o lançamento de saída no Livro Caixa.
            </p>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : folha ? 'Salvar Alterações' : 'Criar Registro'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function FolhaPagamentoPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Registro excluído.' })

  const columns = [
    { key: 'func_nome',          header: 'Funcionário',  render: r => <span className="font-medium">{r.func_nome || r.func_id}</span> },
    { key: 'fopa_mes_ano',       header: 'Competência',  render: r => `${MESES[(r.fopa_mes || 1) - 1]}/${r.fopa_ano}` },
    { key: 'fopa_salario_base',  header: 'Salário Base', render: r => formatCurrency(r.fopa_salario_base) },
    { key: 'fopa_valor_liquido', header: 'Líquido',      render: r => formatCurrency(r.fopa_valor_liquido) },
    { key: 'fopa_status',        header: 'Status',       render: r => <StatusBadge status={r.fopa_status} /> },
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
        title="Folha de Pagamento"
        description="Controle de salários dos funcionários"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo Registro</Button>}
      />

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-300/80">
          <strong className="text-amber-400">Atenção:</strong> A folha de pagamento <strong>não gera lançamento automático</strong> no Livro Caixa.
          Ao marcar como pago, crie o lançamento manual de saída.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por funcionário..." onSearch={q => setFilters(q ? { search: q } : {})} />
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum registro de folha." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Folha' : 'Nova Folha de Pagamento'}</DialogTitle></DialogHeader>
          <FolhaForm folha={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Registro" description="Tem certeza que deseja excluir este registro?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
