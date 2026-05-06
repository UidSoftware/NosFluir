import { useState } from 'react'
import { ClipboardList, Plus, Pencil, Trash2, Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete, fetchAll } from '@/hooks/useApi'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

const ENDPOINT = '/planos-pagamentos/'
const KEY      = 'planos'

function PlanoForm({ plano, onClose }) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: plano ? {
      serv:             String(plano.serv),
      plan_tipo_plano:  plano.plan_tipo_plano || '__none__',
      plan_valor_plano: plano.plan_valor_plano || '',
    } : { serv: '__none__', plan_tipo_plano: '__none__' },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const { data: servicos } = useQuery({
    queryKey: ['servicos-select'],
    queryFn: () => fetchAll('/servicos-produtos/', { serv_ativo: true }),
  })

  const onSubmit = (data) => {
    const servId = data.serv !== '__none__' ? parseInt(data.serv) : null
    if (!servId) { toast({ title: 'Selecione o serviço.', variant: 'destructive' }); return }
    const tipo = data.plan_tipo_plano !== '__none__' ? data.plan_tipo_plano : null
    if (!tipo) { toast({ title: 'Selecione o tipo.', variant: 'destructive' }); return }
    if (!data.plan_valor_plano) { toast({ title: 'Informe o valor.', variant: 'destructive' }); return }

    const payload = {
      serv: servId,
      plan_tipo_plano: tipo,
      plan_valor_plano: data.plan_valor_plano,
    }
    if (plano) update.mutate({ id: plano.plan_id, data: payload })
    else       create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Serviço *">
        <Select value={watch('serv')} onValueChange={v => setValue('serv', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar serviço..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar serviço...</SelectItem>
            {servicos?.map(s => (
              <SelectItem key={s.serv_id} value={String(s.serv_id)}>{s.serv_nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Tipo *">
        <Select value={watch('plan_tipo_plano')} onValueChange={v => setValue('plan_tipo_plano', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar tipo..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar tipo...</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="trimestral">Trimestral</SelectItem>
            <SelectItem value="semestral">Semestral</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Valor (R$) *">
        <Input type="number" step="0.01" {...register('plan_valor_plano')} placeholder="150.00" disabled={busy} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : plano ? 'Salvar' : 'Criar Plano'}
        </Button>
      </DialogFooter>
    </form>
  )
}

const TIPO_LABEL = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral' }

function SecaoGerarMensalidades() {
  const [resultado, setResultado]     = useState(null)
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-fluir-cyan" /> Gerar Mensalidades
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gera cobranças do próximo mês para todos os alunos com plano ativo e dia de vencimento definido. Não duplica se já existir.
            </p>
          </div>
          <Button onClick={() => dryRun.mutate()} disabled={dryRun.isPending || gerar.isPending} size="sm" className="shrink-0">
            {dryRun.isPending ? 'Verificando...' : 'Gerar Mensalidades'}
          </Button>
        </div>

        {resultado && (
          <div className="rounded-md bg-muted/40 p-3 text-sm">
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
                {dryRunResult.detalhes?.length > 0 && (
                  <div className="max-h-40 overflow-y-auto text-xs space-y-0.5 rounded border border-border/40 p-2">
                    {dryRunResult.detalhes.map((d, i) => <p key={i} className="text-muted-foreground">{d.trim()}</p>)}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
              <Button onClick={() => gerar.mutate()} disabled={gerar.isPending || dryRunResult?.criadas === 0}>
                {gerar.isPending ? 'Gerando...' : `Confirmar (${dryRunResult?.criadas ?? 0})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default function PlanosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Plano excluído.' })

  const columns = [
    { key: 'serv_nome',            header: 'Serviço',      render: r => <span className="font-medium">{r.serv_nome || '—'}</span> },
    { key: 'plan_tipo_plano',      header: 'Tipo',         render: r => TIPO_LABEL[r.plan_tipo_plano] || r.plan_tipo_plano },
    { key: 'plan_valor_plano',     header: 'Valor/mês',    render: r => formatCurrency(r.plan_valor_plano) },
    { key: 'total_alunos_ativos',  header: 'Alunos ativos', render: r => r.total_alunos_ativos ?? 0 },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.plan_id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Planos de Pagamentos"
        description="Catálogo de planos — vincule alunos pelo detalhe do aluno"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo Plano</Button>}
      />
      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por serviço..." onSearch={q => setFilters(q ? { search: q } : {})} />
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum plano cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Plano' : 'Novo Plano'}</DialogTitle></DialogHeader>
          <PlanoForm plano={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Plano"
        description="Tem certeza? Alunos vinculados a este plano perderão o vínculo."
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />

      <SecaoGerarMensalidades />
    </div>
  )
}
