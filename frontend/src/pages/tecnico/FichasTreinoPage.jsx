import { useState, useMemo } from 'react'
import { FileText, Plus, Pencil, Trash2, Dumbbell, ChevronDown, ChevronRight } from 'lucide-react'
import { useCreate, useUpdate, useDelete, fetchAll } from '@/hooks/useApi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Spinner, Badge } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const ENDPOINT      = '/fichas-treino/'
const KEY           = 'fichas-treino'
const EXER_ENDPOINT = '/fichas-treino-exercicios/'

const MODALIDADES = [
  { value: 'pilates',   label: 'Mat Pilates' },
  { value: 'funcional', label: 'Funcional' },
]

const MODALIDADE_VARIANT = { pilates: 'cyan', funcional: 'success' }

function FichaForm({ ficha, modalidadeInicial, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: ficha ? {
      fitr_nome:       ficha.fitr_nome,
      fitr_modalidade: ficha.fitr_modalidade || '__none__',
    } : { fitr_modalidade: modalidadeInicial || '__none__' },
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
      exe2:             ftex.exe2 ? String(ftex.exe2) : '__none__',
      ftex_secao:       ftex.ftex_secao || '',
      ftex_ordem:       ftex.ftex_ordem,
      ftex_series:      ftex.ftex_series || '',
      ftex_repeticoes:  ftex.ftex_repeticoes,
      ftex_observacoes: ftex.ftex_observacoes || '',
    },
  })

  const { data: exercicios } = useQuery({
    queryKey: ['exercicios-select'],
    queryFn: () => fetchAll('/exercicios/'),
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
    const exeId  = data.exe  && data.exe  !== '__none__' ? parseInt(data.exe)  : null
    const exe2Id = data.exe2 && data.exe2 !== '__none__' ? parseInt(data.exe2) : null
    if (!exeId) {
      toast({ title: 'Selecione o exercício.', variant: 'destructive' })
      return
    }
    mutation.mutate({
      exe:              exeId,
      exe2:             exe2Id,
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

      <FormField label="Combinado com (opcional)">
        <Select value={watch('exe2')} onValueChange={v => setValue('exe2', v)} disabled={mutation.isPending}>
          <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
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
    defaultValues: { ftex_ordem: 1, ftex_series: 3, ftex_repeticoes: 12, exe: '__none__', exe2: '__none__' },
  })

  const { data: exercicios } = useQuery({
    queryKey: ['exercicios-select'],
    queryFn: () => fetchAll('/exercicios/'),
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
    const exeId  = data.exe  && data.exe  !== '__none__' ? parseInt(data.exe)  : null
    const exe2Id = data.exe2 && data.exe2 !== '__none__' ? parseInt(data.exe2) : null
    if (!exeId) {
      toast({ title: 'Selecione o exercício.', variant: 'destructive' })
      return
    }
    mutation.mutate({
      fitr:             fichaId,
      exe:              exeId,
      exe2:             exe2Id,
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

      <FormField label="Combinado com (opcional)">
        <Select value={watch('exe2')} onValueChange={v => setValue('exe2', v)} disabled={mutation.isPending}>
          <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
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

const GRUPOS_MODALIDADE = [
  { key: 'pilates',   label: 'Mat Pilates', icon: '🧘' },
  { key: 'funcional', label: 'Funcional',   icon: '💪' },
  { key: null,        label: 'Sem modalidade', icon: null },
]

function FichaGrupoCard({ grupo, fichaDetalhe, onSelect, onEdit, onDelete, onNova }) {
  const [aberto, setAberto] = useState(true)
  const { key, label, icon, fichas } = grupo

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            className="flex items-center gap-2 text-sm font-semibold flex-1 text-left"
            onClick={() => setAberto(v => !v)}
          >
            {icon && <span>{icon}</span>}
            <span>{label}</span>
            <Badge variant={MODALIDADE_VARIANT[key] || 'default'} className="text-[10px] px-1.5">
              {fichas.length}
            </Badge>
            {aberto
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <Button size="sm" variant="ghost" onClick={() => onNova(key)}>
            <Plus className="w-3.5 h-3.5" />Nova
          </Button>
        </div>
        {aberto && (
          <div className="divide-y divide-border/40">
            {fichas.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-3">Nenhuma ficha nesta modalidade.</p>
            ) : fichas.map(r => (
              <div
                key={r.fitr_id}
                className={cn(
                  'flex items-center justify-between px-4 py-2.5 hover:bg-fluir-dark-3 transition-colors',
                  fichaDetalhe?.fitr_id === r.fitr_id && 'bg-fluir-dark-3'
                )}
              >
                <button
                  className="text-sm font-medium text-left flex-1"
                  onClick={() => onSelect(r)}
                >
                  <Dumbbell className="w-3 h-3 inline mr-1.5 text-muted-foreground" />
                  {r.fitr_nome}
                </button>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon-sm" onClick={() => onEdit(r)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => onDelete(r.fitr_id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function FichasTreinoPage() {
  const [modalOpen, setModalOpen]       = useState(false)
  const [addExerOpen, setAddExerOpen]   = useState(false)
  const [editExerOpen, setEditExerOpen] = useState(false)
  const [selectedExer, setSelectedExer] = useState(null)
  const [selected, setSelected]         = useState(null)
  const [modInicial, setModInicial]     = useState(null)
  const [fichaDetalhe, setFichaDetalhe] = useState(null)
  const [deleteId, setDeleteId]         = useState(null)
  const [busca, setBusca]               = useState('')

  const queryClient = useQueryClient()

  const { data: todasFichas, isLoading } = useQuery({
    queryKey: [KEY],
    queryFn: () => fetchAll(ENDPOINT),
  })

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

  const exerciciosOrdenados = exerciciosFicha?.slice().sort((a, b) => a.ftex_ordem - b.ftex_ordem) || []

  const gruposSecao = useMemo(() => {
    const mapa = {}
    const ordem = []
    exerciciosOrdenados.forEach(ex => {
      const sec = ex.ftex_secao || ''
      if (!mapa[sec]) { mapa[sec] = []; ordem.push(sec) }
      mapa[sec].push(ex)
    })
    return ordem.map(sec => ({ secao: sec, itens: mapa[sec] }))
  }, [exerciciosOrdenados])

  const temSecao = exerciciosOrdenados.some(ex => ex.ftex_secao)

  const fichasFiltradas = useMemo(() => {
    if (!todasFichas) return []
    if (!busca.trim()) return todasFichas
    const q = busca.toLowerCase()
    return todasFichas.filter(f => f.fitr_nome.toLowerCase().includes(q))
  }, [todasFichas, busca])

  const grupos = useMemo(() =>
    GRUPOS_MODALIDADE.map(g => ({
      ...g,
      fichas: fichasFiltradas.filter(f => f.fitr_modalidade === g.key),
    }))
  , [fichasFiltradas])

  const abrirNova = (mod) => { setSelected(null); setModInicial(mod); setModalOpen(true) }

  const exercCols = [
    { key: 'ftex_ordem',       header: '#',         cellClassName: 'w-8' },
    { key: 'ftex_secao',       header: 'Seção',     render: r => r.ftex_secao ? <span className="text-xs text-muted-foreground">{r.ftex_secao}</span> : '—' },
    {
      key: 'exe_nome', header: 'Exercício',
      render: r => (
        <span className="font-medium">
          {r.exe_nome}{r.exe2_nome ? <span className="text-fluir-cyan"> + {r.exe2_nome}</span> : ''}
        </span>
      ),
    },
    {
      key: 'apar_nome', header: 'Aparelho',
      render: r => {
        if (!r.apar_nome && !r.exe2_apar_nome) return '—'
        if (r.exe2_apar_nome && r.apar_nome !== r.exe2_apar_nome) return `${r.apar_nome || '—'} / ${r.exe2_apar_nome}`
        return r.apar_nome || '—'
      },
    },
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
      />

      <SearchFilter placeholder="Buscar por nome..." onSearch={q => setBusca(q)} />

      <div className={fichaDetalhe ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''}>
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : grupos.map(g => (
            <FichaGrupoCard
              key={g.key ?? '__null__'}
              grupo={g}
              fichaDetalhe={fichaDetalhe}
              onSelect={setFichaDetalhe}
              onEdit={r => { setSelected(r); setModInicial(r.fitr_modalidade); setModalOpen(true) }}
              onDelete={id => setDeleteId(id)}
              onNova={abrirNova}
            />
          ))}
        </div>

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
              ) : exerciciosOrdenados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum exercício nesta ficha.</p>
              ) : temSecao ? (
                <div className="space-y-4">
                  {gruposSecao.map(({ secao, itens }) => (
                    <div key={secao || '__sem_secao__'}>
                      {secao && (
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-fluir-cyan mb-1.5">
                          {secao}
                        </p>
                      )}
                      <div className="space-y-1">
                        {itens.map(ex => (
                          <div key={ex.ftex_id} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                            <span className="text-muted-foreground text-xs w-5 shrink-0">{ex.ftex_ordem}.</span>
                            <span className="flex-1 text-sm font-medium min-w-0">
                              {ex.exe_nome}
                              {ex.exe2_nome && <span className="text-fluir-cyan"> + {ex.exe2_nome}</span>}
                              {ex.apar_nome && <span className="text-muted-foreground font-normal"> · {ex.apar_nome}</span>}
                            </span>
                            {(ex.ftex_series || ex.ftex_repeticoes) && (
                              <span className="text-xs text-muted-foreground shrink-0">{ex.ftex_series}×{ex.ftex_repeticoes}</span>
                            )}
                            {ex.ftex_observacoes && (
                              <span className="text-xs text-muted-foreground italic shrink-0 max-w-[120px] truncate" title={ex.ftex_observacoes}>
                                {ex.ftex_observacoes}
                              </span>
                            )}
                            <div className="flex gap-0.5 shrink-0">
                              <Button variant="ghost" size="icon-sm" onClick={() => { setSelectedExer(ex); setEditExerOpen(true) }}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => removeExerc.mutate(ex.ftex_id)} className="text-red-400 hover:text-red-300">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
          <FichaForm ficha={selected} modalidadeInicial={modInicial} onClose={() => setModalOpen(false)} />
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
