import { Navigate, BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';

import UserManagement from './pages/UserManagement';
import Assets from './pages/Assets';
import Licenses from './pages/Licenses';
import Dashboard from './pages/Dashboard';

// 1. The Bouncer (Protected Route)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const currentToken = localStorage.getItem("token");

  if (!currentToken) {
    return <Navigate to="/login" replace />;
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
          <ProtectedRoute>
            <MainLayout>
              <UserManagement />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/assets" element={
          <ProtectedRoute>
            <MainLayout>
              <Assets />
            </MainLayout>
          </ProtectedRoute>
        } />

        <Route path="/licenses" element={
          <ProtectedRoute>
            <MainLayout>
              <Licenses />
            </MainLayout>
          </ProtectedRoute>
        } />
      </Routes>


    </BrowserRouter>
  )
}