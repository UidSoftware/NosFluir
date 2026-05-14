import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, DollarSign, Users, Dumbbell, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITENS = [
  { icon: LayoutDashboard, path: '/dashboard' },
  { icon: DollarSign,      path: '/financas/contas-receber' },
  { icon: Users,           path: '/operacional/alunos' },
  { icon: Dumbbell,        path: '/tecnico/ministrar-aula' },
  { icon: BarChart2,       path: '/relatorios/frequencia' },
]

export function BottomBar() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-fluir-dark-2 border-t border-border flex md:hidden">
      {ITENS.map(({ icon: Icon, path }) => (
        <Link
          key={path}
          to={path}
          className={cn(
            'flex-1 flex items-center justify-center py-3 transition-colors',
            location.pathname.startsWith(path)
              ? 'text-fluir-cyan'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon size={22} />
        </Link>
      ))}
    </nav>
  )
}
