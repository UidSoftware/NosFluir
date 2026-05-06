import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Landmark, PiggyBank, Wallet, Plus,
} from 'lucide-react'
import { fetchAll } from '@/hooks/useApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/primitives'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CONTA_STYLE = {
  corrente: { bg: 'bg-gradient-to-br from-blue-900 to-blue-700',    icon: Landmark, label: 'Conta Corrente' },
  poupanca: { bg: 'bg-gradient-to-br from-emerald-900 to-emerald-700', icon: PiggyBank, label: 'Poupança' },
  caixa:    { bg: 'bg-gradient-to-br from-amber-900 to-amber-700',   icon: Wallet,   label: 'Caixa Físico' },
}

function ContaCard({ conta, selected, onClick }) {
  const style = CONTA_STYLE[conta.cont_tipo] || CONTA_STYLE.caixa
  const Icon  = style.icon
  const saldo = conta.saldo_atual ?? 0
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-2xl p-5 text-left transition-all w-full min-w-[200px] max-w-[260px]',
        style.bg,
        selected ? 'ring-2 ring-white/80 shadow-lg scale-[1.02]' : 'opacity-80 hover:opacity-100',
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-6 h-6 text-white/70" />
        <span className="text-xs text-white/60 font-medium uppercase tracking-wider">{style.label}</span>
      </div>
      <p className="text-white/70 text-xs mb-1 truncate">{conta.cont_nome}</p>
      <p className={cn('text-2xl font-bold', saldo >= 0 ? 'text-white' : 'text-red-300')}>
        {formatCurrency(saldo)}
      </p>
    </button>
  )
}

function MesNav({ mes, ano, onChange }) {
  const prev = () => mes === 1  ? onChange(12, ano - 1) : onChange(mes - 1, ano)
  const next = () => mes === 12 ? onChange(1,  ano + 1) : onChange(mes + 1, ano)
  return (
    <div className="flex items-center gap-3">
      <button onClick={prev} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-semibold w-36 text-center">{MESES[mes - 1]} {ano}</span>
      <button onClick={next} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function NovoLancamentoModal({ open, onClose, contaId, onSuccess }) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      tipo: 'entrada',
      valor: '',
      historico: '',
      lcx_competencia: new Date().toISOString().slice(0, 10),
      plano_contas: '__none__',
      lica_forma_pagamento: '',
    },
  })
  const tipo = watch('tipo')

  const { data: planos = [] } = useQuery({
    queryKey: ['plano-contas-select'],
    queryFn: () => fetchAll('/plano-contas/'),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: data => api.post('/livro-caixa/', data),
    onSuccess: () => {
      toast({ title: 'Lançamento criado!' })
      reset()
      onSuccess()
      onClose()
    },
    onError: () => toast({ title: 'Erro ao criar lançamento.', variant: 'destructive' }),
  })

  const onSubmit = data => {
    if (data.plano_contas === '__none__') {
      toast({ title: 'Selecione uma categoria para o lançamento.', variant: 'destructive' })
      return
    }
    const payload = {
      lica_tipo_lancamento: data.tipo,
      lica_valor: parseFloat(data.valor),
      lica_historico: data.historico,
      lcx_competencia: data.lcx_competencia || null,
      lica_forma_pagamento: data.lica_forma_pagamento || null,
      plano_contas: parseInt(data.plano_contas),
      conta: contaId,
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Toggle Entrada / Saída */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => setValue('tipo', 'entrada')}
              className={cn(
                'flex-1 py-2 text-sm font-semibold transition-colors',
                tipo === 'entrada'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              + Entrada
            </button>
            <button
              type="button"
              onClick={() => setValue('tipo', 'saida')}
              className={cn(
                'flex-1 py-2 text-sm font-semibold transition-colors',
                tipo === 'saida'
                  ? 'bg-red-600 text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              − Saída
            </button>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Valor *</p>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              {...register('valor', { required: true, min: 0.01 })}
              className={errors.valor ? 'border-red-500' : ''}
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Descrição *</p>
            <Input
              placeholder="Histórico do lançamento"
              {...register('historico', { required: true })}
              className={errors.historico ? 'border-red-500' : ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Data</p>
              <Input type="date" {...register('lcx_competencia')} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Forma de Pgto</p>
              <Input placeholder="Pix, Boleto..." {...register('lica_forma_pagamento')} />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Categoria <span className="text-red-400">*</span></p>
            <Select
              value={watch('plano_contas')}
              onValueChange={v => setValue('plano_contas', v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar categoria..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar categoria...</SelectItem>
                {planos.map(p => (
                  <SelectItem key={p.plc_id} value={String(p.plc_id)}>
                    {p.plc_codigo} — {p.plc_nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className={tipo === 'saida' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {mutation.isPending ? 'Salvando...' : 'Lançar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function MinhasContasPage() {
  const hoje = new Date()
  const [contaSel, setContaSel] = useState(null)
  const [mes, setMes]           = useState(hoje.getMonth() + 1)
  const [ano, setAno]           = useState(hoje.getFullYear())
  const [modalOpen, setModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: contas = [] } = useQuery({
    queryKey: ['contas-minhas'],
    queryFn: () => fetchAll('/contas/', { cont_ativo: true }),
  })

  const { data: extrato, isLoading } = useQuery({
    queryKey: ['extrato-conta', contaSel, mes, ano],
    queryFn: () =>
      api.get('/relatorios/extrato/', { params: { conta: contaSel, mes, ano } }).then(r => r.data),
    enabled: !!contaSel,
  })

  const handleLancamentoCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['extrato-conta', contaSel, mes, ano] })
    queryClient.invalidateQueries({ queryKey: ['contas-minhas'] })
  }

  const entradas = extrato?.lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0) ?? 0
  const saidas   = extrato?.lancamentos.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0) ?? 0

  return (
    <div className="space-y-6">
      <PageHeader title="Minhas Contas" />

      {/* Cards de conta */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {contas.map(c => (
          <ContaCard
            key={c.cont_id}
            conta={c}
            selected={contaSel === c.cont_id}
            onClick={() => setContaSel(contaSel === c.cont_id ? null : c.cont_id)}
          />
        ))}
      </div>

      {/* Extrato */}
      {contaSel && (
        <Card>
          <CardContent className="p-5 space-y-4">
            {/* Cabeçalho período */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <MesNav mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a) }} />

              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1 text-sm text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  {formatCurrency(entradas)}
                </span>
                <span className="flex items-center gap-1 text-sm text-red-400">
                  <TrendingDown className="w-4 h-4" />
                  {formatCurrency(saidas)}
                </span>
                <span className={cn('text-sm font-semibold', (entradas - saidas) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatCurrency(entradas - saidas)}
                </span>
                <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Lançamento
                </Button>
              </div>
            </div>

            {isLoading && (
              <p className="text-muted-foreground text-sm text-center py-8">Carregando...</p>
            )}

            {extrato && extrato.lancamentos.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">
                Nenhum lançamento em {MESES[mes - 1]} {ano}.
              </p>
            )}

            {extrato && extrato.lancamentos.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Descrição</th>
                      <th className="text-left p-2 hidden md:table-cell">Categoria</th>
                      <th className="text-right p-2">Valor</th>
                      <th className="text-right p-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extrato.lancamentos.map(l => (
                      <tr key={l.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="p-2 text-muted-foreground whitespace-nowrap text-xs">
                          {formatDate(l.data)}
                        </td>
                        <td className="p-2 font-medium">{l.historico}</td>
                        <td className="p-2 text-muted-foreground text-xs hidden md:table-cell">
                          {l.plano_contas || '—'}
                        </td>
                        <td className={cn('p-2 text-right font-semibold whitespace-nowrap', l.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400')}>
                          {l.tipo === 'entrada' ? '+' : '-'}{formatCurrency(l.valor)}
                        </td>
                        <td className={cn('p-2 text-right whitespace-nowrap text-xs', l.saldo >= 0 ? 'text-foreground' : 'text-red-400')}>
                          {formatCurrency(l.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {extrato && (
              <div className="flex justify-end pt-2 border-t border-border">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Saldo acumulado até {MESES[mes - 1]} {ano}</p>
                  <p className={cn('text-lg font-bold', extrato.saldo_final >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatCurrency(extrato.saldo_final)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!contaSel && (
        <p className="text-muted-foreground text-sm text-center py-4">
          Selecione uma conta para ver o extrato.
        </p>
      )}

      <NovoLancamentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contaId={contaSel}
        onSuccess={handleLancamentoCreated}
      />
    </div>
  )
}
