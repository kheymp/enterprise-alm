import { Navigate, BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import { jwtDecode } from "jwt-decode";

import UserManagement from './pages/UserManagement';
import Assets from './pages/Assets';
import Licenses from './pages/Licenses';
import Dashboard from './pages/Dashboard';

// 1. The Bouncer (Protected Route)
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const currentToken = localStorage.getItem("token");
  if (!currentToken) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles) {
    const decoded: any = jwtDecode(currentToken);
    const userRole: string = decoded.role;   // "Admin", "Manager", etc.
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
        <Route path="/register" element={<Register />} />

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
      </Routes>


    </BrowserRouter>
  )
}