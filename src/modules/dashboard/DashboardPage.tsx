import { LayoutDashboard } from 'lucide-react'

export function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard size={28} className="text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Resumen general del sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Placeholders para Fase 4 */}
        {[
          { label: 'Vencimientos próximos', value: '—', color: 'yellow' },
          { label: 'Recepciones del mes', value: '—', color: 'blue' },
          { label: 'Rechazos recientes', value: '—', color: 'red' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 text-${color}-600`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <p className="text-blue-700 font-medium">🚀 Sistema iniciado correctamente</p>
        <p className="text-blue-600 text-sm mt-1">
          Fase 0 completada. Navegá por los módulos del sidebar para comenzar a cargar datos.
        </p>
      </div>
    </div>
  )
}
