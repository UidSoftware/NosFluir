import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileDown } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import api from '@/services/api'

export default function FluxoCaixaPage() {
  const [meses, setMeses] = useState(6)

  const { data = [], isLoading } = useQuery({
    queryKey: ['relatorio-fluxo-caixa', meses],
    queryFn: () => api.get('/relatorios/fluxo-caixa/', { params: { meses } }).then(r => r.data),
  })

  const totEntradas = data.reduce((s, r) => s + r.entradas, 0)
  const totSaidas   = data.reduce((s, r) => s + r.saidas,   0)
  const totSaldo    = totEntradas - totSaidas

  const baixarPdf = async () => {
    const resp = await api.get('/relatorios/fluxo-caixa/pdf/', { params: { meses }, responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `fluxo-caixa-${meses}meses.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Fluxo de Caixa Projetado" />

      <Card>
        <CardContent className="p-4 flex gap-2 items-center">
          <span className="text-sm text-muted-foreground mr-2">Período:</span>
          {[1, 3, 6, 12].map(m => (
            <Button key={m} size="sm" variant={meses === m ? 'default' : 'outline'} onClick={() => setMeses(m)}>
              {m === 1 ? 'Mês atual' : `${m} meses`}
            </Button>
          ))}
          {data.length > 0 && (
            <Button size="sm" variant="outline" onClick={baixarPdf} className="gap-1.5 ml-auto">
              <FileDown className="w-4 h-4" /> Exportar PDF
            </Button>
          )}
        </CardContent>
      </Card>

      {isLoading && <p className="text-muted-foreground text-sm px-1">Carregando...</p>}

      {data.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium">Mês</th>
                    <th className="text-right p-3 font-medium text-emerald-400">Entradas Previstas</th>
                    <th className="text-right p-3 font-medium text-red-400">Saídas Previstas</th>
                    <th className="text-right p-3 font-medium">Saldo Projetado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="p-3 font-medium">{r.mes_ano}</td>
                      <td className="p-3 text-right text-emerald-400">{formatCurrency(r.entradas)}</td>
                      <td className="p-3 text-right text-red-400">{formatCurrency(r.saidas)}</td>
                      <td className={cn('p-3 text-right font-semibold', r.saldo >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {r.saldo < 0 ? '(' : ''}{formatCurrency(Math.abs(r.saldo))}{r.saldo < 0 ? ')' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                    <td className="p-3">Total</td>
                    <td className="p-3 text-right text-emerald-400">{formatCurrency(totEntradas)}</td>
                    <td className="p-3 text-right text-red-400">{formatCurrency(totSaidas)}</td>
                    <td className={cn('p-3 text-right', totSaldo >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {totSaldo < 0 ? '(' : ''}{formatCurrency(Math.abs(totSaldo))}{totSaldo < 0 ? ')' : ''}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
