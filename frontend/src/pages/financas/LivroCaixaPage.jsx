import { useState } from 'react'
import { BookOpen, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { useList, useCreate } from '@/hooks/useApi'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ENDPOINT = '/livro-caixa/'
const KEY      = 'livro-caixa'

function LancamentoForm({ onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: { lica_tipo_lancamento: 'entrada' },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })

  const onSubmit = (data) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Tipo" required>
        <Select value={watch('lica_tipo_lancamento')} onValueChange={v => setValue('lica_tipo_lancamento', v)} disabled={create.isPending}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Histórico" required error={errors.lica_historico?.message}>
        <Input {...register('lica_historico', { required: 'Histórico obrigatório' })} placeholder="Descrição do lançamento" disabled={create.isPending} />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Valor (R$)" required error={errors.lica_valor?.message}>
          <Input type="number" step="0.01" {...register('lica_valor', { required: 'Valor obrigatório' })} placeholder="0.00" disabled={create.isPending} />
        </FormField>
        <FormField label="Categoria">
          <Input {...register('lica_categoria')} placeholder="Ex: Aluguel, Mensalidade..." disabled={create.isPending} />
        </FormField>
      </div>

      <FormField label="Forma de Pagamento">
        <Input {...register('lica_forma_pagamento')} placeholder="Dinheiro, Pix, Cartão..." disabled={create.isPending} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={create.isPending}>Cancelar</Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Salvando...' : 'Registrar Lançamento'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function LivroCaixaPage() {
  const [modalOpen, setModalOpen]   = useState(false)
  const [tipoFilter, setTipoFilter] = useState('all')

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)

  const totalEntradas = data.reduce((s, r) => r.lica_tipo_lancamento === 'entrada' ? s + parseFloat(r.lica_valor || 0) : s, 0)
  const totalSaidas   = data.reduce((s, r) => r.lica_tipo_lancamento === 'saida'   ? s + parseFloat(r.lica_valor || 0) : s, 0)
  const saldoAtual    = data.length > 0 ? parseFloat(data[data.length - 1]?.lica_saldo_atual || 0) : 0

  const handleTipoChange = (v) => {
    setTipoFilter(v)
    setFilters(v && v !== 'all' ? { lica_tipo_lancamento: v } : {})
  }

  const columns = [
    {
      key: 'lica_tipo_lancamento', header: 'Tipo', cellClassName: 'w-28',
      render: r => <StatusBadge status={r.lica_tipo_lancamento} />,
    },
    {
      key: 'lica_historico', header: 'Histórico',
      render: r => <span className="font-medium">{r.lica_historico}</span>,
    },
    { key: 'lica_categoria', header: 'Categoria', render: r => r.lica_categoria || '—' },
    {
      key: 'lica_valor', header: 'Valor',
      render: r => (
        <span className={cn('font-medium', r.lica_tipo_lancamento === 'entrada' ? 'text-emerald-400' : 'text-red-400')}>
          {r.lica_tipo_lancamento === 'entrada' ? '+' : '-'}{formatCurrency(r.lica_valor)}
        </span>
      ),
    },
    { key: 'lica_saldo_atual',       header: 'Saldo',  render: r => formatCurrency(r.lica_saldo_atual) },
    { key: 'lica_data_lancamento',   header: 'Data',   render: r => formatDate(r.lica_data_lancamento) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Livro Caixa"
        description="Registro imutável de todas as movimentações financeiras"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </Button>
        }
      />

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Entradas</p>
              <p className="text-sm font-semibold text-emerald-400">{formatCurrency(totalEntradas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Saídas</p>
              <p className="text-sm font-semibold text-red-400">{formatCurrency(totalSaidas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-fluir-purple/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-fluir-purple" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Saldo Atual</p>
              <p className={cn('text-sm font-semibold', saldoAtual >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {formatCurrency(saldoAtual)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por histórico..." onSearch={q => setFilters(q ? { search: q } : {})}>
            <Select value={tipoFilter} onValueChange={handleTipoChange}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </SearchFilter>

          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum lançamento encontrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-fluir-purple" />
              Novo Lançamento Manual
            </DialogTitle>
          </DialogHeader>
          <LancamentoForm onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
