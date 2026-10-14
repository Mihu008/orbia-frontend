import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoginView } from './views/auth/LoginView';
import { StockLedgerView } from './views/inventory/StockLedgerView';
import { MasterCatalogView } from './views/inventory/MasterCatalogView';
import { StockTransfersView } from './views/inventory/StockTransfersView';
import { StoreInView } from './views/store/StoreInView';
import { StoreIssueView } from './views/store/StoreIssueView';
import { ProcurementView } from './views/procurement/ProcurementView';
import { FleetView } from './views/fleet/FleetView';
import { MaintenanceView } from './views/maintenance/MaintenanceView';
import { OperationsView } from './views/operations/OperationsView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginView />} />

              {/* Protected app routes */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/inventory" replace />} />
                <Route path="inventory" element={<StockLedgerView />} />
                <Route path="inventory/transfers" element={<StockTransfersView />} />
                <Route path="inventory/masters" element={<MasterCatalogView />} />
                <Route path="procurement" element={<ProcurementView />} />
                <Route path="fleet" element={<FleetView />} />
                <Route path="maintenance" element={<MaintenanceView />} />
                <Route path="operations" element={<OperationsView />} />
                <Route path="store/intake" element={<StoreInView />} />
                <Route path="store/issue" element={<StoreIssueView />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/inventory" replace />} />
            </Routes>
          </BrowserRouter>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
