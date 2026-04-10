import { useState } from 'react'
import { Boxes, Dumbbell, Package, Plus, Pencil, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

const ENDPOINT = '/exercicios/'
const KEY      = 'exercicios'

const MODALIDADES = [
  { value: 'pilates',   label: 'Mat Pilates' },
  { value: 'funcional', label: 'Funcional' },
]

const MODALIDADE_VARIANT = { pilates: 'cyan', funcional: 'success' }

function useAparelhos() {
  return useQuery({
    queryKey: ['aparelhos-select'],
    queryFn: () => api.get('/aparelhos/', { params: { apar_ativo: true } }).then(r => r.data.results),
    staleTime: 5 * 60 * 1000,
  })
}

function useAcessorios() {
  return useQuery({
    queryKey: ['acessorios-select'],
    queryFn: () => api.get('/acessorios/', { params: { acess_ativo: true } }).then(r => r.data.results),
    staleTime: 5 * 60 * 1000,
  })
}

function aparelhosPorModalidade(aparelhos, modalidade) {
  if (!aparelhos) return []
  if (!modalidade || modalidade === '__none__') return aparelhos
  return aparelhos.filter(a => a.apar_modalidade === modalidade || a.apar_modalidade === 'ambos')
}

const MODALIDADES_APARELHO = [
  { value: 'pilates',   label: 'Mat Pilates' },
  { value: 'funcional', label: 'Funcional' },
  { value: 'ambos',     label: 'Ambos' },
]

function QuickAddAparelho({ open, onOpenChange, onCreated }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: { apar_nome: '', apar_modalidade: '__none__' },
  })

  const mutation = useMutation({
    mutationFn: (data) => api.post('/aparelhos/', data).then(r => r.data),
    onSuccess: (novo) => {
      queryClient.invalidateQueries({ queryKey: ['aparelhos-select'] })
      toast({ title: `Aparelho "${novo.apar_nome}" criado.`, variant: 'success' })
      reset()
      onCreated(novo)
      onOpenChange(false)
    },
    onError: () => toast({ title: 'Erro ao criar aparelho.', variant: 'destructive' }),
  })

  const onSubmit = (data) => {
    const modalidade = data.apar_modalidade !== '__none__' ? data.apar_modalidade : null
    if (!modalidade) {
      toast({ title: 'Selecione a modalidade.', variant: 'destructive' })
      return
    }
    mutation.mutate({ apar_nome: data.apar_nome, apar_modalidade: modalidade, apar_ativo: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Novo Aparelho</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
          <FormField label="Nome" required>
            <Input
              {...register('apar_nome', { required: true })}
              placeholder="Reformer, Chair..."
              disabled={mutation.isPending}
              autoFocus
            />
          </FormField>
          <FormField label="Modalidade" required>
            <Select
              value={watch('apar_modalidade')}
              onValueChange={v => setValue('apar_modalidade', v)}
              disabled={mutation.isPending}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
                {MODALIDADES_APARELHO.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Criando...' : 'Criar Aparelho'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuickAddAcessorio({ open, onOpenChange, onCreated }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm({ defaultValues: { acess_nome: '' } })

  const mutation = useMutation({
    mutationFn: (data) => api.post('/acessorios/', data).then(r => r.data),
    onSuccess: (novo) => {
      queryClient.invalidateQueries({ queryKey: ['acessorios-select'] })
      toast({ title: `Acessório "${novo.acess_nome}" criado.`, variant: 'success' })
      reset()
      onCreated(novo)
      onOpenChange(false)
    },
    onError: () => toast({ title: 'Erro ao criar acessório.', variant: 'destructive' }),
  })

  const onSubmit = (data) => {
    if (!data.acess_nome.trim()) {
      toast({ title: 'Informe o nome do acessório.', variant: 'destructive' })
      return
    }
    mutation.mutate({ acess_nome: data.acess_nome.trim(), acess_ativo: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Novo Acessório</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
          <FormField label="Nome" required>
            <Input
              {...register('acess_nome')}
              placeholder="Bola suíça, Mini band..."
              disabled={mutation.isPending}
              autoFocus
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ExercForm({ exercicio, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: exercicio ? {
      exe_nome:             exercicio.exe_nome,
      exe_modalidade:       exercicio.exe_modalidade || '__none__',
      exe_aparelho:         exercicio.exe_aparelho ? String(exercicio.exe_aparelho) : '__none__',
      exe_acessorio:        exercicio.exe_acessorio ? String(exercicio.exe_acessorio) : '__none__',
      exe_variacao:         exercicio.exe_variacao || '',
      exe_descricao_tecnica: exercicio.exe_descricao_tecnica || '',
    } : { exe_modalidade: '__none__', exe_aparelho: '__none__', exe_acessorio: '__none__' },
  })

  const [quickAparelho, setQuickAparelho] = useState(false)
  const [quickAcessorio, setQuickAcessorio] = useState(false)

  const { data: aparelhos }  = useAparelhos()
  const { data: acessorios } = useAcessorios()
  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const modalidadeSelecionada = watch('exe_modalidade')
  const aparelhosFiltrados = aparelhosPorModalidade(aparelhos, modalidadeSelecionada)

  const onSubmit = (data) => {
    const modalidade = data.exe_modalidade && data.exe_modalidade !== '__none__' ? data.exe_modalidade : null
    if (!modalidade) {
      toast({ title: 'Selecione a modalidade.', variant: 'destructive' })
      return
    }
    const aparelhoId  = data.exe_aparelho  && data.exe_aparelho  !== '__none__' ? parseInt(data.exe_aparelho)  : null
    const acessorioId = data.exe_acessorio && data.exe_acessorio !== '__none__' ? parseInt(data.exe_acessorio) : null
    const payload = {
      exe_nome:              data.exe_nome,
      exe_modalidade:        modalidade,
      exe_aparelho:          aparelhoId,
      exe_acessorio:         acessorioId,
      exe_variacao:          data.exe_variacao || null,
      exe_descricao_tecnica: data.exe_descricao_tecnica || null,
    }
    if (exercicio) update.mutate({ id: exercicio.exe_id, data: payload })
    else           create.mutate(payload)
  }

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Nome do Exercício" required error={errors.exe_nome?.message}>
        <Input {...register('exe_nome', { required: 'Nome obrigatório' })} placeholder="Flexão de quadril" disabled={busy} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Modalidade" required>
          <Select
            value={watch('exe_modalidade')}
            onValueChange={v => { setValue('exe_modalidade', v); setValue('exe_aparelho', '__none__') }}
            disabled={busy}
          >
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
              {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Aparelho">
          <div className="flex gap-1.5">
            <Select value={watch('exe_aparelho')} onValueChange={v => setValue('exe_aparelho', v)} disabled={busy}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
                {aparelhosFiltrados.map(a => (
                  <SelectItem key={a.apar_id} value={String(a.apar_id)}>{a.apar_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Cadastrar novo aparelho"
              onClick={() => setQuickAparelho(true)}
              disabled={busy}
              className="shrink-0 h-9 w-9"
            >
              <Boxes className="w-4 h-4" />
            </Button>
          </div>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Acessório">
          <div className="flex gap-1.5">
            <Select value={watch('exe_acessorio')} onValueChange={v => setValue('exe_acessorio', v)} disabled={busy}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
                {acessorios?.map(a => (
                  <SelectItem key={a.acess_id} value={String(a.acess_id)}>{a.acess_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Cadastrar novo acessório"
              onClick={() => setQuickAcessorio(true)}
              disabled={busy}
              className="shrink-0 h-9 w-9"
            >
              <Package className="w-4 h-4" />
            </Button>
          </div>
        </FormField>
        <FormField label="Variação">
          <Input {...register('exe_variacao')} placeholder="unilateral, com apoio..." disabled={busy} />
        </FormField>
      </div>

      <FormField label="Descrição Técnica">
        <Textarea {...register('exe_descricao_tecnica')} placeholder="Posicionamento, pontos de atenção..." disabled={busy} rows={3} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : exercicio ? 'Salvar Alterações' : 'Cadastrar Exercício'}
        </Button>
      </DialogFooter>
    </form>

    <QuickAddAparelho
      open={quickAparelho}
      onOpenChange={setQuickAparelho}
      onCreated={(novo) => setValue('exe_aparelho', String(novo.apar_id))}
    />
    <QuickAddAcessorio
      open={quickAcessorio}
      onOpenChange={setQuickAcessorio}
      onCreated={(novo) => setValue('exe_acessorio', String(novo.acess_id))}
    />
    </>
  )
}

export default function ExerciciosPage() {
  const [modalOpen, setModalOpen]         = useState(false)
  const [selected, setSelected]           = useState(null)
  const [deleteId, setDeleteId]           = useState(null)
  const [modalidadeFilter, setModalidade] = useState('all')

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const { data: aparelhos } = useAparelhos()
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Exercício excluído.' })

  const handleModalidadeFilter = (v) => {
    setModalidade(v)
    setFilters(v && v !== 'all' ? { exe_modalidade: v } : {})
  }

  const nomeAparelho = (r) => r.apar_nome || '—'

  const columns = [
    {
      key: 'exe_nome', header: 'Exercício',
      render: r => <span className="font-medium">{r.exe_nome}</span>,
    },
    {
      key: 'exe_modalidade', header: 'Modalidade',
      render: r => r.exe_modalidade ? (
        <Badge variant={MODALIDADE_VARIANT[r.exe_modalidade] || 'default'}>
          {MODALIDADES.find(m => m.value === r.exe_modalidade)?.label || r.exe_modalidade}
        </Badge>
      ) : '—',
    },
    { key: 'apar_nome',    header: 'Aparelho',  render: nomeAparelho },
    { key: 'acess_nome',    header: 'Acessório',  render: r => r.acess_nome || '—' },
    { key: 'exe_variacao',  header: 'Variação',  render: r => r.exe_variacao || '—' },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.exe_id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exercícios"
        description="Catálogo de exercícios de Pilates e Funcional"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo Exercício</Button>}
      />
      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por nome..." onSearch={q => setFilters(q ? { search: q } : {})}>
            <Select value={modalidadeFilter} onValueChange={handleModalidadeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </SearchFilter>
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum exercício cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
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
