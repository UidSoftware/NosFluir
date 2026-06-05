import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function FAB({ onClick, to, icon: Icon, label, className }) {
  const base = 'fixed bottom-20 right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-fluir-purple text-white shadow-lg shadow-fluir-purple/30 hover:bg-fluir-purple/90 active:scale-95 transition-all md:hidden'
  if (to) return <Link to={to} className={cn(base, className)} aria-label={label}><Icon className="w-6 h-6" /></Link>
  return <button onClick={onClick} className={cn(base, className)} aria-label={label}><Icon className="w-6 h-6" /></button>
}
