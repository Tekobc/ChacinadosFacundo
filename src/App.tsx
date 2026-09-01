import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { DashboardPage } from './modules/dashboard/DashboardPage'
import { ProveedoresPage } from './modules/proveedores/ProveedoresPage'
import { RecepcionesPage } from './modules/recepciones/RecepcionesPage'
import { DocumentosPage } from './modules/documentos/DocumentosPage'
import { VencimientosPage } from './modules/vencimientos/VencimientosPage'
import { ProduccionPage } from './modules/produccion/ProduccionPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="proveedores" element={<ProveedoresPage />} />
          <Route path="recepciones" element={<RecepcionesPage />} />
          <Route path="documentos" element={<DocumentosPage />} />
          <Route path="vencimientos" element={<VencimientosPage />} />
          <Route path="produccion" element={<ProduccionPage />} />
          {/* Ruta catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
