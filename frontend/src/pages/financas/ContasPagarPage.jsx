import { useState, useMemo } from 'react'
import { CreditCard, Plus, Pencil, Trash2, Banknote, ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

const KEY      = 'contas-pagar'
const ENDPOINT = '/contas-pagar/'

const TIPOS_DESPESA = [
  { value: 'aluguel',   label: 'Aluguel' },
  { value: 'prolabore', label: 'Pró-labore' },
  { value: 'material',  label: 'Material/Equipamento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'servico',   label: 'Serviço Terceiro' },
  { value: 'taxa',      label: 'Taxa Bancária' },
  { value: 'outros',    label: 'Outros' },
]

const FORMAS = ['PIX', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência']

// ── helpers ───────────────────────────────────────────────────────────────────

function getStatusInfo(r) {
  const today  = new Date().toISOString().split('T')[0]
  const amanha = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
  const venc   = r.pag_data_vencimento?.split('T')[0] ?? ''

  if (r.pag_status === 'pago')      return { label: 'Pago',      variant: 'success',     dot: 'bg-green-500' }
  if (r.pag_status === 'cancelado') return { label: 'Cancelado', variant: 'secondary',   dot: 'bg-gray-500' }
  if (venc < today || r.pag_status === 'vencido') return { label: 'Vencida',  variant: 'destructive', dot: 'bg-red-500' }
  if (venc <= amanha) return { label: 'Pendente', variant: 'warning',     dot: 'bg-yellow-500' }
  return { label: 'Futuro', variant: 'cyan', dot: 'bg-blue-500' }
}

function mesLabel(key) {
  const [ano, mes] = key.split('-')
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${nomes[parseInt(mes) - 1]} ${ano}`
}

function calcPeriodo(opcao) {
  const hoje  = new Date()
  const ano   = hoje.getFullYear()
  const mes   = hoje.getMonth()
  const start = new Date(ano, mes - 1, 1)
  const end   = opcao === '1' ? new Date(ano, mes + 1, 0)
              : opcao === '3' ? new Date(ano, mes + 3, 0)
              :                 new Date(ano, mes + 6, 0)
  return {
    gte: start.toISOString().split('T')[0],
    lte: end.toISOString().split('T')[0],
  }
}

// ── Modal de Pagamento Rápido ─────────────────────────────────────────────────

function PagamentoModal({ pag, onClose }) {
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

  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose, successMsg: 'Pagamento confirmado!' })

  const onSubmit = (data) => {
    update.mutate({
      id: pag.pag_id,
      data: {
        pag_status:          'pago',
        pag_data_pagamento:  data.data,
        pag_forma_pagamento: data.forma !== '__none__' ? data.forma : null,
        conta:               data.conta !== '__none__' ? parseInt(data.conta) : null,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-md bg-muted/40 px-4 py-3 text-sm space-y-0.5">
        <p className="font-medium">{pag.forn_nome || pag.cpa_nome_credor || '—'}</p>
        <p className="text-muted-foreground">{pag.pag_descricao}</p>
        <p className="text-red-400 font-semibold text-base">{formatCurrency(pag.pag_valor_total)}</p>
      </div>

      <FormField label="Data do Pagamento" required>
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

      <FormField label="Conta de Saída">
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
          {update.isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Formulário de Cadastro/Edição ─────────────────────────────────────────────

function ContaPagarForm({ pag, onClose }) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: pag ? {
      forn:                pag.forn        ? String(pag.forn)        : '__none__',
      serv:                pag.serv        ? String(pag.serv)        : '__none__',
      plano_contas:        pag.plano_contas ? String(pag.plano_contas): '__none__',
      conta:               pag.conta       ? String(pag.conta)       : '__none__',
      cpa_tipo:            pag.cpa_tipo    || '__none__',
      cpa_nome_credor:     pag.cpa_nome_credor || '',
      pag_descricao:       pag.pag_descricao,
      pag_valor_unitario:  pag.pag_valor_unitario || '',
      pag_quantidade:      pag.pag_quantidade || 1,
      pag_data_emissao:    pag.pag_data_emissao?.split('T')[0] ?? '',
      pag_data_vencimento: pag.pag_data_vencimento?.split('T')[0] ?? '',
      pag_status:          pag.pag_status || 'pendente',
      pag_data_pagamento:  pag.pag_data_pagamento?.split('T')[0] ?? '',
      pag_forma_pagamento: pag.pag_forma_pagamento || '__none__',
      pag_observacoes:     pag.pag_observacoes || '',
    } : {
      forn: '__none__', serv: '__none__', plano_contas: '__none__',
      conta: '__none__', cpa_tipo: '__none__',
      pag_quantidade: 1, pag_status: 'pendente',
      pag_data_emissao: new Date().toISOString().split('T')[0],
      pag_forma_pagamento: '__none__',
    },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending
  const status = watch('pag_status')

  const qtd   = parseFloat(watch('pag_quantidade') || 1)
  const unit  = parseFloat(watch('pag_valor_unitario') || 0)
  const total = qtd * unit

  const { data: fornecedores } = useQuery({ queryKey: ['fornecedores-select'], queryFn: () => fetchAll('/fornecedores/') })
  const { data: servicos }     = useQuery({ queryKey: ['servicos-select'],     queryFn: () => fetchAll('/servicos-produtos/', { serv_ativo: true }) })
  const { data: planosContas } = useQuery({ queryKey: ['plano-contas-select'], queryFn: () => fetchAll('/plano-contas/', { plc_ativo: true }) })
  const { data: contas }       = useQuery({ queryKey: ['contas-select'],       queryFn: () => fetchAll('/contas/', { cont_ativo: true }) })

  const onSubmit = (data) => {
    const fornVal = data.forn !== '__none__' ? parseInt(data.forn) : null
    if (!fornVal && !data.cpa_nome_credor?.trim()) {
      toast({ title: 'Informe o fornecedor ou o nome do credor.', variant: 'destructive' }); return
    }
    const payload = {
      forn:                fornVal,
      cpa_nome_credor:     fornVal ? null : data.cpa_nome_credor,
      cpa_tipo:            data.cpa_tipo !== '__none__' ? data.cpa_tipo : null,
      serv:                data.serv !== '__none__' ? parseInt(data.serv) : null,
      plano_contas:        data.plano_contas !== '__none__' ? parseInt(data.plano_contas) : null,
      conta:               data.conta !== '__none__' ? parseInt(data.conta) : null,
      pag_descricao:       data.pag_descricao,
      pag_valor_unitario:  data.pag_valor_unitario,
      pag_quantidade:      parseInt(data.pag_quantidade) || 1,
      pag_data_emissao:    data.pag_data_emissao || null,
      pag_data_vencimento: data.pag_data_vencimento || null,
      pag_status:          data.pag_status,
      pag_data_pagamento:  status === 'pago' ? (data.pag_data_pagamento || null) : null,
      pag_forma_pagamento: status === 'pago' && data.pag_forma_pagamento !== '__none__' ? data.pag_forma_pagamento : null,
      pag_observacoes:     data.pag_observacoes || null,
    }
    if (pag) update.mutate({ id: pag.pag_id, data: payload })
    else      create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5 max-h-[70vh] overflow-y-auto">

      {/* Tipo */}
      <FormField label="Tipo de Despesa">
        <Select value={watch('cpa_tipo')} onValueChange={v => setValue('cpa_tipo', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar tipo..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
            {TIPOS_DESPESA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      {/* Fornecedor ou nome credor */}
      <FormField label="Fornecedor">
        <Select value={watch('forn')} onValueChange={v => setValue('forn', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
            {fornecedores?.map(f => <SelectItem key={f.forn_id} value={String(f.forn_id)}>{f.forn_nome_empresa}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      {(watch('forn') === '__none__' || !watch('forn')) && (
        <FormField label="Nome do Credor">
          <Input {...register('cpa_nome_credor')} placeholder="Nome para registro" disabled={busy} />
        </FormField>
      )}

      {/* Descrição */}
      <FormField label="Descrição" required>
        <Input {...register('pag_descricao', { required: true })} placeholder="Ex: Aluguel do espaço — Maio/2026" disabled={busy} />
      </FormField>

      {/* Valor + Qtd */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Valor Unitário (R$)" required>
          <Input type="number" step="0.01" {...register('pag_valor_unitario', { required: true })} placeholder="0.00" disabled={busy} />
        </FormField>
        <FormField label="Quantidade">
          <Input type="number" min="1" {...register('pag_quantidade')} disabled={busy} />
        </FormField>
      </div>

      {total > 0 && (
        <div className="rounded-lg bg-fluir-dark-3 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Total calculado:</span>
          <span className="text-base font-semibold text-red-400">{formatCurrency(total)}</span>
        </div>
      )}

      {/* Emissão + Vencimento */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Emissão" required>
          <Input type="date" {...register('pag_data_emissao', { required: true })} disabled={busy} />
        </FormField>
        <FormField label="Vencimento" required>
          <Input type="date" {...register('pag_data_vencimento', { required: true })} disabled={busy} />
        </FormField>
      </div>

      {/* Status */}
      <FormField label="Status">
        <Select value={watch('pag_status')} onValueChange={v => setValue('pag_status', v)} disabled={busy}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {status === 'pago' && (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Data do Pagamento" required>
            <Input type="date" {...register('pag_data_pagamento')} disabled={busy} />
          </FormField>
          <FormField label="Forma">
            <Select value={watch('pag_forma_pagamento')} onValueChange={v => setValue('pag_forma_pagamento', v)}>
              <SelectTrigger><SelectValue placeholder="Forma..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Nenhuma</SelectItem>
                {FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      )}

      {/* Conta + Plano de Contas */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Conta de Saída">
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
              {planosContas?.map(p => <SelectItem key={p.plc_id} value={String(p.plc_id)}>{p.plc_codigo} — {p.plc_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {/* Serviço */}
      <FormField label="Serviço">
        <Select value={watch('serv')} onValueChange={v => setValue('serv', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
            {servicos?.map(s => <SelectItem key={s.serv_id} value={String(s.serv_id)}>{s.serv_nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Observações">
        <Input {...register('pag_observacoes')} placeholder="Observações opcionais" disabled={busy} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : pag ? 'Salvar Alterações' : 'Cadastrar'}</Button>
      </DialogFooter>
    </form>
  )
}

// ── Linha da tabela mensal ────────────────────────────────────────────────────

function LinhaPag({ r, onEditar, onExcluir, onPagar }) {
  const status  = getStatusInfo(r)
  const podePagar = r.pag_status !== 'pago' && r.pag_status !== 'cancelado'

  return (
    <div className="flex flex-wrap items-center gap-2 py-2.5 px-3 border-b border-border/30 last:border-0 hover:bg-muted/20 rounded text-sm">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
        <span className="font-medium truncate">{r.forn_nome || r.cpa_nome_credor || '—'}</span>
        {r.cpa_tipo && <Badge variant="outline" className="text-[10px] hidden md:inline-flex">{TIPOS_DESPESA.find(t => t.value === r.cpa_tipo)?.label ?? r.cpa_tipo}</Badge>}
      </div>
      <span className="text-muted-foreground hidden md:block truncate max-w-[180px]">{r.pag_descricao}</span>
      <span className="text-muted-foreground text-xs">{formatDate(r.pag_data_vencimento)}</span>
      <span className="font-semibold text-red-400">{formatCurrency(r.pag_valor_total)}</span>
      <Badge variant={status.variant} className="text-[11px]">{status.label}</Badge>
      <div className="flex items-center gap-1 ml-auto">
        {podePagar && (
          <Button size="icon" variant="ghost" title="Confirmar pagamento" onClick={() => onPagar(r)}>
            <Banknote className="w-4 h-4 text-orange-400" />
          </Button>
        )}
        <Button size="icon" variant="ghost" title="Editar" onClick={() => onEditar(r)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" title="Excluir" onClick={() => onExcluir(r.pag_id)}>
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function ContasPagarPage() {
  const [periodo,      setPeriodo]     = useState('6')
  const [statusFiltro, setStatusFiltro]= useState('all')
  const [tipoFiltro,   setTipoFiltro]  = useState('all')
  const [modalForm,    setModalForm]   = useState(null)
  const [modalPagar,   setModalPagar]  = useState(null)
  const [deleteId,     setDeleteId]    = useState(null)
  const [mesesAbertos, setMesesAbertos]= useState({})

  const { gte, lte } = calcPeriodo(periodo)

  const { data: registros = [], isLoading, refetch } = useQuery({
    queryKey: [KEY, periodo, statusFiltro, tipoFiltro],
    queryFn: () => fetchAll(ENDPOINT, {
      pag_data_vencimento__gte: gte,
      pag_data_vencimento__lte: lte,
      ordering: 'pag_data_vencimento',
      ...(statusFiltro !== 'all' ? { pag_status: statusFiltro } : {}),
      ...(tipoFiltro   !== 'all' ? { cpa_tipo:   tipoFiltro   } : {}),
    }),
  })

  const del = useDelete(KEY, ENDPOINT, { onSuccess: refetch, successMsg: 'Conta excluída.' })

  const porMes = useMemo(() => {
    const grupos = {}
    registros.forEach(r => {
      const d   = new Date(r.pag_data_vencimento)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!grupos[key]) grupos[key] = []
      grupos[key].push(r)
    })
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b))
  }, [registros])

  const toggleMes = (key) => setMesesAbertos(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contas a Pagar"
        description="Despesas agrupadas por mês de vencimento"
        actions={<Button onClick={() => setModalForm('novo')}><Plus className="w-4 h-4" />Nova Conta</Button>}
      />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex gap-1">
              {[['1','Mês atual'],['3','3 meses'],['6','6 meses']].map(([v, l]) => (
                <Button key={v} size="sm" variant={periodo === v ? 'default' : 'outline'} onClick={() => setPeriodo(v)}>{l}</Button>
              ))}
            </div>
            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="vencido">Vencida</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {TIPOS_DESPESA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
        const aberto    = key in mesesAbertos ? mesesAbertos[key] : true
        const totalMes  = itens.reduce((s, r) => s + parseFloat(r.pag_valor_total), 0)
        const pagos     = itens.filter(r => r.pag_status === 'pago').reduce((s, r) => s + parseFloat(r.pag_valor_total), 0)
        const pendentes = itens.filter(r => r.pag_status !== 'pago' && r.pag_status !== 'cancelado').length

        return (
          <Card key={key}>
            <CardContent className="p-0">
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
                  <span className="text-muted-foreground hidden sm:block">Pago: <span className="text-green-400 font-medium">{formatCurrency(pagos)}</span></span>
                </div>
              </button>

              {aberto && (
                <div className="px-1 pb-1">
                  {itens.map(r => (
                    <LinhaPag
                      key={r.pag_id}
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
            <DialogTitle>{modalForm === 'novo' ? 'Nova Conta a Pagar' : 'Editar Conta a Pagar'}</DialogTitle>
          </DialogHeader>
          {modalForm && <ContaPagarForm pag={modalForm === 'novo' ? null : modalForm} onClose={() => setModalForm(null)} />}
        </DialogContent>
      </Dialog>

      {/* Modal: Pagamento rápido */}
      <Dialog open={!!modalPagar} onOpenChange={open => { if (!open) setModalPagar(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar Pagamento</DialogTitle></DialogHeader>
          {modalPagar && <PagamentoModal pag={modalPagar} onClose={() => setModalPagar(null)} />}
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
    </div>
  )
}
