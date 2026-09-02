import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  PackageSearch,
  FileText,
  AlertCircle,
  ChefHat,
  Factory,
  LogOut,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/proveedores', label: 'Proveedores', icon: Truck },
  { to: '/recepciones', label: 'Recepción MP', icon: PackageSearch },
  { to: '/documentos', label: 'Documentación', icon: FileText },
  { to: '/vencimientos', label: 'Vencimientos', icon: AlertCircle },
  { to: '/produccion', label: 'Recetas y Producción', icon: ChefHat },
]

type SidebarProps = {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onClose?.()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex w-72 max-w-[82vw] min-h-screen flex-col bg-[var(--color-graphite)] text-white md:w-64">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--color-primary)]/15 p-2 text-[var(--color-primary)]">
            <Factory size={20} />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">Gestión</p>
            <p className="text-sm font-semibold leading-tight text-white">Calidad Chacinados</p>
          </div>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Cerrar menú"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'border-[var(--color-primary)] bg-white/4 text-white'
                  : 'border-transparent text-white/75 hover:border-white/20 hover:bg-white/4 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
        <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-white/45">Sistema de Control de Calidad</p>
        <p className="mt-1 text-[11px] text-white/35">v0.1.0 — Fase 0</p>
      </div>
    </aside>
  )
}
