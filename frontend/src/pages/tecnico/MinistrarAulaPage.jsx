import { useState, useCallback, useEffect, useRef } from 'react'
import { Activity, Play, Square } from 'lucide-react'
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

const PRESENCA_OPTS = [
  { value: 'regular',   label: 'Presente' },
  { value: 'falta',     label: 'Falta' },
  { value: 'reposicao', label: 'Reposição' },
]

const FALTA_TIPOS = [
  { value: 'sem_aviso',   label: 'Sem aviso (não gera crédito)' },
  { value: 'justificada', label: 'Justificada (48h a 1h antes)' },
  { value: 'atestado',    label: 'Atestado médico' },
  { value: 'cenario3',    label: 'Aviso com mais de 48h (pendente)' },
]

const PRESSAO_REGEX = /^\d{2,3}\/\d{2}$/

function AlunoRow({ aluno, state, onUpdate }) {
  const presenca   = state?.presenca   ?? 'regular'
  const faltaTipo  = state?.faltaTipo  ?? 'sem_aviso'
  const pressaoI   = state?.pressaoI   ?? ''
  const pressaoF   = state?.pressaoF   ?? ''
  const intensidade= state?.intensidade?? ''

  const { data: creditos } = useQuery({
    queryKey: ['creditos-aluno', aluno.id],
    queryFn: () => api.get('/tecnico/creditos-reposicao/', {
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
      onUpdateRef.current(aluno.id, { creditoId: proximoCredito?.id ?? null })
    }
  }, [proximoCredito?.id, presenca, aluno.id])

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      {/* Nome + botões presença */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="font-medium text-sm">{aluno.alu_nome}</p>
        <div className="flex gap-1.5 flex-wrap">
          {PRESENCA_OPTS.map(o => (
            <button
              key={o.value}
              onClick={() => onUpdate(aluno.id, { presenca: o.value })}
              className={cn(
                'px-3 py-2 rounded-md text-xs font-medium transition-colors min-h-[36px]',
                presenca === o.value
                  ? o.value === 'regular'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : o.value === 'falta'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-fluir-dark-3 text-muted-foreground hover:text-foreground'
              )}
            >
              {o.label}
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

      {/* P.A. e intensidade */}
      {presenca === 'regular' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="P.A. Inicial">
            <Input
              value={pressaoI}
              onChange={e => onUpdate(aluno.id, { pressaoI: e.target.value })}
              placeholder="120/80"
              className={cn('text-xs', pressaoI && !PRESSAO_REGEX.test(pressaoI) ? 'border-red-500' : '')}
            />
          </FormField>
          <FormField label="P.A. Final">
            <Input
              value={pressaoF}
              onChange={e => onUpdate(aluno.id, { pressaoF: e.target.value })}
              placeholder="120/80"
              className={cn('text-xs', pressaoF && !PRESSAO_REGEX.test(pressaoF) ? 'border-red-500' : '')}
            />
          </FormField>
          <FormField label="Intensidade (0-10)">
            <Input
              type="number" min="0" max="10"
              value={intensidade}
              onChange={e => onUpdate(aluno.id, { intensidade: e.target.value })}
              placeholder="7"
            />
          </FormField>
        </div>
      )}
    </div>
  )
}

export default function MinistrarAulaPage() {
  const [turmaId, setTurmaId]     = useState('')
  const [fichaId, setFichaId]     = useState('')
  const [data, setDataAula]        = useState(new Date().toISOString().split('T')[0])
  const [step, setStep]           = useState('configurar') // configurar | aula
  const [horaInicio, setHoraInicio] = useState(null)
  const [finalizando, setFinalizando] = useState(false)
  const [alunoStates, setAlunoStates] = useState({})

  const { data: turmas, isLoading: loadingTurmas } = useQuery({
    queryKey: ['turmas-select'],
    queryFn: () => api.get('/operacional/turmas/').then(r => r.data.results),
  })

  const { data: fichas } = useQuery({
    queryKey: ['fichas-select'],
    queryFn: () => api.get('/tecnico/fichas-treino/').then(r => r.data.results),
  })

  const { data: alunosTurma, isLoading: loadingAlunos } = useQuery({
    queryKey: ['turma-alunos-aula', turmaId],
    queryFn: () => api.get('/operacional/turma-alunos/', { params: { tur: turmaId, ativo: true } })
      .then(r => r.data.results),
    enabled: !!turmaId,
  })

  // Inicializa states quando a lista de alunos carrega
  useEffect(() => {
    if (alunosTurma?.length) {
      const init = {}
      alunosTurma.forEach(ta => {
        init[ta.alu] = {
          presenca: 'regular',
          faltaTipo: 'sem_aviso',
          pressaoI: '',
          pressaoF: '',
          intensidade: '',
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
      const nome = ta.aluno_nome || `Aluno ${ta.alu}`

      if (d.presenca === 'regular') {
        if (d.pressaoI && !PRESSAO_REGEX.test(d.pressaoI)) {
          toast({ title: `P.A. inicial inválida para ${nome}. Formato: 120/80`, variant: 'destructive' })
          return
        }
        if (d.pressaoF && !PRESSAO_REGEX.test(d.pressaoF)) {
          toast({ title: `P.A. final inválida para ${nome}. Formato: 120/80`, variant: 'destructive' })
          return
        }
        if (d.intensidade !== '' && (parseInt(d.intensidade) < 0 || parseInt(d.intensidade) > 10)) {
          toast({ title: `Intensidade inválida para ${nome}. Use 0–10.`, variant: 'destructive' })
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

      const payload = {
        tur:                     parseInt(turmaId),
        alu:                     ta.alu,
        fitr:                    fichaId ? parseInt(fichaId) : null,
        cred:                    d.creditoId || null,
        aul_data:                data,
        aul_hora_inicio:         horaInicio,
        aul_hora_final:          horaFinal,
        aul_pressao_inicio:      d.pressaoI || null,
        aul_pressao_final:       d.pressaoF || null,
        aul_tipo_presenca:       d.presenca,
        aul_tipo_falta:          d.presenca === 'falta' ? d.faltaTipo : null,
        aul_intensidade_esforco: d.intensidade !== '' ? parseInt(d.intensidade) : null,
      }

      try {
        await api.post('/tecnico/aulas/', payload)
      } catch (err) {
        erros++
        const nome = ta.aluno_nome || `Aluno ${ta.alu}`
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
          description={`${turmas?.find(t => t.id === parseInt(turmaId))?.tur_nome || ''} — ${formatDate(data)}`}
          actions={
            <Button variant="outline" onClick={() => setStep('configurar')} disabled={finalizando}>
              Voltar
            </Button>
          }
        />

        <div className="space-y-3">
          {loadingAlunos ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : alunosTurma?.length ? (
            alunosTurma.map(ta => (
              <AlunoRow
                key={ta.alu}
                aluno={{ id: ta.alu, alu_nome: ta.aluno_nome || `Aluno ${ta.alu}` }}
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
            <Select value={turmaId} onValueChange={setTurmaId} disabled={loadingTurmas}>
              <SelectTrigger><SelectValue placeholder="Selecionar turma..." /></SelectTrigger>
              <SelectContent>
                {turmas?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.tur_nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Ficha de Treino (opcional)">
            <Select value={fichaId} onValueChange={setFichaId}>
              <SelectTrigger><SelectValue placeholder="Selecionar ficha..." /></SelectTrigger>
              <SelectContent>
                {fichas?.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.fitr_nome}</SelectItem>)}
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
