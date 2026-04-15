import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Activity, Play, Square, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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

function ExerciciosFicha({ exercicios }) {
  const grupos = useMemo(() => {
    if (!exercicios) return null
    const ordenados = [...exercicios].sort((a, b) => a.ftex_ordem - b.ftex_ordem)
    const mapa = {}
    const ordem = []
    ordenados.forEach(ex => {
      const sec = ex.ftex_secao || ''
      if (!mapa[sec]) { mapa[sec] = []; ordem.push(sec) }
      mapa[sec].push(ex)
    })
    return { grupos: ordem.map(s => ({ secao: s, itens: mapa[s] })), temSecao: ordenados.some(e => e.ftex_secao) }
  }, [exercicios])

  if (!exercicios) return <div className="flex justify-center py-3"><Spinner /></div>
  if (exercicios.length === 0) return <p className="text-xs text-muted-foreground">Nenhum exercício cadastrado nesta ficha.</p>

  if (!grupos.temSecao) {
    return (
      <ol className="space-y-1.5">
        {grupos.grupos[0]?.itens.map(ex => <ExercicioLinha key={ex.ftex_id} ex={ex} />)}
      </ol>
    )
  }

  return (
    <div className="space-y-3">
      {grupos.grupos.map(({ secao, itens }) => (
        <div key={secao || '__sem__'}>
          {secao && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fluir-cyan mb-1">
              {secao}
            </p>
          )}
          <ol className="space-y-1.5">
            {itens.map(ex => <ExercicioLinha key={ex.ftex_id} ex={ex} />)}
          </ol>
        </div>
      ))}
    </div>
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

function AlunoRow({ aluno, state, onUpdate }) {
  const presenca  = state?.presenca  ?? 'presente'
  const faltaTipo = state?.faltaTipo ?? 'sem_aviso'
  const pasI      = state?.pasI      ?? ''
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

  const proximoCredito = creditos?.[0]

  // Sincroniza creditoId no state quando a query retorna
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => { onUpdateRef.current = onUpdate })
  useEffect(() => {
    if (presenca === 'reposicao') {
      onUpdateRef.current(aluno.id, { creditoId: proximoCredito?.cred_id ?? null })
    }
  }, [proximoCredito?.cred_id, presenca, aluno.id])

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      {/* Nome + botões presença */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="font-medium text-sm">{aluno.alu_nome}</p>
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

      {/* Tipo de falta */}
      {presenca === 'falta' && (
        <div>
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
        <div className="space-y-2 mt-1">
          {/* PAS/PAD Inicial e Final */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">PAS Inicial (mmHg)</label>
              <Input
                type="number" min="50" max="250"
                value={pasI}
                onChange={e => onUpdate(aluno.id, { pasI: e.target.value })}
                placeholder="120"
                className="w-full text-sm px-2 py-1 mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">PAD Inicial (mmHg)</label>
              <Input
                type="number" min="30" max="150"
                value={padI}
                onChange={e => onUpdate(aluno.id, { padI: e.target.value })}
                placeholder="80"
                className="w-full text-sm px-2 py-1 mt-0.5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">PAS Final (mmHg)</label>
              <Input
                type="number" min="50" max="250"
                value={pasF}
                onChange={e => onUpdate(aluno.id, { pasF: e.target.value })}
                placeholder="120"
                className="w-full text-sm px-2 py-1 mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">PAD Final (mmHg)</label>
              <Input
                type="number" min="30" max="150"
                value={padF}
                onChange={e => onUpdate(aluno.id, { padF: e.target.value })}
                placeholder="80"
                className="w-full text-sm px-2 py-1 mt-0.5"
              />
            </div>
          </div>

          {/* FC e PSE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-400">FC Inicial (bpm)</label>
              <Input
                type="number" min="30" max="250"
                value={fcI}
                onChange={e => onUpdate(aluno.id, { fcI: e.target.value })}
                placeholder="70"
                className="w-full text-sm px-2 py-1 mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">FC Final (bpm)</label>
              <Input
                type="number" min="30" max="250"
                value={fcF}
                onChange={e => onUpdate(aluno.id, { fcF: e.target.value })}
                placeholder="90"
                className="w-full text-sm px-2 py-1 mt-0.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">PSE Borg (6–20)</label>
              <Input
                type="number" min="6" max="20"
                value={pse}
                onChange={e => onUpdate(aluno.id, { pse: e.target.value })}
                placeholder="13"
                className="w-full text-sm px-2 py-1 mt-0.5"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs text-gray-400">Observações</label>
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
    </div>
  )
}

export default function MinistrarAulaPage() {
  const [turmaId, setTurmaId]       = useState('')
  const [fichaId, setFichaId]       = useState('')
  const [funcId, setFuncId]         = useState('')
  const [data, setDataAula]         = useState(new Date().toISOString().split('T')[0])
  const [step, setStep]             = useState('configurar') // configurar | aula
  const [horaInicio, setHoraInicio] = useState(null)
  const [finalizando, setFinalizando] = useState(false)
  const [alunoStates, setAlunoStates] = useState({})

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

  const { data: alunosTurma, isLoading: loadingAlunos } = useQuery({
    queryKey: ['turma-alunos-aula', turmaId],
    queryFn: () => api.get('/turma-alunos/', { params: { tur: turmaId, ativo: true } })
      .then(r => r.data.results),
    enabled: !!turmaId,
  })

  const { data: exerciciosFicha } = useQuery({
    queryKey: ['ficha-exercicios-aula', fichaId],
    queryFn: () => api.get('/fichas-treino-exercicios/', { params: { fitr: fichaId, ordering: 'ftex_ordem' } })
      .then(r => r.data.results),
    enabled: !!fichaId && step === 'aula',
  })

  const [fichaExpandida, setFichaExpandida] = useState(true)

  // Inicializa states quando a lista de alunos carrega
  useEffect(() => {
    if (alunosTurma?.length) {
      const init = {}
      alunosTurma.forEach(ta => {
        init[ta.alu] = {
          presenca: 'presente',
          faltaTipo: 'sem_aviso',
          pasI: '', padI: '',
          pasF: '', padF: '',
          fcI: '', fcF: '',
          pse: '',
          obs: '',
          creditoId: null,
        }
      })
      setAlunoStates(init)
    }
  }, [alunosTurma])

  const updateAluno = useCallback((alunoId, patch) => {
    setAlunoStates(prev => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], ...patch },
    }))
  }, [])

  const iniciar = () => {
    if (!turmaId) {
      toast({ title: 'Selecione uma turma.', variant: 'destructive' })
      return
    }
    if (!funcId) {
      toast({ title: 'Selecione o professor que está ministrando.', variant: 'destructive' })
      return
    }
    setHoraInicio(new Date().toTimeString().slice(0, 5))
    setStep('aula')
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
    let erros = 0

    for (const ta of alunos) {
      const d = alunoStates[ta.alu]
      if (!d) continue

      const toInt = v => v !== '' ? parseInt(v) : null

      const payload = {
        tur:                parseInt(turmaId),
        alu:                ta.alu,
        func:               funcId ? parseInt(funcId) : null,
        fitr:               fichaId ? parseInt(fichaId) : null,
        cred:               d.creditoId || null,
        miau_data:          data,
        miau_hora_inicio:   horaInicio,
        miau_hora_final:    horaFinal,
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
        await api.post('/ministrar-aula/', payload)
      } catch (err) {
        erros++
        const nome = ta.alu_nome || `Aluno ${ta.alu}`
        const detalhe = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'erro desconhecido'
        toast({ title: `Erro ao salvar ${nome}: ${detalhe}`, variant: 'destructive' })
      }
    }

    setFinalizando(false)

    if (erros === 0) {
      toast({ title: 'Aula finalizada e registrada com sucesso!', variant: 'success' })
      setStep('configurar')
      setTurmaId('')
      setFichaId('')
      setFuncId('')
      setHoraInicio(null)
      setAlunoStates({})
    }
  }

  // ── Step: aula em andamento ─────────────────────────────────────────────
  if (step === 'aula') {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Ministrar Aula"
          description={`${turmas?.find(t => t.tur_id === parseInt(turmaId))?.tur_nome || ''} — ${formatDate(data)}`}
          actions={
            <Button variant="outline" onClick={() => setStep('configurar')} disabled={finalizando}>
              Voltar
            </Button>
          }
        />

        {/* Card de exercícios da ficha */}
        {fichaId && (
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
                <ExerciciosFicha exercicios={exerciciosFicha} />
              </CardContent>
            )}
          </Card>
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

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-fluir-cyan" />
            Configurar Aula
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          <FormField label="Turma" required>
            <Select value={turmaId || '__none__'} onValueChange={v => setTurmaId(v === '__none__' ? '' : v)} disabled={loadingTurmas}>
              <SelectTrigger><SelectValue placeholder="Selecionar turma..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar turma...</SelectItem>
                {turmas?.map(t => <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome}</SelectItem>)}
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
                {fichas?.map(f => <SelectItem key={f.fitr_id} value={String(f.fitr_id)}>{f.fitr_nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Data da Aula" required>
            <Input type="date" value={data} onChange={e => setDataAula(e.target.value)} />
          </FormField>

          {turmaId && alunosTurma && (
            <div className="rounded-lg bg-fluir-dark-3 px-4 py-2 text-xs text-muted-foreground">
              {alunosTurma.length} aluno(s) matriculado(s)
            </div>
          )}

          <Button onClick={iniciar} className="w-full" variant="gradient">
            <Play className="w-4 h-4" />
            Iniciar Aula
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
