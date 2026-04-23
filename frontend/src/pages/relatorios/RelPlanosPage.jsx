import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import api from '@/services/api'
import { fetchAll } from '@/hooks/useApi'

const TIPO_LABELS = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral' }

export default function RelPlanosPage() {
  const [planoFiltro, setPlanoFiltro]   = useState('all')
  const [statusFiltro, setStatusFiltro] = useState('true')

  const { data: planos } = useQuery({
    queryKey: ['planos-rel'],
    queryFn: () => fetchAll('/planos-pagamentos/'),
  })

  const params = {}
  if (planoFiltro !== 'all')   params.plano = planoFiltro
  if (statusFiltro !== 'all')  params.aplano_ativo = statusFiltro

  const { data: alunoPlanos, isLoading } = useQuery({
    queryKey: ['aluno-plano-rel', planoFiltro, statusFiltro],
    queryFn: () => api.get('/aluno-plano/', { params: { ...params, ordering: 'plano,aluno__alu_nome' } })
      .then(r => r.data.results),
  })

  // Agrupa por plano
  const grupos = {}
  alunoPlanos?.forEach(ap => {
    const key = ap.plano
    if (!grupos[key]) grupos[key] = { descricao: ap.plan_descricao, itens: [] }
    grupos[key].itens.push(ap)
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relatório de Planos"
        description="Alunos ativos por plano de pagamento"
      />

      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <Select value={planoFiltro} onValueChange={setPlanoFiltro}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                {planos?.map(p => (
                  <SelectItem key={p.plan_id} value={String(p.plan_id)}>
                    {p.serv_nome} — {TIPO_LABELS[p.plan_tipo_plano]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFiltro} onValueChange={setStatusFiltro}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Ativos</SelectItem>
                <SelectItem value="false">Encerrados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !alunoPlanos?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado encontrado.</p>
          ) : (
            <div className="space-y-5">
              {Object.values(grupos).map((grupo, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-fluir-cyan" />
                    <h3 className="font-semibold text-sm">{grupo.descricao}</h3>
                    <span className="text-xs text-muted-foreground">— {grupo.itens.length} aluno{grupo.itens.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-fluir-dark-3/60">
                        <tr className="text-xs text-muted-foreground">
                          <th className="text-left px-3 py-2">Aluno</th>
                          <th className="text-left px-3 py-2">Início</th>
                          <th className="text-left px-3 py-2">Término</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-left px-3 py-2">Obs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.itens.map(ap => (
                          <tr key={ap.aplano_id} className="border-t border-border/50">
                            <td className="px-3 py-2 font-medium">{ap.alu_nome}</td>
                            <td className="px-3 py-2 text-muted-foreground">{formatDate(ap.aplano_data_inicio)}</td>
                            <td className="px-3 py-2 text-muted-foreground">{ap.aplano_data_fim ? formatDate(ap.aplano_data_fim) : '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`text-xs font-medium ${ap.aplano_ativo ? 'text-emerald-400' : 'text-red-400'}`}>
                                {ap.aplano_ativo ? 'Ativo' : 'Encerrado'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground text-xs italic">{ap.aplano_observacoes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
