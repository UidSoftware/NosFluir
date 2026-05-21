import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Input, FormField } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import api from '@/services/api'
import { fetchAll } from '@/hooks/useApi'

export default function RelPressaoPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [turmaId, setTurmaId]       = useState('')
  const [page, setPage]             = useState(1)

  const { data: turmas } = useQuery({
    queryKey: ['turmas-select-pressao'],
    queryFn: () => fetchAll('/turmas/'),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['rel-pressao', turmaId, dataInicio, dataFim, page],
    queryFn: () => api.get('/ministrar-aula/', {
      params: {
        tur: turmaId || undefined,
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
        page,
        has_pressao: true,
      },
    }).then(r => r.data),
  })

  const items      = data?.results ?? []
  const count      = data?.count ?? 0
  const totalPages = Math.ceil(count / 20) || 1

  const formatPA = (pas, pad) => {
    if (pas == null && pad == null) return '—'
    return `${pas ?? '?'}/${pad ?? '?'}`
  }

  const columns = [
    { key: 'alu_nome',        header: 'Aluno',      render: r => r.alu_nome || `Aluno ${r.alu}` },
    { key: 'miau_data',       header: 'Data',        render: r => formatDate(r.miau_data) },
    { key: 'miau_pa_inicio',  header: 'P.A. Início', render: r => formatPA(r.miau_pas_inicio, r.miau_pad_inicio) },
    { key: 'miau_pa_final',   header: 'P.A. Final',  render: r => formatPA(r.miau_pas_final, r.miau_pad_final) },
    { key: 'miau_fc_inicio',  header: 'FC Início',   headerClassName: 'hidden sm:table-cell', cellClassName: 'hidden sm:table-cell', render: r => r.miau_fc_inicio != null ? `${r.miau_fc_inicio} bpm` : '—' },
    { key: 'miau_fc_final',   header: 'FC Final',    headerClassName: 'hidden sm:table-cell', cellClassName: 'hidden sm:table-cell', render: r => r.miau_fc_final != null ? `${r.miau_fc_final} bpm` : '—' },
    { key: 'miau_pse',        header: 'PSE (Borg)',  render: r => r.miau_pse != null ? `${r.miau_pse}/20` : '—' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Relatório de Pressão Arterial" description="Histórico de medições de P.A., FC e PSE por aluno" />
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-3 items-end">
            <FormField label="Turma" className="min-w-[180px]">
              <Select value={turmaId || '__none__'} onValueChange={v => { setTurmaId(v === '__none__' ? '' : v); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="Todas as turmas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todas as turmas</SelectItem>
                  {turmas?.map(t => <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Data Início" className="min-w-[140px]">
              <Input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPage(1) }} />
            </FormField>
            <FormField label="Data Fim" className="min-w-[140px]">
              <Input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPage(1) }} />
            </FormField>
          </div>
          <DataTable columns={columns} data={items} isLoading={isLoading} emptyMessage="Nenhum registro no período." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  )
}
