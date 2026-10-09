import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import RiskAlerts from './pages/RiskAlerts';
import InvestigationQueue from './pages/InvestigationQueue';
import Analytics from './pages/Analytics';
import RiskMap from './pages/RiskMap';
import EvidenceReview from './pages/EvidenceReview';
import Compliance from './pages/Compliance';
import Settings from './pages/Settings';
import ModelTransparency from './pages/ModelTransparency';
import MPDirectory from './pages/MPDirectory';
import MPProfile from './pages/MPProfile';
import FundFlow from './pages/FundFlow';
import ReportsCenter from './pages/ReportsCenter';
import DataQuality from './pages/DataQuality';
import { getStoredUser } from './services/api';

function RequireAuth({ children }) {
  const user = getStoredUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<ProjectDetails />} />
          <Route path="alerts" element={<RiskAlerts />} />
          <Route path="investigations" element={<InvestigationQueue />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="risk-map" element={<RiskMap />} />
          <Route path="evidence" element={<EvidenceReview />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="model-transparency" element={<ModelTransparency />} />
          <Route path="mp-directory" element={<MPDirectory />} />
          <Route path="mp/:memberCode" element={<MPProfile />} />
          <Route path="fund-flow" element={<FundFlow />} />
          <Route path="reports" element={<ReportsCenter />} />
          <Route path="data-quality" element={<DataQuality />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
