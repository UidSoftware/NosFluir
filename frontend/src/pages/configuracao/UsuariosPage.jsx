import { useState } from 'react'
import { UserCog, Plus, Pencil, Trash2 } from 'lucide-react'
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
import { BooleanBadge } from '@/components/shared/StatusBadge'

const ENDPOINT = '/usuarios/'
const KEY      = 'usuarios'

const GRUPOS = ['Administrador', 'Professor', 'Financeiro', 'Recepcionista']

function UserForm({ usuario, onClose }) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: usuario ? {
      first_name: usuario.first_name || '',
      last_name:  usuario.last_name || '',
      email:      usuario.email || '',
      password:   '',
      is_active:  usuario.is_active !== false,
      groups:     usuario.groups || [],
    } : { is_active: true, groups: [] },
  })

  const create = useCreate(KEY, ENDPOINT, { onSuccess: onClose })
  const update = useUpdate(KEY, ENDPOINT, { onSuccess: onClose })
  const busy   = create.isPending || update.isPending

  const onSubmit = (data) => {
    const payload = { ...data }
    if (!payload.password) delete payload.password
    if (usuario) update.mutate({ id: usuario.id, data: payload })
    else         create.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-5">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nome" required error={errors.first_name?.message}>
          <Input {...register('first_name', { required: 'Nome obrigatório' })} placeholder="Giulia" disabled={busy} />
        </FormField>
        <FormField label="Sobrenome">
          <Input {...register('last_name')} placeholder="Fagionato" disabled={busy} />
        </FormField>
      </div>

      <FormField label="E-mail" required error={errors.email?.message}>
        <Input type="email" {...register('email', { required: 'E-mail obrigatório' })} placeholder="giulia@email.com" disabled={busy} />
      </FormField>

      <FormField label={usuario ? 'Nova Senha (deixar em branco para manter)' : 'Senha'} error={errors.password?.message}>
        <Input
          type="password"
          {...register('password', { required: !usuario ? 'Senha obrigatória' : false })}
          placeholder="••••••••"
          disabled={busy}
        />
      </FormField>

      <FormField label="Grupos de Acesso">
        <div className="space-y-1.5">
          {GRUPOS.map(g => (
            <label key={g} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                value={g}
                {...register('groups')}
                className="w-4 h-4 rounded accent-fluir-purple"
                disabled={busy}
              />
              <span className="text-sm">{g}</span>
            </label>
          ))}
        </div>
      </FormField>

      <FormField label="Ativo">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" {...register('is_active')} className="w-4 h-4 rounded accent-fluir-purple" disabled={busy} />
          <span className="text-sm">Usuário ativo</span>
        </label>
      </FormField>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Salvando...' : usuario ? 'Salvar Alterações' : 'Criar Usuário'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function UsuariosPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [deleteId, setDeleteId]   = useState(null)

  const { data, isLoading, page, setPage, totalPages, count, setFilters } = useList(KEY, ENDPOINT)
  const del = useDelete(KEY, ENDPOINT, { successMsg: 'Usuário excluído.' })

  const columns = [
    {
      key: 'nome', header: 'Nome',
      render: r => (
        <div>
          <p className="font-medium">{[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email}</p>
          <p className="text-xs text-muted-foreground">{r.email}</p>
        </div>
      ),
    },
    {
      key: 'groups', header: 'Grupos',
      render: r => (r.groups || []).join(', ') || '—',
    },
    { key: 'is_active', header: 'Ativo', render: r => <BooleanBadge value={r.is_active} /> },
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
        title="Usuários"
        description="Gestão de usuários e permissões do sistema"
        actions={<Button onClick={() => { setSelected(null); setModalOpen(true) }}><Plus className="w-4 h-4" />Novo Usuário</Button>}
      />
      <Card>
        <CardContent className="p-5 space-y-4">
          <SearchFilter placeholder="Buscar por nome ou e-mail..." onSearch={q => setFilters(q ? { search: q } : {})} />
          <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage="Nenhum usuário cadastrado." />
          <Pagination page={page} totalPages={totalPages} count={count} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selected ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle></DialogHeader>
          <UserForm usuario={selected} onClose={() => setModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId} onOpenChange={() => setDeleteId(null)}
        title="Excluir Usuário" description="Tem certeza que deseja excluir este usuário?"
        confirmLabel="Excluir"
        onConfirm={() => { del.mutate(deleteId); setDeleteId(null) }}
        isLoading={del.isPending}
      />
    </div>
  )
}
