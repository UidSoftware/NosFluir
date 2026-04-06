import { useState } from 'react'
import { CalendarDays, Plus, Pencil, Trash2, Eye, Users, UserPlus, UserMinus } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Spinner, Badge } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

const ENDPOINT = '/turmas/'
const KEY      = 'turmas'

function TurmaForm({ turma, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: turma ? {
      tur_nome:    turma.tur_nome,
      tur_horario: turma.tur_horario || '',
      func_id:     turma.func_id ? String(turma.func_id) : '',
    } : {},
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const { data: funcionarios } = useQuery({
    queryKey: ['funcionarios-select'],
    queryFn: () => api.get('/funcionarios/').then(r => r.data.results),
  })

  const onSubmit = (data) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (cleaned.func_id) cleaned.func_id = parseInt(cleaned.func_id)
    if (turma) update.mutate({ id: turma.id, data: cleaned })
    else       create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
      <div className="space-y-3">
        <FormField label="Nome da turma" required error={errors.tur_nome?.message}>
          <Input {...register('tur_nome', { required: 'Nome obrigatório' })} placeholder="Ex: Pilates Segunda 07h" disabled={busy} />
        </FormField>

        <FormField label="Horário">
          <Input {...register('tur_horario')} placeholder="Seg/Qua/Sex 07:00" disabled={busy} />
        </FormField>

        <FormField label="Professor responsável">
          <Select value={watch('func_id') || '__none__'} onValueChange={v => setValue('func_id', v)} disabled={busy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" disabled className="text-muted-foreground italic">Selecionar professor...</SelectItem>
              {funcionarios?.map(f => (
                <SelectItem key={f.id} value={String(f.id)}>{f.func_nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : turma ? 'Salvar Alterações' : 'Criar Turma'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function GerenciarAlunosModal({ turma, onClose }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: matriculados, isLoading: loadingM } = useQuery({
    queryKey: ['turma-alunos', turma.id],
    queryFn: () => api.get('/turma-alunos/', { params: { turma_id: turma.id, page_size: 100 } }).then(r => r.data.results),
    enabled: !!turma,
  })

  const { data: todosAlunos, isLoading: loadingA } = useQuery({
    queryKey: ['alunos-select', search],
    queryFn: () => api.get('/alunos/', { params: { search, page_size: 20 } }).then(r => r.data.results),
  })

  const matriculadosIds = new Set(matriculados?.map(m => m.aluno_id) ?? [])
  const totalMatriculados = matriculados?.length ?? 0

  const addMutation = useMutation({
    mutationFn: (aluno_id) => api.post('/turma-alunos/', { turma_id: turma.id, aluno_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turma-alunos', turma.id] })
      toast({ title: 'Aluno adicionado.', variant: 'success' })
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Erro ao adicionar aluno.'
      toast({ title: msg, variant: 'destructive' })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id) => api.delete(`/turma-alunos/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turma-alunos', turma.id] })
      toast({ title: 'Aluno removido.', variant: 'success' })
    },
  })

  const getMatriculaId = (aluno_id) => matriculados?.find(m => m.aluno_id === aluno_id)?.id

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalMatriculados}/15 alunos matriculados
        </p>
        {totalMatriculados >= 15 && (
          <Badge variant="warning">Turma cheia</Badge>
        )}
      </div>

      <SearchFilter placeholder="Buscar aluno..." onSearch={setSearch} />

      <div className="max-h-64 overflow-y-auto space-y-1">
        {loadingA || loadingM ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          todosAlunos?.map(aluno => {
            const isIn = matriculadosIds.has(aluno.id)
            const mId  = getMatriculaId(aluno.id)
            return (
              <div key={aluno.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-fluir-dark-3">
                <span className="text-sm">{aluno.alu_nome}</span>
                {isIn ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => removeMutation.mutate(mId)}
                    disabled={removeMutation.isPending}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-fluir-cyan hover:text-fluir-cyan/80"
                    onClick={() => addMutation.mutate(aluno.id)}
                    disabled={addMutation.isPending || totalMatriculados >= 15}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )
          })
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
      </DialogFooter>
    </div>
  )
}

export default function TurmasPage() {
  const [modalOpen, setModalOpen]   = useState(false)
  const [alunosOpen, setAlunosOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [deleteId, setDeleteId]     = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Turma excluída.' })

  const openEdit    = (t) => { setSelected(t); setModalOpen(true) }
  const openCreate  = ()  => { setSelected(null); setModalOpen(true) }
  const openDetail  = (t) => { setSelected(t); setDetailOpen(true) }
  const openAlunos  = (t) => { setSelected(t); setAlunosOpen(true) }

  const columns = [
    { key: 'tur_nome',    header: 'Turma',    render: r => <span className="font-medium">{r.tur_nome}</span> },
    { key: 'tur_horario', header: 'Horário',  render: r => r.tur_horario || '—' },
    {
      key: 'acoes', header: '', cellClassName: 'w-36',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => openDetail(r)} title="Detalhes"><Eye className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => openAlunos(r)} title="Gerenciar alunos"><Users className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Turmas"
        description="Gestão de turmas e alunos matriculados"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" />Nova Turma</Button>}
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por nome..." onSearch={q => setFilters(q ? { search: q } : {})} />
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhuma turma cadastrada." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
          </DialogHeader>
          <TurmaForm turma={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-fluir-purple" />
              {selected?.tur_nome}
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Horário</p>
              <p className="text-sm">{selected?.tur_horario || '—'}</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDetailOpen(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={alunosOpen} onOpenChange={setAlunosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-fluir-cyan" />
              Alunos — {selected?.tur_nome}
            </DialogTitle>
          </DialogHeader>
          {selected && <GerenciarAlunosModal turma={selected} onClose={() => setAlunosOpen(false)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir Turma"
        description="Tem certeza que deseja excluir esta turma?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
