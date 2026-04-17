import { useState } from 'react'
import { CalendarDays, Pencil, Trash2, Users, CheckCircle, XCircle, Eye, GitCompareArrows } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input, FormField, Badge, Spinner } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import api from '@/services/api'

const ENDPOINT = '/aulas/'
const KEY      = 'aulas'

const MODALIDADES = [
  { value: 'pilates',   label: 'Mat Pilates' },
  { value: 'funcional', label: 'Funcional' },
]

const MODALIDADE_VARIANT = { pilates: 'cyan', funcional: 'success' }

const PRESENCA_LABEL = { presente: 'Presente', falta: 'Falta', reposicao: 'Reposição' }
const PRESENCA_VARIANT = { presente: 'success', falta: 'destructive', reposicao: 'secondary' }

function ComparativoCiclo({ aula, registrosAtuais }) {
  const [aberto, setAberto] = useState(false)
  const temCicloAnterior = aula?.aul_numero_ciclo > 1 && aula?.aul_posicao_ciclo

  const { data: aulaAnterior } = useQuery({
    queryKey: ['aula-anterior', aula?.tur, aula?.aul_posicao_ciclo, aula?.aul_numero_ciclo],
    queryFn: () => api.get('/aulas/', {
      params: {
        tur: aula.tur,
        aul_posicao_ciclo: aula.aul_posicao_ciclo,
        aul_numero_ciclo:  aula.aul_numero_ciclo - 1,
      }
    }).then(r => r.data.results?.[0] ?? null),
    enabled: !!temCicloAnterior && aberto,
  })

  const { data: registrosAnt } = useQuery({
    queryKey: ['ministrar-aula-comp', aulaAnterior?.aul_id],
    queryFn: () => api.get('/ministrar-aula/', { params: { aula: aulaAnterior.aul_id, page_size: 100 } })
      .then(r => r.data.results ?? []),
    enabled: !!aulaAnterior?.aul_id,
  })

  if (!temCicloAnterior) return null

  const mapaAnt   = Object.fromEntries((registrosAnt  || []).map(r => [r.alu, r]))
  const mapaAtual = Object.fromEntries((registrosAtuais || []).map(r => [r.alu, r]))
  const todosIds  = [...new Set([...Object.keys(mapaAnt), ...Object.keys(mapaAtual)])]

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setAberto(v => !v)}
        className="flex items-center gap-2 text-xs text-fluir-cyan hover:text-fluir-cyan/80 transition-colors"
      >
        <GitCompareArrows className="w-3.5 h-3.5" />
        {aberto ? 'Ocultar' : 'Ver'} comparativo com Ciclo {aula.aul_numero_ciclo - 1}
      </button>

      {aberto && (
        <div className="mt-3 space-y-2">
          {!aulaAnterior ? (
            <p className="text-xs text-muted-foreground italic">Nenhuma aula encontrada no Ciclo {aula.aul_numero_ciclo - 1} nesta posição.</p>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground">
                Ciclo {aula.aul_numero_ciclo - 1} — {formatDate(aulaAnterior.aul_data)}
                {' '}vs{' '}
                Ciclo {aula.aul_numero_ciclo} — {formatDate(aula.aul_data)}
              </p>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground font-semibold px-1 mb-1">
                <span>Ciclo {aula.aul_numero_ciclo - 1}</span>
                <span>Ciclo {aula.aul_numero_ciclo} (atual)</span>
              </div>
              {todosIds.map(aluId => {
                const ant   = mapaAnt[aluId]
                const atual = mapaAtual[aluId]
                const nome  = ant?.alu_nome || atual?.alu_nome || `Aluno ${aluId}`
                return (
                  <div key={aluId} className="rounded-lg border border-border/50 p-2">
                    <p className="text-xs font-medium mb-1.5">{nome}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-fluir-dark-3 rounded p-2 space-y-1">
                        {ant ? <>
                          <p>PSE: <span className="font-medium">{ant.miau_pse ?? '—'}</span></p>
                          {ant.miau_observacoes && <p className="text-muted-foreground italic text-[10px]">{ant.miau_observacoes}</p>}
                        </> : <p className="text-muted-foreground italic text-[10px]">Ausente</p>}
                      </div>
                      <div className="bg-fluir-dark-2 rounded p-2 space-y-1 border border-fluir-cyan/20">
                        {atual ? <>
                          <p>PSE: <span className="font-medium">{atual.miau_pse ?? '—'}</span>
                            {ant?.miau_pse != null && atual.miau_pse != null && (
                              <span className={cn(
                                'ml-1 font-bold',
                                atual.miau_pse < ant.miau_pse ? 'text-green-400' :
                                atual.miau_pse > ant.miau_pse ? 'text-red-400' : 'text-muted-foreground'
                              )}>
                                {atual.miau_pse < ant.miau_pse ? '↓' : atual.miau_pse > ant.miau_pse ? '↑' : '='}
                              </span>
                            )}
                          </p>
                          {atual.miau_observacoes && <p className="text-muted-foreground italic text-[10px]">{atual.miau_observacoes}</p>}
                        </> : <p className="text-muted-foreground italic text-[10px]">Ausente</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal de detalhes (alunos da aula) ───────────────────────────────────────
function AulaDetalheModal({ aula, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ministrar-aula-by-aula', aula?.aul_id],
    queryFn: async () => {
      const { data } = await api.get('/ministrar-aula/', { params: { aula: aula.aul_id, page_size: 100 } })
      return data.results ?? []
    },
    enabled: !!aula,
  })

  return (
    <Dialog open={!!aula} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Alunos — {aula?.aul_nome}
          </DialogTitle>
        </DialogHeader>

        <div className="px-1 py-2 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum registro de presença vinculado a esta aula.
            </p>
          ) : (
            <div className="space-y-2">
              {data.map(r => (
                <div key={r.miau_id} className="flex items-center justify-between p-2.5 rounded-lg bg-fluir-dark-3">
                  <div>
                    <p className="text-sm font-medium">{r.alu_nome}</p>
                    {r.miau_tipo_falta && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.miau_tipo_falta === 'sem_aviso' ? 'Sem aviso' :
                         r.miau_tipo_falta === 'justificada' ? 'Justificada' :
                         r.miau_tipo_falta === 'atestado' ? 'Atestado' : r.miau_tipo_falta}
                      </p>
                    )}
                  </div>
                  <Badge variant={PRESENCA_VARIANT[r.miau_tipo_presenca] || 'default'}>
                    {PRESENCA_LABEL[r.miau_tipo_presenca] || r.miau_tipo_presenca}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isLoading && aula && (
          <ComparativoCiclo aula={aula} registrosAtuais={data} />
        )}

        <DialogFooter className="mt-3">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Formulário de criação/edição ──────────────────────────────────────────────
function AulaForm({ aula, turmas, funcionarios, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: aula ? {
      tur:             String(aula.tur),
      func:            aula.func ? String(aula.func) : '__none__',
      aul_data:        aula.aul_data,
      aul_hora_inicio: aula.aul_hora_inicio || '',
      aul_hora_final:  aula.aul_hora_final  || '',
      aul_modalidade:  aula.aul_modalidade || '__none__',
      aul_nome:        aula.aul_nome || '',
    } : {
      tur:            '__none__',
      func:           '__none__',
      aul_modalidade: '__none__',
    },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const turVal  = data.tur && data.tur !== '__none__' ? parseInt(data.tur) : null
    const modVal  = data.aul_modalidade && data.aul_modalidade !== '__none__' ? data.aul_modalidade : null
    const funcVal = data.func && data.func !== '__none__' ? parseInt(data.func) : null

    if (!turVal) { toast({ title: 'Selecione a turma.',      variant: 'destructive' }); return }
    if (!modVal) { toast({ title: 'Selecione a modalidade.', variant: 'destructive' }); return }
    if (!data.aul_data) { toast({ title: 'Informe a data da aula.', variant: 'destructive' }); return }

    const payload = {
      tur:             turVal,
      func:            funcVal,
      aul_data:        data.aul_data,
      aul_hora_inicio: data.aul_hora_inicio || null,
      aul_hora_final:  data.aul_hora_final  || null,
      aul_modalidade:  modVal,
      aul_nome:        data.aul_nome || null,
    }

    if (aula) update.mutate({ id: aula.aul_id, data: payload })
    else      create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Turma" required>
        <Select value={watch('tur')} onValueChange={v => setValue('tur', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {turmas?.map(t => <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Modalidade" required>
        <Select value={watch('aul_modalidade')} onValueChange={v => setValue('aul_modalidade', v)} disabled={busy}>
          <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
            {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Data" required error={errors.aul_data?.message}>
          <Input type="date" {...register('aul_data', { required: 'Data obrigatória' })} disabled={busy} />
        </FormField>
        <FormField label="Professor">
          <Select value={watch('func')} onValueChange={v => setValue('func', v)} disabled={busy}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground italic">Sem professor</SelectItem>
              {funcionarios?.map(f => <SelectItem key={f.func_id} value={String(f.func_id)}>{f.func_nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Hora de Início">
          <Input type="time" {...register('aul_hora_inicio')} disabled={busy} />
        </FormField>
        <FormField label="Hora de Término">
          <Input type="time" {...register('aul_hora_final')} disabled={busy} />
        </FormField>
      </div>

      <FormField label="Nome/Descrição" hint="Preenchido automaticamente se deixado em branco">
        <Input {...register('aul_nome')} placeholder="Ex: Funcional Seg 17:00" disabled={busy} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : aula ? 'Salvar Alterações' : 'Criar Aula'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AulasPage() {
  const [modalOpen, setModalOpen]   = useState(false)
  const [selected, setSelected]     = useState(null)
  const [detalhe, setDetalhe]       = useState(null)
  const [deleteId, setDeleteId]     = useState(null)
  const [filtroMod, setFiltroMod]   = useState('all')
  const [filtroTur, setFiltroTur]   = useState('all')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')

  const filters = {
    ...(filtroMod !== 'all'  ? { aul_modalidade: filtroMod }   : {}),
    ...(filtroTur !== 'all'  ? { tur: filtroTur }               : {}),
    ...(dataInicio           ? { aul_data_after: dataInicio }   : {}),
    ...(dataFim              ? { aul_data_before: dataFim }     : {}),
  }

  const { data, isLoading, page, setPage, totalPages, count } = useList(KEY, ENDPOINT, filters)
  const { data: turmas }       = useList('turmas',       '/turmas/',       {}, { pageSize: 200 })
  const { data: funcionarios } = useList('funcionarios', '/funcionarios/', {}, { pageSize: 200 })
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Aula excluída.' })

  const limparFiltros = () => {
    setFiltroMod('all'); setFiltroTur('all'); setDataInicio(''); setDataFim(''); setPage(1)
  }
  const temFiltro = filtroMod !== 'all' || filtroTur !== 'all' || dataInicio || dataFim

  const columns = [
    {
      key: 'aul_data', header: 'Data',
      render: r => (
        <div>
          <p className="font-medium">{new Date(r.aul_data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
          {r.aul_hora_inicio && (
            <p className="text-xs text-muted-foreground">
              {r.aul_hora_inicio}{r.aul_hora_final ? ` – ${r.aul_hora_final}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'tur_nome', header: 'Turma',
      render: r => <span className="font-medium">{r.tur_nome}</span>,
    },
    {
      key: 'aul_modalidade', header: 'Modalidade',
      render: r => (
        <Badge variant={MODALIDADE_VARIANT[r.aul_modalidade] || 'default'}>
          {MODALIDADES.find(m => m.value === r.aul_modalidade)?.label || r.aul_modalidade}
        </Badge>
      ),
    },
    {
      key: 'func_nome', header: 'Professor',
      headerClassName: 'hidden sm:table-cell',
      cellClassName: 'hidden sm:table-cell',
      render: r => <span className="text-sm text-muted-foreground">{r.func_nome || '—'}</span>,
    },
    {
      key: 'stats', header: 'Presença',
      render: r => (
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-400" title="Presentes">
            <CheckCircle className="w-3.5 h-3.5" />{r.total_presentes}
          </span>
          <span className="flex items-center gap-1 text-red-400" title="Faltas">
            <XCircle className="w-3.5 h-3.5" />{r.total_faltas}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground" title="Total">
            <Users className="w-3.5 h-3.5" />{r.total_registros}
          </span>
        </div>
      ),
    },
    {
      key: 'acoes', header: '', cellClassName: 'w-28',
      render: r => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" title="Ver alunos" onClick={() => setDetalhe(r)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => { setSelected(r); setModalOpen(true) }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setDeleteId(r.aul_id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Aulas"
        description="Histórico de aulas coletivas ministradas"
        actions={null}
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:items-end">
            <Select value={filtroMod} onValueChange={v => { setFiltroMod(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Modalidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas modalidades</SelectItem>
                {MODALIDADES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filtroTur} onValueChange={v => { setFiltroTur(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Turma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {turmas?.map(t => <SelectItem key={t.tur_id} value={String(t.tur_id)}>{t.tur_nome}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center gap-2">
              <Input
                type="date"
                className="w-full sm:w-36"
                value={dataInicio}
                onChange={e => { setDataInicio(e.target.value); setPage(1) }}
                title="Data início"
              />
              <Input
                type="date"
                className="w-full sm:w-36"
                value={dataFim}
                onChange={e => { setDataFim(e.target.value); setPage(1) }}
                title="Data fim"
              />
            </div>

            {temFiltro && (
              <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-muted-foreground w-full sm:w-auto">
                Limpar filtros
              </Button>
            )}
          </div>

          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhuma aula registrada." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      {/* Modal edição/criação */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {selected ? 'Editar Aula' : 'Nova Aula'}
            </DialogTitle>
          </DialogHeader>
          <AulaForm
            aula={selected}
            turmas={turmas}
            funcionarios={funcionarios}
            onClose={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal detalhe — alunos da aula */}
      <AulaDetalheModal aula={detalhe} onClose={() => setDetalhe(null)} />

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Aula"
        description="Tem certeza? Os registros de presença vinculados perderão o vínculo com esta aula."
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
