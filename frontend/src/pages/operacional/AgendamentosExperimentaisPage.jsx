import { useState } from 'react'
import { Plus, Sparkles, UserPlus, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useList, useCreate, useUpdate, fetchAll } from '@/hooks/useApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Spinner } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import api from '@/services/api'

const KEY_AGE  = 'agendamento-experimental'
const KEY_AEXP = 'aula-experimental'

const MODALIDADE_LABELS = { pilates: 'Mat Pilates', funcional: 'Funcional', ambos: 'Ambos' }
const STATUS_CONFIG = {
  pendente:   { label: 'Pendente',   cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  confirmado: { label: 'Confirmado', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  realizado:  { label: 'Realizado',  cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  faltou:     { label: 'Faltou',     cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-gray-500/15 text-gray-400' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── Form: Novo Agendamento ──────────────────────────────────────────────────
function AgendamentoForm({ onClose }) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      slot: '__none__', age_nome: '', age_telefone: '', age_nascimento: '',
      age_modalidade: '__none__', age_disponibilidade: '', age_problema_saude: '',
      age_data_agendada: new Date().toISOString().slice(0, 10),
      age_hora_agendada: '', age_observacoes: '',
    },
  })

  const create = useCreate(KEY_AGE, `/${KEY_AGE}/`, { successMsg: 'Agendamento criado.', onSuccess: onClose })
  const { data: slots } = useQuery({
    queryKey: ['slots-experimentais-all'],
    queryFn:  () => fetchAll('/slots-experimentais/'),
  })
  const slotsAtivos = slots?.filter(s => s.slot_ativo) || []

  const DIA_ABREV = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex' }

  const onSubmit = (data) => {
    const slotId     = data.slot !== '__none__' ? parseInt(data.slot) : null
    const modalidade = data.age_modalidade !== '__none__' ? data.age_modalidade : null
    if (!slotId)               { toast({ title: 'Selecione o slot.', variant: 'destructive' }); return }
    if (!data.age_nome.trim()) { toast({ title: 'Informe o nome.', variant: 'destructive' }); return }
    if (!data.age_telefone.trim()) { toast({ title: 'Informe o telefone.', variant: 'destructive' }); return }
    if (!data.age_nascimento)  { toast({ title: 'Informe a data de nascimento.', variant: 'destructive' }); return }
    if (!modalidade)           { toast({ title: 'Selecione a modalidade.', variant: 'destructive' }); return }
    if (!data.age_data_agendada) { toast({ title: 'Informe a data.', variant: 'destructive' }); return }
    if (!data.age_hora_agendada) { toast({ title: 'Informe o horário.', variant: 'destructive' }); return }

    create.mutate({
      slot: slotId,
      age_nome: data.age_nome.trim(),
      age_telefone: data.age_telefone.trim(),
      age_nascimento: data.age_nascimento,
      age_modalidade: modalidade,
      age_disponibilidade: data.age_disponibilidade || null,
      age_problema_saude:  data.age_problema_saude  || null,
      age_data_agendada:   data.age_data_agendada,
      age_hora_agendada:   data.age_hora_agendada,
      age_origem: 'sistema',
      age_observacoes: data.age_observacoes || null,
    })
  }

  const busy = create.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nome completo *" className="col-span-2">
          <Input {...register('age_nome')} disabled={busy} placeholder="Nome do prospecto" />
        </FormField>
        <FormField label="Telefone *">
          <Input {...register('age_telefone')} disabled={busy} placeholder="(34) 9xxxx-xxxx" />
        </FormField>
        <FormField label="Nascimento *">
          <Input type="date" {...register('age_nascimento')} disabled={busy} />
        </FormField>
      </div>

      <FormField label="Modalidade *">
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

      <FormField label="Slot *">
        <Select value={watch('slot')} onValueChange={v => setValue('slot', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {slotsAtivos.map(s => (
              <SelectItem key={s.slot_id} value={String(s.slot_id)} disabled={s.vagas_disponiveis === 0}>
                {DIA_ABREV[s.slot_dia_semana] || s.slot_dia_semana} {s.slot_hora?.slice(0, 5)} — {MODALIDADE_LABELS[s.slot_modalidade]}
                {s.vagas_disponiveis === 0 ? ' (sem vagas)' : ` (${s.vagas_disponiveis} vaga${s.vagas_disponiveis > 1 ? 's' : ''})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Data *">
          <Input type="date" {...register('age_data_agendada')} disabled={busy} />
        </FormField>
        <FormField label="Horário *">
          <Input type="time" {...register('age_hora_agendada')} disabled={busy} />
        </FormField>
      </div>

      <FormField label="Saúde / Lesões">
        <textarea {...register('age_problema_saude')} disabled={busy} rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Doenças, lesões — conte tudo 😊" />
      </FormField>

      <FormField label="Outros horários disponíveis">
        <Input {...register('age_disponibilidade')} disabled={busy} placeholder="Ex: Segunda 18h, Sexta 7h..." />
      </FormField>

      <FormField label="Observações">
        <textarea {...register('age_observacoes')} disabled={busy} rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Opcional..." />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner className="mr-2" /> : null}Agendar
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Form: Aula Experimental ─────────────────────────────────────────────────
function AulaExperimentalForm({ agendamento, aulaExistente, onClose }) {
  const qc = useQueryClient()
  const { data: funcionarios } = useQuery({
    queryKey: ['funcionarios-all'],
    queryFn:  () => fetchAll('/funcionarios/'),
  })

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      func: aulaExistente?.func ? String(aulaExistente.func) : '__none__',
      aexp_data: aulaExistente?.aexp_data || agendamento.age_data_agendada,
      aexp_modalidade: aulaExistente?.aexp_modalidade
        || (agendamento.age_modalidade !== 'ambos' ? agendamento.age_modalidade : '__none__'),
      aexp_profissao: aulaExistente?.aexp_profissao || '',
      aexp_doencas_cronicas: aulaExistente?.aexp_doencas_cronicas || agendamento.age_problema_saude || '',
      aexp_lesoes_dores: aulaExistente?.aexp_lesoes_dores || agendamento.age_problema_saude || '',
      aexp_objetivo: aulaExistente?.aexp_objetivo || '',
      aexp_agachamento:   aulaExistente?.aexp_agachamento   || '',
      aexp_flexibilidade: aulaExistente?.aexp_flexibilidade || '',
      aexp_equilibrio:    aulaExistente?.aexp_equilibrio    || '',
      aexp_coordenacao:   aulaExistente?.aexp_coordenacao   || '',
      aexp_observacoes:   aulaExistente?.aexp_observacoes   || '',
      decisao: aulaExistente?.aexp_cadastrou_aluno ? 'cadastrar'
              : aulaExistente?.aexp_id ? 'encerrar' : '__none__',
    },
  })

  const [showAluno, setShowAluno] = useState(false)
  const [salvando, setSalvando]   = useState(false)
  const decisao = watch('decisao')

  const buildPayload = (data) => ({
    agendamento: agendamento.age_id,
    func: data.func !== '__none__' ? parseInt(data.func) : null,
    aexp_data: data.aexp_data,
    aexp_modalidade: data.aexp_modalidade !== '__none__' ? data.aexp_modalidade : null,
    aexp_profissao:        data.aexp_profissao        || null,
    aexp_doencas_cronicas: data.aexp_doencas_cronicas || null,
    aexp_lesoes_dores:     data.aexp_lesoes_dores     || null,
    aexp_objetivo:         data.aexp_objetivo         || null,
    aexp_agachamento:      data.aexp_agachamento      || null,
    aexp_flexibilidade:    data.aexp_flexibilidade    || null,
    aexp_equilibrio:       data.aexp_equilibrio       || null,
    aexp_coordenacao:      data.aexp_coordenacao      || null,
    aexp_observacoes:      data.aexp_observacoes      || null,
    aexp_cadastrou_aluno: data.decisao === 'cadastrar',
  })

  const onSubmit = async (data) => {
    if (!data.func || data.func === '__none__') {
      toast({ title: 'Selecione o professor.', variant: 'destructive' }); return
    }
    if (!data.aexp_modalidade || data.aexp_modalidade === '__none__') {
      toast({ title: 'Selecione a modalidade.', variant: 'destructive' }); return
    }
    if (!data.decisao || data.decisao === '__none__') {
      toast({ title: 'Informe a decisão (cadastrar ou encerrar).', variant: 'destructive' }); return
    }
    if (data.decisao === 'cadastrar') { setShowAluno(true); return }

    try {
      setSalvando(true)
      const payload = buildPayload(data)
      if (aulaExistente) {
        await api.patch(`/aula-experimental/${aulaExistente.aexp_id}/`, payload)
      } else {
        await api.post('/aula-experimental/', payload)
      }
      qc.invalidateQueries({ queryKey: [KEY_AGE] })
      qc.invalidateQueries({ queryKey: [KEY_AEXP] })
      toast({ title: 'Aula experimental registrada.', variant: 'success' })
      onClose()
    } catch (err) {
      const d = err.response?.data
      const msg = d ? (typeof d === 'string' ? d
        : Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '))
        : 'Erro ao salvar.'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const busy = salvando
  const TA = ({ name, placeholder, rows = 3 }) => (
    <textarea {...register(name)} disabled={busy} rows={rows}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
      placeholder={placeholder} />
  )

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Cabeçalho do prospecto */}
        <div className="bg-fluir-dark-3 rounded-lg p-3 text-sm">
          <p className="font-semibold">{agendamento.age_nome}</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {formatDate(agendamento.age_data_agendada)} {agendamento.age_hora_agendada?.slice(0, 5)}
            {' · '}{agendamento.age_telefone}
            {' · '}{MODALIDADE_LABELS[agendamento.age_modalidade] || agendamento.age_modalidade}
          </p>
        </div>

        {/* Professor + Modalidade + Data */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Professor *" className="col-span-2 sm:col-span-1">
            <Select value={watch('func')} onValueChange={v => setValue('func', v)} disabled={busy}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
                {funcionarios?.map(f => (
                  <SelectItem key={f.func_id} value={String(f.func_id)}>{f.func_nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Modalidade da aula *" className="col-span-2 sm:col-span-1">
            <Select value={watch('aexp_modalidade')} onValueChange={v => setValue('aexp_modalidade', v)} disabled={busy}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
                <SelectItem value="pilates">Mat Pilates</SelectItem>
                <SelectItem value="funcional">Funcional</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Data *">
            <Input type="date" {...register('aexp_data')} disabled={busy} />
          </FormField>
        </div>

        {/* Anamnese */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Anamnese</p>
          <div className="space-y-3">
            <FormField label="Profissão">
              <Input {...register('aexp_profissao')} disabled={busy} placeholder="Profissão do prospecto" />
            </FormField>
            <FormField label="Doenças crônicas">
              <TA name="aexp_doencas_cronicas" placeholder="Diabetes, hipertensão, etc." rows={2} />
            </FormField>
            <FormField label="Lesões / Dores">
              <TA name="aexp_lesoes_dores" placeholder="Lesões, dores recentes..." rows={2} />
            </FormField>
            <FormField label="Objetivo">
              <TA name="aexp_objetivo" placeholder="O que o prospecto busca com o treino?" rows={2} />
            </FormField>
          </div>
        </div>

        {/* Testes Físicos */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Testes Físicos (Pré Aula)</p>
          <div className="space-y-3">
            <FormField label="Agachamento">
              <TA name="aexp_agachamento" placeholder="Alinhamento, profundidade, compensações..." />
            </FormField>
            <FormField label="Flexibilidade">
              <TA name="aexp_flexibilidade" placeholder="Sentado, mão no pé — alcance e limitações..." />
            </FormField>
            <FormField label="Equilíbrio">
              <TA name="aexp_equilibrio" placeholder="Uma perna + elevação lateral — estabilidade..." />
            </FormField>
            <FormField label="Coordenação">
              <TA name="aexp_coordenacao" placeholder="Perdigueiro invertido — execução..." />
            </FormField>
            <FormField label="Observações gerais">
              <TA name="aexp_observacoes" placeholder="Qualquer observação adicional..." />
            </FormField>
          </div>
        </div>

        {/* Decisão */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Decisão</p>
          <Select value={watch('decisao')} onValueChange={v => setValue('decisao', v)} disabled={busy}>
            <SelectTrigger><SelectValue placeholder="Selecionar decisão..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
              <SelectItem value="cadastrar">Cadastrar como aluno</SelectItem>
              <SelectItem value="encerrar">Encerrar sem cadastro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" disabled={busy} className="bg-fluir-purple hover:bg-fluir-purple/90">
            {busy ? <Spinner className="mr-2" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
            {decisao === 'cadastrar' ? 'Continuar → Cadastrar Aluno' : 'Finalizar Aula Experimental'}
          </Button>
        </DialogFooter>
      </form>

      {showAluno && (
        <CadastrarAlunoModal
          agendamento={agendamento}
          buildPayload={() => buildPayload(watch())}
          aulaExistente={aulaExistente}
          onClose={() => setShowAluno(false)}
          onDone={() => { qc.invalidateQueries({ queryKey: [KEY_AGE] }); onClose() }}
        />
      )}
    </>
  )
}

// ── Modal: Cadastrar Aluno pré-preenchido ───────────────────────────────────
function CadastrarAlunoModal({ agendamento, buildPayload, aulaExistente, onClose, onDone }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      alu_nome: agendamento.age_nome,
      alu_telefone: agendamento.age_telefone,
      alu_data_nascimento: agendamento.age_nascimento,
      alu_documento: '', alu_email: '', alu_endereco: '',
    },
  })
  const [busy, setBusy] = useState(false)

  const onSubmit = async (alunoData) => {
    if (!alunoData.alu_documento.trim()) {
      toast({ title: 'CPF é obrigatório.', variant: 'destructive' }); return
    }
    setBusy(true)
    try {
      const res = await api.post('/alunos/', {
        alu_nome: alunoData.alu_nome,
        alu_documento: alunoData.alu_documento.replace(/\D/g, ''),
        alu_data_nascimento: alunoData.alu_data_nascimento,
        alu_telefone: alunoData.alu_telefone || null,
        alu_email:    alunoData.alu_email    || null,
        alu_endereco: alunoData.alu_endereco || null,
      })
      const alu_id  = res.data.alu_id
      const payload = { ...buildPayload(), aexp_cadastrou_aluno: true, aluno: alu_id }

      if (aulaExistente) {
        await api.patch(`/aula-experimental/${aulaExistente.aexp_id}/`, payload)
      } else {
        await api.post('/aula-experimental/', payload)
      }
      toast({ title: 'Aluno cadastrado! Não esqueça de matriculá-lo em uma turma.', variant: 'success' })
      onDone()
    } catch (err) {
      const d = err.response?.data
      const msg = d ? (typeof d === 'string' ? d
        : Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '))
        : 'Erro ao salvar.'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />Cadastrar como Aluno
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">
            Dados pré-preenchidos do agendamento. Preencha o CPF e revise antes de salvar.
          </p>
          <FormField label="Nome *"><Input {...register('alu_nome')} disabled={busy} /></FormField>
          <FormField label="CPF *">
            <Input {...register('alu_documento')} disabled={busy} placeholder="000.000.000-00" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nascimento *">
              <Input type="date" {...register('alu_data_nascimento')} disabled={busy} />
            </FormField>
            <FormField label="Telefone">
              <Input {...register('alu_telefone')} disabled={busy} />
            </FormField>
          </div>
          <FormField label="E-mail"><Input type="email" {...register('alu_email')} disabled={busy} /></FormField>
          <FormField label="Endereço"><Input {...register('alu_endereco')} disabled={busy} /></FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Voltar</Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Spinner className="mr-2" /> : <UserPlus className="w-3.5 h-3.5 mr-1.5" />}
              Cadastrar Aluno
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Painel de Detalhes do Agendamento ───────────────────────────────────────
function PainelDetalhe({ row, onChangeStatus, onIniciarAula, onFechar }) {
  const { isAdmin, canAccessTecnico } = useAuthStore()
  const podeCriarAula = isAdmin() || canAccessTecnico()
  const podeAlterar   = ['pendente', 'confirmado'].includes(row.age_status)

  return (
    <Card className="border-fluir-purple/30">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-foreground">{row.age_nome}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(row.age_data_agendada)} {row.age_hora_agendada?.slice(0, 5)}
              {' · '}{row.age_telefone}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={row.age_status} />
            <Button variant="ghost" size="icon-sm" onClick={onFechar} title="Fechar">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Modalidade: </span>
            {MODALIDADE_LABELS[row.age_modalidade] || row.age_modalidade}
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Origem: </span>
            <span className="capitalize">{row.age_origem}</span>
          </div>
          {row.age_problema_saude && (
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Saúde / Lesões: </span>
              <span className="text-xs">{row.age_problema_saude}</span>
            </div>
          )}
          {row.age_disponibilidade && (
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Outros horários: </span>
              <span className="text-xs">{row.age_disponibilidade}</span>
            </div>
          )}
          {row.age_observacoes && (
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Obs: </span>
              <span className="text-xs">{row.age_observacoes}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
          {podeAlterar && (
            <>
              {row.age_status === 'pendente' && (
                <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
                  onClick={() => onChangeStatus(row.age_id, 'confirmado')}>
                  Confirmar
                </Button>
              )}
              <Button size="sm" variant="outline" className="text-red-400 border-red-500/40 hover:bg-red-500/10"
                onClick={() => onChangeStatus(row.age_id, 'cancelado')}>
                Cancelar
              </Button>
              <Button size="sm" variant="outline" className="text-orange-400 border-orange-500/40 hover:bg-orange-500/10"
                onClick={() => onChangeStatus(row.age_id, 'faltou')}>
                Faltou
              </Button>
            </>
          )}
          {(podeAlterar || row.age_status === 'realizado') && podeCriarAula && (
            <Button size="sm" className="bg-fluir-purple hover:bg-fluir-purple/90 ml-auto"
              onClick={() => onIniciarAula(row)}>
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {row.age_status === 'realizado' ? 'Ver Aula Experimental' : 'Iniciar Aula Experimental'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
export default function AgendamentosExperimentaisPage() {
  const [modalNovo, setModalNovo]   = useState(false)
  const [selected, setSelected]     = useState(null)
  const [aulaModal, setAulaModal]   = useState(null)
  const [aulaExistente, setAulaExistente] = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY_AGE, `/${KEY_AGE}/`)
  const update = useUpdate(KEY_AGE, `/${KEY_AGE}/`, { successMsg: 'Status atualizado.' })

  const handleChangeStatus = (id, status) => {
    update.mutate({ id, data: { age_status: status } }, {
      onSuccess: (updated) => {
        if (selected?.age_id === id) setSelected(s => ({ ...s, age_status: updated.age_status || status }))
      },
    })
  }

  const handleIniciarAula = async (row) => {
    try {
      const { data: res } = await api.get('/aula-experimental/', { params: { agendamento: row.age_id } })
      setAulaExistente(res.results?.[0] || null)
    } catch {
      setAulaExistente(null)
    }
    setAulaModal(row)
  }

  const handleSelectRow = (row) => {
    setSelected(prev => prev?.age_id === row.age_id ? null : row)
  }

  const COLUMNS = [
    {
      key: 'age_data_agendada', header: 'Data / Hora',
      render: r => <span className="tabular-nums text-xs">{formatDate(r.age_data_agendada)} {r.age_hora_agendada?.slice(0, 5)}</span>,
    },
    {
      key: 'age_nome', header: 'Prospecto',
      render: r => (
        <button
          className="font-medium text-left hover:text-fluir-cyan transition-colors"
          onClick={() => handleSelectRow(r)}
        >
          {r.age_nome}
        </button>
      ),
    },
    {
      key: 'age_telefone', header: 'Telefone',
      render: r => r.age_telefone,
      cellClassName: 'hidden md:table-cell',
    },
    {
      key: 'age_modalidade', header: 'Modalidade',
      render: r => MODALIDADE_LABELS[r.age_modalidade] || r.age_modalidade,
      cellClassName: 'hidden sm:table-cell',
    },
    {
      key: 'age_status', header: 'Status',
      render: r => <StatusBadge status={r.age_status} />,
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aulas Experimentais"
        description="Agendamentos e realização de aulas experimentais — captação de novos alunos"
        actions={
          <Button onClick={() => setModalNovo(true)}>
            <Plus className="w-4 h-4 mr-1.5" />Novo Agendamento
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select defaultValue="all"
              onValueChange={v => setFilters(f => ({ ...f, age_status: v !== 'all' ? v : undefined }))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select defaultValue="all"
              onValueChange={v => setFilters(f => ({ ...f, age_modalidade: v !== 'all' ? v : undefined }))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas modalidades</SelectItem>
                <SelectItem value="pilates">Mat Pilates</SelectItem>
                <SelectItem value="funcional">Funcional</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" className="w-44"
              onChange={e => setFilters(f => ({ ...f, age_data_agendada: e.target.value || undefined }))} />
          </div>

          <DataTable
            columns={COLUMNS}
            data={data.map(r => ({ ...r, id: r.age_id }))}
            isLoading={isLoading}
            emptyMessage="Nenhum agendamento experimental registrado."
          />

          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* Painel de detalhe — aparece ao clicar no nome do prospecto */}
      {selected && (
        <PainelDetalhe
          row={selected}
          onChangeStatus={handleChangeStatus}
          onIniciarAula={handleIniciarAula}
          onFechar={() => setSelected(null)}
        />
      )}

      <Dialog open={modalNovo} onOpenChange={setModalNovo}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Agendamento Experimental</DialogTitle></DialogHeader>
          <AgendamentoForm onClose={() => setModalNovo(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!aulaModal} onOpenChange={v => { if (!v) setAulaModal(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fluir-purple" />
              Aula Experimental
            </DialogTitle>
          </DialogHeader>
          {aulaModal && (
            <AulaExperimentalForm
              agendamento={aulaModal}
              aulaExistente={aulaExistente}
              onClose={() => { setAulaModal(null); setAulaExistente(null) }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
