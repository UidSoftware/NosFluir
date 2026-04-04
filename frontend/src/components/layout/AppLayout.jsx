import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Toaster } from '@/components/ui/toast'
import { useAuthStore } from '@/store/useAuthStore'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { init } = useAuthStore()

  useEffect(() => {
    init()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-fluir-dark">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-5">
          <div className="max-w-screen-xl mx-auto page-fade">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  )
}
