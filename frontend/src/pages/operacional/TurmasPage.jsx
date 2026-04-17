import { useState } from 'react'
import { CalendarDays, Plus, Pencil, Trash2, Eye, Users, UserPlus, UserMinus, ChevronDown, ChevronRight } from 'lucide-react'
import { useCreate, useUpdate, useDelete, fetchAll } from '@/hooks/useApi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Spinner, Badge } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

const ENDPOINT = '/turmas/'
const KEY      = 'turmas'

const MODALIDADES = [
  { value: 'pilates',   label: 'Mat Pilates' },
  { value: 'funcional', label: 'Funcional' },
]
const MODALIDADE_VARIANT = { pilates: 'cyan', funcional: 'success' }

function TurmaForm({ turma, modalidadeInicial, onClose }) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: turma ? {
      tur_nome:       turma.tur_nome,
      tur_horario:    turma.tur_horario || '',
      tur_modalidade: turma.tur_modalidade || '__none__',
    } : { tur_modalidade: modalidadeInicial || '__none__' },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const modVal = data.tur_modalidade && data.tur_modalidade !== '__none__' ? data.tur_modalidade : null
    if (!modVal) {
      toast({ title: 'Selecione a modalidade.', variant: 'destructive' })
      return
    }
    const payload = { tur_nome: data.tur_nome, tur_horario: data.tur_horario, tur_modalidade: modVal }
    if (turma) update.mutate({ id: turma.tur_id, data: payload })
    else       create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
      <div className="space-y-3">
        <FormField label="Nome da turma" required error={errors.tur_nome?.message}>
          <Input {...register('tur_nome', { required: 'Nome obrigatório' })} placeholder="Ex: Pilates Segunda 07h" disabled={busy} />
        </FormField>

        <FormField label="Horário" required error={errors.tur_horario?.message}>
          <Input {...register('tur_horario', { required: 'Horário obrigatório' })} placeholder="Seg/Qua/Sex 07:00" disabled={busy} />
        </FormField>

        <FormField label="Modalidade" required>
          <Select value={watch('tur_modalidade')} onValueChange={v => setValue('tur_modalidade', v)} disabled={busy}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
              {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
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
    queryKey: ['turma-alunos', turma.tur_id],
    queryFn: () => api.get('/turma-alunos/', { params: { tur: turma.tur_id } }).then(r => r.data.results),
    enabled: !!turma,
  })

  const { data: todosAlunos, isLoading: loadingA } = useQuery({
    queryKey: ['alunos-select', search],
    queryFn: () => api.get('/alunos/', { params: { search, page_size: 20 } }).then(r => r.data.results),
  })

  const matriculadosIds = new Set(matriculados?.map(m => m.alu) ?? [])
  const totalMatriculados = matriculados?.length ?? 0

  const addMutation = useMutation({
    mutationFn: (aluno_id) => api.post('/turma-alunos/', { tur: turma.tur_id, alu: aluno_id, data_matricula: new Date().toISOString().split('T')[0] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turma-alunos', turma.tur_id] })
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
      queryClient.invalidateQueries({ queryKey: ['turma-alunos', turma.tur_id] })
      toast({ title: 'Aluno removido.', variant: 'success' })
    },
  })

  const getMatriculaId = (aluno_id) => matriculados?.find(m => m.alu === aluno_id)?.tual_id

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
            const isIn = matriculadosIds.has(aluno.alu_id)
            const mId  = getMatriculaId(aluno.alu_id)
            return (
              <div key={aluno.alu_id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-fluir-dark-3">
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
                    onClick={() => addMutation.mutate(aluno.alu_id)}
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

const GRUPOS = [
  { key: 'pilates',   label: 'Mat Pilates', icon: '🧘' },
  { key: 'funcional', label: 'Funcional',   icon: '💪' },
  { key: null,        label: 'Sem modalidade', icon: null },
]

function TurmaGrupoCard({ grupo, turmas, onEdit, onAlunos, onDelete, onNova }) {
  const [expandido, setExpandido] = useState(true)
  const ChevronIcon = expandido ? ChevronDown : ChevronRight

  return (
    <Card>
      <CardContent className="p-0">
        <div
          className="flex items-center justify-between px-5 py-3 cursor-pointer select-none hover:bg-white/5 rounded-t-lg"
          onClick={() => setExpandido(e => !e)}
        >
          <div className="flex items-center gap-2">
            <ChevronIcon className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">
              {grupo.icon ? `${grupo.icon} ` : ''}{grupo.label}
            </span>
            <span className="text-xs text-muted-foreground">({turmas.length})</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={e => { e.stopPropagation(); onNova(grupo.key) }}
          >
            <Plus className="w-3 h-3" /> Nova
          </Button>
        </div>

        {expandido && (
          <div className="divide-y divide-white/5">
            {turmas.length === 0 ? (
              <p className="px-5 py-3 text-sm text-muted-foreground italic">Nenhuma turma.</p>
            ) : turmas.map(t => (
              <div key={t.tur_id} className="flex items-center justify-between px-5 py-2.5 hover:bg-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-sm truncate">{t.tur_nome}</span>
                  {t.tur_horario && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">{t.tur_horario}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {t.total_alunos ?? 0}/15
                    {(t.total_alunos ?? 0) >= 15 && (
                      <Badge variant="warning" className="ml-1 text-[10px] py-0">cheia</Badge>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon-sm" title="Gerenciar alunos" onClick={() => onAlunos(t)}>
                    <Users className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => onEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => onDelete(t.tur_id)} className="text-red-400 hover:text-red-300">
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

export default function TurmasPage() {
  const [modalOpen, setModalOpen]      = useState(false)
  const [alunosOpen, setAlunosOpen]    = useState(false)
  const [selected, setSelected]        = useState(null)
  const [deleteId, setDeleteId]        = useState(null)
  const [modInicial, setModInicial]    = useState(null)
  const [busca, setBusca]              = useState('')

  const queryClient = useQueryClient()
  const { data: todas, isLoading } = useQuery({
    queryKey: [KEY, 'all'],
    queryFn: () => fetchAll(ENDPOINT),
    staleTime: 30 * 1000,
  })

  const del = useDelete(KEY, ENDPOINT, {
    successMsg: 'Turma excluída.',
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY, 'all'] }),
  })

  const filtradas = (todas || []).filter(t =>
    !busca || t.tur_nome.toLowerCase().includes(busca.toLowerCase())
  )

  const abrirNova = (modalidade) => { setSelected(null); setModInicial(modalidade); setModalOpen(true) }
  const abrirEditar = (t) => { setSelected(t); setModInicial(null); setModalOpen(true) }
  const fecharModal = () => { setModalOpen(false); queryClient.invalidateQueries({ queryKey: [KEY, 'all'] }) }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Turmas"
        description="Gestão de turmas e alunos matriculados"
        actions={<Button onClick={() => abrirNova(null)}><Plus className="w-4 h-4" />Nova Turma</Button>}
      />

      <SearchFilter placeholder="Buscar por nome..." onSearch={setBusca} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-4">
          {GRUPOS.map(grupo => (
            <TurmaGrupoCard
              key={String(grupo.key)}
              grupo={grupo}
              turmas={filtradas.filter(t => (t.tur_modalidade || null) === grupo.key)}
              onEdit={abrirEditar}
              onAlunos={t => { setSelected(t); setAlunosOpen(true) }}
              onDelete={setDeleteId}
              onNova={abrirNova}
            />
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
          </DialogHeader>
          <TurmaForm turma={selected} modalidadeInicial={modInicial} onClose={fecharModal} />
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
