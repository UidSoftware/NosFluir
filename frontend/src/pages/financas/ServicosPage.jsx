import { useState } from 'react'
import { Package, Plus, Pencil, Trash2 } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
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
import { BooleanBadge } from '@/components/shared/StatusBadge'
import { formatCurrency } from '@/lib/utils'

const ENDPOINT = '/servicos-produtos/'
const KEY      = 'servicos'

function ServicoForm({ servico, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: servico ? {
      serv_nome:        servico.serv_nome,
      serv_descricao:   servico.serv_descricao || '',
      serv_valor_base:  servico.serv_valor_base || '',
      serv_tipo:        servico.serv_tipo || '',
      serv_ativo:       servico.serv_ativo !== false,
    } : { serv_ativo: true },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (servico) update.mutate({ id: servico.serv_id, data: cleaned })
    else         create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Nome do Serviço/Produto" required error={errors.serv_nome?.message}>
        <Input {...register('serv_nome', { required: 'Nome obrigatório' })} placeholder="Mensalidade Pilates" disabled={busy} />
      </FormField>
      <FormField label="Tipo" required error={errors.serv_tipo?.message}>
        <Select value={watch('serv_tipo') || '__none__'} onValueChange={v => setValue('serv_tipo', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar tipo..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar tipo...</SelectItem>
            <SelectItem value="servico">Serviço</SelectItem>
            <SelectItem value="produto">Produto</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Descrição">
        <Input {...register('serv_descricao')} placeholder="Descrição opcional" disabled={busy} />
      </FormField>
      <FormField label="Valor Base (R$)" required error={errors.serv_valor_base?.message}>
        <Input type="number" step="0.01" {...register('serv_valor_base', { required: 'Valor obrigatório' })} placeholder="350.00" disabled={busy} />
      </FormField>
      <FormField label="Ativo">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('serv_ativo')} className="w-4 h-4 rounded accent-fluir-purple" />
          <span className="text-sm">Serviço/produto ativo</span>
        </label>
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : servico ? 'Salvar Alterações' : 'Cadastrar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ServicosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Serviço excluído.' })

  const columns = [
    { key: 'serv_nome',       header: 'Nome',      render: r => <span className="font-medium">{r.serv_nome}</span> },
    { key: 'serv_tipo',       header: 'Tipo',      render: r => r.serv_tipo === 'servico' ? 'Serviço' : r.serv_tipo === 'produto' ? 'Produto' : '—' },
    { key: 'serv_descricao',  header: 'Descrição', render: r => r.serv_descricao || '—' },
    { key: 'serv_valor_base', header: 'Valor',     render: r => formatCurrency(r.serv_valor_base) },
    { key: 'serv_ativo',      header: 'Ativo',     render: r => <BooleanBadge value={r.serv_ativo} /> },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.serv_id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Serviços e Produtos"
        description="Catálogo de serviços e produtos do studio"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo</Button>}
      />
      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar..." onSearch={q => setFilters(q ? { search: q } : {})} />
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum serviço cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Serviço' : 'Novo Serviço/Produto'}</DialogTitle></DialogHeader>
          <ServicoForm servico={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Serviço" description="Tem certeza que deseja excluir?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
