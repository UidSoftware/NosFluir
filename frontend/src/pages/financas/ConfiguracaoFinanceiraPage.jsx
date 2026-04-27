import { useState } from 'react'
import { Landmark, Plus, Pencil, Trash2, ListTree, CalendarClock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Badge } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

// ── Contas ────────────────────────────────────────────────────────────────────

const TIPOS_CONTA = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'caixa',    label: 'Caixa Físico' },
]
const TIPO_CONTA_VARIANT = { corrente: 'cyan', poupanca: 'success', caixa: 'secondary' }
const TIPO_CONTA_LABEL   = { corrente: 'Corrente', poupanca: 'Poupança', caixa: 'Caixa' }

function ContaForm({ conta, onClose }) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: conta ? {
      cont_nome:          conta.cont_nome,
      cont_tipo:          conta.cont_tipo,
      cont_saldo_inicial: conta.cont_saldo_inicial,
    } : { cont_tipo: '__none__', cont_saldo_inicial: '0.00' },
  })

  const create = useCreate('contas', '/contas/', { onSuccess: onClose })
  const update = useUpdate('contas', '/contas/', { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const tipo = data.cont_tipo && data.cont_tipo !== '__none__' ? data.cont_tipo : null
    if (!tipo) { toast({ title: 'Selecione o tipo da conta.', variant: 'destructive' }); return }
    const payload = { cont_nome: data.cont_nome, cont_tipo: tipo, cont_saldo_inicial: data.cont_saldo_inicial, cont_ativo: true }
    if (conta) update.mutate({ id: conta.cont_id, data: payload })
    else        create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Nome da Conta" required>
        <Input {...register('cont_nome', { required: true })} placeholder="Ex: Conta Corrente Mercado Pago" />
      </FormField>
      <FormField label="Tipo" required>
        <Select value={watch('cont_tipo') || '__none__'} onValueChange={v => setValue('cont_tipo', v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {TIPOS_CONTA.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Saldo Inicial (R$)">
        <Input type="number" step="0.01" {...register('cont_saldo_inicial')} placeholder="0.00" />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar'}</Button>
      </DialogFooter>
    </form>
  )
}

function SecaoContas() {
  const [modal, setModal] = useState(null) // null | 'novo' | conta
  const [excluir, setExcluir] = useState(null)

  const { data: contas, count: total, page, setPage } = useList('contas', '/contas/')
  const del = useDelete('contas', '/contas/')

  const COLS = [
    { header: 'Nome',         render: r => r.cont_nome },
    { header: 'Tipo',         render: r => <Badge variant={TIPO_CONTA_VARIANT[r.cont_tipo] ?? 'secondary'}>{TIPO_CONTA_LABEL[r.cont_tipo] ?? r.cont_tipo}</Badge> },
    { header: 'Saldo Inicial',render: r => `R$ ${parseFloat(r.cont_saldo_inicial).toFixed(2).replace('.', ',')}` },
    { header: 'Status',       render: r => r.cont_ativo ? <Badge variant="success">Ativa</Badge> : <Badge variant="secondary">Inativa</Badge> },
    {
      header: 'Ações',
      render: r => (
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" title="Editar" onClick={() => setModal(r)}><Pencil className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" title="Excluir" onClick={() => setExcluir(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold"><Landmark className="w-4 h-4" /> Contas</div>
            <Button size="sm" onClick={() => setModal('novo')}><Plus className="w-4 h-4 mr-1" /> Nova</Button>
          </div>
          <DataTable columns={COLS} data={contas} emptyMessage="Nenhuma conta cadastrada." />
          <Pagination page={page} count={total} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={!!modal} onOpenChange={open => { if (!open) setModal(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal === 'novo' ? 'Nova Conta' : 'Editar Conta'}</DialogTitle>
          </DialogHeader>
          {modal && <ContaForm conta={modal === 'novo' ? null : modal} onClose={() => setModal(null)} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!excluir}
        title="Excluir Conta"
        description={`Deseja excluir "${excluir?.cont_nome}"?`}
        onConfirm={() => { del.mutate(excluir.cont_id); setExcluir(null) }}
        onCancel={() => setExcluir(null)}
      />
    </>
  )
}

// ── Plano de Contas ───────────────────────────────────────────────────────────

const TIPOS_PLC = [
  { value: 'receita_operacional',     label: 'Receita Operacional' },
  { value: 'receita_nao_operacional', label: 'Receita Não Operacional' },
  { value: 'despesa_operacional',     label: 'Despesa Operacional' },
  { value: 'despesa_nao_operacional', label: 'Despesa Não Operacional' },
  { value: 'transferencia',           label: 'Transferência' },
]
const PLC_VARIANT = {
  receita_operacional:     'success',
  receita_nao_operacional: 'cyan',
  despesa_operacional:     'destructive',
  despesa_nao_operacional: 'secondary',
  transferencia:           'outline',
}

function PlanoContasForm({ plc, onClose }) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: plc ? {
      plc_codigo: plc.plc_codigo,
      plc_nome:   plc.plc_nome,
      plc_tipo:   plc.plc_tipo,
    } : { plc_tipo: '__none__' },
  })

  const create = useCreate('plano-contas', '/plano-contas/', { onSuccess: onClose })
  const update = useUpdate('plano-contas', '/plano-contas/', { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const tipo = data.plc_tipo && data.plc_tipo !== '__none__' ? data.plc_tipo : null
    if (!tipo) { toast({ title: 'Selecione o tipo.', variant: 'destructive' }); return }
    const payload = { plc_codigo: data.plc_codigo, plc_nome: data.plc_nome, plc_tipo: tipo, plc_ativo: true }
    if (plc) update.mutate({ id: plc.plc_id, data: payload })
    else      create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Código" required>
        <Input {...register('plc_codigo', { required: true })} placeholder="Ex: 1.1.1" />
      </FormField>
      <FormField label="Nome" required>
        <Input {...register('plc_nome', { required: true })} placeholder="Ex: Mensalidades" />
      </FormField>
      <FormField label="Tipo" required>
        <Select value={watch('plc_tipo') || '__none__'} onValueChange={v => setValue('plc_tipo', v)}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {TIPOS_PLC.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar'}</Button>
      </DialogFooter>
    </form>
  )
}

function SecaoPlanoContas() {
  const [modal, setModal] = useState(null)

  const { data: itens, count: total, page, setPage } = useList('plano-contas', '/plano-contas/')

  const COLS = [
    { header: 'Código', render: r => <span className="font-mono">{r.plc_codigo}</span> },
    { header: 'Nome',   render: r => r.plc_nome },
    { header: 'Tipo',   render: r => <Badge variant={PLC_VARIANT[r.plc_tipo] ?? 'secondary'} className="text-xs">{r.plc_tipo_display}</Badge> },
    { header: 'Status', render: r => r.plc_ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge> },
    {
      header: 'Ações',
      render: r => (
        <Button size="icon" variant="ghost" title="Editar" onClick={() => setModal(r)}><Pencil className="w-4 h-4" /></Button>
      ),
    },
  ]

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold"><ListTree className="w-4 h-4" /> Plano de Contas</div>
            <Button size="sm" onClick={() => setModal('novo')}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
          </div>
          <DataTable columns={COLS} data={itens} emptyMessage="Nenhum plano de contas cadastrado." />
          <Pagination page={page} count={total} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={!!modal} onOpenChange={open => { if (!open) setModal(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal === 'novo' ? 'Novo Plano de Contas' : 'Editar Plano de Contas'}</DialogTitle>
          </DialogHeader>
          {modal && <PlanoContasForm plc={modal === 'novo' ? null : modal} onClose={() => setModal(null)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

// ── Seção: Geração de Mensalidades ────────────────────────────────────────────

function SecaoGerarMensalidades() {
  const [resultado, setResultado]   = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dryRunResult, setDryRunResult] = useState(null)

  const dryRun = useMutation({
    mutationFn: () => api.post('/gerar-mensalidades/', { dry_run: true }).then(r => r.data),
    onSuccess: (data) => { setDryRunResult(data); setConfirmOpen(true) },
    onError: () => toast({ title: 'Erro ao consultar mensalidades', variant: 'destructive' }),
  })

  const gerar = useMutation({
    mutationFn: () => api.post('/gerar-mensalidades/', {}).then(r => r.data),
    onSuccess: (data) => {
      setConfirmOpen(false)
      setDryRunResult(null)
      setResultado(data)
      toast({ title: `${data.criadas} mensalidade(s) gerada(s) para ${data.mes_referencia}`, variant: 'success' })
    },
    onError: () => toast({ title: 'Erro ao gerar mensalidades', variant: 'destructive' }),
  })

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold flex items-center gap-2"><CalendarClock className="w-4 h-4 text-fluir-cyan" />Geração de Mensalidades</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gera cobranças do próximo mês para todos os alunos com plano ativo e dia de vencimento definido. Idempotente — não duplica se já existir.
            </p>
          </div>
          <Button onClick={() => dryRun.mutate()} disabled={dryRun.isPending || gerar.isPending} size="sm">
            {dryRun.isPending ? 'Verificando...' : 'Gerar Mensalidades'}
          </Button>
        </div>

        {resultado && (
          <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
            <p className="font-medium flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {resultado.mes_referencia} — {resultado.criadas} criada(s), {resultado.ignoradas} ignorada(s)
            </p>
          </div>
        )}

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
                {dryRunResult.detalhes.length > 0 && (
                  <div className="max-h-40 overflow-y-auto text-xs space-y-0.5 rounded border border-border/40 p-2">
                    {dryRunResult.detalhes.map((d, i) => <p key={i} className="text-muted-foreground">{d.trim()}</p>)}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => gerar.mutate()}
                disabled={gerar.isPending || dryRunResult?.criadas === 0}
              >
                {gerar.isPending ? 'Gerando...' : `Confirmar (${dryRunResult?.criadas ?? 0})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default function ConfiguracaoFinanceiraPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuração Financeira" icon={<Landmark />} />
      <SecaoGerarMensalidades />
      <SecaoContas />
      <SecaoPlanoContas />
    </div>
  )
}
