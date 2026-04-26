import { useState } from 'react'
import { ArrowLeftRight, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { fetchAll } from '@/hooks/useApi'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, FormField } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/useToast'
import api from '@/services/api'

export default function TransferenciaPage() {
  const [ultimaTransf, setUltimaTransf] = useState(null)

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      conta_origem:  '__none__',
      conta_destino: '__none__',
      valor:   '',
      data:    new Date().toISOString().split('T')[0],
      descricao: '',
    },
  })

  const { data: contas = [] } = useQuery({
    queryKey: ['contas-select'],
    queryFn: () => fetchAll('/contas/', { cont_ativo: true }),
  })

  const queryClient = useQueryClient()

  const mutate = useMutation({
    mutationFn: (data) => api.post('/transferencia/', data).then(r => r.data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['livro-caixa'] })
      toast({ title: 'Transferência registrada com sucesso!', variant: 'success' })
      setUltimaTransf(vars)
      reset({
        conta_origem: '__none__', conta_destino: '__none__',
        valor: '', data: new Date().toISOString().split('T')[0], descricao: '',
      })
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Erro ao registrar transferência.'
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    },
  })

  const onSubmit = (data) => {
    const origem  = data.conta_origem  !== '__none__' ? parseInt(data.conta_origem)  : null
    const destino = data.conta_destino !== '__none__' ? parseInt(data.conta_destino) : null

    if (!origem)  { toast({ title: 'Selecione a conta de origem.',  variant: 'destructive' }); return }
    if (!destino) { toast({ title: 'Selecione a conta de destino.', variant: 'destructive' }); return }
    if (!data.valor || parseFloat(data.valor) <= 0) {
      toast({ title: 'Informe um valor válido.', variant: 'destructive' }); return
    }

    mutate.mutate({
      conta_origem:  origem,
      conta_destino: destino,
      valor:         data.valor,
      data:          data.data,
      descricao:     data.descricao || 'Transferência entre contas',
    })
  }

  const origemId  = watch('conta_origem')
  const destinoId = watch('conta_destino')
  const contasDisponiveis = contas.filter(c => c.cont_ativo)

  return (
    <div className="space-y-5 max-w-md">
      <PageHeader title="Transferência Entre Contas" icon={<ArrowLeftRight />} />

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <FormField label="De (conta de saída)" required>
              <Select value={watch('conta_origem')} onValueChange={v => setValue('conta_origem', v)} disabled={mutate.isPending}>
                <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
                  {contasDisponiveis.map(c => (
                    <SelectItem
                      key={c.cont_id} value={String(c.cont_id)}
                      disabled={String(c.cont_id) === destinoId}
                    >
                      {c.cont_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Para (conta de destino)" required>
              <Select value={watch('conta_destino')} onValueChange={v => setValue('conta_destino', v)} disabled={mutate.isPending}>
                <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground italic">Selecionar...</SelectItem>
                  {contasDisponiveis.map(c => (
                    <SelectItem
                      key={c.cont_id} value={String(c.cont_id)}
                      disabled={String(c.cont_id) === origemId}
                    >
                      {c.cont_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Valor (R$)" required>
              <Input
                type="number" step="0.01" min="0.01"
                {...register('valor', { required: true })}
                placeholder="0,00"
                disabled={mutate.isPending}
              />
            </FormField>

            <FormField label="Data" required>
              <Input type="date" {...register('data', { required: true })} disabled={mutate.isPending} />
            </FormField>

            <FormField label="Descrição">
              <Input
                {...register('descricao')}
                placeholder="Ex: Reserva mensal"
                disabled={mutate.isPending}
              />
            </FormField>

            <Button type="submit" className="w-full" disabled={mutate.isPending}>
              {mutate.isPending ? 'Registrando...' : 'Registrar Transferência'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmação da última transferência */}
      {ultimaTransf && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div className="text-sm space-y-0.5">
              <p className="font-semibold text-green-400">Transferência registrada</p>
              <p className="text-muted-foreground">
                {formatCurrency(ultimaTransf.valor)} em {formatDate(ultimaTransf.data)}
              </p>
              <p className="text-xs text-muted-foreground">
                {contas.find(c => c.cont_id === ultimaTransf.conta_origem)?.cont_nome} →{' '}
                {contas.find(c => c.cont_id === ultimaTransf.conta_destino)?.cont_nome}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
