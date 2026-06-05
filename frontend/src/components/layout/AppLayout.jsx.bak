import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { BottomBar } from './BottomBar'
import { Toaster } from '@/components/ui/toast'
import { useAuthStore } from '@/store/useAuthStore'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(true)
  const [drawerAberto, setDrawerAberto] = useState(false)
  const { init } = useAuthStore()

  useEffect(() => {
    init()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-fluir-dark">
      {/* Sidebar — visível só no desktop */}
      <div className="hidden md:flex">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>

      {/* Drawer mobile */}
      {drawerAberto && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setDrawerAberto(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 z-50 md:hidden transition-transform duration-300">
            <Sidebar collapsed={false} onToggle={() => setDrawerAberto(false)} />
          </div>
        </>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setDrawerAberto(v => !v)} />
        <main className="flex-1 overflow-y-auto p-5 pb-20 md:pb-5">
          <div className="max-w-screen-xl mx-auto page-fade">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomBar />
      <Toaster />
    </div>
  )
}
