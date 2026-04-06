import { useState } from 'react'
import { Building2, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { useList, useCreate, useUpdate, useDelete } from '@/hooks/useApi'
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
import { formatCNPJ, onlyNumbers } from '@/lib/utils'

const ENDPOINT = '/fornecedores/'
const KEY      = 'fornecedores'

function FornForm({ forn, onClose }) {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: forn ? {
      for_nome:     forn.for_nome,
      for_cnpj:     forn.for_cnpj || '',
      for_telefone: forn.for_telefone || '',
      for_email:    forn.for_email || '',
      for_endereco: forn.for_endereco || '',
    } : {},
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    if (data.for_cnpj) data.for_cnpj = onlyNumbers(data.for_cnpj)
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    if (forn) update.mutate({ id: forn.id, data: cleaned })
    else      create.mutate(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <FormField label="Nome / Razão Social" required error={errors.for_nome?.message}>
        <Input {...register('for_nome', { required: 'Nome obrigatório' })} placeholder="Empresa LTDA" disabled={busy} />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="CNPJ">
          <Input
            {...register('for_cnpj')}
            placeholder="00.000.000/0000-00"
            disabled={busy}
            onChange={e => {
              const n = onlyNumbers(e.target.value)
              const f = n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a,b,c,d,e2) => {
                if (e2) return `${a}.${b}.${c}/${d}-${e2}`
                if (d)  return `${a}.${b}.${c}/${d}`
                if (c)  return `${a}.${b}.${c}`
                if (b)  return `${a}.${b}`
                return a
              })
              setValue('for_cnpj', f)
            }}
          />
        </FormField>
        <FormField label="Telefone">
          <Input {...register('for_telefone')} placeholder="(34) 99999-0000" disabled={busy} />
        </FormField>
      </div>

      <FormField label="E-mail">
        <Input type="email" {...register('for_email')} placeholder="contato@empresa.com" disabled={busy} />
      </FormField>

      <FormField label="Endereço">
        <Input {...register('for_endereco')} placeholder="Rua Exemplo, 123" disabled={busy} />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : forn ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function FornecedoresPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Fornecedor excluído.' })

  const columns = [
    { key: 'for_nome',     header: 'Nome',     render: r => <span className="font-medium">{r.for_nome}</span> },
    { key: 'for_cnpj',     header: 'CNPJ',     render: r => formatCNPJ(r.for_cnpj) },
    { key: 'for_telefone', header: 'Telefone', render: r => r.for_telefone || '—' },
    { key: 'for_email',    header: 'E-mail',   render: r => r.for_email || '—' },
    {
      key: 'acoes', header: '', cellClassName: 'w-20',
      render: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(r); setModalOpen(true) }}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(r.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fornecedores"
        description="Cadastro de fornecedores e parceiros"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo Fornecedor</Button>}
      />
      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por nome ou CNPJ..." onSearch={q => setFilters(q ? { search: q } : {})} />
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum fornecedor cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
          <FornForm forn={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Fornecedor" description="Tem certeza que deseja excluir este fornecedor?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
