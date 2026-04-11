import { useState } from 'react'
import { CalendarDays, Plus, Pencil, Trash2, Users, CheckCircle, XCircle } from 'lucide-react'
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

const ENDPOINT = '/aulas/'
const KEY      = 'aulas'

const MODALIDADES = [
  { value: 'pilates',   label: 'Mat Pilates' },
  { value: 'funcional', label: 'Funcional' },
]

const MODALIDADE_VARIANT = { pilates: 'cyan', funcional: 'success' }

function AulaForm({ aula, turmas, funcionarios, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: aula ? {
      tur:            String(aula.tur),
      func:           aula.func ? String(aula.func) : '__none__',
      aul_data:       aula.aul_data,
      aul_hora_inicio: aula.aul_hora_inicio,
      aul_hora_final:  aula.aul_hora_final || '',
      aul_modalidade: aula.aul_modalidade || '__none__',
      aul_nome:       aula.aul_nome || '',
    } : {
      tur:            '__none__',
      func:           '__none__',
      aul_modalidade: '__none__',
    },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const turVal  = data.tur && data.tur !== '__none__' ? parseInt(data.tur) : null
    const modVal  = data.aul_modalidade && data.aul_modalidade !== '__none__' ? data.aul_modalidade : null
    const funcVal = data.func && data.func !== '__none__' ? parseInt(data.func) : null

    if (!turVal)  { toast({ title: 'Selecione a turma.',      variant: 'destructive' }); return }
    if (!modVal)  { toast({ title: 'Selecione a modalidade.', variant: 'destructive' }); return }
    if (!data.aul_data) { toast({ title: 'Informe a data da aula.', variant: 'destructive' }); return }
    if (!data.aul_hora_inicio) { toast({ title: 'Informe a hora de início.', variant: 'destructive' }); return }

    const payload = {
      tur:             turVal,
      func:            funcVal,
      aul_data:        data.aul_data,
      aul_hora_inicio: data.aul_hora_inicio,
      aul_hora_final:  data.aul_hora_final || null,
      aul_modalidade:  modVal,
      aul_nome:        data.aul_nome || null,
    }

    if (aula) update.mutate({ id: aula.aul_id, data: payload })
    else      create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Turma" required>
        <Select value={watch('tur')} onValueChange={v => setValue('tur', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {turmas?.map(t => <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Modalidade" required>
        <Select value={watch('aul_modalidade')} onValueChange={v => setValue('aul_modalidade', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Data" required error={errors.aul_data?.message}>
          <Input type="date" {...register('aul_data', { required: 'Data obrigatória' })} disabled={busy} />
        </FormField>
        <FormField label="Professor">
          <Select value={watch('func')} onValueChange={v => setValue('func', v)} disabled={busy}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Sem professor</SelectItem>
              {funcionarios?.map(f => <SelectItem key={f.func_id} value={String(f.func_id)}>{f.func_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Hora Início" required error={errors.aul_hora_inicio?.message}>
          <Input type="time" {...register('aul_hora_inicio', { required: 'Hora obrigatória' })} disabled={busy} />
        </FormField>
        <FormField label="Hora Término">
          <Input type="time" {...register('aul_hora_final')} disabled={busy} />
        </FormField>
      </div>

      <FormField label="Nome/Descrição" hint="Preenchido automaticamente se deixado em branco">
        <Input {...register('aul_nome')} placeholder="Ex: Funcional Seg 17:00" disabled={busy} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : aula ? 'Salvar Alterações' : 'Criar Aula'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function AulasPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)
  const [filtroMod, setFiltroMod] = useState('all')
  const [filtroTur, setFiltroTur] = useState('all')

  const filters = {
    ...(filtroMod !== 'all' ? { aul_modalidade: filtroMod } : {}),
    ...(filtroTur !== 'all' ? { tur: filtroTur } : {}),
  }

  const { data, isLoading, page, setPage, totalPages, count } = useList(KEY, ENDPOINT, filters)
  const { data: turmas }       = useList('turmas', '/turmas/', {}, { pageSize: 200 })
  const { data: funcionarios } = useList('funcionarios', '/funcionarios/', {}, { pageSize: 200 })
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Aula excluída.' })

  const columns = [
    {
      key: 'aul_data', header: 'Data',
      render: r => (
        <div>
          <p className="font-medium">{new Date(r.aul_data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">{r.aul_hora_inicio?.slice(0, 5)}{r.aul_hora_final ? ` – ${r.aul_hora_final.slice(0, 5)}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'tur_nome', header: 'Turma',
      render: r => <span className="font-medium">{r.tur_nome}</span>,
    },
    {
      key: 'aul_modalidade', header: 'Modalidade',
      render: r => (
        <Badge variant={MODALIDADE_VARIANT[r.aul_modalidade] || 'default'}>
          {MODALIDADES.find(m => m.value === r.aul_modalidade)?.label || r.aul_modalidade}
        </Badge>
      ),
    },
    {
      key: 'func_nome', header: 'Professor',
      render: r => <span className="text-sm text-muted-foreground">{r.func_nome || '—'}</span>,
    },
    {
      key: 'stats', header: 'Presença',
      render: r => (
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle className="w-3.5 h-3.5" />{r.total_presentes}
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <XCircle className="w-3.5 h-3.5" />{r.total_faltas}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-3.5 h-3.5" />{r.total_registros}
          </span>
        </div>
      ),
    },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: r => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.aul_id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aulas"
        description="Histórico de aulas coletivas ministradas"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Nova Aula</Button>}
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <Select value={filtroMod} onValueChange={v => { setFiltroMod(v); setPage(1) }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Modalidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas modalidades</SelectItem>
                {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filtroTur} onValueChange={v => { setFiltroTur(v); setPage(1) }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Turma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {turmas?.map(t => <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhuma aula registrada." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {selected ? 'Editar Aula' : 'Nova Aula'}
            </DialogTitle>
          </DialogHeader>
          <AulaForm
            aula={selected}
            turmas={turmas}
            funcionarios={funcionarios}
            onClose={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Aula"
        description="Tem certeza? Os registros de presença vinculados perderão o vínculo com esta aula."
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
