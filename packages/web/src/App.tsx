import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { BatchesPage } from '@/pages/batches/BatchesPage';
import { BatchDetailPage } from '@/pages/batches/BatchDetailPage';
import { TransfersPage } from '@/pages/transfers/TransfersPage';
import QrManagementPage from '@/pages/qr/QrManagementPage';
import InventoryPage from '@/pages/inventory/InventoryPage';
import { RiskDashboardPage } from '@/pages/risk/RiskDashboardPage';
import { InvestigationsPage } from '@/pages/investigations/InvestigationsPage';
import { InvestigationDetailPage } from '@/pages/investigations/InvestigationDetailPage';
import AlertsPage from '@/pages/alerts/AlertsPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { TenantsPage } from '@/pages/tenants/TenantsPage';
import AnalyticsPage from '@/pages/analytics/AnalyticsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { PublicVerificationPage } from '@/pages/verify/PublicVerificationPage';
import { RetailSalesPage } from '@/pages/sales/RetailSalesPage';

/**
 * ProtectedRoute — Redirects to login if user is not authenticated
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * AdminRoute — Only allows platform_admin role
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  if (user?.role !== 'platform_admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * GuestRoute — Redirects authenticated users to dashboard
 */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Main App component with all route definitions
 */
function App() {
  return (
    <Routes>
      {/* Public verification page — no auth required */}
      <Route path="/verify/:token" element={<PublicVerificationPage />} />

      {/* Auth routes */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          </GuestRoute>
        }
      />

      {/* Protected dashboard routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="batches" element={<BatchesPage />} />
        <Route path="batches/:id" element={<BatchDetailPage />} />
        <Route path="transfers" element={<TransfersPage />} />
        <Route path="sales" element={<RetailSalesPage />} />
        <Route path="qr" element={<QrManagementPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="risk" element={<RiskDashboardPage />} />
        <Route path="investigations" element={<InvestigationsPage />} />
        <Route path="investigations/:id" element={<InvestigationDetailPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route
          path="tenants"
          element={
            <AdminRoute>
              <TenantsPage />
            </AdminRoute>
          }
        />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
