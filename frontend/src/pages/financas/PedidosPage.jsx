import { useState, useMemo } from 'react'
import { ShoppingCart, Plus, Trash2, Banknote, X, Printer, ArrowLeft, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useList, useDelete, fetchAll } from '@/hooks/useApi'
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
const FORMAS   = ['pix', 'dinheiro', 'cartao', 'boleto']
const FORMAS_L = { pix: 'PIX', dinheiro: 'Dinheiro', cartao: 'Cartão', boleto: 'Boleto' }
const STATUS_V = { pendente: 'warning', pago: 'success', cancelado: 'secondary' }
const STATUS_L = { pendente: 'Pendente', pago: 'Pago', cancelado: 'Cancelado' }
const TABS     = [
  { key: 'produto', label: '💪 Produtos' },
  { key: 'servico', label: '🎯 Serviços' },
  { key: 'plano',   label: '📋 Planos' },
]

// ── Confirmar Pagamento Modal ─────────────────────────────────────────────────

function ConfirmarPagamentoModal({ pedido, onClose }) {
  const [forma,  setForma]  = useState(pedido.ped_forma_pagamento || '__none__')
  const [conta,  setConta]  = useState('__none__')
  const [data,   setData]   = useState(new Date().toISOString().split('T')[0])

  const { data: contas = [] } = useQuery({ queryKey: ['contas-select'], queryFn: () => fetchAll('/contas/', { cont_ativo: true }) })
  const qc  = useQueryClient()
  const mut = useMutation({
    mutationFn: (payload) => api.post(`/pedidos/${pedido.ped_id}/confirmar/`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast({ title: 'Pedido confirmado!', variant: 'success' }); onClose() },
    onError: (e) => toast({ title: 'Erro', description: e.response?.data?.detail || 'Erro desconhecido', variant: 'destructive' }),
  })

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted/40 px-4 py-3 text-sm space-y-1">
        <p className="font-semibold">{pedido.ped_numero}</p>
        <p className="text-muted-foreground">{pedido.alu_nome || pedido.ped_nome_cliente || '—'}</p>
        <p className="text-fluir-cyan font-bold text-base">{formatCurrency(pedido.ped_total)}</p>
      </div>
      <FormField label="Data do Pagamento" required>
        <Input type="date" value={data} onChange={e => setData(e.target.value)} />
      </FormField>
      <FormField label="Forma de Pagamento">
        <Select value={forma} onValueChange={setForma}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhuma</SelectItem>
            {FORMAS.map(f => <SelectItem key={f} value={f}>{FORMAS_L[f]}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Conta">
        <Select value={conta} onValueChange={setConta}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
            {contas.map(c => <SelectItem key={c.cont_id} value={String(c.cont_id)}>{c.cont_nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button disabled={mut.isPending} onClick={() => mut.mutate({
          conta: conta !== '__none__' ? parseInt(conta) : null,
          forma: forma !== '__none__' ? forma : null,
          data,
        })}>
          {mut.isPending ? 'Confirmando...' : 'Confirmar'}
        </Button>
      </DialogFooter>
    </div>
  )
}

// ── CarrinhoItem ──────────────────────────────────────────────────────────────

function CarrinhoItem({ item, onAumentar, onDiminuir, onRemover }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/20 last:border-0">
      <span className="text-sm truncate flex-1 min-w-0">{item.descricao}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={onDiminuir} className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted/50 text-muted-foreground font-bold text-sm">-</button>
        <span className="text-xs w-5 text-center font-medium">{item.quantidade}</span>
        <button onClick={onAumentar} className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted/50 text-muted-foreground font-bold text-sm">+</button>
      </div>
      <span className="text-sm font-medium text-fluir-cyan shrink-0 text-right" style={{ minWidth: '4.5rem' }}>{formatCurrency(item.valor_total)}</span>
      <button onClick={onRemover} className="text-destructive hover:opacity-70 shrink-0"><X size={12} /></button>
    </div>
  )
}

// ── CartView ──────────────────────────────────────────────────────────────────

function CartView({ onVoltar }) {
  const [carrinho,    setCarrinho]    = useState([])
  const [alu,         setAlu]         = useState('__none__')
  const [nomeCliente, setNomeCliente] = useState('')
  const [contaId,     setContaId]     = useState('__none__')
  const [forma,       setForma]       = useState('__none__')
  const [pagFuturo,   setPagFuturo]   = useState(false)
  const [numParcelas, setNumParcelas] = useState(1)
  const [obs,         setObs]         = useState('')
  const [pedData,     setPedData]     = useState(new Date().toISOString().split('T')[0])
  const [busca,       setBusca]       = useState('')
  const [tab,         setTab]         = useState('produto')
  const [drawerAberto, setDrawerAberto] = useState(false)

  const { data: alunos         = [] } = useQuery({ queryKey: ['alunos-select'],   queryFn: () => fetchAll('/alunos/') })
  const { data: produtos        = [] } = useQuery({ queryKey: ['produtos-select'], queryFn: () => fetchAll('/produtos/', { prod_ativo: true }) })
  const { data: servicos        = [] } = useQuery({ queryKey: ['servicos-select'], queryFn: () => fetchAll('/servicos-produtos/', { serv_ativo: true }) })
  const { data: contas          = [] } = useQuery({ queryKey: ['contas-select'],   queryFn: () => fetchAll('/contas/', { cont_ativo: true }) })
  const { data: planosCatalogo  = [] } = useQuery({ queryKey: ['planos-catalogo'], queryFn: () => fetchAll('/planos-pagamentos/') })
  const { data: planosDoAluno   = [] } = useQuery({
    queryKey: ['aluno-plano-pedido', alu],
    queryFn:  () => fetchAll('/aluno-plano/', { aluno: alu, aplano_ativo: true }),
    enabled:  !!alu && alu !== '__none__',
  })

  const qc  = useQueryClient()
  const mut = useMutation({
    mutationFn: (payload) => api.post(ENDPOINT, payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast({ title: 'Pedido criado!', variant: 'success' })
      onVoltar()
    },
    onError: (e) => toast({ title: 'Erro ao criar pedido', description: JSON.stringify(e.response?.data), variant: 'destructive' }),
  })

  const adicionarItem = (item) => {
    setCarrinho(prev => {
      const existente = prev.find(i => i.key === item.key)
      if (existente) {
        return prev.map(i => i.key === item.key
          ? { ...i, quantidade: i.quantidade + 1, valor_total: (i.quantidade + 1) * i.valor_unitario }
          : i
        )
      }
      return [...prev, { ...item, quantidade: 1, valor_total: item.valor_unitario }]
    })
  }

  const ajustarQtd = (key, delta) => {
    setCarrinho(prev => prev
      .map(i => i.key === key ? { ...i, quantidade: i.quantidade + delta, valor_total: (i.quantidade + delta) * i.valor_unitario } : i)
      .filter(i => i.quantidade > 0)
    )
  }

  const removerItem = (key) => setCarrinho(prev => prev.filter(i => i.key !== key))

  const total = carrinho.reduce((s, i) => s + i.valor_total, 0)
  const temAluno = alu !== '__none__'

  const itensTab = useMemo(() => {
    const q = busca.toLowerCase()
    if (tab === 'produto') {
      return produtos
        .filter(p => !q || p.prod_nome.toLowerCase().includes(q))
        .map(p => ({ key: `produto-${p.prod_id}`, tipo: 'produto', item_id: p.prod_id, descricao: p.prod_nome, valor_unitario: parseFloat(p.prod_valor_venda), isAlunoPlano: false }))
    }
    if (tab === 'servico') {
      return servicos
        .filter(s => !q || s.serv_nome.toLowerCase().includes(q))
        .map(s => ({ key: `servico-${s.serv_id}`, tipo: 'servico', item_id: s.serv_id, descricao: s.serv_nome, valor_unitario: parseFloat(s.serv_valor_base), isAlunoPlano: false }))
    }
    if (tab === 'plano') {
      if (temAluno) {
        return planosDoAluno
          .filter(p => !q || p.plan_descricao?.toLowerCase().includes(q))
          .map(p => ({ key: `plano-${p.aplano_id}`, tipo: 'plano', item_id: p.aplano_id, descricao: p.plan_descricao || p.serv_nome, valor_unitario: parseFloat(p.plan_valor_plano), isAlunoPlano: true }))
      }
      return planosCatalogo
        .filter(p => !q || p.serv_nome?.toLowerCase().includes(q))
        .map(p => ({ key: `plano-${p.plan_id}`, tipo: 'plano', item_id: p.plan_id, descricao: `${p.serv_nome} (${p.plan_tipo_plano})`, valor_unitario: parseFloat(p.plan_valor_plano), isAlunoPlano: false }))
    }
    return []
  }, [tab, busca, produtos, servicos, planosDoAluno, planosCatalogo, temAluno])

  const handleConfirmar = () => {
    if (!carrinho.length) { toast({ title: 'Carrinho vazio.', variant: 'destructive' }); return }
    const aluVal = temAluno ? parseInt(alu) : null
    if (!aluVal && !nomeCliente.trim()) { toast({ title: 'Informe o aluno ou o nome do cliente.', variant: 'destructive' }); return }
    mut.mutate({
      alu:                  aluVal,
      ped_nome_cliente:     aluVal ? null : nomeCliente,
      ped_data:             pedData,
      ped_forma_pagamento:  forma !== '__none__' ? forma : null,
      ped_pagamento_futuro: pagFuturo,
      ped_num_parcelas:     pagFuturo ? (parseInt(numParcelas) || 1) : 1,
      conta:                contaId !== '__none__' ? parseInt(contaId) : null,
      ped_status:           'pendente',
      ped_observacoes:      obs || null,
      itens: carrinho.map(i => ({
        item_tipo:           i.tipo,
        prod:                i.tipo === 'produto' ? i.item_id : null,
        serv:                i.tipo === 'servico' ? i.item_id : null,
        aplano:              i.tipo === 'plano' && i.isAlunoPlano ? i.item_id : null,
        item_descricao:      i.descricao,
        item_quantidade:     i.quantidade,
        item_valor_unitario: parseFloat(i.valor_unitario).toFixed(2),
      })),
    })
  }

  const painelCarrinho = (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">🛒 Carrinho</p>

      <FormField label="Cliente">
        <Select value={alu} onValueChange={v => { setAlu(v); setNomeCliente('') }}>
          <SelectTrigger><SelectValue placeholder="Selecionar aluno..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Nenhum</SelectItem>
            {alunos.map(a => <SelectItem key={a.alu_id} value={String(a.alu_id)}>{a.alu_nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      {alu === '__none__' && (
        <Input placeholder="Nome do cliente" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} />
      )}

      <div className="min-h-[72px] max-h-48 overflow-y-auto">
        {carrinho.length === 0
          ? <p className="text-xs text-muted-foreground text-center py-5">Adicione itens do catálogo</p>
          : carrinho.map(item => (
            <CarrinhoItem
              key={item.key}
              item={item}
              onAumentar={() => ajustarQtd(item.key, 1)}
              onDiminuir={() => ajustarQtd(item.key, -1)}
              onRemover={() => removerItem(item.key)}
            />
          ))
        }
      </div>

      <div className="flex items-center justify-between rounded-lg bg-fluir-dark-3 px-3 py-2">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-bold text-fluir-cyan">{formatCurrency(total)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="Forma">
          <Select value={forma} onValueChange={setForma}>
            <SelectTrigger><SelectValue placeholder="Forma..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
              {FORMAS.map(f => <SelectItem key={f} value={f}>{FORMAS_L[f]}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Conta">
          <Select value={contaId} onValueChange={setContaId}>
            <SelectTrigger><SelectValue placeholder="Conta..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Não informar</SelectItem>
              {contas.map(c => <SelectItem key={c.cont_id} value={String(c.cont_id)}>{c.cont_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField label="Data">
          <Input type="date" value={pedData} onChange={e => setPedData(e.target.value)} />
        </FormField>
        <FormField label="Pagamento">
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={pagFuturo} onChange={e => { setPagFuturo(e.target.checked); setNumParcelas(1) }} className="w-4 h-4" />
            <span className="text-sm">Futuro</span>
          </label>
          {pagFuturo && (
            <div className="flex items-center gap-2 mt-1.5">
              <Input
                type="number" min="1" max="36"
                value={numParcelas}
                onChange={e => setNumParcelas(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">parcela{numParcelas !== 1 ? 's' : ''}</span>
            </div>
          )}
        </FormField>
      </div>

      <Input placeholder="Observações (opcional)" value={obs} onChange={e => setObs(e.target.value)} />

      <Button onClick={handleConfirmar} disabled={mut.isPending || !carrinho.length} className="w-full">
        {mut.isPending ? 'Salvando...' : '✅ Confirmar Pedido'}
      </Button>
    </div>
  )

  return (
    <div className="space-y-4 pb-24 md:pb-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onVoltar}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="text-lg font-semibold">Novo Pedido</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Catálogo */}
        <Card className="flex-1 min-w-0">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-8" />
            </div>

            <div className="flex gap-1 border-b border-border/40 pb-2">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setBusca('') }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    tab === t.key
                      ? 'bg-fluir-cyan/20 text-fluir-cyan font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {itensTab.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum item encontrado</p>
                : itensTab.map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2 px-1 hover:bg-muted/20 rounded border-b border-border/20 last:border-0">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="text-sm font-medium truncate">{item.descricao}</p>
                      <p className="text-xs text-fluir-cyan">{formatCurrency(item.valor_unitario)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => adicionarItem(item)} className="shrink-0 h-7 px-2">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>

        {/* Carrinho — desktop */}
        <Card className="hidden md:block w-72 shrink-0">
          <CardContent className="p-4">
            {painelCarrinho}
          </CardContent>
        </Card>
      </div>

      {/* Mobile: barra inferior */}
      <div className="fixed bottom-20 left-0 right-0 z-40 md:hidden px-4">
        <button
          onClick={() => setDrawerAberto(true)}
          className="w-full flex items-center justify-between bg-fluir-dark-2 border border-border/60 rounded-xl px-4 py-3 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-fluir-cyan" />
            <span className="text-sm font-medium">{carrinho.length} item{carrinho.length !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-fluir-cyan font-bold">{formatCurrency(total)}</span>
        </button>
      </div>

      {/* Mobile: drawer */}
      {drawerAberto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerAberto(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-fluir-dark-2 rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold">Carrinho</span>
              <button onClick={() => setDrawerAberto(false)}><X className="w-5 h-5" /></button>
            </div>
            {painelCarrinho}
          </div>
        </div>
      )}
    </div>
  )
}

// ── ListView ──────────────────────────────────────────────────────────────────

function ListView({ onNovoPedido }) {
  const [statusFiltro, setStatusFiltro] = useState('all')
  const [modalPagar,   setModalPagar]   = useState(null)
  const [deleteId,     setDeleteId]     = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Pedido excluído.' })

  const handleStatus = (v) => { setStatusFiltro(v); setFilters(v !== 'all' ? { ped_status: v } : {}) }

  const columns = [
    { header: 'Número',  render: r => <span className="font-mono font-medium">{r.ped_numero}</span> },
    { header: 'Cliente', render: r => r.alu_nome || r.ped_nome_cliente || '—' },
    {
      header: 'Itens',
      render: r => (
        <span className="text-muted-foreground text-xs">
          {r.itens?.map(i => `${i.item_descricao} ×${i.item_quantidade}`).join(', ') || '—'}
        </span>
      ),
    },
    { header: 'Total',  render: r => <span className="font-semibold text-fluir-cyan">{formatCurrency(r.ped_total)}</span> },
    { header: 'Data',   render: r => formatDate(r.ped_data) },
    { header: 'Status', render: r => <Badge variant={STATUS_V[r.ped_status] ?? 'secondary'}>{STATUS_L[r.ped_status] ?? r.ped_status}</Badge> },
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
            <Button size="icon" variant="ghost" title="Baixar recibo PDF"
              onClick={async () => {
                try {
                  const res = await api.get(`/pedidos/${r.ped_id}/recibo/`, { responseType: 'blob' })
                  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
                  const a = document.createElement('a')
                  a.href = url; a.download = `recibo-${r.ped_numero}.pdf`; a.click()
                  URL.revokeObjectURL(url)
                } catch { toast({ title: 'Erro ao gerar recibo', variant: 'destructive' }) }
              }}>
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
        actions={<Button onClick={onNovoPedido}><Plus className="w-4 h-4" />Novo Pedido</Button>}
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex gap-2">
            {[['all', 'Todos'], ['pendente', 'Pendentes'], ['pago', 'Pagos'], ['cancelado', 'Cancelados']].map(([v, l]) => (
              <Button key={v} size="sm" variant={statusFiltro === v ? 'default' : 'outline'} onClick={() => handleStatus(v)}>{l}</Button>
            ))}
          </div>
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum pedido encontrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

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

// ── Página ────────────────────────────────────────────────────────────────────

export default function PedidosPage() {
  const [showCart, setShowCart] = useState(false)

  if (showCart) return <CartView onVoltar={() => setShowCart(false)} />
  return <ListView onNovoPedido={() => setShowCart(true)} />
}
