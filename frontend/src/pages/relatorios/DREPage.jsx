import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileDown } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/primitives'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function SecaoDRE({ titulo, dados, tipo }) {
  if (!dados?.itens?.length && dados?.total === 0) return null
  const isReceita = tipo === 'receita'
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-1">{titulo}</p>
      {dados.itens.map((i, idx) => (
        <div key={idx} className="flex justify-between py-1 border-b border-border/20 text-sm">
          <span className="text-muted-foreground pl-3">{i.nome}</span>
          <span className={isReceita ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(i.valor)}</span>
        </div>
      ))}
      <div className="flex justify-between py-1.5 font-semibold text-sm">
        <span>Total {titulo}</span>
        <span className={isReceita ? 'text-emerald-400' : 'text-red-400'}>{isReceita ? '' : '('}{formatCurrency(dados.total)}{isReceita ? '' : ')'}</span>
      </div>
    </div>
  )
}

export default function DREPage() {
  const hoje = new Date()
  const [mes,  setMes]  = useState(String(hoje.getMonth() + 1).padStart(2, '0'))
  const [ano,  setAno]  = useState(String(hoje.getFullYear()))
  const [query,setQuery]= useState({ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() })

  const { data, isLoading } = useQuery({
    queryKey: ['relatorio-dre', query.mes, query.ano],
    queryFn: () => api.get('/relatorios/dre/', { params: { mes: query.mes, ano: query.ano } }).then(r => r.data),
  })

  const aplicar = () => setQuery({ mes: parseInt(mes), ano: parseInt(ano) })

  const baixarPdf = async () => {
    const resp = await api.get('/relatorios/dre/pdf/', { params: { mes: query.mes, ano: query.ano }, responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `dre-${String(query.mes).padStart(2,'0')}-${query.ano}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resOp  = data?.resultado_operacional ?? 0
  const resLiq = data?.resultado_liquido     ?? 0

  return (
    <div className="space-y-5">
      <PageHeader title="DRE — Demonstração de Resultado" />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
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
          <Button onClick={aplicar}>Gerar DRE</Button>
          {data && (
            <Button variant="outline" onClick={baixarPdf} className="gap-1.5">
              <FileDown className="w-4 h-4" /> Exportar PDF
            </Button>
          )}
        </CardContent>
      </Card>

      {isLoading && <p className="text-muted-foreground text-sm px-1">Carregando...</p>}

      {data && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <p className="font-semibold text-center">{MESES[query.mes - 1]} {query.ano}</p>

            <SecaoDRE titulo="Receitas Operacionais"     dados={data.receitas_operacionais}     tipo="receita" />
            <SecaoDRE titulo="Receitas Não Operacionais" dados={data.receitas_nao_operacionais} tipo="receita" />
            <SecaoDRE titulo="Despesas Operacionais"     dados={data.despesas_operacionais}     tipo="despesa" />
            <SecaoDRE titulo="Despesas Não Operacionais" dados={data.despesas_nao_operacionais} tipo="despesa" />

            {data.sem_classificacao?.total > 0 && (
              <SecaoDRE titulo="Sem Classificação" dados={data.sem_classificacao} tipo="receita" />
            )}

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Resultado Operacional</span>
                <span className={resOp >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {resOp < 0 ? '(' : ''}{formatCurrency(Math.abs(resOp))}{resOp < 0 ? ')' : ''}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                <span>Resultado Líquido</span>
                <span className={resLiq >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {resLiq < 0 ? '(' : ''}{formatCurrency(Math.abs(resLiq))}{resLiq < 0 ? ')' : ''}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
