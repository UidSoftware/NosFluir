import { useState } from 'react'
import { FlaskConical, Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useList, useCreate, useUpdate, useDelete, fetchAll } from '@/hooks/useApi'
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

const KEY      = 'slots-experimentais'
const ENDPOINT = '/slots-experimentais/'

const DIA_LABELS = {
  seg: 'Segunda-feira', ter: 'Terça-feira', qua: 'Quarta-feira',
  qui: 'Quinta-feira', sex: 'Sexta-feira',
}
const MODALIDADE_LABELS = { pilates: 'Mat Pilates', funcional: 'Funcional', ambos: 'Ambos' }

function SlotForm({ initial, onClose }) {
  const isEdit = !!initial
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      slot_dia_semana: initial?.slot_dia_semana || '__none__',
      slot_hora: initial?.slot_hora?.slice(0, 5) || '',
      slot_modalidade: initial?.slot_modalidade || 'ambos',
      slot_vagas: initial?.slot_vagas ?? 2,
      slot_ativo: initial?.slot_ativo ?? true,
    },
  })

  const create = useCreate(KEY, ENDPOINT, { successMsg: 'Slot criado.', onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { successMsg: 'Slot atualizado.', onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const dia = data.slot_dia_semana
    if (!dia || dia === '__none__') { toast({ title: 'Selecione o dia.', variant: 'destructive' }); return }
    if (!data.slot_hora) { toast({ title: 'Informe o horário.', variant: 'destructive' }); return }

    const payload = {
      slot_dia_semana: dia,
      slot_hora: data.slot_hora,
      slot_modalidade: data.slot_modalidade,
      slot_vagas: parseInt(data.slot_vagas),
      slot_ativo: data.slot_ativo === true || data.slot_ativo === 'true',
    }
    if (isEdit) update.mutate({ id: initial.slot_id, data: payload })
    else create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <FormField label="Dia da Semana *">
        <Select value={watch('slot_dia_semana')} onValueChange={v => setValue('slot_dia_semana', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {Object.entries(DIA_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Horário *">
        <Input type="time" {...register('slot_hora')} disabled={busy} />
      </FormField>

      <FormField label="Modalidade *">
        <Select value={watch('slot_modalidade')} onValueChange={v => setValue('slot_modalidade', v)} disabled={busy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pilates">Mat Pilates</SelectItem>
            <SelectItem value="funcional">Funcional</SelectItem>
            <SelectItem value="ambos">Ambos</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Vagas disponíveis *">
        <Input type="number" min={1} max={10} {...register('slot_vagas')} disabled={busy} />
      </FormField>

      <FormField label="Ativo">
        <Select value={String(watch('slot_ativo'))} onValueChange={v => setValue('slot_ativo', v === 'true')} disabled={busy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Sim</SelectItem>
            <SelectItem value="false">Não</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner className="mr-2" /> : null}
          {isEdit ? 'Salvar' : 'Criar Slot'}
        </Button>
      </DialogFooter>
    </form>
  )
}

const COLUMNS = [
  {
    key: 'slot_dia_semana', header: 'Dia',
    render: r => DIA_LABELS[r.slot_dia_semana] || r.slot_dia_semana,
  },
  {
    key: 'slot_hora', header: 'Horário',
    render: r => r.slot_hora?.slice(0, 5) || '—',
  },
  {
    key: 'slot_modalidade', header: 'Modalidade',
    render: r => MODALIDADE_LABELS[r.slot_modalidade] || r.slot_modalidade,
  },
  {
    key: 'slot_vagas', header: 'Vagas',
    render: r => (
      <span>
        {r.vagas_disponiveis} / {r.slot_vagas}
        {r.vagas_disponiveis === 0 && (
          <span className="ml-1.5 text-xs text-red-400 font-medium">cheio</span>
        )}
      </span>
    ),
  },
  {
    key: 'slot_ativo', header: 'Ativo',
    render: r => r.slot_ativo
      ? <span className="text-xs text-emerald-400 font-medium">Sim</span>
      : <span className="text-xs text-muted-foreground">Não</span>,
  },
]

export default function SlotsExperimentaisPage() {
  const [modal, setModal]    = useState(null) // null | 'new' | row
  const [deleteId, setDeleteId] = useState(null)

  const { data, isLoading, page, setPage, totalPages, count } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Slot excluído.' })

  const columns = [
    ...COLUMNS,
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setModal(r)} title="Editar slot">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon-sm"
            onClick={() => setDeleteId(r.slot_id)}
            className="text-red-400 hover:text-red-300"
            title="Excluir slot"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Slots Experimentais"
        description="Horários disponíveis para agendamento de aulas experimentais"
        actions={
          <Button onClick={() => setModal('new')}>
            <Plus className="w-4 h-4 mr-1.5" />Novo Slot
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5 space-y-4">
          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            emptyMessage="Nenhum slot cadastrado. Crie um slot para receber agendamentos experimentais."
          />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={!!modal} onOpenChange={v => { if (!v) setModal(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{modal === 'new' ? 'Novo Slot Experimental' : 'Editar Slot'}</DialogTitle>
          </DialogHeader>
          {modal && (
            <SlotForm
              initial={modal === 'new' ? null : modal}
              onClose={() => setModal(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Slot"
        description="Tem certeza? Agendamentos vinculados serão afetados."
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
