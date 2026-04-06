import { useState } from 'react'
import { ListTodo, Trash2, Clock, Calendar } from 'lucide-react'
import { useList, useDelete } from '@/hooks/useApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchFilter } from '@/components/shared/SearchFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatDate, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'horarios', label: 'Horários', endpoint: '/agendamentos-horario/', key: 'ag-horarios' },
  { id: 'turmas',   label: 'Turmas',   endpoint: '/agendamentos-turmas/',  key: 'ag-turmas' },
]

function TabContent({ endpoint, keyName, columns, emptyMessage }) {
  const [deleteId, setDeleteId] = useState(null)
  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(keyName, endpoint)
  const del = useDelete(keyName, endpoint, { successMsg: 'Agendamento excluído.' })

  const allColumns = [
    ...columns,
    {
      key: 'acoes', header: '', cellClassName: 'w-16',
      render: (r) => (
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <SearchFilter placeholder="Buscar..." onSearch={q => setFilters(q ? { search: q } : {})} />
      <DataTable columns={allColumns} data={data} isLoading={isLoading} emptyMessage={emptyMessage} />
      <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir Agendamento"
        description="Tem certeza que deseja excluir este agendamento?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}

const HORARIOS_COLS = [
  { key: 'nome',     header: 'Nome',     render: r => <span className="font-medium">{r.nome || r.agh_nome || '—'}</span> },
  { key: 'email',    header: 'E-mail',   render: r => r.email || r.agh_email || '—' },
  { key: 'telefone', header: 'Telefone', render: r => r.telefone || r.agh_telefone || '—' },
  { key: 'horario',  header: 'Horário',  render: r => r.horario || r.agh_horario || '—' },
  { key: 'created',  header: 'Enviado em', render: r => formatDateTime(r.created_at) },
]

const TURMAS_COLS = [
  { key: 'nome',    header: 'Nome',    render: r => <span className="font-medium">{r.nome || r.agt_nome || '—'}</span> },
  { key: 'email',   header: 'E-mail',  render: r => r.email || r.agt_email || '—' },
  { key: 'turma',   header: 'Turma',   render: r => r.turma || r.agt_turma || '—' },
  { key: 'created', header: 'Enviado em', render: r => formatDateTime(r.created_at) },
]

export default function AgendamentosPage() {
  const [activeTab, setActiveTab] = useState('horarios')
  const tab = TABS.find(t => t.id === activeTab)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agendamentos"
        description="Solicitações recebidas pelo site institucional (somente leitura)"
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-fluir-dark-3 rounded-lg p-1 w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors',
                  activeTab === t.id
                    ? 'bg-fluir-purple text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.id === 'horarios' ? <Clock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'horarios' && (
            <TabContent
              endpoint={tab.endpoint}
              keyName={tab.key}
              columns={HORARIOS_COLS}
              emptyMessage="Nenhum agendamento de horário recebido."
            />
          )}
          {activeTab === 'turmas' && (
            <TabContent
              endpoint={tab.endpoint}
              keyName={tab.key}
              columns={TURMAS_COLS}
              emptyMessage="Nenhum agendamento de turma recebido."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
