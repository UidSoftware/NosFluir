import { useState } from 'react'
import { ListTodo, Trash2, Clock, Calendar, CalendarDays, Plus, X, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useList, useDelete, fetchAll } from '@/hooks/useApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Spinner } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatDateTime, cn } from '@/lib/utils'
import api from '@/services/api'

// ── Aba genérica (Horários / Turmas) ───────────────────────────────────────
function TabContent({ endpoint, keyName, columns, emptyMessage }) {
  const [deleteId, setDeleteId] = useState(null)
  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(keyName, endpoint)
  const del = useDelete(keyName, endpoint, { successMsg: 'Agendamento excluído.' })

  const allColumns = [
    ...columns,
    {
      key: 'acoes', header: '', cellClassName: 'w-16',
      render: (r) => (
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.id)}
            className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <SearchFilter placeholder="Buscar..." onSearch={q => setFilters(q ? { search: q } : {})} />
      <DataTable columns={allColumns} data={data} isLoading={isLoading} emptyMessage={emptyMessage} />
      <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Agendamento"
        description="Tem certeza que deseja excluir este agendamento?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}

const HORARIOS_COLS = [
  { key: 'alu_nome',                  header: 'Aluno',      render: r => <span className="font-medium">{r.alu_nome || '—'}</span> },
  { key: 'agho_dias_disponiveis',     header: 'Dias',       render: r => r.agho_dias_disponiveis || '—' },
  { key: 'agho_horarios_disponiveis', header: 'Horários',   render: r => r.agho_horarios_disponiveis || '—' },
  { key: 'created',                   header: 'Enviado em', render: r => formatDateTime(r.created_at) },
]
const TURMAS_COLS = [
  { key: 'alu_nome',                  header: 'Aluno',      render: r => <span className="font-medium">{r.alu_nome || '—'}</span> },
  { key: 'agtu_dias_disponiveis',     header: 'Dias',       render: r => r.agtu_dias_disponiveis || '—' },
  { key: 'agtu_horarios_disponiveis', header: 'Horários',   render: r => r.agtu_horarios_disponiveis || '—' },
  { key: 'agtu_nivelamento',          header: 'Nível',      render: r => r.agtu_nivelamento || '—' },
  { key: 'created',                   header: 'Enviado em', render: r => formatDateTime(r.created_at) },
]

// ── Aba Grade de Horários (estilo barbearia) ──────────────────────────────
const DIAS = [
  { id: 'seg', label: 'Segunda' },
  { id: 'ter', label: 'Terça'   },
  { id: 'qua', label: 'Quarta'  },
  { id: 'qui', label: 'Quinta'  },
  { id: 'sex', label: 'Sexta'   },
]
const HORAS = [
  '06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00',
]
const MOD_CONFIG = {
  pilates:  { label: 'Pilates',   cls: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  funcional:{ label: 'Funcional', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  ambos:    { label: 'Ambos',     cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
}

// Mini form para criar slot ao clicar em célula vazia
function SlotCreateForm({ dia, hora, onClose, onSaved }) {
  const qc = useQueryClient()
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: { slot_modalidade: '__none__', slot_vagas: 2 },
  })
  const [busy, setBusy] = useState(false)

  const onSubmit = async (data) => {
    const modalidade = data.slot_modalidade !== '__none__' ? data.slot_modalidade : null
    if (!modalidade) { toast({ title: 'Selecione a modalidade.', variant: 'destructive' }); return }
    setBusy(true)
    try {
      await api.post('/slots-experimentais/', {
        slot_dia_semana: dia, slot_hora: hora,
        slot_modalidade: modalidade, slot_vagas: parseInt(data.slot_vagas), slot_ativo: true,
      })
      qc.invalidateQueries({ queryKey: ['slots-grade'] })
      toast({ title: 'Slot criado.', variant: 'success' })
      onSaved?.()
      onClose()
    } catch (err) {
      const d = err.response?.data
      toast({ title: d ? Object.values(d).flat().join(' ') : 'Erro ao criar slot.', variant: 'destructive' })
    } finally { setBusy(false) }
  }

  const diaLabel = DIAS.find(d => d.id === dia)?.label || dia

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{diaLabel}</span> às <span className="font-medium text-foreground">{hora}</span>
      </p>
      <FormField label="Modalidade *">
        <Select value={watch('slot_modalidade')} onValueChange={v => setValue('slot_modalidade', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            <SelectItem value="pilates">Mat Pilates</SelectItem>
            <SelectItem value="funcional">Funcional</SelectItem>
            <SelectItem value="ambos">Ambos</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Vagas">
        <Input type="number" min={1} max={10} {...register('slot_vagas')} disabled={busy} />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner className="mr-2" /> : null}Ativar horário
        </Button>
      </DialogFooter>
    </form>
  )
}

// Mini form para editar slot existente
function SlotEditForm({ slot, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit } = useForm({
    defaultValues: { slot_vagas: slot.slot_vagas },
  })
  const [busy, setBusy] = useState(false)

  const onSave = async (data) => {
    setBusy(true)
    try {
      await api.patch(`/slots-experimentais/${slot.slot_id}/`, { slot_vagas: parseInt(data.slot_vagas) })
      qc.invalidateQueries({ queryKey: ['slots-grade'] })
      toast({ title: 'Vagas atualizadas.', variant: 'success' })
      onClose()
    } catch { toast({ title: 'Erro ao salvar.', variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  const onDelete = async () => {
    setBusy(true)
    try {
      await api.delete(`/slots-experimentais/${slot.slot_id}/`)
      qc.invalidateQueries({ queryKey: ['slots-grade'] })
      toast({ title: 'Slot removido.', variant: 'success' })
      onClose()
    } catch { toast({ title: 'Erro ao remover.', variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  const diaLabel = DIAS.find(d => d.id === slot.slot_dia_semana)?.label || slot.slot_dia_semana
  const mod = MOD_CONFIG[slot.slot_modalidade]

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4 py-2">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${mod?.cls}`}>{mod?.label}</span>
        <span className="text-sm text-muted-foreground">{diaLabel} às {slot.slot_hora?.slice(0,5)}</span>
      </div>
      <FormField label="Vagas">
        <Input type="number" min={1} max={10} {...register('slot_vagas')} disabled={busy} />
      </FormField>
      <DialogFooter className="flex gap-2 justify-between sm:justify-between">
        <Button type="button" variant="ghost" size="sm" className="text-red-400 hover:text-red-300"
          onClick={onDelete} disabled={busy}>
          Remover slot
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner className="mr-2" /> : null}Salvar
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

function TabGrade() {
  const qc = useQueryClient()
  const [cellModal, setCellModal] = useState(null) // { dia, hora, slot? }

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['slots-grade'],
    queryFn:  () => fetchAll('/slots-experimentais/'),
  })

  // Mapa: 'seg-07:00-pilates' → slot
  const slotMap = {}
  slots.forEach(s => {
    const hora = s.slot_hora?.slice(0, 5)
    const key  = `${s.slot_dia_semana}-${hora}-${s.slot_modalidade}`
    slotMap[key] = s
  })

  // Slots ativos por célula (dia+hora), qualquer modalidade
  const getSlotsForCell = (dia, hora) =>
    slots.filter(s => s.slot_dia_semana === dia && s.slot_hora?.slice(0,5) === hora)

  const handleToggle = async (slot) => {
    try {
      await api.patch(`/slots-experimentais/${slot.slot_id}/`, { slot_ativo: !slot.slot_ativo })
      qc.invalidateQueries({ queryKey: ['slots-grade'] })
    } catch { toast({ title: 'Erro ao atualizar slot.', variant: 'destructive' }) }
  }

  const handleCellClick = (dia, hora, existingSlots) => {
    // Se tem slots, abre o primeiro para edição (ou permite criar novo)
    // Se não tem, abre form de criação
    setCellModal({ dia, hora, slots: existingSlots })
  }

  const modalTitle = cellModal
    ? cellModal.slots?.length
      ? `${DIAS.find(d=>d.id===cellModal.dia)?.label} ${cellModal.hora} — Gerenciar`
      : `Ativar horário`
    : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Clique em uma célula vazia para ativar um horário. Clique nos badges para alternar ativo/inativo ou editar vagas.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-fluir-dark-2/60">
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-16">Hora</th>
              {DIAS.map(d => (
                <th key={d.id} className="px-2 py-2.5 text-center text-xs font-medium text-muted-foreground min-w-[110px]">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">Carregando...</td></tr>
            ) : HORAS.map(hora => (
              <tr key={hora} className="border-t border-border/40 hover:bg-fluir-dark-2/20 transition-colors">
                <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums font-mono">{hora}</td>
                {DIAS.map(dia => {
                  const cell = getSlotsForCell(dia.id, hora)
                  return (
                    <td key={dia.id} className="px-2 py-1.5 text-center align-middle">
                      <div className="flex flex-wrap gap-1 justify-center items-center min-h-[28px]">
                        {cell.map(slot => {
                          const mod = MOD_CONFIG[slot.slot_modalidade]
                          return (
                            <div key={slot.slot_id} className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleToggle(slot)}
                                title={`${slot.slot_ativo ? 'Desativar' : 'Ativar'} — ${mod?.label}`}
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-xs font-medium border transition-all',
                                  slot.slot_ativo ? mod?.cls : 'bg-gray-800/60 text-gray-500 border-gray-700/40 line-through',
                                )}
                              >
                                {mod?.label?.slice(0, 3)} {slot.slot_ativo ? `·${slot.slot_vagas}` : ''}
                              </button>
                              <button
                                onClick={() => setCellModal({ dia: dia.id, hora, editSlot: slot })}
                                title="Editar vagas"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )
                        })}
                        <button
                          onClick={() => setCellModal({ dia: dia.id, hora, slots: cell })}
                          title="Adicionar horário"
                          className="text-muted-foreground/40 hover:text-fluir-purple transition-colors rounded p-0.5"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(MOD_CONFIG).map(([k, v]) => (
          <span key={k} className={`px-2 py-0.5 rounded border ${v.cls}`}>{v.label}</span>
        ))}
        <span className="px-2 py-0.5 rounded border bg-gray-800/60 text-gray-500 border-gray-700/40 line-through">Inativo</span>
        <span className="ml-2">· {slots.filter(s => s.slot_ativo).length} horários ativos</span>
      </div>

      {/* Modal criar slot */}
      <Dialog
        open={!!cellModal && !cellModal.editSlot}
        onOpenChange={v => { if (!v) setCellModal(null) }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ativar horário</DialogTitle></DialogHeader>
          {cellModal && !cellModal.editSlot && (
            <SlotCreateForm dia={cellModal.dia} hora={cellModal.hora} onClose={() => setCellModal(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal editar slot */}
      <Dialog
        open={!!cellModal?.editSlot}
        onOpenChange={v => { if (!v) setCellModal(null) }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar slot</DialogTitle></DialogHeader>
          {cellModal?.editSlot && (
            <SlotEditForm slot={cellModal.editSlot} onClose={() => setCellModal(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
const TABS = [
  { id: 'horarios', label: 'Horários',          icon: Clock },
  { id: 'turmas',   label: 'Turmas',            icon: Calendar },
  { id: 'grade',    label: 'Grade de Horários', icon: CalendarDays },
]

export default function AgendamentosPage() {
  const [activeTab, setActiveTab] = useState('horarios')

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agendamentos"
        description="Solicitações do site e controle de horários para aulas experimentais"
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex gap-1 bg-fluir-dark-3 rounded-lg p-1 w-fit flex-wrap">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors',
                  activeTab === t.id ? 'bg-fluir-purple text-white' : 'text-muted-foreground hover:text-foreground'
                )}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>

          {activeTab === 'horarios' && (
            <TabContent endpoint="/agendamentos-horario/" keyName="ag-horarios" columns={HORARIOS_COLS}
              emptyMessage="Nenhum agendamento de horário recebido." />
          )}
          {activeTab === 'turmas' && (
            <TabContent endpoint="/agendamentos-turmas/" keyName="ag-turmas" columns={TURMAS_COLS}
              emptyMessage="Nenhum agendamento de turma recebido." />
          )}
          {activeTab === 'grade' && <TabGrade />}
        </CardContent>
      </Card>
    </div>
  )
}
