import { useState } from 'react'
import { Package, Plus, Pencil, Trash2 } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Badge } from '@/components/ui/primitives'

const ENDPOINT = '/acessorios/'
const KEY      = 'acessorios'

function AcessorioForm({ acessorio, onClose }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: acessorio ? { acess_nome: acessorio.acess_nome } : {},
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const payload = { acess_nome: data.acess_nome, acess_ativo: true }
    if (acessorio) update.mutate({ id: acessorio.acess_id, data: payload })
    else           create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Nome do Acessório" required error={errors.acess_nome?.message}>
        <Input
          {...register('acess_nome', { required: 'Nome obrigatório' })}
          placeholder="Bola suíça, Mini band..."
          disabled={busy}
          autoFocus
        />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : acessorio ? 'Salvar Alterações' : 'Cadastrar Acessório'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function AcessoriosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Acessório excluído.' })

  const columns = [
    { key: 'acess_nome', header: 'Acessório', render: r => <span className="font-medium">{r.acess_nome}</span> },
    {
      key: 'acess_ativo', header: 'Status',
      render: r => <Badge variant={r.acess_ativo ? 'success' : 'secondary'}>{r.acess_ativo ? 'Ativo' : 'Inativo'}</Badge>,
    },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.acess_id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Acessórios"
        description="Catálogo de acessórios usados nos exercícios"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo Acessório</Button>}
      />
      <Card>
        <CardContent className="p-5 space-y-4">
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum acessório cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{selected ? 'Editar Acessório' : 'Novo Acessório'}</DialogTitle></DialogHeader>
          <AcessorioForm acessorio={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Acessório"
        description="Tem certeza? Exercícios vinculados a este acessório perderão o vínculo."
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
