import { useState } from 'react'
import { Boxes, Plus, Pencil, Trash2 } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'

const ENDPOINT = '/aparelhos/'
const KEY      = 'aparelhos'

const MODALIDADES = [
  { value: 'pilates',   label: 'Mat Pilates' },
  { value: 'funcional', label: 'Funcional' },
  { value: 'ambos',     label: 'Ambos' },
]

const MODALIDADE_VARIANT = { pilates: 'cyan', funcional: 'success', ambos: 'secondary' }

function AparelhoForm({ aparelho, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: aparelho ? {
      apar_nome:       aparelho.apar_nome,
      apar_modalidade: aparelho.apar_modalidade || '__none__',
    } : { apar_modalidade: '__none__' },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const modalidade = data.apar_modalidade && data.apar_modalidade !== '__none__' ? data.apar_modalidade : null
    if (!modalidade) {
      toast({ title: 'Selecione a modalidade.', variant: 'destructive' })
      return
    }
    const payload = { apar_nome: data.apar_nome, apar_modalidade: modalidade, apar_ativo: true }
    if (aparelho) update.mutate({ id: aparelho.apar_id, data: payload })
    else          create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Nome do Aparelho" required error={errors.apar_nome?.message}>
        <Input {...register('apar_nome', { required: 'Nome obrigatório' })} placeholder="Reformer" disabled={busy} />
      </FormField>
      <FormField label="Modalidade" required>
        <Select value={watch('apar_modalidade')} onValueChange={v => setValue('apar_modalidade', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : aparelho ? 'Salvar Alterações' : 'Cadastrar Aparelho'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function AparelhosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Aparelho excluído.' })

  const columns = [
    { key: 'apar_nome',       header: 'Aparelho',   render: r => <span className="font-medium">{r.apar_nome}</span> },
    {
      key: 'apar_modalidade', header: 'Modalidade',
      render: r => (
        <Badge variant={MODALIDADE_VARIANT[r.apar_modalidade] || 'default'}>
          {MODALIDADES.find(m => m.value === r.apar_modalidade)?.label || r.apar_modalidade}
        </Badge>
      ),
    },
    {
      key: 'apar_ativo', header: 'Status',
      render: r => <Badge variant={r.apar_ativo ? 'success' : 'secondary'}>{r.apar_ativo ? 'Ativo' : 'Inativo'}</Badge>,
    },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.apar_id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aparelhos"
        description="Catálogo de aparelhos de Pilates e Funcional"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo Aparelho</Button>}
      />
      <Card>
        <CardContent className="p-5 space-y-4">
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum aparelho cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{selected ? 'Editar Aparelho' : 'Novo Aparelho'}</DialogTitle></DialogHeader>
          <AparelhoForm aparelho={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Aparelho"
        description="Tem certeza? Exercícios vinculados a este aparelho perderão o vínculo."
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
