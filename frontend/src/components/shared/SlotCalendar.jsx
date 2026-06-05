import { useState } from 'react'
import { cn } from '@/lib/utils'

const DOW_DIA  = { 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex' }
const MES_PT   = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

const isoLocal = (dt) =>
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
      sem.push({ iso: isoLocal(dt), dt, dia: DOW_DIA[dt.getDay()] })
    }
    out.push(sem)
  }
  return out
}

const MOD_LABELS = { pilates: 'Mat Pilates', funcional: 'Funcional', ambos: 'Ambos' }
const MOD_CLS    = {
  pilates:  'bg-purple-500/20 text-purple-300 border-purple-500/40',
  funcional:'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  ambos:    'bg-slate-500/20 text-slate-300 border-slate-500/40',
}

/**
 * SlotCalendar — calendário de slots de agendamento reutilizável.
 *
 * Props:
 *  - slots           : array de slots (com slot_dia_semana, slot_hora, slot_modalidade, vagas_disponiveis, slot_id)
 *  - slotIdSelecionado : id do slot atualmente selecionado (string ou number)
 *  - dataAtual       : data selecionada (ISO 'YYYY-MM-DD')
 *  - onSelect        : fn(slot, iso) chamada ao selecionar horário
 *  - semanas         : número de semanas a exibir (default 4)
 *  - emptyMessage    : mensagem quando não há slots
 */
export function SlotCalendar({ slots, slotIdSelecionado, dataAtual, onSelect, semanas = 4, emptyMessage }) {
  const [diaFoco, setDiaFoco] = useState(null)

  const byDia = {}
  slots.forEach(s => {
    if (!byDia[s.slot_dia_semana]) byDia[s.slot_dia_semana] = []
    byDia[s.slot_dia_semana].push(s)
  })

  const grid    = gerarSemanas(semanas)
  const hojeStr = isoLocal(new Date())

  const slotsFoco = diaFoco
    ? (byDia[DOW_DIA[new Date(diaFoco + 'T00:00').getDay()]] || [])
    : []

  const meses = [...new Set(grid.flat().map(c => c.dt.getMonth()))].map(m => MES_PT[m]).join(' / ')

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-fluir-dark-2/60 px-3 py-1.5 text-xs text-muted-foreground font-medium">{meses}</div>
        <div className="grid grid-cols-5 border-b border-border/50">
          {['Seg','Ter','Qua','Qui','Sex'].map(d => (
            <div key={d} className="text-center text-xs text-muted-foreground py-1.5 font-medium">{d}</div>
          ))}
        </div>

        {grid.map((sem, wi) => (
          <div key={wi} className="grid grid-cols-5 border-t border-border/30">
            {sem.map(({ iso, dt, dia }) => {
              const temSlot = (byDia[dia] || []).length > 0
              const isPast  = iso < hojeStr
              const isFoco  = diaFoco === iso
              const temSel  = dataAtual === iso
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={!temSlot || isPast}
                  onClick={() => setDiaFoco(isFoco ? null : iso)}
                  className={cn(
                    'relative py-2 text-center text-sm transition-colors',
                    isPast    ? 'text-muted-foreground/20 cursor-not-allowed' :
                    !temSlot  ? 'text-muted-foreground/30 cursor-not-allowed' :
                    isFoco    ? 'bg-fluir-purple text-white font-semibold' :
                    temSel    ? 'bg-fluir-purple/20 text-fluir-purple font-semibold' :
                    'text-foreground hover:bg-fluir-purple/15 cursor-pointer font-medium',
                  )}
                >
                  {dt.getDate()}
                  {temSlot && !isPast && !isFoco && (
                    <span className={cn(
                      'absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                      temSel ? 'bg-fluir-purple' : 'bg-fluir-purple/50',
                    )} />
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
              const isSel = String(slot.slot_id) === String(slotIdSelecionado) && dataAtual === diaFoco
              return (
                <button
                  key={slot.slot_id}
                  type="button"
                  onClick={() => onSelect(slot, diaFoco)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all',
                    isSel
                      ? 'bg-fluir-purple text-white border-fluir-purple'
                      : 'border-border hover:border-fluir-purple/50 hover:bg-fluir-purple/10',
                  )}
                >
                  <span className="font-medium tabular-nums">{slot.slot_hora?.slice(0,5)}</span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded border', MOD_CLS[slot.slot_modalidade])}>
                    {MOD_LABELS[slot.slot_modalidade]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {slot.vagas_disponiveis} vaga{slot.vagas_disponiveis > 1 ? 's' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {slots.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          {emptyMessage || 'Nenhum horário ativo.'}
        </p>
      )}
    </div>
  )
}
