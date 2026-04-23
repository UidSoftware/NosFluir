import { useState } from 'react'
import { Users, Plus, Pencil, Trash2, ChevronDown, ChevronRight, ClipboardCheck, XCircle } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Spinner } from '@/components/ui/primitives'
import { formatDate, formatCPF, formatCurrency, formatDateTime, onlyNumbers } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'
import { cn } from '@/lib/utils'

const ENDPOINT = '/alunos/'
const KEY      = 'alunos'

// ─── Formulário de Aluno (cria/edita + plano inicial opcional) ────────────────

function AlunoForm({ aluno, onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: aluno ? {
      alu_nome:               aluno.alu_nome,
      alu_documento:          aluno.alu_documento,
      alu_data_nascimento:    aluno.alu_data_nascimento,
      alu_email:              aluno.alu_email || '',
      alu_telefone:           aluno.alu_telefone || '',
      alu_endereco:           aluno.alu_endereco || '',
      alu_contato_emergencia: aluno.alu_contato_emergencia || '',
      alu_doencas_cronicas:   aluno.alu_doencas_cronicas || '',
      alu_medicamentos:       aluno.alu_medicamentos || '',
    } : {},
  })

  const [planoInicial, setPlanoInicial] = useState({
    plano:              '__none__',
    aplano_data_inicio: new Date().toISOString().slice(0, 10),
  })

  const { data: planosCatalogo } = useQuery({
    queryKey: ['planos-catalogo'],
    queryFn: () => api.get('/planos-pagamentos/').then(r => r.data.results),
    enabled: !aluno, // só carrega no form de criar
  })

  const create = useCreate(KEY, ENDPOINT, {
    onSuccess: async (novoAluno) => {
      if (planoInicial.plano !== '__none__') {
        try {
          await api.post('/aluno-plano/', {
            aluno:              novoAluno.alu_id,
            plano:              parseInt(planoInicial.plano),
            aplano_data_inicio: planoInicial.aplano_data_inicio,
          })
          queryClient.invalidateQueries({ queryKey: ['aluno-plano', novoAluno.alu_id] })
        } catch {
          toast({ title: 'Aluno criado, mas erro ao vincular plano.', variant: 'destructive' })
        }
      }
      onClose()
    },
  })

  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const TIPO_PLANO_LABELS = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral' }

  const onSubmit = (data) => {
    data.alu_documento = onlyNumbers(data.alu_documento)
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (aluno) update.mutate({ id: aluno.alu_id, data: cleaned })
    else       create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Nome completo" required error={errors.alu_nome?.message} className="sm:col-span-2">
          <Input {...register('alu_nome', { required: 'Nome obrigatório' })} placeholder="Giulia Fagionato" disabled={busy} />
        </FormField>

        <FormField label="CPF" required error={errors.alu_documento?.message}>
          <Input
            {...register('alu_documento', {
              required: 'CPF obrigatório',
              validate: v => onlyNumbers(v).length === 11 || 'CPF deve ter 11 dígitos',
            })}
            placeholder="000.000.000-00"
            disabled={busy}
            onChange={e => {
              const n = onlyNumbers(e.target.value)
              const f = n.length <= 11
                ? n.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
                    d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a)
                : e.target.value
              setValue('alu_documento', f)
            }}
          />
        </FormField>

        <FormField label="Data de Nascimento" required error={errors.alu_data_nascimento?.message}>
          <Input type="date" {...register('alu_data_nascimento', { required: 'Data obrigatória' })} disabled={busy} />
        </FormField>

        <FormField label="E-mail">
          <Input type="email" {...register('alu_email')} placeholder="giulia@email.com" disabled={busy} />
        </FormField>

        <FormField label="Telefone">
          <Input {...register('alu_telefone')} placeholder="(34) 99999-0000" disabled={busy} />
        </FormField>

        <FormField label="Endereço" className="sm:col-span-2">
          <Input {...register('alu_endereco')} placeholder="Rua Exemplo, 123 — Uberlândia, MG" disabled={busy} />
        </FormField>

        <FormField label="Contato de Emergência" className="sm:col-span-2">
          <Input {...register('alu_contato_emergencia')} placeholder="(34) 99999-0000" disabled={busy} />
        </FormField>

        <FormField label="Doenças Crônicas" className="sm:col-span-2">
          <textarea {...register('alu_doencas_cronicas')} placeholder="Ex: Hipertensão, Diabetes tipo 2..." disabled={busy} rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-none" />
        </FormField>

        <FormField label="Medicamentos em Uso" className="sm:col-span-2">
          <textarea {...register('alu_medicamentos')} placeholder="Ex: Losartana 50mg, Metformina 500mg..." disabled={busy} rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-none" />
        </FormField>
      </div>

      {/* Plano inicial — só na criação */}
      {!aluno && (
        <div className="border border-border/50 rounded-lg p-3 space-y-3 bg-fluir-dark-3/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plano de Pagamento (opcional)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Plano">
              <Select value={planoInicial.plano} onValueChange={v => setPlanoInicial(p => ({ ...p, plano: v }))} disabled={busy}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
                  {planosCatalogo?.map(p => (
                    <SelectItem key={p.plan_id} value={String(p.plan_id)}>
                      {p.serv_nome} — {TIPO_PLANO_LABELS[p.plan_tipo_plano]} — {formatCurrency(p.plan_valor_plano)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            {planoInicial.plano !== '__none__' && (
              <FormField label="Data de Início">
                <Input type="date" value={planoInicial.aplano_data_inicio}
                  onChange={e => setPlanoInicial(p => ({ ...p, aplano_data_inicio: e.target.value }))} disabled={busy} />
              </FormField>
            )}
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : aluno ? 'Salvar Alterações' : 'Cadastrar Aluno'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── Seção de Avaliações Físicas ──────────────────────────────────────────────

function FichaAlunoForm({ alunoId, onClose }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit } = useForm({
    defaultValues: { fial_data: new Date().toISOString().slice(0, 10) },
  })
  const mutation = useMutation({
    mutationFn: (data) => api.post('/ficha-aluno/', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ficha-aluno', alunoId] })
      toast({ title: 'Avaliação registrada.', variant: 'success' })
      onClose()
    },
    onError: () => toast({ title: 'Erro ao salvar avaliação.', variant: 'destructive' }),
  })
  const onSubmit = (data) => mutation.mutate({
    aluno: alunoId, fial_data: data.fial_data,
    fial_peso: data.fial_peso || null, fial_massa_muscular: data.fial_massa_muscular || null,
    fial_massa_gorda: data.fial_massa_gorda || null, fial_porcentagem_gordura: data.fial_porcentagem_gordura || null,
    fial_circunferencia_abdominal: data.fial_circunferencia_abdominal || null,
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Data da Avaliação" required>
        <Input type="date" {...register('fial_data', { required: true })} disabled={mutation.isPending} />
      </FormField>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <FormField label="Peso (kg)"><Input type="number" step="0.01" {...register('fial_peso')} placeholder="70.5" disabled={mutation.isPending} /></FormField>
        <FormField label="M. Muscular (kg)"><Input type="number" step="0.01" {...register('fial_massa_muscular')} placeholder="45.0" disabled={mutation.isPending} /></FormField>
        <FormField label="M. Gorda (kg)"><Input type="number" step="0.01" {...register('fial_massa_gorda')} placeholder="18.0" disabled={mutation.isPending} /></FormField>
        <FormField label="% Gordura"><Input type="number" step="0.01" {...register('fial_porcentagem_gordura')} placeholder="15.5" disabled={mutation.isPending} /></FormField>
        <FormField label="Circ. Abdominal (cm)"><Input type="number" step="0.01" {...register('fial_circunferencia_abdominal')} placeholder="85.0" disabled={mutation.isPending} /></FormField>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando...' : 'Registrar Avaliação'}</Button>
      </DialogFooter>
    </form>
  )
}

function AvaliacoesSection({ alunoId }) {
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const { data, isLoading } = useQuery({
    queryKey: ['ficha-aluno', alunoId],
    queryFn: () => api.get('/ficha-aluno/', { params: { aluno: alunoId } }).then(r => r.data.results),
    enabled: !!alunoId,
  })
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/ficha-aluno/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ficha-aluno', alunoId] }); toast({ title: 'Avaliação excluída.', variant: 'success' }) },
  })
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avaliações Físicas</p>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" />Nova</Button>
      </div>
      {isLoading ? <Spinner /> : !data?.length ? (
        <p className="text-xs text-muted-foreground py-1">Nenhuma avaliação registrada.</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {data.map(f => (
            <div key={f.fial_id} className="flex items-start justify-between gap-2 rounded-md border border-border/50 p-2 text-xs">
              <div>
                <span className="font-medium">{formatDate(f.fial_data)}</span>
                <span className="text-muted-foreground ml-2">
                  {f.fial_peso && `${f.fial_peso}kg`}
                  {f.fial_porcentagem_gordura && ` · ${f.fial_porcentagem_gordura}% gord`}
                  {f.fial_massa_muscular && ` · ${f.fial_massa_muscular}kg musc`}
                </span>
              </div>
              <Button variant="ghost" size="icon-sm" className="text-red-400 hover:text-red-300 shrink-0" onClick={() => setDeleteId(f.fial_id)}>
                <XCircle className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Nova Avaliação Física</DialogTitle></DialogHeader>
          <FichaAlunoForm alunoId={alunoId} onClose={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Excluir Avaliação"
        description="Tem certeza?" confirmLabel="Excluir"
        onConfirm={() => { deleteMut.mutate(deleteId); setDeleteId(null) }} isLoading={deleteMut.isPending} />
    </div>
  )
}

// ─── Seção de Planos ──────────────────────────────────────────────────────────

const TIPO_PLANO_LABELS = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral' }

function PlanosSection({ alunoId }) {
  const queryClient = useQueryClient()
  const [vincularOpen, setVincularOpen] = useState(false)
  const [encerrarId, setEncerrarId]     = useState(null)
  const [novoPlano, setNovoPlano]       = useState({ plano: '__none__', aplano_data_inicio: new Date().toISOString().slice(0, 10), aplano_observacoes: '' })

  const { data: planosAluno, isLoading } = useQuery({
    queryKey: ['aluno-plano', alunoId],
    queryFn: () => api.get('/aluno-plano/', { params: { aluno: alunoId, ordering: '-aplano_ativo,-aplano_data_inicio' } }).then(r => r.data.results),
    enabled: !!alunoId,
  })
  const { data: planos } = useQuery({
    queryKey: ['planos-catalogo'],
    queryFn: () => api.get('/planos-pagamentos/').then(r => r.data.results),
  })

  const vincularMut = useMutation({
    mutationFn: (p) => api.post('/aluno-plano/', p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['aluno-plano', alunoId] }); toast({ title: 'Plano vinculado.', variant: 'success' }); setVincularOpen(false) },
  })
  const encerrarMut = useMutation({
    mutationFn: (id) => api.patch(`/aluno-plano/${id}/`, { aplano_ativo: false, aplano_data_fim: new Date().toISOString().slice(0, 10) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['aluno-plano', alunoId] }); toast({ title: 'Plano encerrado.', variant: 'success' }); setEncerrarId(null) },
  })

  const handleVincular = () => {
    if (novoPlano.plano === '__none__') { toast({ title: 'Selecione um plano.', variant: 'destructive' }); return }
    vincularMut.mutate({ aluno: alunoId, plano: parseInt(novoPlano.plano), aplano_data_inicio: novoPlano.aplano_data_inicio, aplano_observacoes: novoPlano.aplano_observacoes || null })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Planos</p>
        <Button size="sm" variant="outline" onClick={() => setVincularOpen(true)}><Plus className="w-3.5 h-3.5" />Vincular</Button>
      </div>
      {isLoading ? <Spinner /> : !planosAluno?.length ? (
        <p className="text-xs text-muted-foreground py-1">Nenhum plano vinculado.</p>
      ) : (
        <div className="space-y-1.5">
          {planosAluno.map(ap => (
            <div key={ap.aplano_id} className={`rounded-md border px-3 py-2 text-xs ${ap.aplano_ativo ? 'border-border' : 'border-border/30 opacity-50'}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-sm">{ap.plan_descricao}</span>
                  <span className="text-muted-foreground ml-2">desde {formatDate(ap.aplano_data_inicio)}</span>
                  <span className={`ml-2 ${ap.aplano_ativo ? 'text-emerald-400' : 'text-red-400'}`}>
                    · {ap.aplano_ativo ? 'Ativo' : 'Encerrado'}
                  </span>
                  {ap.aplano_observacoes && <p className="italic text-muted-foreground mt-0.5">{ap.aplano_observacoes}</p>}
                </div>
                {ap.aplano_ativo && (
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 text-xs h-6 shrink-0" onClick={() => setEncerrarId(ap.aplano_id)}>
                    Encerrar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={vincularOpen} onOpenChange={setVincularOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Vincular Plano</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <FormField label="Plano *">
              <Select value={novoPlano.plano} onValueChange={v => setNovoPlano(p => ({ ...p, plano: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar plano..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
                  {planos?.map(p => (
                    <SelectItem key={p.plan_id} value={String(p.plan_id)}>
                      {p.serv_nome} — {TIPO_PLANO_LABELS[p.plan_tipo_plano]} — {formatCurrency(p.plan_valor_plano)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Data de Início *">
              <Input type="date" value={novoPlano.aplano_data_inicio} onChange={e => setNovoPlano(p => ({ ...p, aplano_data_inicio: e.target.value }))} />
            </FormField>
            <FormField label="Observações">
              <textarea rows={2} value={novoPlano.aplano_observacoes} onChange={e => setNovoPlano(p => ({ ...p, aplano_observacoes: e.target.value }))}
                placeholder="Necessidades específicas..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setVincularOpen(false)}>Cancelar</Button>
            <Button onClick={handleVincular} disabled={vincularMut.isPending}>{vincularMut.isPending ? 'Salvando...' : 'Vincular'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!encerrarId} onOpenChange={() => setEncerrarId(null)} title="Encerrar Plano"
        description="Encerra o plano hoje. Histórico mantido." confirmLabel="Encerrar"
        onConfirm={() => encerrarMut.mutate(encerrarId)} isLoading={encerrarMut.isPending} />
    </div>
  )
}

// ─── Seção de Avisos e Créditos ──────────────────────────────────────────────

const TIPO_AVISO_LABELS = { justificada: 'Justificada', atestado: 'Atestado Médico' }

function AvisosSection({ alunoId }) {
  const { data: avisos, isLoading } = useQuery({
    queryKey: ['avisos-aluno', alunoId],
    queryFn: () => api.get('/avisos-falta/', { params: { aluno: alunoId, ordering: '-avi_data_hora_aviso' } }).then(r => r.data.results),
    enabled: !!alunoId,
  })
  const { data: creditos } = useQuery({
    queryKey: ['creditos-aluno', alunoId],
    queryFn: () => api.get('/creditos/', { params: { alu: alunoId, cred_status: 'disponivel', ordering: 'cred_data_expiracao' } }).then(r => r.data.results),
    enabled: !!alunoId,
  })
  const n = creditos?.length ?? 0
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avisos e Créditos</p>
      <div className="rounded-md border border-border/50 px-3 py-2 text-xs flex items-center gap-2">
        <span className="text-fluir-cyan">{'🪙'.repeat(n) || '—'}</span>
        <span className="text-muted-foreground">
          {n === 0 ? 'Nenhum crédito' : `${n} crédito${n > 1 ? 's' : ''} disponível${n > 1 ? 's' : ''}`}
          {creditos?.[0]?.cred_data_expiracao && ` · expira ${formatDate(creditos[0].cred_data_expiracao)}`}
        </span>
      </div>
      {isLoading ? <Spinner /> : !avisos?.length ? (
        <p className="text-xs text-muted-foreground py-1">Nenhum aviso registrado.</p>
      ) : (
        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
          {avisos.map(av => (
            <div key={av.avi_id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2.5 py-1.5 text-xs">
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">{formatDate(av.avi_data_aula)}</span>
                {' · '}{av.tur_nome || '—'}{' · '}{TIPO_AVISO_LABELS[av.avi_tipo] || av.avi_tipo}
              </div>
              {av.avi_gera_credito
                ? <span className="text-emerald-400 shrink-0 flex items-center gap-0.5"><ClipboardCheck size={10} />crédito</span>
                : <span className="text-red-400/70 shrink-0 flex items-center gap-0.5"><XCircle size={10} />sem crédito</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Card colapsável do aluno ─────────────────────────────────────────────────

function AlunoCard({ aluno, onEdit, onDelete }) {
  const [expandido, setExpandido] = useState(false)

  const F = ({ label, value }) => value ? (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
    </div>
  ) : null

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header — somente nome (LGPD) */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setExpandido(v => !v)}
          className="flex items-center gap-2 flex-1 text-left group"
        >
          {expandido
            ? <ChevronDown size={15} className="text-muted-foreground shrink-0" />
            : <ChevronRight size={15} className="text-muted-foreground shrink-0" />}
          <span className="font-medium group-hover:text-fluir-cyan transition-colors">{aluno.alu_nome}</span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(aluno)} title="Editar">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => onDelete(aluno.alu_id)} title="Excluir" className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Card 2 — detalhe expandido */}
      {expandido && (
        <div className="mx-3 mb-3 rounded-lg border border-border/60 bg-fluir-dark-3/40 p-4 space-y-4">
          {/* Dados pessoais */}
          <div className="grid grid-cols-2 gap-3">
            <F label="CPF"        value={formatCPF(aluno.alu_documento)} />
            <F label="Nascimento" value={formatDate(aluno.alu_data_nascimento)} />
            <F label="E-mail"     value={aluno.alu_email} />
            <F label="Telefone"   value={aluno.alu_telefone} />
            <F label="Contato de Emergência" value={aluno.alu_contato_emergencia} />
            {aluno.alu_endereco && (
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Endereço</p>
                <p className="text-sm mt-0.5">{aluno.alu_endereco}</p>
              </div>
            )}
            {aluno.alu_doencas_cronicas && (
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Doenças Crônicas</p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">{aluno.alu_doencas_cronicas}</p>
              </div>
            )}
            {aluno.alu_medicamentos && (
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Medicamentos em Uso</p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap">{aluno.alu_medicamentos}</p>
              </div>
            )}
          </div>

          <div className="border-t border-border/40 pt-3 space-y-4">
            <PlanosSection     alunoId={aluno.alu_id} />
            <AvaliacoesSection alunoId={aluno.alu_id} />
            <AvisosSection     alunoId={aluno.alu_id} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function AlunosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Aluno excluído.' })

  const openEdit   = (a) => { setSelected(a); setModalOpen(true) }
  const openCreate = ()  => { setSelected(null); setModalOpen(true) }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alunos"
        description="Clique no nome do aluno para ver os detalhes"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" />Novo Aluno</Button>}
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por nome, CPF ou e-mail..." onSearch={q => setFilters(q ? { search: q } : {})} />

          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno cadastrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {data.map(a => (
                <AlunoCard
                  key={a.alu_id}
                  aluno={a}
                  onEdit={openEdit}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
          </DialogHeader>
          <AlunoForm aluno={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Aluno"
        description="Tem certeza que deseja excluir este aluno?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
