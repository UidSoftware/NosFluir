import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/primitives'

export function SearchFilter({ placeholder = 'Buscar...', onSearch, debounce = 400, children, className }) {
  const [value, setValue] = useState('')
  const timerRef = useRef(null)

  const handleChange = (e) => {
    const v = e.target.value
    setValue(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSearch(v), debounce)
  }

  const handleClear = () => {
    setValue('')
    onSearch('')
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="pl-9 pr-8"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
