import { useState } from 'react'
import { Bell, Plus, CheckCircle2, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { useList, useCreate, useDelete, fetchAll } from '@/hooks/useApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Spinner } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime } from '@/lib/utils'
import api from '@/services/api'

const KEY      = 'avisos-falta'
const ENDPOINT = '/avisos-falta/'

const TIPO_LABELS = {
  justificada: 'Justificada',
  atestado: 'Atestado Médico',
}

function AvisoForm({ onClose }) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      aluno: '__none__',
      turma: '__none__',
      avi_data_hora_aviso: new Date().toISOString().slice(0, 16),
      avi_data_aula: new Date().toISOString().slice(0, 10),
      avi_tipo: '__none__',
      avi_observacoes: '',
    },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })

  const { data: alunos } = useQuery({
    queryKey: ['alunos-all'],
    queryFn: () => fetchAll('/alunos/'),
  })
  const { data: turmas } = useQuery({
    queryKey: ['turmas-all'],
    queryFn: () => fetchAll('/turmas/'),
  })

  const onSubmit = (data) => {
    const alunoId = data.aluno !== '__none__' ? parseInt(data.aluno) : null
    const turmaId = data.turma !== '__none__' ? parseInt(data.turma) : null
    const tipo    = data.avi_tipo !== '__none__' ? data.avi_tipo : null

    if (!alunoId) { toast({ title: 'Selecione o aluno.', variant: 'destructive' }); return }
    if (!turmaId) { toast({ title: 'Selecione a turma.', variant: 'destructive' }); return }
    if (!tipo)    { toast({ title: 'Selecione o tipo.', variant: 'destructive' }); return }
    if (!data.avi_data_hora_aviso) { toast({ title: 'Informe quando o aluno avisou.', variant: 'destructive' }); return }
    if (!data.avi_data_aula)       { toast({ title: 'Informe a data da aula.', variant: 'destructive' }); return }

    create.mutate({
      aluno: alunoId,
      turma: turmaId,
      avi_data_hora_aviso: data.avi_data_hora_aviso,
      avi_data_aula: data.avi_data_aula,
      avi_tipo: tipo,
      avi_observacoes: data.avi_observacoes || null,
    })
  }

  const busy = create.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <FormField label="Aluno *">
        <Select value={watch('aluno')} onValueChange={v => setValue('aluno', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {alunos?.map(a => (
              <SelectItem key={a.alu_id} value={String(a.alu_id)}>{a.alu_nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Turma *">
        <Select value={watch('turma')} onValueChange={v => setValue('turma', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {turmas?.map(t => (
              <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome} — {t.tur_horario}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Data da Aula *">
        <Input type="date" {...register('avi_data_aula')} disabled={busy} />
      </FormField>

      <FormField label="Quando o aluno avisou? *">
        <Input type="datetime-local" {...register('avi_data_hora_aviso')} disabled={busy} />
      </FormField>

      <FormField label="Tipo *">
        <Select value={watch('avi_tipo')} onValueChange={v => setValue('avi_tipo', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            <SelectItem value="justificada">Justificada</SelectItem>
            <SelectItem value="atestado">Atestado Médico</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Observações">
        <textarea
          {...register('avi_observacoes')}
          disabled={busy}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Opcional..."
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner className="mr-2" /> : null}
          Registrar Aviso
        </Button>
      </DialogFooter>
    </form>
  )
}

const COLUMNS = [
  {
    key: 'alu_nome', header: 'Aluno',
    render: r => <span className="font-medium">{r.alu_nome || '—'}</span>,
  },
  {
    key: 'tur_nome', header: 'Turma',
    render: r => r.tur_nome || '—',
  },
  {
    key: 'avi_data_aula', header: 'Data da Aula',
    render: r => formatDate(r.avi_data_aula),
  },
  {
    key: 'avi_tipo', header: 'Tipo',
    render: r => TIPO_LABELS[r.avi_tipo] || r.avi_tipo,
  },
  {
    key: 'avi_antecedencia_horas', header: 'Antecedência',
    render: r => r.avi_antecedencia_horas != null
      ? `${Number(r.avi_antecedencia_horas).toFixed(1)}h`
      : '—',
  },
  {
    key: 'avi_gera_credito', header: 'Crédito',
    render: r => r.avi_gera_credito
      ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 size={13} />Gerou</span>
      : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={13} />Não gerou</span>,
  },
  {
    key: 'avi_data_hora_aviso', header: 'Aviso em',
    render: r => formatDateTime(r.avi_data_hora_aviso),
  },
]

export default function AvisosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Aviso excluído.' })

  const columns = [
    ...COLUMNS,
    {
      key: 'acoes', header: '', cellClassName: 'w-16',
      render: (r) => (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost" size="icon-sm"
            onClick={() => setDeleteId(r.id)}
            className="text-red-400 hover:text-red-300"
            title="Excluir aviso"
          >
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Avisos de Falta"
        description="Registro de avisos de falta dos alunos — gera crédito de reposição automaticamente"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />Nova Falta
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <Input
              type="date"
              className="w-44"
              placeholder="Data da aula"
              onChange={e => setFilters(f => ({ ...f, avi_data_aula: e.target.value || undefined }))}
            />
            <Select
              onValueChange={v => setFilters(f => ({ ...f, avi_tipo: v !== 'all' ? v : undefined }))}
              defaultValue="all"
            >
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="justificada">Justificada</SelectItem>
                <SelectItem value="atestado">Atestado Médico</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={v => setFilters(f => ({
                ...f,
                avi_gera_credito: v !== 'all' ? v : undefined,
              }))}
              defaultValue="all"
            >
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Gerou crédito</SelectItem>
                <SelectItem value="false">Não gerou crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum aviso registrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Aviso de Falta</DialogTitle></DialogHeader>
          <AvisoForm onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Aviso"
        description="Tem certeza? Se um crédito foi gerado por este aviso, ele não será removido automaticamente."
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
