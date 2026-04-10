import { useState } from 'react'
import { FileText, Plus, Pencil, Trash2, Dumbbell } from 'lucide-react'
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
import { Input, FormField, Spinner, Badge } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

const ENDPOINT      = '/fichas-treino/'
const KEY           = 'fichas-treino'
const EXER_ENDPOINT = '/fichas-treino-exercicios/'

const MODALIDADES = [
  { value: 'pilates',   label: 'Mat Pilates' },
  { value: 'funcional', label: 'Funcional' },
]

const MODALIDADE_VARIANT = { pilates: 'cyan', funcional: 'success' }

function FichaForm({ ficha, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: ficha ? {
      fitr_nome:       ficha.fitr_nome,
      fitr_modalidade: ficha.fitr_modalidade || '__none__',
    } : { fitr_modalidade: '__none__' },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const payload = {
      fitr_nome:       data.fitr_nome,
      fitr_modalidade: data.fitr_modalidade && data.fitr_modalidade !== '__none__' ? data.fitr_modalidade : null,
    }
    if (ficha) update.mutate({ id: ficha.fitr_id, data: payload })
    else       create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Nome da Ficha" required error={errors.fitr_nome?.message}>
        <Input {...register('fitr_nome', { required: 'Nome obrigatório' })} placeholder="Ficha A — Iniciante" disabled={busy} />
      </FormField>
      <FormField label="Modalidade">
        <Select value={watch('fitr_modalidade')} onValueChange={v => setValue('fitr_modalidade', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Não definida" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Não definida</SelectItem>
            {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : ficha ? 'Salvar' : 'Criar Ficha'}</Button>
      </DialogFooter>
    </form>
  )
}

function EditExercicioForm({ ftex, fichaId, onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      exe:              String(ftex.exe),
      ftex_secao:       ftex.ftex_secao || '',
      ftex_ordem:       ftex.ftex_ordem,
      ftex_series:      ftex.ftex_series || '',
      ftex_repeticoes:  ftex.ftex_repeticoes,
      ftex_observacoes: ftex.ftex_observacoes || '',
    },
  })

  const { data: exercicios } = useQuery({
    queryKey: ['exercicios-select'],
    queryFn: () => api.get('/exercicios/').then(r => r.data.results),
  })

  const mutation = useMutation({
    mutationFn: (data) => api.patch(`${EXER_ENDPOINT}${ftex.ftex_id}/`, data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ficha-exercicios', fichaId] })
      toast({ title: 'Exercício atualizado.', variant: 'success' })
      onClose()
    },
    onError: () => toast({ title: 'Erro ao atualizar exercício.', variant: 'destructive' }),
  })

  const onSubmit = (data) => {
    const exeId = data.exe && data.exe !== '__none__' ? parseInt(data.exe) : null
    if (!exeId) {
      toast({ title: 'Selecione o exercício.', variant: 'destructive' })
      return
    }
    mutation.mutate({
      exe:              exeId,
      ftex_secao:       data.ftex_secao || null,
      ftex_ordem:       parseInt(data.ftex_ordem),
      ftex_series:      data.ftex_series ? parseInt(data.ftex_series) : null,
      ftex_repeticoes:  parseInt(data.ftex_repeticoes),
      ftex_observacoes: data.ftex_observacoes || null,
    })
  }

  const nomeExercicio = (e) => {
    const mod  = e.exe_modalidade === 'pilates' ? 'Pilates' : 'Funcional'
    const apar = e.apar_nome ? ` · ${e.apar_nome}` : ''
    return `${e.exe_nome} (${mod}${apar})`
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Exercício" required>
        <Select value={watch('exe')} onValueChange={v => setValue('exe', v)} disabled={mutation.isPending}>
          <SelectTrigger><SelectValue placeholder="Selecionar exercício..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar exercício...</SelectItem>
            {exercicios?.map(e => (
              <SelectItem key={e.exe_id} value={String(e.exe_id)}>{nomeExercicio(e)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Seção">
        <Input {...register('ftex_secao')} placeholder="Potência, Força, Aquecimento..." disabled={mutation.isPending} />
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="Ordem"><Input type="number" {...register('ftex_ordem')} disabled={mutation.isPending} /></FormField>
        <FormField label="Séries"><Input type="number" {...register('ftex_series')} disabled={mutation.isPending} /></FormField>
        <FormField label="Reps"><Input type="number" {...register('ftex_repeticoes')} disabled={mutation.isPending} /></FormField>
      </div>
      <FormField label="Observações">
        <Input {...register('ftex_observacoes')} placeholder="Carga, observações..." disabled={mutation.isPending} />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando...' : 'Salvar Alterações'}</Button>
      </DialogFooter>
    </form>
  )
}

function AddExercicioForm({ fichaId, onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: { ftex_ordem: 1, ftex_series: 3, ftex_repeticoes: 12, exe: '__none__' },
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
    const exeId = data.exe && data.exe !== '__none__' ? parseInt(data.exe) : null
    if (!exeId) {
      toast({ title: 'Selecione o exercício.', variant: 'destructive' })
      return
    }
    mutation.mutate({
      fitr:             fichaId,
      exe:              exeId,
      ftex_secao:       data.ftex_secao || null,
      ftex_ordem:       parseInt(data.ftex_ordem),
      ftex_series:      parseInt(data.ftex_series),
      ftex_repeticoes:  parseInt(data.ftex_repeticoes),
      ftex_observacoes: data.ftex_observacoes || null,
    })
  }

  const nomeExercicio = (e) => {
    const mod  = e.exe_modalidade === 'pilates' ? 'Pilates' : 'Funcional'
    const apar = e.apar_nome ? ` · ${e.apar_nome}` : ''
    return `${e.exe_nome} (${mod}${apar})`
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Exercício" required>
        <Select value={watch('exe')} onValueChange={v => setValue('exe', v)} disabled={mutation.isPending}>
          <SelectTrigger><SelectValue placeholder="Selecionar exercício..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar exercício...</SelectItem>
            {exercicios?.map(e => (
              <SelectItem key={e.exe_id} value={String(e.exe_id)}>{nomeExercicio(e)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Seção">
        <Input {...register('ftex_secao')} placeholder="Potência, Força, Aquecimento..." disabled={mutation.isPending} />
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="Ordem"><Input type="number" {...register('ftex_ordem')} disabled={mutation.isPending} /></FormField>
        <FormField label="Séries"><Input type="number" {...register('ftex_series')} disabled={mutation.isPending} /></FormField>
        <FormField label="Reps"><Input type="number" {...register('ftex_repeticoes')} disabled={mutation.isPending} /></FormField>
      </div>
      <FormField label="Observações">
        <Input {...register('ftex_observacoes')} placeholder="Carga, observações..." disabled={mutation.isPending} />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Adicionando...' : 'Adicionar'}</Button>
      </DialogFooter>
    </form>
  )
}

export default function FichasTreinoPage() {
  const [modalOpen, setModalOpen]       = useState(false)
  const [addExerOpen, setAddExerOpen]   = useState(false)
  const [editExerOpen, setEditExerOpen] = useState(false)
  const [selectedExer, setSelectedExer] = useState(null)
  const [selected, setSelected]         = useState(null)
  const [fichaDetalhe, setFichaDetalhe] = useState(null)
  const [deleteId, setDeleteId]         = useState(null)

  const queryClient = useQueryClient()
  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Ficha excluída.' })

  const { data: exerciciosFicha, isLoading: loadingExerc } = useQuery({
    queryKey: ['ficha-exercicios', fichaDetalhe?.fitr_id],
    queryFn: () => api.get(EXER_ENDPOINT, { params: { fitr: fichaDetalhe.fitr_id } }).then(r => r.data.results),
    enabled: !!fichaDetalhe,
  })

  const removeExerc = useMutation({
    mutationFn: (id) => api.delete(`${EXER_ENDPOINT}${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ficha-exercicios', fichaDetalhe?.fitr_id] })
      toast({ title: 'Exercício removido.', variant: 'success' })
    },
  })

  // Agrupamento por seção para exibição
  const exerciciosOrdenados = exerciciosFicha?.slice().sort((a, b) => a.ftex_ordem - b.ftex_ordem) || []

  const fichasCols = [
    {
      key: 'fitr_nome', header: 'Ficha',
      render: r => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.fitr_nome}</span>
          {r.fitr_modalidade && (
            <Badge variant={MODALIDADE_VARIANT[r.fitr_modalidade] || 'default'} className="text-[10px] px-1.5 py-0">
              {MODALIDADES.find(m => m.value === r.fitr_modalidade)?.label || r.fitr_modalidade}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'acoes', header: '', cellClassName: 'w-28',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => setFichaDetalhe(r)} title="Ver exercícios">
            <Dumbbell className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.fitr_id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const exercCols = [
    { key: 'ftex_ordem',       header: '#',         cellClassName: 'w-8' },
    { key: 'ftex_secao',       header: 'Seção',     render: r => r.ftex_secao ? <span className="text-xs text-muted-foreground">{r.ftex_secao}</span> : '—' },
    { key: 'exe_nome',         header: 'Exercício', render: r => <span className="font-medium">{r.exe_nome}</span> },
    { key: 'apar_nome',        header: 'Aparelho',  render: r => r.apar_nome || '—' },
    { key: 'ftex_series',      header: 'Séries' },
    { key: 'ftex_repeticoes',  header: 'Reps' },
    { key: 'ftex_observacoes', header: 'Obs.',      render: r => r.ftex_observacoes ? <span className="text-xs text-muted-foreground">{r.ftex_observacoes}</span> : '—' },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelectedExer(r); setEditExerOpen(true) }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => removeExerc.mutate(r.ftex_id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
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
            <SearchFilter placeholder="Buscar por nome..." onSearch={q => setFilters(q ? { search: q } : {})} />
            <DataTable columns={fichasCols} data={data} isLoading={isLoading} emptyMessage="Nenhuma ficha cadastrada." />
            <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
          </CardContent>
        </Card>

        {fichaDetalhe && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-fluir-cyan" />
                {fichaDetalhe.fitr_nome}
                {fichaDetalhe.fitr_modalidade && (
                  <Badge variant={MODALIDADE_VARIANT[fichaDetalhe.fitr_modalidade] || 'default'} className="text-[10px]">
                    {MODALIDADES.find(m => m.value === fichaDetalhe.fitr_modalidade)?.label}
                  </Badge>
                )}
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
                  data={exerciciosOrdenados}
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
          {fichaDetalhe && <AddExercicioForm fichaId={fichaDetalhe.fitr_id} onClose={() => setAddExerOpen(false)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={editExerOpen} onOpenChange={setEditExerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Exercício da Ficha</DialogTitle></DialogHeader>
          {selectedExer && fichaDetalhe && (
            <EditExercicioForm
              ftex={selectedExer}
              fichaId={fichaDetalhe.fitr_id}
              onClose={() => { setEditExerOpen(false); setSelectedExer(null) }}
            />
          )}
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
