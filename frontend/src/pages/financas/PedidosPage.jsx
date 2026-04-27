import { useState, useMemo } from 'react'
import { ShoppingCart, Plus, Trash2, Banknote, X, Printer } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useList, useDelete, fetchAll } from '@/hooks/useApi'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/primitives'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

const KEY      = 'pedidos'
const ENDPOINT = '/pedidos/'

const FORMAS   = ['pix','dinheiro','cartao','boleto']
const FORMAS_L = { pix:'PIX', dinheiro:'Dinheiro', cartao:'Cartão', boleto:'Boleto' }
const STATUS_V = { pendente: 'warning', pago: 'success', cancelado: 'secondary' }
const STATUS_L = { pendente: 'Pendente', pago: 'Pago', cancelado: 'Cancelado' }
const TIPOS_ITEM = ['produto','servico','plano']
const TIPOS_L    = { produto:'Produto', servico:'Serviço', plano:'Plano' }

// ── Modal de confirmação de pagamento ─────────────────────────────────────────

function ConfirmarPagamentoModal({ pedido, onClose }) {
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: { conta: '__none__', forma: pedido.ped_forma_pagamento || '__none__', data: new Date().toISOString().split('T')[0] },
  })
  const { data: contas = [] } = useQuery({ queryKey: ['contas-select'], queryFn: () => fetchAll('/contas/', { cont_ativo: true }) })
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: (data) => api.post(`/pedidos/${pedido.ped_id}/confirmar/`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast({ title: 'Pedido confirmado!', variant: 'success' }); onClose() },
    onError: (e) => toast({ title: 'Erro', description: e.response?.data?.detail || 'Erro desconhecido', variant: 'destructive' }),
  })

  const onSubmit = (data) => mut.mutate({
    conta: data.conta !== '__none__' ? parseInt(data.conta) : null,
    forma: data.forma !== '__none__' ? data.forma : null,
    data:  data.data,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-md bg-muted/40 px-4 py-3 text-sm space-y-1">
        <p className="font-semibold">{pedido.ped_numero}</p>
        <p className="text-muted-foreground">{pedido.alu_nome || pedido.ped_nome_cliente || '—'}</p>
        <p className="text-fluir-cyan font-bold text-base">{formatCurrency(pedido.ped_total)}</p>
      </div>
      <FormField label="Data do Pagamento" required>
        <Input type="date" {...register('data', { required: true })} />
      </FormField>
      <FormField label="Forma de Pagamento">
        <Select value={watch('forma')} onValueChange={v => setValue('forma', v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhuma</SelectItem>
            {FORMAS.map(f => <SelectItem key={f} value={f}>{FORMAS_L[f]}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Conta">
        <Select value={watch('conta')} onValueChange={v => setValue('conta', v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
            {contas.map(c => <SelectItem key={c.cont_id} value={String(c.cont_id)}>{c.cont_nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Confirmando...' : 'Confirmar'}</Button>
      </DialogFooter>
    </form>
  )
}

// ── Formulário de novo pedido ─────────────────────────────────────────────────

function NovoPedidoForm({ onClose }) {
  const [itens, setItens] = useState([{ tipo: '__none__', item_id: '__none__', descricao: '', qtd: 1, valor: '' }])
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      alu: '__none__', conta: '__none__', forma: '__none__',
      nome_cliente: '', data: new Date().toISOString().split('T')[0],
      pagamento_futuro: false, observacoes: '',
    },
  })

  const { data: alunos   = [] } = useQuery({ queryKey: ['alunos-select'],   queryFn: () => fetchAll('/alunos/') })
  const { data: produtos  = [] } = useQuery({ queryKey: ['produtos-select'], queryFn: () => fetchAll('/produtos/', { prod_ativo: true }) })
  const { data: servicos  = [] } = useQuery({ queryKey: ['servicos-select'], queryFn: () => fetchAll('/servicos-produtos/', { serv_ativo: true }) })
  const { data: contas    = [] } = useQuery({ queryKey: ['contas-select'],   queryFn: () => fetchAll('/contas/', { cont_ativo: true }) })

  const aluId = watch('alu')
  const { data: planosDoAluno = [] } = useQuery({
    queryKey: ['aluno-plano-pedido', aluId],
    queryFn: () => fetchAll('/aluno-plano/', { aluno: aluId, aplano_ativo: true }),
    enabled: !!aluId && aluId !== '__none__',
  })
  const { data: planosCatalogo = [] } = useQuery({
    queryKey: ['planos-catalogo'],
    queryFn: () => fetchAll('/planos-pagamentos/'),
    enabled: !aluId || aluId === '__none__',
  })

  const qc  = useQueryClient()
  const mut = useMutation({
    mutationFn: (data) => api.post(ENDPOINT, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast({ title: 'Pedido criado!', variant: 'success' }); onClose() },
    onError: (e) => {
      const msg = e.response?.data ? JSON.stringify(e.response.data) : 'Erro desconhecido'
      toast({ title: 'Erro ao criar pedido', description: msg, variant: 'destructive' })
    },
  })

  const total = itens.reduce((s, i) => s + (parseFloat(i.qtd || 1) * parseFloat(i.valor || 0)), 0)

  const addItem = () => setItens(prev => [...prev, { tipo: '__none__', item_id: '__none__', descricao: '', qtd: 1, valor: '' }])
  const removeItem = (idx) => setItens(prev => prev.filter((_, i) => i !== idx))
  const updateItem = (idx, field, value) => setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))

  const getOpcoes = (tipo) => {
    if (tipo === 'produto') return produtos.map(p => ({ id: p.prod_id, label: `${p.prod_nome} — ${formatCurrency(p.prod_valor_venda)}`, valor: p.prod_valor_venda }))
    if (tipo === 'servico') return servicos.map(s => ({ id: s.serv_id, label: `${s.serv_nome} — ${formatCurrency(s.serv_valor_base)}`, valor: s.serv_valor_base }))
    if (tipo === 'plano') {
      const temAluno = aluId && aluId !== '__none__'
      if (temAluno) return planosDoAluno.map(p => ({ id: p.aplano_id, label: `${p.plan_descricao} — ${formatCurrency(p.plan_valor_plano)}`, valor: p.plan_valor_plano, isAlunoPlano: true }))
      return planosCatalogo.map(p => ({ id: p.plan_id, label: `${p.serv_nome} — ${p.plan_tipo_plano} — ${formatCurrency(p.plan_valor_plano)}`, valor: p.plan_valor_plano }))
    }
    return []
  }

  const onSubmit = (data) => {
    const itensValidos = itens.filter(i => i.tipo !== '__none__' && i.descricao && parseFloat(i.valor) > 0)
    if (!itensValidos.length) { toast({ title: 'Adicione pelo menos um item.', variant: 'destructive' }); return }

    const aluVal = data.alu !== '__none__' ? parseInt(data.alu) : null
    if (!aluVal && !data.nome_cliente?.trim()) {
      toast({ title: 'Informe o aluno ou o nome do cliente.', variant: 'destructive' }); return
    }

    const payload = {
      alu:                 aluVal,
      ped_nome_cliente:    aluVal ? null : data.nome_cliente,
      ped_data:            data.data,
      ped_forma_pagamento: data.forma !== '__none__' ? data.forma : null,
      ped_pagamento_futuro: data.pagamento_futuro,
      conta:               data.conta !== '__none__' ? parseInt(data.conta) : null,
      ped_status:          'pendente',
      ped_observacoes:     data.observacoes || null,
      itens: itensValidos.map(i => ({
        item_tipo:           i.tipo,
        prod:                i.tipo === 'produto' ? parseInt(i.item_id) : null,
        serv:                i.tipo === 'servico' ? parseInt(i.item_id) : null,
        aplano:              i.tipo === 'plano' && i.isAlunoPlano ? parseInt(i.item_id) : null,
        item_descricao:      i.descricao,
        item_quantidade:     parseInt(i.qtd) || 1,
        item_valor_unitario: parseFloat(i.valor).toFixed(2),
      })),
    }
    mut.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5 max-h-[75vh] overflow-y-auto">
      {/* Cliente */}
      <FormField label="Aluno">
        <Select value={watch('alu')} onValueChange={v => {
          setValue('alu', v)
          setItens(prev => prev.map(i => i.tipo === 'plano' ? { ...i, item_id: '__none__', descricao: '', valor: '', isAlunoPlano: false } : i))
        }}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
            {alunos.map(a => <SelectItem key={a.alu_id} value={String(a.alu_id)}>{a.alu_nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      {(watch('alu') === '__none__' || !watch('alu')) && (
        <FormField label="Nome do Cliente">
          <Input {...register('nome_cliente')} placeholder="Nome para registro" />
        </FormField>
      )}

      {/* Data + Conta + Forma */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Data" required>
          <Input type="date" {...register('data', { required: true })} />
        </FormField>
        <FormField label="Conta">
          <Select value={watch('conta')} onValueChange={v => setValue('conta', v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
              {contas.map(c => <SelectItem key={c.cont_id} value={String(c.cont_id)}>{c.cont_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Forma de Pagamento">
          <Select value={watch('forma')} onValueChange={v => setValue('forma', v)}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
              {FORMAS.map(f => <SelectItem key={f} value={f}>{FORMAS_L[f]}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Pagamento">
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" {...register('pagamento_futuro')} className="w-4 h-4" />
            <span className="text-sm">Futuro (gera receber)</span>
          </label>
        </FormField>
      </div>

      {/* Itens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Itens</p>
          <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Item</Button>
        </div>
        {itens.map((item, idx) => {
          const opcoes = getOpcoes(item.tipo)
          return (
            <div key={idx} className="rounded-md border border-border/40 p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <select
                  className="rounded border border-border bg-background text-sm px-2 py-1"
                  value={item.tipo}
                  onChange={e => updateItem(idx, 'tipo', e.target.value)}
                >
                  <option value="__none__">Tipo...</option>
                  {TIPOS_ITEM.map(t => <option key={t} value={t}>{TIPOS_L[t]}</option>)}
                </select>
                {item.tipo !== '__none__' ? (
                  <select
                    className="rounded border border-border bg-background text-sm px-2 py-1"
                    value={item.item_id}
                    onChange={e => {
                      const opt = opcoes.find(o => String(o.id) === e.target.value)
                      updateItem(idx, 'item_id', e.target.value)
                      if (opt) {
                        updateItem(idx, 'descricao', opt.label.split(' — ')[0])
                        updateItem(idx, 'valor', parseFloat(opt.valor).toFixed(2))
                        updateItem(idx, 'isAlunoPlano', opt.isAlunoPlano ?? false)
                      }
                    }}
                  >
                    <option value="__none__">Selecionar...</option>
                    {opcoes.map(o => <option key={o.id} value={String(o.id)}>{o.label}</option>)}
                  </select>
                ) : (
                  <Input placeholder="Descrição" value={item.descricao} onChange={e => updateItem(idx, 'descricao', e.target.value)} className="text-sm" />
                )}
                <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)} className="justify-self-end"><X className="w-3.5 h-3.5 text-destructive" /></Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {item.tipo !== '__none__' && (
                  <Input placeholder="Descrição" value={item.descricao} onChange={e => updateItem(idx, 'descricao', e.target.value)} className="text-sm col-span-1" />
                )}
                <Input type="number" min="1" placeholder="Qtd" value={item.qtd} onChange={e => updateItem(idx, 'qtd', e.target.value)} className="text-sm" />
                <Input type="number" step="0.01" placeholder="R$" value={item.valor} onChange={e => updateItem(idx, 'valor', e.target.value)} className="text-sm" />
                <span className="text-sm text-fluir-cyan font-medium self-center">
                  {formatCurrency((parseFloat(item.qtd || 1)) * parseFloat(item.valor || 0))}
                </span>
              </div>
            </div>
          )
        })}
        <div className="flex justify-end pt-1">
          <span className="text-sm text-muted-foreground mr-2">Total:</span>
          <span className="text-fluir-cyan font-bold">{formatCurrency(total)}</span>
        </div>
      </div>

      <FormField label="Observações">
        <Input {...register('observacoes')} placeholder="Observações opcionais" />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={mut.isPending}>Cancelar</Button>
        <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Salvando...' : 'Criar Pedido'}</Button>
      </DialogFooter>
    </form>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function PedidosPage() {
  const [statusFiltro, setStatusFiltro] = useState('all')
  const [modalNovo,    setModalNovo]    = useState(false)
  const [modalPagar,   setModalPagar]   = useState(null)
  const [deleteId,     setDeleteId]     = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Pedido excluído.' })

  const handleStatus = (v) => { setStatusFiltro(v); setFilters(v !== 'all' ? { ped_status: v } : {}) }

  const columns = [
    { header: 'Número',   render: r => <span className="font-mono font-medium">{r.ped_numero}</span> },
    { header: 'Cliente',  render: r => r.alu_nome || r.ped_nome_cliente || '—' },
    {
      header: 'Itens',
      render: r => (
        <span className="text-muted-foreground text-xs">
          {r.itens?.map(i => `${i.item_descricao} ×${i.item_quantidade}`).join(', ') || '—'}
        </span>
      ),
    },
    { header: 'Total',    render: r => <span className="font-semibold text-fluir-cyan">{formatCurrency(r.ped_total)}</span> },
    { header: 'Data',     render: r => formatDate(r.ped_data) },
    { header: 'Status',   render: r => <Badge variant={STATUS_V[r.ped_status] ?? 'secondary'}>{STATUS_L[r.ped_status] ?? r.ped_status}</Badge> },
    {
      header: '',
      render: r => (
        <div className="flex gap-1 justify-end">
          {r.ped_status === 'pendente' && (
            <Button size="icon" variant="ghost" title="Confirmar pagamento" onClick={() => setModalPagar(r)}>
              <Banknote className="w-4 h-4 text-green-400" />
            </Button>
          )}
          {r.ped_status === 'pago' && (
            <Button size="icon" variant="ghost" title="Imprimir recibo" onClick={() => window.print()}>
              <Printer className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
          <Button size="icon" variant="ghost" title="Excluir" onClick={() => setDeleteId(r.ped_id)}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pedidos"
        description="Venda de produtos, serviços e planos"
        actions={<Button onClick={() => setModalNovo(true)}><Plus className="w-4 h-4" />Novo Pedido</Button>}
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex gap-2">
            {[['all','Todos'],['pendente','Pendentes'],['pago','Pagos'],['cancelado','Cancelados']].map(([v,l]) => (
              <Button key={v} size="sm" variant={statusFiltro === v ? 'default' : 'outline'} onClick={() => handleStatus(v)}>{l}</Button>
            ))}
          </div>
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum pedido encontrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalNovo} onOpenChange={setModalNovo}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Novo Pedido</DialogTitle></DialogHeader>
          <NovoPedidoForm onClose={() => setModalNovo(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!modalPagar} onOpenChange={open => { if (!open) setModalPagar(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar Pagamento</DialogTitle></DialogHeader>
          {modalPagar && <ConfirmarPagamentoModal pedido={modalPagar} onClose={() => setModalPagar(null)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Pedido" description="Deseja excluir este pedido?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
