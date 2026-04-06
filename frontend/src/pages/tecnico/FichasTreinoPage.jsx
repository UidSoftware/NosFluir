import { useState } from 'react'
import { FileText, Plus, Pencil, Trash2, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Textarea, Spinner } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

const ENDPOINT     = '/fichas-treino/'
const KEY          = 'fichas-treino'
const EXER_ENDPOINT = '/fichas-treino-exercicios/'

function FichaForm({ ficha, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: ficha ? {
      fitr_nome:     ficha.fitr_nome,
      aluno_id:      ficha.aluno_id ? String(ficha.aluno_id) : '',
      fitr_descricao: ficha.fitr_descricao || '',
    } : {},
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const { data: alunos } = useQuery({
    queryKey: ['alunos-select'],
    queryFn: () => api.get('/alunos/').then(r => r.data.results),
  })

  const onSubmit = (data) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (cleaned.aluno_id) cleaned.aluno_id = parseInt(cleaned.aluno_id)
    if (ficha) update.mutate({ id: ficha.id, data: cleaned })
    else       create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Nome da Ficha" required error={errors.fitr_nome?.message}>
        <Input {...register('fitr_nome', { required: 'Nome obrigatório' })} placeholder="Ficha A — Iniciante" disabled={busy} />
      </FormField>
      <FormField label="Aluno">
        <Select value={watch('aluno_id') || ''} onValueChange={v => setValue('aluno_id', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar aluno..." /></SelectTrigger>
          <SelectContent>
            {alunos?.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.alu_nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Descrição">
        <Textarea {...register('fitr_descricao')} placeholder="Observações da ficha..." rows={2} disabled={busy} />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : ficha ? 'Salvar' : 'Criar Ficha'}</Button>
      </DialogFooter>
    </form>
  )
}

function AddExercicioForm({ fichaId, onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: { ordem: 1, fte_series: 3, fte_repeticoes: 12 },
  })

  const { data: exercicios } = useQuery({
    queryKey: ['exercicios-select'],
    queryFn: () => api.get('/exercicios/').then(r => r.data.results),
  })

  const mutation = useMutation({
    mutationFn: (data) => api.post(EXER_ENDPOINT, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ficha-exercicios', fichaId] })
      toast({ title: 'Exercício adicionado.', variant: 'success' })
      onClose()
    },
    onError: () => toast({ title: 'Erro ao adicionar exercício.', variant: 'destructive' }),
  })

  const onSubmit = (data) => {
    mutation.mutate({
      ficha_treino_id: fichaId,
      exercicio_id: parseInt(data.exercicio_id),
      fte_ordem: parseInt(data.ordem),
      fte_series: parseInt(data.fte_series),
      fte_repeticoes: parseInt(data.fte_repeticoes),
      fte_observacoes: data.fte_observacoes || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Exercício" required>
        <Select value={watch('exercicio_id') || ''} onValueChange={v => setValue('exercicio_id', v)} disabled={mutation.isPending}>
          <SelectTrigger><SelectValue placeholder="Selecionar exercício..." /></SelectTrigger>
          <SelectContent>
            {exercicios?.map(e => (
              <SelectItem key={e.id} value={String(e.id)}>{e.exe_nome} ({e.exe_aparelho})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Ordem"><Input type="number" {...register('ordem')} disabled={mutation.isPending} /></FormField>
        <FormField label="Séries"><Input type="number" {...register('fte_series')} disabled={mutation.isPending} /></FormField>
        <FormField label="Repetições"><Input type="number" {...register('fte_repeticoes')} disabled={mutation.isPending} /></FormField>
      </div>
      <FormField label="Observações">
        <Input {...register('fte_observacoes')} placeholder="Carga, observações..." disabled={mutation.isPending} />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Adicionando...' : 'Adicionar'}</Button>
      </DialogFooter>
    </form>
  )
}

export default function FichasTreinoPage() {
  const [modalOpen, setModalOpen]     = useState(false)
  const [addExerOpen, setAddExerOpen] = useState(false)
  const [selected, setSelected]       = useState(null)
  const [fichaDetalhe, setFichaDetalhe] = useState(null)
  const [deleteId, setDeleteId]       = useState(null)

  const queryClient = useQueryClient()
  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Ficha excluída.' })

  const { data: exerciciosFicha, isLoading: loadingExerc } = useQuery({
    queryKey: ['ficha-exercicios', fichaDetalhe?.id],
    queryFn: () => api.get(EXER_ENDPOINT, { params: { ficha_treino_id: fichaDetalhe.id } }).then(r => r.data.results),
    enabled: !!fichaDetalhe,
  })

  const removeExerc = useMutation({
    mutationFn: (id) => api.delete(`${EXER_ENDPOINT}${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ficha-exercicios', fichaDetalhe?.id] })
      toast({ title: 'Exercício removido.', variant: 'success' })
    },
  })

  const fichasCols = [
    { key: 'fitr_nome',  header: 'Ficha',  render: r => <span className="font-medium">{r.fitr_nome}</span> },
    { key: 'aluno_nome', header: 'Aluno',  render: r => r.aluno_nome || '—' },
    {
      key: 'acoes', header: '', cellClassName: 'w-32',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => setFichaDetalhe(r)} title="Ver exercícios">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ]

  const exercCols = [
    { key: 'fte_ordem',      header: '#',           cellClassName: 'w-10' },
    { key: 'exercicio_nome', header: 'Exercício',   render: r => <span className="font-medium">{r.exercicio_nome || r.exercicio_id}</span> },
    { key: 'fte_series',     header: 'Séries' },
    { key: 'fte_repeticoes', header: 'Reps' },
    { key: 'fte_observacoes',header: 'Obs.',        render: r => r.fte_observacoes || '—' },
    {
      key: 'acoes', header: '', cellClassName: 'w-16',
      render: (r) => (
        <Button variant="ghost" size="icon-sm" onClick={() => removeExerc.mutate(r.id)} className="text-red-400 hover:text-red-300">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fichas de Treino"
        description="Gerenciamento de fichas e exercícios"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Nova Ficha</Button>}
      />

      <div className={fichaDetalhe ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''}>
        <Card>
          <CardContent className="p-5 space-y-4">
            <SearchFilter placeholder="Buscar por nome ou aluno..." onSearch={q => setFilters(q ? { search: q } : {})} />
            <DataTable columns={fichasCols} data={data} isLoading={isLoading} emptyMessage="Nenhuma ficha cadastrada." />
            <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
          </CardContent>
        </Card>

        {fichaDetalhe && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-fluir-cyan" />
                {fichaDetalhe.fitr_nome}
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setAddExerOpen(true)}><Plus className="w-3.5 h-3.5" />Exercício</Button>
                <Button variant="ghost" size="sm" onClick={() => setFichaDetalhe(null)}>Fechar</Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {loadingExerc ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : (
                <DataTable
                  columns={exercCols}
                  data={exerciciosFicha?.sort((a, b) => a.fte_ordem - b.fte_ordem) || []}
                  emptyMessage="Nenhum exercício nesta ficha."
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Ficha' : 'Nova Ficha de Treino'}</DialogTitle></DialogHeader>
          <FichaForm ficha={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={addExerOpen} onOpenChange={setAddExerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Exercício</DialogTitle></DialogHeader>
          {fichaDetalhe && <AddExercicioForm fichaId={fichaDetalhe.id} onClose={() => setAddExerOpen(false)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Ficha" description="Tem certeza que deseja excluir esta ficha?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
