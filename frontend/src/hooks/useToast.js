import { useToast as useRadixToast } from '@/components/ui/toast'

export function useToast() {
  return useRadixToast()
}

// Toast global sem hook — usa evento customizado para chamar de fora de componentes
const toastListeners = []

export function toast(opts) {
  toastListeners.forEach(fn => fn(opts))
}

export function subscribeToast(fn) {
  toastListeners.push(fn)
  return () => {
    const idx = toastListeners.indexOf(fn)
    if (idx > -1) toastListeners.splice(idx, 1)
  }
}
