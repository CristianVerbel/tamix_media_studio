import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/components/RequireAuth';
import { Shell } from '@/components/shell/Shell';
import { AuditoriaPage } from '@/pages/auditoria/AuditoriaPage';
import { ComunidadPage } from '@/pages/comunidad/ComunidadPage';
import { ConfiguracionPage } from '@/pages/configuracion/ConfiguracionPage';
import { ContenidoPage } from '@/pages/contenido/ContenidoPage';
import { SubidaMasivaPage } from '@/pages/contenido/SubidaMasivaPage';
import { EquipoPage } from '@/pages/equipo/EquipoPage';
import { IngresosPage } from '@/pages/ingresos/IngresosPage';
import { IntegracionesPage } from '@/pages/integraciones/IntegracionesPage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { MetricaDetallePage } from '@/pages/metricas/MetricaDetallePage';
import { MetricasPage } from '@/pages/metricas/MetricasPage';
import { VideoDetallePage } from '@/pages/metricas/VideoDetallePage';
import { PlanificadorPage } from '@/pages/planificador/PlanificadorPage';
import { ResumenPage } from '@/pages/ResumenPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/entrar" element={<LoginPage />} />
      <Route
        path="/panel"
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route index element={<ResumenPage />} />
        <Route path="contenido" element={<ContenidoPage />} />
        <Route path="contenido/masiva" element={<SubidaMasivaPage />} />
        <Route path="planificador" element={<PlanificadorPage />} />
        <Route path="comunidad" element={<ComunidadPage />} />
        <Route path="metricas" element={<MetricasPage />} />
        <Route path="metricas/video/:id" element={<VideoDetallePage />} />
        <Route path="metricas/:tipo/:id" element={<MetricaDetallePage />} />
        <Route path="ingresos" element={<IngresosPage />} />
        <Route path="integraciones" element={<IntegracionesPage />} />
        <Route path="equipo" element={<EquipoPage />} />
        <Route path="auditoria" element={<AuditoriaPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
