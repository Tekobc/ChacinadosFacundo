import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './components/LoginPage'
import { MainLayout } from './layouts/MainLayout'
import { DashboardPage } from './modules/dashboard/DashboardPage'
import { ProveedoresPage } from './modules/proveedores/ProveedoresPage'
import { RecepcionesPage } from './modules/recepciones/RecepcionesPage'
import { DocumentosPage } from './modules/documentos/DocumentosPage'
import { VencimientosPage } from './modules/vencimientos/VencimientosPage'
import { ProduccionPage } from './modules/produccion/ProduccionPage'
import { AuthGuard } from './components/AuthGuard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<AuthGuard />}>
          <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="proveedores" element={<ProveedoresPage />} />
            <Route path="recepciones" element={<RecepcionesPage />} />
            <Route path="documentos" element={<DocumentosPage />} />
            <Route path="vencimientos" element={<VencimientosPage />} />
            <Route path="produccion" element={<ProduccionPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
