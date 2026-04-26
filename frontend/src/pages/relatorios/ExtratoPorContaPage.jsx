import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen } from 'lucide-react'
import { fetchAll } from '@/hooks/useApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/primitives'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function ExtratoPorContaPage() {
  const hoje = new Date()
  const [contaId, setContaId] = useState('__none__')
  const [mes,  setMes]  = useState(String(hoje.getMonth() + 1).padStart(2, '0'))
  const [ano,  setAno]  = useState(String(hoje.getFullYear()))
  const [query,setQuery]= useState(null)

  const { data: contas = [] } = useQuery({
    queryKey: ['contas-select'],
    queryFn:  () => fetchAll('/contas/', { cont_ativo: true }),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['relatorio-extrato', query?.conta, query?.mes, query?.ano],
    queryFn:  () => api.get('/relatorios/extrato/', { params: query }).then(r => r.data),
    enabled:  !!query,
  })

  const aplicar = () => {
    if (contaId === '__none__') return
    setQuery({ conta: contaId, mes: parseInt(mes), ano: parseInt(ano) })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Extrato por Conta" />

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="w-56">
            <p className="text-xs text-muted-foreground mb-1">Conta</p>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
                {contas.map(c => <SelectItem key={c.cont_id} value={String(c.cont_id)}>{c.cont_nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Mês</p>
              <select
                className="rounded border border-border bg-background text-sm px-2 py-1.5"
                value={mes}
                onChange={e => setMes(e.target.value)}
              >
                {MESES.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ano</p>
              <Input type="number" value={ano} onChange={e => setAno(e.target.value)} className="w-24" />
            </div>
          </div>
          <Button onClick={aplicar} disabled={contaId === '__none__'}>Ver Extrato</Button>
        </CardContent>
      </Card>

      {isLoading && <p className="text-muted-foreground text-sm px-1">Carregando...</p>}

      {data && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{data.conta_nome}</p>
                <p className="text-xs text-muted-foreground">{MESES[query.mes - 1]} {query.ano}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Saldo Final</p>
                <p className={cn('text-lg font-bold', data.saldo_final >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {formatCurrency(data.saldo_final)}
                </p>
              </div>
            </div>

            {data.lancamentos.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Nenhum lançamento neste período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Histórico</th>
                      <th className="text-left p-2 hidden md:table-cell">Categoria</th>
                      <th className="text-right p-2">Valor</th>
                      <th className="text-right p-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lancamentos.map((l, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="p-2 text-muted-foreground whitespace-nowrap">{formatDate(l.data)}</td>
                        <td className="p-2 font-medium">{l.historico}</td>
                        <td className="p-2 text-muted-foreground text-xs hidden md:table-cell">{l.plano_contas || '—'}</td>
                        <td className={cn('p-2 text-right font-medium', l.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400')}>
                          {l.tipo === 'entrada' ? '+' : '-'}{formatCurrency(l.valor)}
                        </td>
                        <td className={cn('p-2 text-right', l.saldo >= 0 ? 'text-foreground' : 'text-red-400')}>
                          {formatCurrency(l.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
