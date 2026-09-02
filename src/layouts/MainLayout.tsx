import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'

export function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[var(--color-page)] text-[var(--color-text)]">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {mobileMenuOpen ? (
        <button
          type="button"
          aria-label="Cerrar overlay del menú"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-200 md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--color-border)] bg-white/85 px-4 py-3 backdrop-blur-sm md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-2 text-[var(--color-text)]"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>

          <span className="text-sm font-semibold tracking-[0.12em] text-[var(--color-text)] uppercase">
            Calidad Chacinados
          </span>
        </header>

        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
