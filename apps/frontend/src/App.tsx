import { Navigate, BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import { jwtDecode } from "jwt-decode";
import UserManagement from './pages/UserManagement';
import Assets from './pages/Assets';
import Licenses from './pages/Licenses';
import Dashboard from './pages/Dashboard';
import AuditLog from './pages/AuditLog';
import ChangePassword from './pages/ChangePassword';

// 1. The Bouncer (Protected Route)
const ProtectedRoute = ({
  children,
  allowedRoles,
  allowPasswordChange,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowPasswordChange?: boolean;
}) => {
  const currentToken = localStorage.getItem("token");
  if (!currentToken) {
    return <Navigate to="/login" replace />;
  }
  const decoded: any = jwtDecode(currentToken);

  // Force the temp-password user onto the change screen before anything else.
  if (decoded.mustChangePassword === "true" && !allowPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles) {
    const userRole: string = decoded.role;
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <MainLayout>
              <UserManagement />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/assets" element={
          <ProtectedRoute allowedRoles={["Admin", "Manager", "Viewer"]}>
            <MainLayout>
              <Assets />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/licenses" element={
          <ProtectedRoute allowedRoles={["Admin", "Manager", "Viewer"]}>
            <MainLayout>
              <Licenses />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/audit-log" element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <MainLayout>
              <AuditLog />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/change-password" element={
          <ProtectedRoute allowPasswordChange>
            <ChangePassword />
          </ProtectedRoute>
        } />
      </Routes>

    </BrowserRouter>
  )
}