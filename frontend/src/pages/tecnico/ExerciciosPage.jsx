import { useState } from 'react'
import { Dumbbell, Plus, Pencil, Trash2 } from 'lucide-react'
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
import { Input, FormField, Textarea } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/primitives'

const ENDPOINT = '/exercicios/'
const KEY      = 'exercicios'

const APARELHOS = [
  { value: 'solo',     label: 'Solo' },
  { value: 'reformer', label: 'Reformer' },
  { value: 'cadillac', label: 'Cadillac' },
  { value: 'chair',    label: 'Chair' },
  { value: 'barrel',   label: 'Barrel' },
]

const APARELHO_COLORS = {
  solo:     'default',
  reformer: 'cyan',
  cadillac: 'success',
  chair:    'warning',
  barrel:   'secondary',
}

function ExercForm({ exercicio, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: exercicio ? {
      exe_nome:      exercicio.exe_nome,
      exe_aparelho:  exercicio.exe_aparelho || '',
      exe_descricao: exercicio.exe_descricao || '',
    } : {},
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (exercicio) update.mutate({ id: exercicio.id, data: cleaned })
    else           create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Nome do Exercício" required error={errors.exe_nome?.message}>
        <Input {...register('exe_nome', { required: 'Nome obrigatório' })} placeholder="Flexão de quadril" disabled={busy} />
      </FormField>

      <FormField label="Aparelho" required error={errors.exe_aparelho?.message}>
        <Select value={watch('exe_aparelho') || undefined} onValueChange={v => setValue('exe_aparelho', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar aparelho..." /></SelectTrigger>
          <SelectContent>
            {APARELHOS.map(a => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Descrição">
        <Textarea {...register('exe_descricao')} placeholder="Descrição e observações do exercício..." disabled={busy} rows={3} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : exercicio ? 'Salvar Alterações' : 'Cadastrar Exercício'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ExerciciosPage() {
  const [modalOpen, setModalOpen]     = useState(false)
  const [selected, setSelected]       = useState(null)
  const [deleteId, setDeleteId]       = useState(null)
  const [aparelhoFilter, setAparelhoFilter] = useState('all')

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Exercício excluído.' })

  const handleAparelhoFilter = (v) => {
    setAparelhoFilter(v)
    setFilters(v && v !== 'all' ? { exe_aparelho: v } : {})
  }

  const columns = [
    { key: 'exe_nome',     header: 'Exercício', render: r => <span className="font-medium">{r.exe_nome}</span> },
    {
      key: 'exe_aparelho', header: 'Aparelho',
      render: r => r.exe_aparelho ? (
        <Badge variant={APARELHO_COLORS[r.exe_aparelho] || 'default'}>
          {APARELHOS.find(a => a.value === r.exe_aparelho)?.label || r.exe_aparelho}
        </Badge>
      ) : '—',
    },
    { key: 'exe_descricao', header: 'Descrição', render: r => r.exe_descricao ? (
      <span className="text-muted-foreground text-xs line-clamp-1">{r.exe_descricao}</span>
    ) : '—' },
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
        title="Exercícios"
        description="Catálogo de exercícios por aparelho"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo Exercício</Button>}
      />
      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por nome..." onSearch={q => setFilters(q ? { search: q } : {})}>
            <Select value={aparelhoFilter} onValueChange={handleAparelhoFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {APARELHOS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </SearchFilter>
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum exercício cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Exercício' : 'Novo Exercício'}</DialogTitle></DialogHeader>
          <ExercForm exercicio={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Exercício" description="Tem certeza que deseja excluir este exercício?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
