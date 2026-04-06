import { useState } from 'react'
import { UserCheck, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
import { useQuery } from '@tanstack/react-query'
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
import { formatCPF, onlyNumbers } from '@/lib/utils'
import api from '@/services/api'

const ENDPOINT = '/funcionarios/'
const KEY      = 'funcionarios'

function FuncForm({ func, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: func ? {
      func_nome:       func.func_nome,
      func_documento:  func.func_documento,
      func_telefone:   func.func_telefone || '',
      func_endereco:   func.func_endereco || '',
      func_formacao:   func.func_formacao || '',
      func_salario:    func.func_salario || '',
      prof:            func.prof ? String(func.prof) : '',
    } : {},
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const { data: profissoes } = useQuery({
    queryKey: ['profissoes-select'],
    queryFn: () => api.get('/profissoes/', { params: { page_size: 100 } }).then(r => r.data.results),
  })

  const onSubmit = (data) => {
    data.func_documento = onlyNumbers(data.func_documento)
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (cleaned.prof) cleaned.prof = parseInt(cleaned.prof)
    if (func) update.mutate({ id: func.id, data: cleaned })
    else      create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Nome completo" required error={errors.func_nome?.message} className="sm:col-span-2">
          <Input {...register('func_nome', { required: 'Nome obrigatório' })} placeholder="Nome do funcionário" disabled={busy} />
        </FormField>

        <FormField label="CPF" required error={errors.func_documento?.message}>
          <Input
            {...register('func_documento', {
              required: 'CPF obrigatório',
              validate: v => onlyNumbers(v).length === 11 || 'CPF deve ter 11 dígitos',
            })}
            placeholder="000.000.000-00"
            disabled={busy}
            onChange={e => {
              const n = onlyNumbers(e.target.value)
              const f = n.length <= 11
                ? n.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
                    d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a)
                : e.target.value
              setValue('func_documento', f)
            }}
          />
        </FormField>

        <FormField label="Telefone">
          <Input {...register('func_telefone')} placeholder="(34) 99999-0000" disabled={busy} />
        </FormField>

        <FormField label="Endereço" className="sm:col-span-2">
          <Input {...register('func_endereco')} placeholder="Rua Exemplo, 123 — Uberlândia, MG" disabled={busy} />
        </FormField>

        <FormField label="Formação">
          <Input {...register('func_formacao')} placeholder="CREF, Fisioterapeuta..." disabled={busy} />
        </FormField>

        <FormField label="Salário (R$)">
          <Input type="number" step="0.01" {...register('func_salario')} placeholder="3000.00" disabled={busy} />
        </FormField>

        <FormField label="Profissão" className="sm:col-span-2">
          <Select
            value={watch('prof') || '__none__'}
            onValueChange={v => setValue('prof', v)}
            disabled={busy}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" disabled className="text-muted-foreground italic">Selecionar profissão...</SelectItem>
              {profissoes?.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.prof_nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : func ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function FuncDetail({ func, onClose }) {
  if (!func) return null
  const F = ({ label, value }) => (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm mt-0.5">{value || '—'}</p>
    </div>
  )
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <F label="Nome"      value={func.func_nome} />
        <F label="CPF"       value={formatCPF(func.func_documento)} />
        <F label="Telefone"  value={func.func_telefone} />
        <F label="Formação"  value={func.func_formacao} />
        <F label="Salário"   value={func.func_salario ? `R$ ${func.func_salario}` : null} />
        <F label="Endereço"  value={func.func_endereco} />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
      </DialogFooter>
    </div>
  )
}

export default function FuncionariosPage() {
  const [modalOpen, setModalOpen]   = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected]     = useState(null)
  const [deleteId, setDeleteId]     = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Funcionário excluído.' })

  const openEdit   = (f) => { setSelected(f); setModalOpen(true) }
  const openCreate = ()  => { setSelected(null); setModalOpen(true) }
  const openDetail = (f) => { setSelected(f); setDetailOpen(true) }

  const columns = [
    { key: 'func_nome',      header: 'Nome',      render: r => <span className="font-medium">{r.func_nome}</span> },
    { key: 'func_documento', header: 'CPF',        render: r => formatCPF(r.func_documento) },
    { key: 'func_telefone',  header: 'Telefone',   render: r => r.func_telefone || '—' },
    { key: 'func_formacao',  header: 'Formação',   render: r => r.func_formacao || '—' },
    {
      key: 'acoes', header: '', cellClassName: 'w-24',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => openDetail(r)}><Eye className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.id)} className="text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Funcionários"
        description="Cadastro e gestão de funcionários"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" />Novo Funcionário</Button>}
      />

      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por nome ou CPF..." onSearch={q => setFilters(q ? { search: q } : {})} />
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum funcionário cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
          </DialogHeader>
          <FuncForm func={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-fluir-purple" />
              {selected?.func_nome}
            </DialogTitle>
          </DialogHeader>
          <FuncDetail func={selected} onClose={() => setDetailOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir Funcionário"
        description="Tem certeza que deseja excluir este funcionário?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
