import { useState } from 'react'
import { ListTodo, Trash2, Clock, Calendar, CalendarDays, Plus, X, Pencil, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useList, useCreate, useDelete, fetchAll } from '@/hooks/useApi'
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

// ── Calendário de slots (compartilhado com Novo Agendamento) ──────────────
const KEY_AGE   = 'agendamento-experimental'
const MOD_LABELS_AG = { pilates: 'Mat Pilates', funcional: 'Funcional', ambos: 'Ambos' }
const MOD_CLS_AG    = {
  pilates:  'bg-purple-500/20 text-purple-300 border-purple-500/40',
  funcional:'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  ambos:    'bg-slate-500/20 text-slate-300 border-slate-500/40',
}
const DOW_DIA_AG = { 1:'seg', 2:'ter', 3:'qua', 4:'qui', 5:'sex' }
const MES_PT_AG  = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

const isoLocalAg = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`

function gerarSemanas(n) {
  const hoje = new Date()
  const dow  = hoje.getDay()
  const seg  = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (dow === 0 ? 6 : dow - 1))
  const out  = []
  for (let w = 0; w < n; w++) {
    const sem = []
    for (let d = 0; d < 5; d++) {
      const dt = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + w * 7 + d)
      sem.push({ iso: isoLocalAg(dt), dt, dia: DOW_DIA_AG[dt.getDay()] })
    }
    out.push(sem)
  }
  return out
}

function SlotCalendar({ slots, slotIdSel, dataAtual, onSelect }) {
  const [diaFoco, setDiaFoco] = useState(null)
  const byDia = {}
  slots.forEach(s => { if (!byDia[s.slot_dia_semana]) byDia[s.slot_dia_semana] = []; byDia[s.slot_dia_semana].push(s) })
  const semanas = gerarSemanas(4)
  const hojeStr = isoLocalAg(new Date())
  const slotsFoco = diaFoco ? (byDia[DOW_DIA_AG[new Date(diaFoco + 'T00:00').getDay()]] || []) : []
  const meses = [...new Set(semanas.flat().map(c => c.dt.getMonth()))].map(m => MES_PT_AG[m]).join(' / ')

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-fluir-dark-2/60 px-3 py-1.5 text-xs text-muted-foreground font-medium">{meses}</div>
        <div className="grid grid-cols-5 border-b border-border/50">
          {['Seg','Ter','Qua','Qui','Sex'].map(d => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1.5 font-medium">{d}</div>
          ))}
        </div>
        {semanas.map((sem, wi) => (
          <div key={wi} className="grid grid-cols-5 border-t border-border/30">
            {sem.map(({ iso, dt, dia }) => {
              const temSlot = (byDia[dia] || []).length > 0
              const isPast  = iso < hojeStr
              const isFoco  = diaFoco === iso
              const temSel  = dataAtual === iso
              return (
                <button key={iso} type="button" disabled={!temSlot || isPast}
                  onClick={() => setDiaFoco(isFoco ? null : iso)}
                  className={cn(
                    'relative py-2 text-center text-sm transition-colors',
                    isPast    ? 'text-muted-foreground/20 cursor-not-allowed' :
                    !temSlot  ? 'text-muted-foreground/30 cursor-not-allowed' :
                    isFoco    ? 'bg-fluir-purple text-white font-semibold' :
                    temSel    ? 'bg-fluir-purple/20 text-fluir-purple font-semibold' :
                    'text-foreground hover:bg-fluir-purple/15 cursor-pointer font-medium',
                  )}>
                  {dt.getDate()}
                  {temSlot && !isPast && !isFoco && (
                    <span className={cn('absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full', temSel ? 'bg-fluir-purple' : 'bg-fluir-purple/50')} />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      {diaFoco && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {new Date(diaFoco + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          <div className="flex flex-wrap gap-2">
            {slotsFoco.map(slot => {
              const isSel = String(slot.slot_id) === String(slotIdSel) && dataAtual === diaFoco
              return (
                <button key={slot.slot_id} type="button" onClick={() => onSelect(slot, diaFoco)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all',
                    isSel ? 'bg-fluir-purple text-white border-fluir-purple'
                          : 'border-border hover:border-fluir-purple/50 hover:bg-fluir-purple/10',
                  )}>
                  <span className="font-medium tabular-nums">{slot.slot_hora?.slice(0,5)}</span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded border', MOD_CLS_AG[slot.slot_modalidade])}>
                    {MOD_LABELS_AG[slot.slot_modalidade]}
                  </span>
                  <span className="text-xs text-muted-foreground">{slot.vagas_disponiveis} vaga{slot.vagas_disponiveis > 1 ? 's' : ''}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {slots.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhum horário ativo — use a <strong>Grade de Horários</strong> para configurar.</p>}
    </div>
  )
}

function NovoAgendamentoExpForm({ onClose }) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      slot_id: null, age_nome: '', age_telefone: '', age_nascimento: '',
      age_modalidade: '__none__', age_disponibilidade: '', age_problema_saude: '',
      age_data_agendada: '', age_hora_agendada: '',
    },
  })
  const create = useCreate(KEY_AGE, `/${KEY_AGE}/`, { successMsg: 'Agendamento criado.', onSuccess: onClose })
  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['slots-disponiveis'],
    queryFn:  () => fetchAll('/slots-experimentais/'),
    select:   (all) => all.filter(s => s.slot_ativo && s.vagas_disponiveis > 0),
  })
  const slotId  = watch('slot_id')
  const dataAg  = watch('age_data_agendada')
  const slotSel = slots.find(s => s.slot_id === slotId)
  const busy    = create.isPending

  const handleSlotSelect = (slot, data) => {
    setValue('slot_id',           slot.slot_id)
    setValue('age_data_agendada', data)
    setValue('age_hora_agendada', slot.slot_hora?.slice(0,5) || '')
    if (slot.slot_modalidade !== 'ambos') setValue('age_modalidade', slot.slot_modalidade)
    else setValue('age_modalidade', '__none__')
  }

  const onSubmit = (data) => {
    const modalidade = data.age_modalidade !== '__none__' ? data.age_modalidade : null
    if (!data.slot_id)             { toast({ title: 'Selecione um horário no calendário.', variant: 'destructive' }); return }
    if (!data.age_nome.trim())     { toast({ title: 'Informe o nome.', variant: 'destructive' }); return }
    if (!data.age_telefone.trim()) { toast({ title: 'Informe o telefone.', variant: 'destructive' }); return }
    if (!data.age_nascimento)      { toast({ title: 'Informe a data de nascimento.', variant: 'destructive' }); return }
    if (!modalidade)               { toast({ title: 'Selecione a modalidade.', variant: 'destructive' }); return }
    create.mutate({
      slot: data.slot_id, age_nome: data.age_nome.trim(), age_telefone: data.age_telefone.trim(),
      age_nascimento: data.age_nascimento, age_modalidade: modalidade,
      age_disponibilidade: data.age_disponibilidade || null,
      age_problema_saude:  data.age_problema_saude  || null,
      age_data_agendada: data.age_data_agendada, age_hora_agendada: data.age_hora_agendada,
      age_origem: 'sistema',
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {loadingSlots ? 'Carregando horários...' : 'Selecione um dia disponível *'}
        </p>
        {!loadingSlots && <SlotCalendar slots={slots} slotIdSel={slotId} dataAtual={dataAg} onSelect={handleSlotSelect} />}
        {slotSel && dataAg && (
          <p className="text-xs text-emerald-400 mt-2">
            ✓ {new Date(dataAg + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
            {' '}às {slotSel.slot_hora?.slice(0,5)} — {MOD_LABELS_AG[slotSel.slot_modalidade]}
          </p>
        )}
      </div>
      {slotSel?.slot_modalidade === 'ambos' && (
        <FormField label="Modalidade da aula *">
          <Select value={watch('age_modalidade')} onValueChange={v => setValue('age_modalidade', v)} disabled={busy}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
              <SelectItem value="pilates">Mat Pilates</SelectItem>
              <SelectItem value="funcional">Funcional</SelectItem>
              <SelectItem value="ambos">Ambos</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      )}
      {slotSel && <FormField label="Confirmar data *"><Input type="date" {...register('age_data_agendada')} disabled={busy} /></FormField>}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nome completo *" className="col-span-2"><Input {...register('age_nome')} disabled={busy} placeholder="Nome do prospecto" /></FormField>
        <FormField label="Telefone *"><Input {...register('age_telefone')} disabled={busy} placeholder="(34) 9xxxx-xxxx" /></FormField>
        <FormField label="Nascimento *"><Input type="date" {...register('age_nascimento')} disabled={busy} /></FormField>
      </div>
      <FormField label="Saúde / Lesões">
        <textarea {...register('age_problema_saude')} disabled={busy} rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Doenças, lesões — conte tudo 😊" />
      </FormField>
      <FormField label="Outros horários disponíveis">
        <Input {...register('age_disponibilidade')} disabled={busy} placeholder="Ex: Segunda 18h, Sexta 7h..." />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>{busy ? <Spinner className="mr-2" /> : null}Agendar</Button>
      </DialogFooter>
    </form>
  )
}

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
  const [modalExp, setModalExp]   = useState(false)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agendamentos"
        description="Solicitações do site e controle de horários para aulas experimentais"
        actions={
          <Button onClick={() => setModalExp(true)}>
            <Sparkles className="w-4 h-4 mr-1.5" />Novo Agendamento Experimental
          </Button>
        }
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

      <Dialog open={modalExp} onOpenChange={setModalExp}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-fluir-purple" />Novo Agendamento Experimental</DialogTitle></DialogHeader>
          <NovoAgendamentoExpForm onClose={() => setModalExp(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
