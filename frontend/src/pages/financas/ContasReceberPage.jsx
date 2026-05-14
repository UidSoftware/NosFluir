import { useState, useMemo } from 'react'
import { Wallet, Plus, Pencil, Trash2, DollarSign, ChevronDown, ChevronUp, Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useCreate, useUpdate, useDelete, fetchAll } from '@/hooks/useApi'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

const KEY      = 'contas-receber'
const ENDPOINT = '/contas-receber/'

const PERIODICIDADES_REC = [
  { value: 'mensal',     label: 'Mensal',     meses: 1 },
  { value: 'trimestral', label: 'Trimestral', meses: 3 },
  { value: 'semestral',  label: 'Semestral',  meses: 6 },
]

function addMonthsPreviewRec(dateStr, months) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T12:00:00')
  const m = d.getMonth() + months
  d.setFullYear(d.getFullYear() + Math.floor(m / 12))
  d.setMonth(m % 12)
  return d.toLocaleDateString('pt-BR')
}

const TIPOS_RECEITA = [
  { value: 'mensalidade',  label: 'Mensalidade' },
  { value: 'avaliacao',    label: 'Avaliação Física' },
  { value: 'consultoria',  label: 'Consultoria Online' },
  { value: 'personal',     label: 'Personal' },
  { value: 'produto',      label: 'Venda de Produto' },
  { value: 'rendimento',   label: 'Rendimento' },
  { value: 'outros',       label: 'Outros' },
]
const TIPOS_COM_ALUNO = new Set(['mensalidade', 'avaliacao', 'consultoria', 'personal'])

const FORMAS = ['PIX', 'Dinheiro', 'Cartão', 'Boleto']

// ── helpers ───────────────────────────────────────────────────────────────────

function getStatusInfo(r) {
  const today    = new Date().toISOString().split('T')[0]
  const amanha   = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
  const venc     = r.rec_data_vencimento?.split('T')[0] ?? ''

  if (r.rec_status === 'recebido')  return { label: 'Recebida',  variant: 'success',     dot: 'bg-green-500' }
  if (r.rec_status === 'cancelado') return { label: 'Cancelada', variant: 'secondary',   dot: 'bg-gray-500' }
  if (venc < today || r.rec_status === 'vencido') return { label: 'Vencida',  variant: 'destructive', dot: 'bg-red-500' }
  if (venc <= amanha) return { label: 'Pendente', variant: 'warning',     dot: 'bg-yellow-500' }
  return { label: 'Futuro', variant: 'cyan', dot: 'bg-blue-500' }
}

// Vencida=0, Pendente=1, Recebida=2, Futuro=3, Cancelada=4
function ordemStatus(r) {
  const today = new Date().toISOString().split('T')[0]
  const venc  = r.rec_data_vencimento?.split('T')[0] ?? ''
  if (r.rec_status === 'recebido')  return 2
  if (r.rec_status === 'cancelado') return 4
  if (r.rec_status === 'vencido' || venc < today) return 0
  const amanha = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
  if (venc <= amanha) return 1
  return 3
}

function mesLabel(key) {
  const [ano, mes] = key.split('-')
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${nomes[parseInt(mes) - 1]} ${ano}`
}

function calcPeriodo(opcao) {
  const hoje  = new Date()
  const ano   = hoje.getFullYear()
  const mes   = hoje.getMonth() // 0-indexed
  const start = new Date(ano, mes - 1, 1)
  let   end
  if (opcao === '1')  end = new Date(ano, mes + 1, 0)
  else if (opcao === '3') end = new Date(ano, mes + 3, 0)
  else                    end = new Date(ano, mes + 6, 0)
  return {
    gte: start.toISOString().split('T')[0],
    lte: end.toISOString().split('T')[0],
  }
}

// ── Modal de Pagamento Rápido ─────────────────────────────────────────────────

function PagamentoModal({ rec, onClose }) {
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      data:  new Date().toISOString().split('T')[0],
      forma: '__none__',
      conta: '__none__',
    },
  })

  const { data: contas } = useQuery({
    queryKey: ['contas-select'],
    queryFn: () => fetchAll('/contas/', { cont_ativo: true }),
  })

  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose, successMsg: 'Recebimento confirmado!' })

  const onSubmit = (data) => {
    const contaVal = data.conta !== '__none__' ? parseInt(data.conta) : null
    const forma    = data.forma !== '__none__' ? data.forma : null
    update.mutate({
      id: rec.rec_id,
      data: {
        rec_status:           'recebido',
        rec_data_recebimento: data.data,
        rec_forma_recebimento: forma,
        conta:                contaVal,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-md bg-muted/40 px-4 py-3 text-sm space-y-0.5">
        <p className="font-medium">{rec.alu_nome || rec.rec_nome_pagador || '—'}</p>
        <p className="text-muted-foreground">{rec.rec_descricao}</p>
        <p className="text-fluir-cyan font-semibold text-base">{formatCurrency(rec.rec_valor_total)}</p>
      </div>

      <FormField label="Data do Recebimento" required>
        <Input type="date" {...register('data', { required: true })} />
      </FormField>

      <FormField label="Forma de Pagamento">
        <Select value={watch('forma')} onValueChange={v => setValue('forma', v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhuma</SelectItem>
            {FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Conta de Destino">
        <Select value={watch('conta')} onValueChange={v => setValue('conta', v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
            {contas?.map(c => <SelectItem key={c.cont_id} value={String(c.cont_id)}>{c.cont_nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Confirmando...' : 'Confirmar Recebimento'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Formulário de Cadastro/Edição ─────────────────────────────────────────────

function ContaReceberForm({ rec, onClose }) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: rec ? {
      alu:                  rec.alu      ? String(rec.alu)      : '__none__',
      serv:                 rec.serv     ? String(rec.serv)     : '__none__',
      aplano:               rec.aplano   ? String(rec.aplano)   : null,
      plano_catalogo:       '__none__',
      plano_contas:         rec.plano_contas ? String(rec.plano_contas) : '__none__',
      conta:                rec.conta    ? String(rec.conta)    : '__none__',
      rec_tipo:             rec.rec_tipo || '__none__',
      rec_nome_pagador:     rec.rec_nome_pagador || '',
      rec_descricao:        rec.rec_descricao,
      rec_data_emissao:     rec.rec_data_emissao?.split('T')[0] ?? '',
      rec_data_vencimento:  rec.rec_data_vencimento?.split('T')[0] ?? '',
      rec_status:           rec.rec_status || 'pendente',
      rec_data_recebimento: rec.rec_data_recebimento?.split('T')[0] ?? '',
      rec_forma_recebimento: rec.rec_forma_recebimento || '',
      rec_valor_unitario:   rec.rec_valor_unitario || '',
      rec_quantidade:       rec.rec_quantidade || 1,
      rec_desconto:         rec.rec_desconto || 0,
    } : {
      alu: '__none__', serv: '__none__', plano_catalogo: '__none__',
      plano_contas: '__none__', conta: '__none__', rec_tipo: '__none__',
      rec_quantidade: 1, rec_desconto: 0, rec_status: 'pendente',
      rec_data_emissao: new Date().toISOString().split('T')[0],
    },
  })

  const [servValor,  setServValor]  = useState(0)
  const [planoValor, setPlanoValor] = useState(0)

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const [repetir,       setRepetir]       = useState(false)
  const [qtdRep,        setQtdRep]        = useState(3)
  const [periodicidade, setPeriodicidade] = useState('mensal')
  const vencimento = watch('rec_data_vencimento')
  const preview = useMemo(() => {
    if (!repetir || !vencimento) return []
    const meses = PERIODICIDADES_REC.find(p => p.value === periodicidade)?.meses || 1
    return Array.from({ length: parseInt(qtdRep) || 1 }, (_, i) => addMonthsPreviewRec(vencimento, meses * i))
  }, [repetir, vencimento, qtdRep, periodicidade])

  const status  = watch('rec_status')
  const aluId   = watch('alu')
  const recTipo = watch('rec_tipo')
  const showAlu = recTipo === '__none__' || TIPOS_COM_ALUNO.has(recTipo)

  const qtd   = parseFloat(watch('rec_quantidade') || 1)
  const unit  = parseFloat(watch('rec_valor_unitario') || 0)
  const desc  = parseFloat(watch('rec_desconto') || 0)
  const total = Math.max(0, qtd * unit - desc)

  const { data: alunos }        = useQuery({ queryKey: ['alunos-select'],   queryFn: () => fetchAll('/alunos/') })
  const { data: servicos }      = useQuery({ queryKey: ['servicos-select'], queryFn: () => fetchAll('/servicos-produtos/', { serv_ativo: true }) })
  const { data: planosCatalogo }= useQuery({ queryKey: ['planos-catalogo'], queryFn: () => api.get('/planos-pagamentos/').then(r => r.data.results) })
  const { data: planosContas }  = useQuery({ queryKey: ['plano-contas-select'], queryFn: () => fetchAll('/plano-contas/', { plc_ativo: true }) })
  const { data: contas }        = useQuery({ queryKey: ['contas-select'],   queryFn: () => fetchAll('/contas/', { cont_ativo: true }) })

  const { data: contratosDoAluno } = useQuery({
    queryKey: ['aluno-plano-select', aluId],
    queryFn: () => api.get('/aluno-plano/', { params: { aluno: aluId, aplano_ativo: true } }).then(r => r.data.results),
    enabled: !!aluId && aluId !== '__none__',
  })

  const handleServChange = (v) => {
    setValue('serv', v)
    const val = v !== '__none__' ? parseFloat(servicos?.find(x => String(x.serv_id) === v)?.serv_valor_base || 0) : 0
    setServValor(val)
    setValue('rec_valor_unitario', val + planoValor || '')
  }
  const handlePlanoChange = (v) => {
    setValue('plano_catalogo', v)
    const p = v !== '__none__' ? planosCatalogo?.find(x => String(x.plan_id) === v) : null
    const val = p ? parseFloat(p.plan_valor_plano) : 0
    setPlanoValor(val)
    setValue('rec_valor_unitario', servValor + val || '')
    const contrato = contratosDoAluno?.find(x => String(x.plano) === v)
    setValue('aplano', contrato ? String(contrato.aplano_id) : null)
  }

  const onSubmit = (data) => {
    const aluVal     = data.alu      !== '__none__' ? parseInt(data.alu)      : null
    const recTipoVal = data.rec_tipo !== '__none__' ? data.rec_tipo           : null
    const contaVal   = data.conta    !== '__none__' ? parseInt(data.conta)    : null
    const plcVal     = data.plano_contas !== '__none__' ? parseInt(data.plano_contas) : null

    if (!aluVal && !data.rec_nome_pagador?.trim()) {
      toast({ title: 'Informe o aluno ou o nome do pagador.', variant: 'destructive' }); return
    }

    const payload = {
      alu:                  aluVal,
      rec_nome_pagador:     aluVal ? null : data.rec_nome_pagador,
      rec_tipo:             recTipoVal,
      plano_contas:         plcVal,
      conta:                contaVal,
      serv:                 data.serv !== '__none__' ? parseInt(data.serv) : null,
      aplano:               data.aplano ? parseInt(data.aplano) : null,
      rec_descricao:        data.rec_descricao,
      rec_data_emissao:     data.rec_data_emissao || null,
      rec_data_vencimento:  data.rec_data_vencimento || null,
      rec_status:           data.rec_status,
      rec_data_recebimento: status === 'recebido' ? (data.rec_data_recebimento || null) : null,
      rec_forma_recebimento: status === 'recebido' ? (data.rec_forma_recebimento || null) : null,
      rec_valor_unitario:   data.rec_valor_unitario,
      rec_quantidade:       parseInt(data.rec_quantidade) || 1,
      rec_desconto:         parseFloat(data.rec_desconto) || 0,
    }

    if (rec) {
      update.mutate({ id: rec.rec_id, data: payload })
    } else {
      if (repetir && parseInt(qtdRep) > 1) {
        payload.repeticao = { quantidade: parseInt(qtdRep), periodicidade }
      }
      create.mutate(payload)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5 max-h-[70vh] overflow-y-auto">

      {/* Tipo de receita */}
      <FormField label="Tipo de Receita">
        <Select value={watch('rec_tipo')} onValueChange={v => setValue('rec_tipo', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar tipo..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
            {TIPOS_RECEITA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      {/* Aluno ou Nome Pagador */}
      {showAlu ? (
        <FormField label={TIPOS_COM_ALUNO.has(recTipo) ? 'Aluno (obrigatório)' : 'Aluno'}>
          <Select value={watch('alu')} onValueChange={v => { setValue('alu', v); setValue('aplano', null) }} disabled={busy}>
            <SelectTrigger><SelectValue placeholder="Selecionar aluno..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
              {alunos?.map(a => <SelectItem key={a.alu_id} value={String(a.alu_id)}>{a.alu_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      ) : null}

      {(!showAlu || (aluId === '__none__' || !aluId)) && !TIPOS_COM_ALUNO.has(recTipo) && (
        <FormField label="Nome do Pagador">
          <Input {...register('rec_nome_pagador')} placeholder="Nome para registro" disabled={busy} />
        </FormField>
      )}

      {/* Descrição */}
      <FormField label="Descrição" required>
        <Input {...register('rec_descricao', { required: true })} placeholder="ex: Mensalidade Pilates — Maio/2026" disabled={busy} />
      </FormField>

      {/* Emissão + Vencimento */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Emissão" required>
          <Input type="date" {...register('rec_data_emissao', { required: true })} disabled={busy} />
        </FormField>
        <FormField label="Vencimento" required>
          <Input type="date" {...register('rec_data_vencimento', { required: true })} disabled={busy} />
        </FormField>
      </div>

      {/* Status */}
      <FormField label="Status">
        <Select value={watch('rec_status')} onValueChange={v => setValue('rec_status', v)} disabled={busy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {status === 'recebido' && (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Data do Recebimento" required>
            <Input type="date" {...register('rec_data_recebimento')} disabled={busy} />
          </FormField>
          <FormField label="Forma">
            <Select value={watch('rec_forma_recebimento') || '__none__'} onValueChange={v => setValue('rec_forma_recebimento', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Forma..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Nenhuma</SelectItem>
                {FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      )}

      {/* Repetição Automática — só no cadastro */}
      {!rec && (
        <div className="rounded-lg border border-border/40 bg-fluir-dark-3/40 p-3 space-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={repetir} onChange={e => setRepetir(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm font-medium">Repetição Automática</span>
          </label>
          {repetir && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Quantidade">
                  <Input type="number" min="2" max="60" value={qtdRep} onChange={e => setQtdRep(e.target.value)} />
                </FormField>
                <FormField label="Periodicidade">
                  <select
                    value={periodicidade}
                    onChange={e => setPeriodicidade(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    {PERIODICIDADES_REC.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </FormField>
              </div>
              {preview.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground font-medium">Preview:</p>
                  {preview.slice(0, 3).map((d, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• Venc. {d} — {formatCurrency(total)}</p>
                  ))}
                  {preview.length > 3 && <p className="text-xs text-muted-foreground">... e mais {preview.length - 3}</p>}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Serviço + Plano */}
      <FormField label="Serviço">
        <Select value={watch('serv')} onValueChange={handleServChange} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
            {servicos?.map(s => <SelectItem key={s.serv_id} value={String(s.serv_id)}>{s.serv_nome} — {formatCurrency(s.serv_valor_base)}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Plano de Pagamento">
        <Select value={watch('plano_catalogo')} onValueChange={handlePlanoChange} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
            {planosCatalogo?.map(p => <SelectItem key={p.plan_id} value={String(p.plan_id)}>{p.serv_nome} — {p.plan_tipo_plano} — {formatCurrency(p.plan_valor_plano)}/mês</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      {servValor > 0 && planoValor > 0 && (
        <div className="rounded-md bg-fluir-dark-3/60 border border-border/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
          <div className="flex justify-between"><span>Serviço:</span><span>{formatCurrency(servValor)}</span></div>
          <div className="flex justify-between"><span>Plano:</span><span>{formatCurrency(planoValor)}</span></div>
          <div className="flex justify-between font-medium text-foreground border-t border-border/40 pt-0.5 mt-0.5"><span>Soma:</span><span>{formatCurrency(servValor + planoValor)}</span></div>
        </div>
      )}

      {/* Conta + Plano de Contas */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Conta de Destino">
          <Select value={watch('conta')} onValueChange={v => setValue('conta', v)} disabled={busy}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
              {contas?.map(c => <SelectItem key={c.cont_id} value={String(c.cont_id)}>{c.cont_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Plano de Contas">
          <Select value={watch('plano_contas')} onValueChange={v => setValue('plano_contas', v)} disabled={busy}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
              {planosContas?.filter(p => p.plc_tipo?.startsWith('receita')).map(p => <SelectItem key={p.plc_id} value={String(p.plc_id)}>{p.plc_codigo} — {p.plc_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {/* Valor + Qtd + Desconto */}
      <div className="grid grid-cols-3 gap-3">
        <FormField label="Valor Unit. (R$)" required>
          <Input type="number" step="0.01" {...register('rec_valor_unitario', { required: true })} placeholder="0.00" disabled={busy} />
        </FormField>
        <FormField label="Qtd">
          <Input type="number" min="1" {...register('rec_quantidade')} disabled={busy} />
        </FormField>
        <FormField label="Desconto (R$)">
          <Input type="number" step="0.01" {...register('rec_desconto')} placeholder="0.00" disabled={busy} />
        </FormField>
      </div>

      <div className="rounded-lg bg-fluir-dark-3 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Total calculado:</span>
        <span className="text-base font-semibold text-fluir-cyan">{formatCurrency(total)}</span>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : rec ? 'Salvar Alterações' : 'Cadastrar'}</Button>
      </DialogFooter>
    </form>
  )
}

// ── Linha da tabela mensal ────────────────────────────────────────────────────

function LinhaRec({ r, onEditar, onExcluir, onPagar }) {
  const status = getStatusInfo(r)
  const podeReceber = r.rec_status !== 'recebido' && r.rec_status !== 'cancelado'
  const nome = r.alu_nome || r.rec_nome_pagador || '—'

  const acoes = (
    <div className="flex items-center gap-1">
      {podeReceber && (
        <Button size="icon" variant="ghost" title="Confirmar recebimento" onClick={() => onPagar(r)}>
          <DollarSign className="w-4 h-4 text-green-400" />
        </Button>
      )}
      <Button size="icon" variant="ghost" title="Editar" onClick={() => onEditar(r)}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button size="icon" variant="ghost" title="Excluir" onClick={() => onExcluir(r.rec_id)}>
        <Trash2 className="w-3.5 h-3.5 text-destructive" />
      </Button>
    </div>
  )

  return (
    <div className="py-2.5 px-3 border-b border-border/30 last:border-0 hover:bg-muted/20 rounded text-sm">

      {/* Mobile: 2 linhas */}
      <div className="md:hidden">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
          <span className="font-medium flex-1 min-w-0 truncate">{nome}</span>
          <Badge variant={status.variant} className="text-[11px] shrink-0">{status.label}</Badge>
        </div>
        <div className="flex items-center gap-2 mt-1 pl-4">
          <span className="text-muted-foreground text-xs">{formatDate(r.rec_data_vencimento)}</span>
          <span className="font-semibold text-fluir-cyan text-xs">{formatCurrency(r.rec_valor_total)}</span>
          <div className="ml-auto">{acoes}</div>
        </div>
      </div>

      {/* Tablet/Desktop: 1 linha */}
      <div className="hidden md:flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-medium truncate">{nome}</span>
          {r.rec_tipo && (
            <Badge variant="outline" className="text-[10px] shrink-0">
              {TIPOS_RECEITA.find(t => t.value === r.rec_tipo)?.label ?? r.rec_tipo}
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground hidden lg:block truncate max-w-[180px]">{r.rec_descricao}</span>
        <span className="text-muted-foreground text-xs shrink-0">{formatDate(r.rec_data_vencimento)}</span>
        <span className="font-semibold text-fluir-cyan shrink-0">{formatCurrency(r.rec_valor_total)}</span>
        <Badge variant={status.variant} className="text-[11px] shrink-0">{status.label}</Badge>
        <div className="ml-auto">{acoes}</div>
      </div>

    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ContasReceberPage() {
  const [periodo,      setPeriodo]     = useState('6')
  const [statusFiltro, setStatusFiltro]= useState('all')
  const [tipoFiltro,   setTipoFiltro]  = useState('all')
  const [modalForm,    setModalForm]   = useState(null)  // null | 'novo' | objeto
  const [modalPagar,   setModalPagar]  = useState(null)
  const [deleteId,     setDeleteId]    = useState(null)
  const [mesesAbertos, setMesesAbertos]= useState({})
  const [modalMens,    setModalMens]   = useState(false)
  const [dryRunResult, setDryRunResult]= useState(null)

  const { gte, lte } = calcPeriodo(periodo)

  const { data: registros = [], isLoading, refetch } = useQuery({
    queryKey: [KEY, periodo, statusFiltro, tipoFiltro],
    queryFn: () => fetchAll(ENDPOINT, {
      rec_data_vencimento__gte: gte,
      rec_data_vencimento__lte: lte,
      ordering: 'rec_data_vencimento',
      ...(statusFiltro !== 'all' ? { rec_status: statusFiltro } : {}),
      ...(tipoFiltro   !== 'all' ? { rec_tipo:   tipoFiltro   } : {}),
    }),
  })

  const del = useDelete(KEY, ENDPOINT, { onSuccess: refetch, successMsg: 'Conta excluída.' })

  const dryRun = useMutation({
    mutationFn: () => api.post('/gerar-mensalidades/', { dry_run: true }).then(r => r.data),
    onSuccess: (data) => { setDryRunResult(data); setModalMens(true) },
    onError: () => toast({ title: 'Erro ao consultar mensalidades.', variant: 'destructive' }),
  })

  const gerarMens = useMutation({
    mutationFn: () => api.post('/gerar-mensalidades/', {}).then(r => r.data),
    onSuccess: (data) => {
      setModalMens(false)
      setDryRunResult(null)
      refetch()
      toast({ title: `${data.criadas} mensalidade(s) gerada(s) para ${data.mes_referencia}`, variant: 'success' })
    },
    onError: () => toast({ title: 'Erro ao gerar mensalidades.', variant: 'destructive' }),
  })

  // Agrupa por mês e ordena por status: Vencida → Pendente → Recebida → Futuro → Cancelada
  const porMes = useMemo(() => {
    const grupos = {}
    registros.forEach(r => {
      const d   = new Date(r.rec_data_vencimento)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!grupos[key]) grupos[key] = []
      grupos[key].push(r)
    })
    Object.values(grupos).forEach(arr => arr.sort((a, b) => {
      const diff = ordemStatus(a) - ordemStatus(b)
      if (diff !== 0) return diff
      return (a.rec_data_vencimento ?? '').localeCompare(b.rec_data_vencimento ?? '')
    }))
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b))
  }, [registros])

  const toggleMes = (key) => setMesesAbertos(prev => ({ ...prev, [key]: !prev[key] }))
  const isMesAberto = (key) => prev => key in prev ? prev[key] : true  // aberto por padrão

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contas a Receber"
        description="Receitas agrupadas por mês de vencimento"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dryRun.mutate()} disabled={dryRun.isPending} className="gap-1.5">
              <Zap className="w-4 h-4" />{dryRun.isPending ? 'Verificando...' : 'Gerar Mensalidades'}
            </Button>
            <Button onClick={() => setModalForm('novo')}><Plus className="w-4 h-4" />Nova Conta</Button>
          </div>
        }
      />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            {/* Período */}
            <div className="flex gap-1">
              {[['1','Mês atual'],['3','3 meses'],['6','6 meses']].map(([v, l]) => (
                <Button key={v} size="sm" variant={periodo === v ? 'default' : 'outline'} onClick={() => setPeriodo(v)}>{l}</Button>
              ))}
            </div>
            {/* Status */}
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="vencido">Vencida</SelectItem>
                <SelectItem value="recebido">Recebida</SelectItem>
                <SelectItem value="cancelado">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            {/* Tipo */}
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {TIPOS_RECEITA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grupos mensais */}
      {isLoading && <p className="text-muted-foreground text-sm px-1">Carregando...</p>}

      {!isLoading && porMes.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Nenhuma conta no período selecionado.</CardContent></Card>
      )}

      {porMes.map(([key, itens]) => {
        const aberto     = key in mesesAbertos ? mesesAbertos[key] : true
        const totalMes   = itens.reduce((s, r) => s + parseFloat(r.rec_valor_total), 0)
        const recebidos  = itens.filter(r => r.rec_status === 'recebido').reduce((s, r) => s + parseFloat(r.rec_valor_total), 0)
        const pendentes  = itens.filter(r => r.rec_status !== 'recebido' && r.rec_status !== 'cancelado').length

        return (
          <Card key={key}>
            <CardContent className="p-0">
              {/* Cabeçalho do mês */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 rounded-t-lg"
                onClick={() => toggleMes(key)}
              >
                <div className="flex items-center gap-3">
                  {aberto ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  <span className="font-semibold">{mesLabel(key)}</span>
                  <Badge variant="outline" className="text-xs">{itens.length} lançamento{itens.length !== 1 ? 's' : ''}</Badge>
                  {pendentes > 0 && <Badge variant="warning" className="text-xs">{pendentes} pendente{pendentes !== 1 ? 's' : ''}</Badge>}
                </div>
                <div className="flex gap-4 text-sm text-right">
                  <span className="text-muted-foreground hidden sm:block">Total: <span className="text-foreground font-medium">{formatCurrency(totalMes)}</span></span>
                  <span className="text-muted-foreground hidden sm:block">Recebido: <span className="text-green-400 font-medium">{formatCurrency(recebidos)}</span></span>
                </div>
              </button>

              {/* Linhas */}
              {aberto && (
                <div className="px-1 pb-1">
                  {itens.map(r => (
                    <LinhaRec
                      key={r.rec_id}
                      r={r}
                      onEditar={r => setModalForm(r)}
                      onExcluir={id => setDeleteId(id)}
                      onPagar={r => setModalPagar(r)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Modal: Cadastro/Edição */}
      <Dialog open={!!modalForm} onOpenChange={open => { if (!open) setModalForm(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{modalForm === 'novo' ? 'Nova Conta a Receber' : 'Editar Conta a Receber'}</DialogTitle>
          </DialogHeader>
          {modalForm && <ContaReceberForm rec={modalForm === 'novo' ? null : modalForm} onClose={() => setModalForm(null)} />}
        </DialogContent>
      </Dialog>

      {/* Modal: Pagamento rápido */}
      <Dialog open={!!modalPagar} onOpenChange={open => { if (!open) setModalPagar(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar Recebimento</DialogTitle></DialogHeader>
          {modalPagar && <PagamentoModal rec={modalPagar} onClose={() => setModalPagar(null)} />}
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Conta" description="Tem certeza que deseja excluir esta conta?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />

      {/* Modal Gerar Mensalidades */}
      <Dialog open={modalMens} onOpenChange={v => { if (!v) { setModalMens(false); setDryRunResult(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirmar Geração de Mensalidades</DialogTitle></DialogHeader>
          {dryRunResult && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/40 px-4 py-3 text-sm">
                <p className="font-semibold text-fluir-cyan">{dryRunResult.mes_referencia}</p>
                <p className="text-muted-foreground mt-1">
                  {dryRunResult.criadas} cobrança(s) serão criadas · {dryRunResult.ignoradas} já existem ou com contrato encerrado
                </p>
              </div>
              {dryRunResult.criadas === 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Todas as mensalidades já foram geradas para este mês.
                </p>
              )}
              {dryRunResult.detalhes?.length > 0 && (
                <div className="max-h-40 overflow-y-auto text-xs space-y-0.5 rounded border border-border/40 p-2">
                  {dryRunResult.detalhes.map((d, i) => <p key={i} className="text-muted-foreground">{d.trim()}</p>)}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalMens(false); setDryRunResult(null) }}>Cancelar</Button>
            <Button onClick={() => gerarMens.mutate()} disabled={gerarMens.isPending || dryRunResult?.criadas === 0}>
              {gerarMens.isPending ? 'Gerando...' : `Confirmar (${dryRunResult?.criadas ?? 0})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
