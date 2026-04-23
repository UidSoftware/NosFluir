import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Activity, Play, Square, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, ClipboardList, GripVertical, ClipboardCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, FormField, Spinner } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/services/api'
import { fetchAll } from '@/hooks/useApi'

const PRESENCA_OPTS = [
  { value: 'presente',  label: 'Presente',   Icon: CheckCircle },
  { value: 'falta',     label: 'Falta',      Icon: XCircle },
  { value: 'reposicao', label: 'Reposição',  Icon: RefreshCw },
]

const FALTA_TIPOS = [
  { value: 'sem_aviso',   label: 'Sem aviso (não gera crédito)' },
  { value: 'justificada', label: 'Justificada (48h a 1h antes)' },
  { value: 'atestado',    label: 'Atestado médico' },
  { value: 'cenario3',    label: 'Aviso com mais de 48h (pendente)' },
]

const MODALIDADES = [
  { value: 'pilates',   label: '🧘 Mat Pilates' },
  { value: 'funcional', label: '💪 Funcional' },
]

function SortableExercicioLinha({ ex }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.ftex_id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <li ref={setNodeRef} style={style} className="list-none flex items-start gap-1.5">
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing shrink-0"
        title="Arrastar para reordenar"
      >
        <GripVertical size={13} />
      </button>
      <div className="flex-1 text-sm leading-snug">
        <span className="text-muted-foreground">{ex.ftex_ordem}.</span>{' '}
        <span className="font-medium">
          {ex.exe_nome}
          {ex.exe2_nome && <span className="text-fluir-cyan"> + {ex.exe2_nome}</span>}
        </span>
        {ex.apar_nome && <span className="text-muted-foreground"> · {ex.apar_nome}</span>}
        {(ex.ftex_series || ex.ftex_repeticoes) && (
          <span className="text-muted-foreground"> — {ex.ftex_series}x{ex.ftex_repeticoes}</span>
        )}
        {ex.ftex_observacoes && (
          <p className="text-xs text-muted-foreground italic ml-3">{ex.ftex_observacoes}</p>
        )}
      </div>
    </li>
  )
}

function ExerciciosFicha({ exercicios }) {
  const grupos = useMemo(() => {
    if (!exercicios) return null
    const mapa = {}
    const ordem = []
    exercicios.forEach(ex => {
      const sec = ex.ftex_secao || ''
      if (!mapa[sec]) { mapa[sec] = []; ordem.push(sec) }
      mapa[sec].push(ex)
    })
    return { grupos: ordem.map(s => ({ secao: s, itens: mapa[s] })), temSecao: exercicios.some(e => e.ftex_secao) }
  }, [exercicios])

  if (!exercicios) return <div className="flex justify-center py-3"><Spinner /></div>
  if (exercicios.length === 0) return <p className="text-xs text-muted-foreground">Nenhum exercício cadastrado nesta ficha.</p>

  const ids = exercicios.map(e => e.ftex_id)

  if (!grupos.temSecao) {
    return (
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="space-y-1.5">
          {exercicios.map(ex => <SortableExercicioLinha key={ex.ftex_id} ex={ex} />)}
        </ol>
      </SortableContext>
    )
  }

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className="space-y-3">
        {grupos.grupos.map(({ secao, itens }) => (
          <div key={secao || '__sem__'}>
            {secao && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-fluir-cyan mb-1">
                {secao}
              </p>
            )}
            <ol className="space-y-1.5">
              {itens.map(ex => <SortableExercicioLinha key={ex.ftex_id} ex={ex} />)}
            </ol>
          </div>
        ))}
      </div>
    </SortableContext>
  )
}

function ExercicioLinha({ ex }) {
  return (
    <li className="text-sm list-none">
      <span className="text-muted-foreground">{ex.ftex_ordem}.</span>{' '}
      <span className="font-medium">
        {ex.exe_nome}
        {ex.exe2_nome && <span className="text-fluir-cyan"> + {ex.exe2_nome}</span>}
      </span>
      {ex.apar_nome && <span className="text-muted-foreground"> · {ex.apar_nome}</span>}
      {(ex.ftex_series || ex.ftex_repeticoes) && (
        <span className="text-muted-foreground"> — {ex.ftex_series}x{ex.ftex_repeticoes}</span>
      )}
      {ex.ftex_observacoes && (
        <p className="text-xs text-muted-foreground italic ml-3">{ex.ftex_observacoes}</p>
      )}
    </li>
  )
}

function ExercicioEditavel({ ex, exState, onUpdateEx, ultimoReg }) {
  const series     = exState?.reg_series      ?? ''
  const repeticoes = exState?.reg_repeticoes  ?? ''
  const carga      = exState?.reg_carga       ?? ''
  const obsEx      = exState?.reg_observacoes ?? ''

  return (
    <div className="rounded-md border border-border/50 bg-fluir-dark-3 px-3 py-2 space-y-2">
      {/* Nome do exercício */}
      <p className="text-sm font-medium">
        <span className="text-muted-foreground">{ex.ftex_ordem}.</span>{' '}
        {ex.exe_nome}
        {ex.exe2_nome && <span className="text-fluir-cyan"> + {ex.exe2_nome}</span>}
        {ex.apar_nome && <span className="text-muted-foreground text-xs"> · {ex.apar_nome}</span>}
      </p>

      {/* Campos editáveis */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">Séries</label>
          <Input type="number" min="1" value={series}
            onChange={e => onUpdateEx({ reg_series: e.target.value })}
            placeholder={ex.ftex_series ?? '—'}
            className="w-full text-sm px-2 py-1 mt-0.5" />
        </div>
        <div>
          <label className="text-xs text-gray-400">Reps</label>
          <Input type="number" min="1" value={repeticoes}
            onChange={e => onUpdateEx({ reg_repeticoes: e.target.value })}
            placeholder={ex.ftex_repeticoes ?? '—'}
            className="w-full text-sm px-2 py-1 mt-0.5" />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400">Carga</label>
        <Input value={carga}
          onChange={e => onUpdateEx({ reg_carga: e.target.value })}
          placeholder="ex: 5kg, faixa amarela..."
          className="w-full text-sm px-2 py-1 mt-0.5" />
      </div>
      <div>
        <label className="text-xs text-gray-400">Obs do exercício</label>
        <textarea
          value={obsEx}
          onChange={e => onUpdateEx({ reg_observacoes: e.target.value })}
          placeholder="Observações..."
          rows={1}
          className="w-full mt-0.5 rounded-md border border-border bg-fluir-dark-2 px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-fluir-cyan resize-none"
        />
      </div>

      {/* Referência da última vez */}
      {ultimoReg && (
        <div className="rounded-md bg-fluir-dark-2/80 border border-border/30 px-2 py-1.5 text-xs text-muted-foreground">
          <span className="text-fluir-cyan font-medium">Última vez: </span>
          {ultimoReg.reg_series && <span>{ultimoReg.reg_series}x{ultimoReg.reg_repeticoes} </span>}
          {ultimoReg.reg_carga && <span>· {ultimoReg.reg_carga} </span>}
          {ultimoReg.reg_observacoes && <span className="italic">· {ultimoReg.reg_observacoes}</span>}
        </div>
      )}
    </div>
  )
}

function AlunoRow({ aluno, state, onUpdate, onUpdateExercicio, exerciciosFicha, fichaId, expandido, onToggle, modalidade, avisoExistente }) {
  const presenca      = state?.presenca      ?? 'presente'
  const faltaTipo     = state?.faltaTipo     ?? 'sem_aviso'
  const dataHoraAviso = state?.dataHoraAviso ?? new Date().toISOString().slice(0, 16)
  const pasI          = state?.pasI          ?? ''
  const padI      = state?.padI      ?? ''
  const pasF      = state?.pasF      ?? ''
  const padF      = state?.padF      ?? ''
  const fcI       = state?.fcI       ?? ''
  const fcF       = state?.fcF       ?? ''
  const pse       = state?.pse       ?? ''
  const obs       = state?.obs       ?? ''

  const { data: creditos } = useQuery({
    queryKey: ['creditos-aluno', aluno.id],
    queryFn: () => api.get('/creditos/', {
      params: { alu: aluno.id, cred_status: 'disponivel', ordering: 'cred_data_expiracao' },
    }).then(r => r.data.results),
    enabled: presenca === 'reposicao',
  })

  const { data: ultimoRegistro } = useQuery({
    queryKey: ['ultima-obs-aluno', aluno.id],
    queryFn: () => api.get('/ministrar-aula/', {
      params: { alu: aluno.id, ordering: '-miau_data', page: 1 },
    }).then(r => r.data.results?.[0] ?? null),
  })

  // Últimos registros de exercício deste aluno nesta ficha (para referência)
  const { data: ultimosExercicios } = useQuery({
    queryKey: ['ultimos-exercicios-aluno', aluno.id, fichaId],
    queryFn: () => api.get('/registro-exercicio-aluno/', {
      params: {
        'ministrar_aula__alu': aluno.id,
        'ministrar_aula__aula__fitr': fichaId,
        ordering: '-created_at',
      },
    }).then(r => {
      // Agrupa por ftex_id, pega o mais recente (ordering -created_at)
      const mapa = {}
      r.data.results.forEach(reg => {
        if (!mapa[reg.ftex]) mapa[reg.ftex] = reg
      })
      return mapa
    }),
    enabled: !!fichaId,
  })

  const proximoCredito = creditos?.[0]

  const onUpdateRef = useRef(onUpdate)
  useEffect(() => { onUpdateRef.current = onUpdate })
  useEffect(() => {
    if (presenca === 'reposicao') {
      onUpdateRef.current(aluno.id, { creditoId: proximoCredito?.cred_id ?? null })
    }
  }, [proximoCredito?.cred_id, presenca, aluno.id])

  const corNome = modalidade === 'pilates'
    ? 'text-fluir-purple'
    : modalidade === 'funcional'
    ? 'text-fluir-cyan'
    : ''

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      {/* Nome + badge aviso + botões presença — sempre visível */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            onClick={onToggle}
            className={cn('font-medium text-sm text-left flex items-center gap-1', corNome)}
          >
            {aluno.alu_nome}
            {expandido
              ? <ChevronUp size={12} className="shrink-0 opacity-50" />
              : <ChevronDown size={12} className="shrink-0 opacity-50" />}
          </button>
          {avisoExistente && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" title="Aviso de falta registrado">
              <ClipboardCheck size={10} />Avisou
            </span>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {PRESENCA_OPTS.map(o => (
            <button
              key={o.value}
              title={o.label}
              onClick={() => onUpdate(aluno.id, { presenca: o.value })}
              className={cn(
                'p-2 rounded-md transition-colors min-h-[36px]',
                presenca === o.value
                  ? o.value === 'presente'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : o.value === 'falta'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-fluir-dark-3 text-muted-foreground hover:text-foreground'
              )}
            >
              <o.Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo colapsável */}
      {expandido && <>

      {/* Tipo de falta */}
      {presenca === 'falta' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-1.5">Tipo de falta:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {FALTA_TIPOS.map(t => (
              <button
                key={t.value}
                onClick={() => onUpdate(aluno.id, { faltaTipo: t.value })}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-xs text-left transition-colors',
                  faltaTipo === t.value
                    ? 'bg-fluir-purple/20 text-fluir-purple border border-fluir-purple/30'
                    : 'bg-fluir-dark-3 text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {['justificada', 'atestado'].includes(faltaTipo) && !avisoExistente && (
            <div>
              <label className="text-xs text-gray-400">Quando o aluno avisou?</label>
              <Input
                type="datetime-local"
                value={dataHoraAviso}
                onChange={e => onUpdate(aluno.id, { dataHoraAviso: e.target.value })}
                className="w-full text-sm px-2 py-1 mt-0.5"
              />
            </div>
          )}
          {avisoExistente && ['justificada', 'atestado'].includes(faltaTipo) && (
            <p className="text-xs text-emerald-400">Aviso já registrado previamente — crédito será gerado automaticamente.</p>
          )}
        </div>
      )}

      {/* Crédito de reposição */}
      {presenca === 'reposicao' && (
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
          {proximoCredito ? (
            <p className="text-xs text-blue-300">
              Crédito a usar: gerado em {formatDate(proximoCredito.cred_data_geracao)},
              expira em {formatDate(proximoCredito.cred_data_expiracao)}
            </p>
          ) : (
            <p className="text-xs text-amber-300">Nenhum crédito disponível para este aluno.</p>
          )}
        </div>
      )}

      {/* Campos de medição — apenas para Presente */}
      {presenca === 'presente' && (
        <div className="space-y-3 mt-1">

          {/* ── Medições iniciais ── */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">PAS Inicial (mmHg)</label>
              <Input type="number" min="50" max="250" value={pasI}
                onChange={e => onUpdate(aluno.id, { pasI: e.target.value })}
                placeholder="120" className="w-full text-sm px-2 py-1 mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-400">PAD Inicial (mmHg)</label>
              <Input type="number" min="30" max="150" value={padI}
                onChange={e => onUpdate(aluno.id, { padI: e.target.value })}
                placeholder="80" className="w-full text-sm px-2 py-1 mt-0.5" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">FC Inicial (bpm)</label>
            <Input type="number" min="30" max="250" value={fcI}
              onChange={e => onUpdate(aluno.id, { fcI: e.target.value })}
              placeholder="70" className="w-full text-sm px-2 py-1 mt-0.5" />
          </div>

          {/* ── Exercícios com campos editáveis ── */}
          {exerciciosFicha?.length > 0 && (
            <div className="space-y-2">
              {exerciciosFicha.map(ex => (
                <ExercicioEditavel
                  key={ex.ftex_id}
                  ex={ex}
                  exState={state?.exercicios?.[ex.ftex_id]}
                  onUpdateEx={patch => onUpdateExercicio(aluno.id, ex.ftex_id, patch)}
                  ultimoReg={ultimosExercicios?.[ex.ftex_id]}
                />
              ))}
            </div>
          )}

          {/* ── Medições finais ── */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">PAS Final (mmHg)</label>
              <Input type="number" min="50" max="250" value={pasF}
                onChange={e => onUpdate(aluno.id, { pasF: e.target.value })}
                placeholder="120" className="w-full text-sm px-2 py-1 mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-400">PAD Final (mmHg)</label>
              <Input type="number" min="30" max="150" value={padF}
                onChange={e => onUpdate(aluno.id, { padF: e.target.value })}
                placeholder="80" className="w-full text-sm px-2 py-1 mt-0.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">FC Final (bpm)</label>
              <Input type="number" min="30" max="250" value={fcF}
                onChange={e => onUpdate(aluno.id, { fcF: e.target.value })}
                placeholder="90" className="w-full text-sm px-2 py-1 mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-400">PSE Borg (6–20)</label>
              <Input type="number" min="6" max="20" value={pse}
                onChange={e => onUpdate(aluno.id, { pse: e.target.value })}
                placeholder="13" className="w-full text-sm px-2 py-1 mt-0.5" />
            </div>
          </div>

          {/* ── Obs aula anterior (read-only) ── */}
          {ultimoRegistro?.miau_observacoes && (
            <div>
              <label className="text-xs text-gray-400">Obs aula anterior</label>
              <p className="mt-0.5 rounded-md border border-border bg-fluir-dark-3/50 px-2 py-1.5 text-sm text-muted-foreground italic">
                {ultimoRegistro.miau_observacoes}
              </p>
            </div>
          )}

          {/* ── Obs aula atual ── */}
          <div>
            <label className="text-xs text-gray-400">Obs aula atual</label>
            <textarea
              value={obs}
              onChange={e => onUpdate(aluno.id, { obs: e.target.value })}
              placeholder="Observações sobre o aluno nesta aula..."
              rows={2}
              className="w-full mt-0.5 rounded-md border border-border bg-fluir-dark-3 px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-fluir-cyan resize-none"
            />
          </div>
        </div>
      )}

      </>}
    </div>
  )
}

export default function MinistrarAulaPage() {
  const [turmaId, setTurmaId]               = useState('')
  const [fichaId, setFichaId]               = useState('')
  const [funcId, setFuncId]                 = useState('')
  const [data, setDataAula]                 = useState(new Date().toISOString().split('T')[0])
  const [horaInicio, setHoraInicio]         = useState(new Date().toTimeString().slice(0, 5))
  const [step, setStep]                     = useState('configurar') // configurar | aula
  const [aulaId, setAulaId]                 = useState(null)
  const [iniciando, setIniciando]           = useState(false)
  const [finalizando, setFinalizando]       = useState(false)
  const [alunoStates, setAlunoStates]       = useState({})
  const [exerciciosOrdenados, setExOrd]     = useState([])
  const [modalidade, setModalidade]         = useState('')
  const [expandidos, setExpandidos]         = useState({})

  const STORAGE_KEY = 'nosfluir_aula_em_andamento'

  // Restaura aula em andamento do localStorage (sobrevive a refresh/voltar)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (!saved?.aulaId) return
      api.get(`/aulas/${saved.aulaId}/`).then(r => {
        if (r.data.aul_hora_final) { localStorage.removeItem(STORAGE_KEY); return }
        setAulaId(saved.aulaId)
        setModalidade(saved.modalidade || '')
        setTurmaId(String(saved.turmaId || ''))
        setFichaId(saved.fichaId ? String(saved.fichaId) : '')
        setFuncId(String(saved.funcId || ''))
        setDataAula(saved.data)
        setHoraInicio(saved.horaInicio)
      }).catch(() => localStorage.removeItem(STORAGE_KEY))
    } catch {}
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const { data: turmas, isLoading: loadingTurmas } = useQuery({
    queryKey: ['turmas-select'],
    queryFn: () => fetchAll('/turmas/'),
  })

  const { data: funcionarios } = useQuery({
    queryKey: ['funcionarios-select'],
    queryFn: () => fetchAll('/funcionarios/'),
  })

  const { data: fichas } = useQuery({
    queryKey: ['fichas-select'],
    queryFn: () => fetchAll('/fichas-treino/'),
  })

  const turmasFiltradas = turmas?.filter(t => !modalidade || t.tur_modalidade === modalidade) ?? []
  const fichasFiltradas = fichas?.filter(f => !modalidade || !f.fitr_modalidade || f.fitr_modalidade === modalidade) ?? []

  const handleModalidadeChange = useCallback((v) => {
    setModalidade(v === '__none__' ? '' : v)
    setTurmaId('')
    setFichaId('')
  }, [])

  const { data: alunosTurma, isLoading: loadingAlunos } = useQuery({
    queryKey: ['turma-alunos-aula', turmaId],
    queryFn: () => api.get('/turma-alunos/', { params: { tur: turmaId, ativo: true, alu__alu_ativo: true } })
      .then(r => r.data.results),
    enabled: !!turmaId,
  })

  // Sugestão automática: última aula da turma → próxima ficha do programa
  const { data: fichaSugerida } = useQuery({
    queryKey: ['sugestao-ficha', turmaId],
    queryFn: async () => {
      const [programaResp, ultimaAulaResp] = await Promise.all([
        api.get('/programa-turma/', { params: { turma: turmaId, ordering: 'prog_ordem' } }),
        api.get('/aulas/', { params: { tur: turmaId, ordering: '-aul_data', page: 1 } }),
      ])
      const programa = programaResp.data.results
      if (!programa.length) return null
      const ultimaPosicao = ultimaAulaResp.data.results?.[0]?.aul_posicao_ciclo ?? 0
      const proxima = programa.find(p => p.prog_ordem === ultimaPosicao + 1) ?? programa[0]
      return proxima?.fitr ?? null
    },
    enabled: !!turmaId && step === 'configurar',
  })

  // onSuccess foi removido no TanStack Query v5 — usar useEffect
  useEffect(() => {
    if (fichaSugerida && !fichaId) setFichaId(String(fichaSugerida))
  }, [fichaSugerida])

  const { data: exerciciosFicha } = useQuery({
    queryKey: ['ficha-exercicios-aula', fichaId],
    queryFn: () => api.get('/fichas-treino-exercicios/', { params: { fitr: fichaId, ordering: 'ftex_ordem' } })
      .then(r => r.data.results),
    enabled: !!fichaId && step === 'aula',
  })

  // Avisos de falta já registrados para esta turma/data — badge "Avisou"
  const { data: avisosHoje } = useQuery({
    queryKey: ['avisos-falta-turma', turmaId, data],
    queryFn: () => api.get('/avisos-falta/', { params: { turma: turmaId, avi_data_aula: data } })
      .then(r => {
        const mapa = {}
        r.data.results.forEach(av => { mapa[av.aluno] = av })
        return mapa
      }),
    enabled: !!turmaId && step === 'aula',
  })

  const [fichaExpandida, setFichaExpandida] = useState(true)

  // Sincroniza ordem local com dados da query
  useEffect(() => {
    if (exerciciosFicha) {
      setExOrd([...exerciciosFicha].sort((a, b) => a.ftex_ordem - b.ftex_ordem))
    }
  }, [exerciciosFicha])

  const handleDragEnd = useCallback(async ({ active, over }) => {
    if (!over || active.id === over.id) return
    setExOrd(prev => {
      const oldIndex = prev.findIndex(e => e.ftex_id === active.id)
      const newIndex = prev.findIndex(e => e.ftex_id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      const newList = arrayMove(prev, oldIndex, newIndex).map((ex, i) => ({ ...ex, ftex_ordem: i + 1 }))
      const changed = newList.filter((ex, i) => ex.ftex_ordem !== prev[i]?.ftex_ordem)
      Promise.all(changed.map(ex =>
        api.patch(`/fichas-treino-exercicios/${ex.ftex_id}/`, { ftex_ordem: ex.ftex_ordem })
      )).catch(() => toast({ title: 'Erro ao salvar reordenação.', variant: 'destructive' }))
      return newList
    })
  }, [])

  // Inicializa states quando a lista de alunos carrega
  useEffect(() => {
    if (alunosTurma?.length) {
      const isMobile = window.innerWidth < 768
      const init = {}
      const exp = {}
      alunosTurma.forEach(ta => {
        init[ta.alu] = {
          presenca: 'presente',
          faltaTipo: 'sem_aviso',
          dataHoraAviso: new Date().toISOString().slice(0, 16),
          pasI: '', padI: '',
          pasF: '', padF: '',
          fcI: '', fcF: '',
          pse: '',
          obs: '',
          creditoId: null,
        }
        exp[ta.alu] = !isMobile
      })
      setAlunoStates(init)
      setExpandidos(exp)
    }
  }, [alunosTurma])

  const updateAluno = useCallback((alunoId, patch) => {
    setAlunoStates(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], ...patch },
    }))
    if ('presenca' in patch) {
      setExpandidos(prev => ({ ...prev, [alunoId]: true }))
    }
  }, [])

  const updateExpandido = useCallback((alunoId, val) => {
    setExpandidos(prev => ({ ...prev, [alunoId]: val }))
  }, [])

  const updateExercicio = useCallback((alunoId, ftexId, patch) => {
    setAlunoStates(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        exercicios: {
          ...prev[alunoId]?.exercicios,
          [ftexId]: { ...prev[alunoId]?.exercicios?.[ftexId], ...patch },
        },
      },
    }))
  }, [])

  // Inicializa estado dos exercícios quando a ficha carrega
  useEffect(() => {
    if (!exerciciosFicha?.length || !alunosTurma?.length) return
    setAlunoStates(prev => {
      const next = { ...prev }
      alunosTurma.forEach(ta => {
        if (!next[ta.alu]) return
        const exs = {}
        exerciciosFicha.forEach(ex => {
          exs[ex.ftex_id] = {
            reg_series:      ex.ftex_series      != null ? String(ex.ftex_series)      : '',
            reg_repeticoes:  ex.ftex_repeticoes  != null ? String(ex.ftex_repeticoes)  : '',
            reg_carga:       '',
            reg_observacoes: '',
          }
        })
        next[ta.alu] = { ...next[ta.alu], exercicios: exs }
      })
      return next
    })
  }, [exerciciosFicha, alunosTurma])

  const turmaSelecionada = turmas?.find(t => t.tur_id === parseInt(turmaId))

  const iniciar = async () => {
    if (!turmaId) {
      toast({ title: 'Selecione uma turma.', variant: 'destructive' })
      return
    }
    if (!funcId) {
      toast({ title: 'Selecione o professor que está ministrando.', variant: 'destructive' })
      return
    }
    if (!horaInicio) {
      toast({ title: 'Informe a hora de início.', variant: 'destructive' })
      return
    }
    if (!turmaSelecionada?.tur_modalidade) {
      toast({ title: 'Turma sem modalidade definida. Configure a modalidade da turma.', variant: 'destructive' })
      return
    }

    setIniciando(true)
    try {
      const resp = await api.post('/aulas/', {
        tur: parseInt(turmaId),
        func: parseInt(funcId),
        fitr: fichaId ? parseInt(fichaId) : null,
        aul_data: data,
        aul_modalidade: turmaSelecionada.tur_modalidade,
        aul_hora_inicio: horaInicio,
      })
      setAulaId(resp.data.aul_id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        aulaId: resp.data.aul_id,
        turmaId: parseInt(turmaId),
        fichaId: fichaId ? parseInt(fichaId) : null,
        funcId: parseInt(funcId),
        modalidade: turmaSelecionada.tur_modalidade,
        data,
        horaInicio,
      }))
      setStep('aula')
    } catch (err) {
      const status = err.response?.status
      if (status === 400) {
        // unique_together: já existe Aula para essa turma+data+modalidade
        const errData = err.response?.data
        const errStr = JSON.stringify(errData).toLowerCase()
        const isUnique = errStr.includes('unique') || errStr.includes('already') ||
                         errStr.includes('único') || !!errData?.non_field_errors
        if (isUnique) {
          toast({
            title: 'Já existe uma aula registrada para essa turma nesta data.',
            description: 'Verifique em Aulas se já foi criada.',
            variant: 'destructive',
          })
        } else {
          toast({ title: 'Erro ao criar aula.', description: JSON.stringify(errData), variant: 'destructive' })
        }
      } else {
        toast({ title: 'Erro ao iniciar aula.', variant: 'destructive' })
      }
    } finally {
      setIniciando(false)
    }
  }

  const finalizar = async () => {
    const horaFinal = new Date().toTimeString().slice(0, 5)
    const alunos = alunosTurma || []

    // Validação
    for (const ta of alunos) {
      const d = alunoStates[ta.alu]
      if (!d) continue
      const nome = ta.alu_nome || `Aluno ${ta.alu}`

      if (d.presenca === 'presente') {
        if (d.pasI !== '' && (parseInt(d.pasI) < 50 || parseInt(d.pasI) > 250)) {
          toast({ title: `PAS inicial inválida para ${nome}. Use 50–250 mmHg.`, variant: 'destructive' })
          return
        }
        if (d.padI !== '' && (parseInt(d.padI) < 30 || parseInt(d.padI) > 150)) {
          toast({ title: `PAD inicial inválida para ${nome}. Use 30–150 mmHg.`, variant: 'destructive' })
          return
        }
        if (d.pasF !== '' && (parseInt(d.pasF) < 50 || parseInt(d.pasF) > 250)) {
          toast({ title: `PAS final inválida para ${nome}. Use 50–250 mmHg.`, variant: 'destructive' })
          return
        }
        if (d.padF !== '' && (parseInt(d.padF) < 30 || parseInt(d.padF) > 150)) {
          toast({ title: `PAD final inválida para ${nome}. Use 30–150 mmHg.`, variant: 'destructive' })
          return
        }
        if (d.fcI !== '' && (parseInt(d.fcI) < 30 || parseInt(d.fcI) > 250)) {
          toast({ title: `FC inicial inválida para ${nome}. Use 30–250 bpm.`, variant: 'destructive' })
          return
        }
        if (d.fcF !== '' && (parseInt(d.fcF) < 30 || parseInt(d.fcF) > 250)) {
          toast({ title: `FC final inválida para ${nome}. Use 30–250 bpm.`, variant: 'destructive' })
          return
        }
        if (d.pse !== '' && (parseInt(d.pse) < 6 || parseInt(d.pse) > 20)) {
          toast({ title: `PSE inválido para ${nome}. Use Escala de Borg: 6–20.`, variant: 'destructive' })
          return
        }
      }

      if (d.presenca === 'reposicao' && !d.creditoId) {
        toast({
          title: `${nome} não tem crédito disponível. Altere o tipo de presença.`,
          variant: 'destructive',
        })
        return
      }
    }

    setFinalizando(true)

    // 1. Atualiza hora final na Aula coletiva
    try {
      await api.patch(`/aulas/${aulaId}/`, { aul_hora_final: horaFinal })
    } catch {
      toast({ title: 'Aviso: não foi possível registrar a hora de término da aula.', variant: 'destructive' })
    }

    // 2. Salva registro individual de cada aluno
    let erros = 0
    for (const ta of alunos) {
      const d = alunoStates[ta.alu]
      if (!d) continue

      const toInt = v => v !== '' ? parseInt(v) : null

      const payload = {
        aula:               aulaId,
        tur:                parseInt(turmaId),
        alu:                ta.alu,
        func:               funcId ? parseInt(funcId) : null,
        fitr:               fichaId ? parseInt(fichaId) : null,
        cred:               d.creditoId || null,
        miau_data:          data,
        miau_pas_inicio:    toInt(d.pasI),
        miau_pad_inicio:    toInt(d.padI),
        miau_pas_final:     toInt(d.pasF),
        miau_pad_final:     toInt(d.padF),
        miau_fc_inicio:     toInt(d.fcI),
        miau_fc_final:      toInt(d.fcF),
        miau_pse:           toInt(d.pse),
        miau_observacoes:   d.obs || null,
        miau_tipo_presenca: d.presenca,
        miau_tipo_falta:    d.presenca === 'falta' ? d.faltaTipo : null,
      }

      try {
        const miauResp = await api.post('/ministrar-aula/', payload)
        const miauId = miauResp.data.miau_id

        // Criar AvisoFalta se falta justificada/atestado e sem aviso prévio
        if (
          d.presenca === 'falta' &&
          ['justificada', 'atestado'].includes(d.faltaTipo) &&
          !(avisosHoje?.[ta.alu])
        ) {
          try {
            await api.post('/avisos-falta/', {
              aluno: ta.alu,
              turma: parseInt(turmaId),
              avi_data_hora_aviso: d.dataHoraAviso || new Date().toISOString().slice(0, 16),
              avi_data_aula: data,
              avi_tipo: d.faltaTipo,
            })
          } catch {
            // AvisoFalta não crítico — não bloqueia o fluxo
          }
        }

        // Salvar registros individuais de exercícios
        const exs = d.exercicios || {}
        for (const [ftexId, exData] of Object.entries(exs)) {
          const temDados = exData.reg_series !== '' || exData.reg_repeticoes !== '' ||
                           (exData.reg_carga || '').trim() !== '' ||
                           (exData.reg_observacoes || '').trim() !== ''
          if (!temDados) continue
          try {
            await api.post('/registro-exercicio-aluno/', {
              ministrar_aula: miauId,
              ftex:           parseInt(ftexId),
              reg_series:     exData.reg_series !== '' ? parseInt(exData.reg_series) : null,
              reg_repeticoes: exData.reg_repeticoes !== '' ? parseInt(exData.reg_repeticoes) : null,
              reg_carga:      exData.reg_carga || null,
              reg_observacoes: exData.reg_observacoes || null,
            })
          } catch {
            // Não bloqueia o fluxo principal — apenas loga
          }
        }
      } catch (err) {
        erros++
        const nome = ta.alu_nome || `Aluno ${ta.alu}`
        const detalhe = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'erro desconhecido'
        toast({ title: `Erro ao salvar ${nome}: ${detalhe}`, variant: 'destructive' })
      }
    }

    setFinalizando(false)

    if (erros === 0) {
      localStorage.removeItem(STORAGE_KEY)
      toast({ title: 'Aula finalizada e registrada com sucesso!', variant: 'success' })
      setStep('configurar')
      setModalidade('')
      setTurmaId('')
      setFichaId('')
      setFuncId('')
      setAulaId(null)
      setHoraInicio(new Date().toTimeString().slice(0, 5))
      setAlunoStates({})
      setExpandidos({})
    }
  }

  // ── Step: aula em andamento ─────────────────────────────────────────────
  if (step === 'aula') {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Ministrar Aula"
          description={`${turmaSelecionada?.tur_nome || ''} — ${formatDate(data)} — início ${horaInicio}`}
          actions={
            <Button variant="outline" onClick={() => setStep('configurar')} disabled={finalizando}>
              Voltar
            </Button>
          }
        />

        {/* Card de exercícios da ficha — com drag & drop */}
        {fichaId && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ClipboardList className="w-4 h-4 text-fluir-cyan" />
                    {fichas?.find(f => String(f.fitr_id) === fichaId)?.fitr_nome || 'Ficha de Treino'}
                  </CardTitle>
                  <button
                    onClick={() => setFichaExpandida(v => !v)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {fichaExpandida ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </CardHeader>
              {fichaExpandida && (
                <CardContent className="pt-0 pb-3 px-4">
                  <ExerciciosFicha exercicios={exerciciosOrdenados.length ? exerciciosOrdenados : exerciciosFicha} />
                </CardContent>
              )}
            </Card>
          </DndContext>
        )}

        <div className="space-y-3">
          {loadingAlunos ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : alunosTurma?.length ? (
            alunosTurma.map(ta => (
              <AlunoRow
                key={ta.alu}
                aluno={{ id: ta.alu, alu_nome: ta.alu_nome || `Aluno ${ta.alu}` }}
                state={alunoStates[ta.alu]}
                onUpdate={updateAluno}
                onUpdateExercicio={updateExercicio}
                exerciciosFicha={exerciciosOrdenados.length ? exerciciosOrdenados : exerciciosFicha}
                fichaId={fichaId}
                expandido={expandidos[ta.alu] ?? true}
                onToggle={() => updateExpandido(ta.alu, !(expandidos[ta.alu] ?? true))}
                modalidade={turmaSelecionada?.tur_modalidade}
                avisoExistente={avisosHoje?.[ta.alu] ?? null}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                Nenhum aluno matriculado nesta turma.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="gradient"
            onClick={finalizar}
            disabled={finalizando || !alunosTurma?.length}
          >
            {finalizando ? (
              <><Spinner className="w-4 h-4" /> Salvando...</>
            ) : (
              <><Square className="w-4 h-4" /> Finalizar Aula</>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ── Step: configurar ────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        title="Ministrar Aula"
        description="Configure a turma e inicie o registro da aula"
      />

      {/* Banner de retomar aula em andamento */}
      {aulaId && (
        <div className="rounded-lg border border-fluir-cyan/30 bg-fluir-cyan/10 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-fluir-cyan">Aula em andamento</p>
            <p className="text-xs text-muted-foreground">
              {turmas?.find(t => t.tur_id === parseInt(turmaId))?.tur_nome || '—'} — {formatDate(data)} às {horaInicio}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="gradient" onClick={() => setStep('aula')}>
              Retomar Aula
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              localStorage.removeItem(STORAGE_KEY)
              setAulaId(null)
              setModalidade('')
              setTurmaId('')
              setFichaId('')
              setFuncId('')
              setAlunoStates({})
              setExpandidos({})
            }}>
              Descartar
            </Button>
          </div>
        </div>
      )}

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-fluir-cyan" />
            Configurar Aula
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          <FormField label="Modalidade" required>
            <Select value={modalidade || '__none__'} onValueChange={handleModalidadeChange}>
              <SelectTrigger><SelectValue placeholder="Selecionar modalidade..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar modalidade...</SelectItem>
                {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Turma" required>
            <Select value={turmaId || '__none__'} onValueChange={v => setTurmaId(v === '__none__' ? '' : v)} disabled={loadingTurmas || !modalidade}>
              <SelectTrigger><SelectValue placeholder="Selecionar turma..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar turma...</SelectItem>
                {turmasFiltradas.map(t => <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Professor ministrando" required>
            <Select value={funcId || '__none__'} onValueChange={v => setFuncId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar professor..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar professor...</SelectItem>
                {funcionarios?.map(f => <SelectItem key={f.func_id} value={String(f.func_id)}>{f.func_nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Ficha de Treino (opcional)">
            <Select value={fichaId || '__none__'} onValueChange={v => setFichaId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar ficha...</SelectItem>
                {fichasFiltradas.map(f => <SelectItem key={f.fitr_id} value={String(f.fitr_id)}>{f.fitr_nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Data da Aula" required>
            <Input type="date" value={data} onChange={e => setDataAula(e.target.value)} />
          </FormField>

          <FormField label="Hora de Início" required>
            <Input
              type="time"
              value={horaInicio}
              onChange={e => setHoraInicio(e.target.value)}
            />
          </FormField>

          {turmaId && alunosTurma && (
            <div className="rounded-lg bg-fluir-dark-3 px-4 py-2 text-xs text-muted-foreground">
              {alunosTurma.length} aluno(s) matriculado(s)
              {turmaSelecionada?.tur_modalidade && (
                <span className="ml-2 text-fluir-cyan capitalize">· {turmaSelecionada.tur_modalidade}</span>
              )}
            </div>
          )}

          <Button onClick={iniciar} className="w-full" variant="gradient" disabled={iniciando}>
            {iniciando ? (
              <><Spinner className="w-4 h-4" /> Criando aula...</>
            ) : (
              <><Play className="w-4 h-4" /> Iniciar Aula</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
