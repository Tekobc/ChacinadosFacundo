import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  PackageSearch,
  FileText,
  AlertCircle,
  ChefHat,
  Factory,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/proveedores', label: 'Proveedores', icon: Truck },
  { to: '/recepciones', label: 'Recepción MP', icon: PackageSearch },
  { to: '/documentos', label: 'Documentación', icon: FileText },
  { to: '/vencimientos', label: 'Vencimientos', icon: AlertCircle },
  { to: '/produccion', label: 'Recetas y Producción', icon: ChefHat },
]

export function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-blue-900 text-white flex flex-col">
      {/* Logo / Nombre del sistema */}
      <div className="px-6 py-5 border-b border-blue-800">
        <div className="flex items-center gap-2">
          <Factory size={24} className="text-blue-300" />
          <div>
            <p className="text-xs text-blue-300 uppercase tracking-widest font-medium">Gestión</p>
            <p className="font-semibold text-sm leading-tight">Calidad Chacinados</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer del sidebar */}
      <div className="px-6 py-4 border-t border-blue-800">
        <p className="text-xs text-blue-400">Sistema de Control de Calidad</p>
        <p className="text-xs text-blue-500 mt-0.5">v0.1.0 — Fase 0</p>
      </div>
    </aside>
  )
}
