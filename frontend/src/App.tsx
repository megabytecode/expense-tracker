import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AppLayout } from "./components/layout/AppLayout"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { LoginPage } from "./pages/auth/LoginPage"
import { VerifyOtpPage } from "./pages/auth/VerifyOtpPage"
import { AccountsPage } from "./pages/accounts/AccountsPage"
import { CategoriesPage } from "./pages/categories/CategoriesPage"
import { SettingsPage } from "./pages/settings/SettingsPage"
import { DashboardPage } from "./pages/DashboardPage"
import { DebtsPage } from "./pages/debts/DebtsPage"
import { SavingsGoalsPage } from "./pages/savings-goals/SavingsGoalsPage"
import { MonthlyPlannerPage } from "./pages/monthly-planner/MonthlyPlannerPage"
import { AdminPage } from "./pages/admin/AdminPage"
import { LoadingState } from "./components/ui/EmptyState"

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "admin" | "user";
}) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-4 flex items-center justify-center">
        <LoadingState title="Validando sesión..." description="Estamos revisando tu acceso antes de abrir la app." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/debts" element={<DebtsPage />} />
        <Route path="/savings-goals" element={<SavingsGoalsPage />} />
        <Route path="/monthly-planner" element={<MonthlyPlannerPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
