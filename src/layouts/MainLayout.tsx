import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'

export function MainLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar fijo en desktop, oculto en mobile (se manejará en Fase 4) */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        {/* Header mobile con hamburger — placeholder para Fase 4 */}
        <div className="md:hidden bg-blue-900 text-white px-4 py-3 flex items-center gap-3">
          <span className="font-semibold text-sm">Calidad Chacinados</span>
        </div>

        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
