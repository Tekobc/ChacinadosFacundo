import { FileText } from 'lucide-react'

export function DocumentosPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <FileText size={28} className="text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentación</h1>
          <p className="text-sm text-gray-500">Repositorio de documentos y habilitaciones</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 shadow-sm">
        <FileText size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">Módulo en construcción</p>
        <p className="text-sm mt-1">Se implementa en Fase 2</p>
      </div>
    </div>
  )
}
