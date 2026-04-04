import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/services/api'
import { toast } from '@/hooks/useToast'

// ── useList — lista paginada ──────────────────────────────────────────────────
export function useList(key, endpoint, options = {}) {
  const [page, setPage]       = useState(1)
  const [filters, setFilters] = useState({})
  const PAGE_SIZE = 20

  const query = useQuery({
    queryKey: [key, page, filters],
    queryFn: async () => {
      const params = { page, ...filters }
      const { data } = await api.get(endpoint, { params })
      return data
    },
    ...options,
  })

  const items      = query.data?.results ?? []
  const count      = query.data?.count ?? 0
  const totalPages = Math.ceil(count / PAGE_SIZE) || 1

  return {
    data: items,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    page,
    setPage,
    totalPages,
    count,
    filters,
    setFilters: (f) => { setFilters(f); setPage(1) },
  }
}

// ── useDetail — busca um registro ────────────────────────────────────────────
export function useDetail(key, endpoint, id, options = {}) {
  return useQuery({
    queryKey: [key, id],
    queryFn: async () => {
      const { data } = await api.get(`${endpoint}${id}/`)
      return data
    },
    enabled: !!id,
    ...options,
  })
}

// ── useCreate — cria registro ────────────────────────────────────────────────
export function useCreate(key, endpoint, options = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, successMsg = 'Registro criado com sucesso.' } = options

  return useMutation({
    mutationFn: (data) => api.post(endpoint, data).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [key] })
      toast({ title: successMsg, variant: 'success' })
      onSuccess?.(data)
    },
    onError: (err) => {
      const msg = extractError(err)
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' })
    },
  })
}

// ── useUpdate — atualiza registro ────────────────────────────────────────────
export function useUpdate(key, endpoint, options = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, successMsg = 'Registro atualizado com sucesso.' } = options

  return useMutation({
    mutationFn: ({ id, data }) => api.patch(`${endpoint}${id}/`, data).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [key] })
      toast({ title: successMsg, variant: 'success' })
      onSuccess?.(data)
    },
    onError: (err) => {
      const msg = extractError(err)
      toast({ title: 'Erro ao atualizar', description: msg, variant: 'destructive' })
    },
  })
}

// ── useDelete — remove registro (soft delete) ────────────────────────────────
export function useDelete(key, endpoint, options = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, successMsg = 'Registro excluído.' } = options

  return useMutation({
    mutationFn: (id) => api.delete(`${endpoint}${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [key] })
      toast({ title: successMsg, variant: 'success' })
      onSuccess?.()
    },
    onError: (err) => {
      const msg = extractError(err)
      toast({ title: 'Erro ao excluir', description: msg, variant: 'destructive' })
    },
  })
}

// ── Extrai mensagem de erro da resposta ─────────────────────────────────────
function extractError(err) {
  const data = err.response?.data
  if (!data) return err.message || 'Erro desconhecido.'
  if (typeof data === 'string') return data
  const msgs = Object.entries(data)
    .map(([k, v]) => {
      const val = Array.isArray(v) ? v.join(', ') : v
      return k === 'detail' || k === 'non_field_errors' ? val : `${k}: ${val}`
    })
  return msgs.join(' | ')
}
