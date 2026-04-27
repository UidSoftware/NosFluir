import { useState } from 'react'
import { Package, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/primitives'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField } from '@/components/ui/primitives'
import { BooleanBadge } from '@/components/shared/StatusBadge'
import { formatCurrency } from '@/lib/utils'

const ENDPOINT = '/produtos/'
const KEY      = 'produtos'

function ProdutoForm({ produto, onClose }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: produto ? {
      prod_nome:           produto.prod_nome,
      prod_descricao:      produto.prod_descricao || '',
      prod_valor_venda:    produto.prod_valor_venda || '',
      prod_estoque_atual:  produto.prod_estoque_atual ?? 0,
      prod_estoque_minimo: produto.prod_estoque_minimo ?? 5,
      prod_ativo:          produto.prod_ativo !== false,
    } : { prod_estoque_atual: 0, prod_estoque_minimo: 5, prod_ativo: true },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const payload = {
      prod_nome:           data.prod_nome,
      prod_descricao:      data.prod_descricao || null,
      prod_valor_venda:    data.prod_valor_venda,
      prod_estoque_atual:  parseInt(data.prod_estoque_atual) || 0,
      prod_estoque_minimo: parseInt(data.prod_estoque_minimo) || 5,
      prod_ativo:          data.prod_ativo,
    }
    if (produto) update.mutate({ id: produto.prod_id, data: payload })
    else         create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Nome do Produto" required error={errors.prod_nome?.message}>
        <Input {...register('prod_nome', { required: 'Nome obrigatório' })} placeholder="Squeeze Studio Fluir" disabled={busy} />
      </FormField>
      <FormField label="Descrição">
        <Input {...register('prod_descricao')} placeholder="Descrição opcional" disabled={busy} />
      </FormField>
      <FormField label="Valor de Venda (R$)" required error={errors.prod_valor_venda?.message}>
        <Input type="number" step="0.01" {...register('prod_valor_venda', { required: 'Valor obrigatório' })} placeholder="45.00" disabled={busy} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Estoque Atual">
          <Input type="number" min="0" {...register('prod_estoque_atual')} disabled={busy} />
        </FormField>
        <FormField label="Estoque Mínimo">
          <Input type="number" min="0" {...register('prod_estoque_minimo')} disabled={busy} />
        </FormField>
      </div>
      <FormField label="Ativo">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('prod_ativo')} className="w-4 h-4 rounded accent-fluir-purple" />
          <span className="text-sm">Produto ativo</span>
        </label>
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : produto ? 'Salvar Alterações' : 'Cadastrar'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function EstoqueBadge({ atual, minimo }) {
  if (atual <= minimo) {
    return (
      <span className="flex items-center gap-1 text-yellow-400 font-medium">
        <AlertTriangle className="w-3.5 h-3.5" />
        {atual}
      </span>
    )
  }
  return <span className="text-foreground">{atual}</span>
}

export default function ProdutosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Produto excluído.' })

  const estoqueBaixo = data.filter(p => p.estoque_baixo).length

  const columns = [
    { key: 'prod_nome',        header: 'Nome',           render: r => <span className="font-medium">{r.prod_nome}</span> },
    { key: 'prod_descricao',   header: 'Descrição',      render: r => r.prod_descricao || '—' },
    { key: 'prod_valor_venda', header: 'Valor',          render: r => formatCurrency(r.prod_valor_venda) },
    {
      key: 'estoque', header: 'Estoque',
      render: r => <EstoqueBadge atual={r.prod_estoque_atual} minimo={r.prod_estoque_minimo} />,
    },
    { key: 'prod_ativo', header: 'Ativo', render: r => <BooleanBadge value={r.prod_ativo} /> },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.prod_id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Produtos"
        description="Catálogo de produtos com controle de estoque"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo Produto</Button>}
      />

      {estoqueBaixo > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-2.5 text-sm text-yellow-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{estoqueBaixo} produto{estoqueBaixo > 1 ? 's' : ''} com estoque abaixo do mínimo</span>
        </div>
      )}

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar produto..." onSearch={q => setFilters(q ? { search: q } : {})} />
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum produto cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
          <ProdutoForm produto={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Produto" description="Tem certeza que deseja excluir?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
