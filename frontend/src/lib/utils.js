import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge classNames com Tailwind deduplication */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Formata valor monetário em BRL */
export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

/** Formata data ISO "YYYY-MM-DD" → "DD/MM/YYYY" */
export function formatDate(value) {
  if (!value) return '—'
  if (value.includes('T')) {
    // datetime
    return new Date(value).toLocaleDateString('pt-BR')
  }
  const [y, m, d] = value.split('-')
  return `${d}/${m}/${y}`
}

/** Formata datetime ISO → "DD/MM/YYYY HH:mm" */
export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Formata CPF "00000000000" → "000.000.000-00" */
export function formatCPF(value) {
  if (!value) return '—'
  const n = onlyNumbers(value)
  if (n.length !== 11) return value
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/** Formata CNPJ "00000000000000" → "00.000.000/0000-00" */
export function formatCNPJ(value) {
  if (!value) return '—'
  const n = onlyNumbers(value)
  if (n.length !== 14) return value
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/** Retorna somente dígitos */
export function onlyNumbers(value) {
  if (!value) return ''
  return String(value).replace(/\D/g, '')
}

/** Retorna iniciais do nome (máx 2) */
export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

// ── Status Colors ────────────────────────────────────────────────────────────

export const STATUS_COLORS = {
  // Genérico
  ativo:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  inativo:    'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  pendente:   'bg-amber-500/15 text-amber-400 border-amber-500/20',
  cancelado:  'bg-red-500/15 text-red-400 border-red-500/20',
  // Contas
  pago:       'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  recebido:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  vencido:    'bg-red-500/15 text-red-400 border-red-500/20',
  // Crédito reposição
  disponivel: 'bg-fluir-purple/15 text-fluir-purple border-fluir-purple/20',
  usado:      'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
  expirado:   'bg-red-500/15 text-red-400 border-red-500/20',
  // Aula
  presente:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  falta:      'bg-red-500/15 text-red-400 border-red-500/20',
  reposicao:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  // Livro caixa
  entrada:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  saida:      'bg-red-500/15 text-red-400 border-red-500/20',
}

export const STATUS_LABELS = {
  ativo:      'Ativo',
  inativo:    'Inativo',
  pendente:   'Pendente',
  cancelado:  'Cancelado',
  pago:       'Pago',
  recebido:   'Recebido',
  vencido:    'Vencido',
  disponivel: 'Disponível',
  usado:      'Usado',
  expirado:   'Expirado',
  presente:   'Presente',
  falta:      'Falta',
  reposicao:  'Reposição',
  entrada:    'Entrada',
  saida:      'Saída',
}
