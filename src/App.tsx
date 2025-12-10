import { AuthProvider } from './contexts/AuthContext';
import AuthComponent from './components/AuthComponent';
import AppLayout from './components/AppLayout';
import { useAuth } from './hooks/useAuth';
import { Navigate, Route, Routes } from 'react-router-dom';
import ItwinsRoute from './routes/ItwinsRoute';
import RealityDataRoute from './routes/RealityDataRoute';
import RealityModelingV2Route from './routes/RealityModelingV2Route';
import ItwinDetailRoute from './routes/ItwinDetailRoute';
import SynchronizationRoute from './routes/SynchronizationRoute';
import StorageRoute from './routes/StorageRoute';
import FormsRoute from './routes/FormsRoute';
import IModelsRoute from './routes/IModelsRoute';
import IModelVersionsRoute from './routes/IModelVersionsRoute';

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthComponent />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}> 
        <Route path="/itwins" element={<ItwinsRoute />} />
        <Route path="/itwins/:itwinId" element={<ItwinDetailRoute />} />
        <Route path="/itwins/:itwinId/imodels" element={<IModelsRoute />} />
        <Route path="/itwins/:itwinId/imodels/:imodelId/versions" element={<IModelVersionsRoute />} />
  <Route path="/reality-data" element={<RealityDataRoute />} />
  <Route path="/reality-modeling-v2" element={<RealityModelingV2Route />} />
        <Route path="/synchronization" element={<SynchronizationRoute />} />
        <Route path="/storage" element={<StorageRoute />} />
          <Route path="/forms" element={<FormsRoute />} />
        <Route path="*" element={<Navigate to="/itwins" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <AppContent />
      </div>
    </AuthProvider>
  );
}

export default App;
