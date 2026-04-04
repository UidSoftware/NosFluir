import { useState } from 'react'
import { Activity, Play, Square, ChevronRight, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, FormField, Spinner, Badge } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const PRESENCA_OPTS = [
  { value: 'presente',  label: 'Presente' },
  { value: 'falta',     label: 'Falta' },
  { value: 'reposicao', label: 'Reposição' },
]

const FALTA_TIPOS = [
  { value: 'sem_aviso',   label: 'Sem aviso (não gera crédito)' },
  { value: 'justificada', label: 'Justificada (48h a 1h antes)' },
  { value: 'atestado',    label: 'Atestado médico' },
  { value: 'cenario3',    label: 'Aviso com mais de 48h (pendente definição)' },
]

const PRESSAO_REGEX = /^\d{2,3}\/\d{2}$/

function AlunoRow({ aluno, aulaId, onUpdate }) {
  const [presenca, setPresenca]   = useState('presente')
  const [faltaTipo, setFaltaTipo] = useState('sem_aviso')
  const [pressaoI, setPressaoI]   = useState('')
  const [pressaoF, setPressaoF]   = useState('')
  const [intensidade, setIntens]  = useState('')
  const [creditoId, setCreditoId] = useState(null)

  const { data: creditos } = useQuery({
    queryKey: ['creditos-aluno', aluno.id],
    queryFn: () => api.get('/tecnico/creditos-reposicao/', {
      params: { aluno_id: aluno.id, cred_status: 'disponivel', ordering: 'cred_data_expiracao', page_size: 5 },
    }).then(r => r.data.results),
    enabled: presenca === 'reposicao',
  })

  const proximoCredito = creditos?.[0]

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{aluno.alu_nome}</p>
        <div className="flex gap-1">
          {PRESENCA_OPTS.map(o => (
            <button
              key={o.value}
              onClick={() => setPresenca(o.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                presenca === o.value
                  ? o.value === 'presente'
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

      {presenca === 'falta' && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Tipo de falta:</p>
          <div className="grid grid-cols-2 gap-1">
            {FALTA_TIPOS.map(t => (
              <button
                key={t.value}
                onClick={() => setFaltaTipo(t.value)}
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

      {presenca === 'presente' && (
        <div className="grid grid-cols-3 gap-3">
          <FormField label="P.A. Inicial">
            <Input
              value={pressaoI}
              onChange={e => setPressaoI(e.target.value)}
              placeholder="120/80"
              className={cn('text-xs', pressaoI && !PRESSAO_REGEX.test(pressaoI) ? 'border-red-500' : '')}
            />
          </FormField>
          <FormField label="P.A. Final">
            <Input
              value={pressaoF}
              onChange={e => setPressaoF(e.target.value)}
              placeholder="120/80"
              className={cn('text-xs', pressaoF && !PRESSAO_REGEX.test(pressaoF) ? 'border-red-500' : '')}
            />
          </FormField>
          <FormField label="Intensidade (0-10)">
            <Input
              type="number" min="0" max="10"
              value={intensidade}
              onChange={e => setIntens(e.target.value)}
              placeholder="7"
            />
          </FormField>
        </div>
      )}
    </div>
  )
}

export default function MinistrarAulaPage() {
  const [turmaId, setTurmaId]       = useState('')
  const [fichaId, setFichaId]       = useState('')
  const [data, setDataAula]          = useState(new Date().toISOString().split('T')[0])
  const [step, setStep]             = useState('configurar') // configurar | aula

  const { data: turmas, isLoading: loadingTurmas } = useQuery({
    queryKey: ['turmas-select'],
    queryFn: () => api.get('/operacional/turmas/', { params: { page_size: 100 } }).then(r => r.data.results),
  })

  const { data: fichas } = useQuery({
    queryKey: ['fichas-select'],
    queryFn: () => api.get('/tecnico/fichas-treino/', { params: { page_size: 100 } }).then(r => r.data.results),
  })

  const { data: alunosTurma, isLoading: loadingAlunos } = useQuery({
    queryKey: ['turma-alunos-aula', turmaId],
    queryFn: () => api.get('/operacional/turma-alunos/', { params: { turma_id: turmaId, page_size: 100 } })
      .then(r => r.data.results),
    enabled: !!turmaId,
  })

  const iniciar = () => {
    if (!turmaId) {
      toast({ title: 'Selecione uma turma.', variant: 'destructive' })
      return
    }
    setStep('aula')
  }

  if (step === 'aula') {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Ministrar Aula"
          description={`${turmas?.find(t => t.id === parseInt(turmaId))?.tur_nome || ''} — ${formatDate(data)}`}
          actions={
            <Button variant="outline" onClick={() => setStep('configurar')}>
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
                key={ta.aluno_id}
                aluno={{ id: ta.aluno_id, alu_nome: ta.aluno_nome || `Aluno ${ta.aluno_id}` }}
                aulaId={null}
                onUpdate={() => {}}
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
          <Button variant="gradient">
            <Square className="w-4 h-4" />
            Finalizar Aula
          </Button>
        </div>
      </div>
    )
  }

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
                {fichas?.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.fich_nome}</SelectItem>)}
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
