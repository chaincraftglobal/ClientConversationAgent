import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Clients from './pages/Clients';
import Assignments from './pages/Assignments';
import Chat from './pages/Chat';
import CreateAgent from './pages/CreateAgent';  // ✅ ADD THIS
import CreateClient from './pages/CreateClient';
import CreateAssignment from './pages/CreateAssignment';
import PaymentGatewaySettings from './pages/PaymentGatewaySettings';
import MerchantDashboard from './pages/MerchantDashboard';
import AddMerchantAccount from './pages/AddMerchantAccount';

import ViewMerchantAccount from './pages/ViewMerchantAccount';
import EditMerchantAccount from './pages/EditMerchantAccount';
import WelcomeEmailDashboard from './pages/WelcomeEmailDashboard';
import WelcomeEmailSettings from './pages/WelcomeEmailSettings';


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
      />

      <Route
        path="/assignments/create"
        element={
          <ProtectedRoute>
            <CreateAssignment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agents"
        element={
          <ProtectedRoute>
            <Agents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <Clients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assignments"
        element={
          <ProtectedRoute>
            <Assignments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:assignmentId?"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchants"
        element={
          <ProtectedRoute>
            <MerchantDashboard />
          </ProtectedRoute>
        }
      />

      {/* ✅ ADD THIS ROUTE */}
      <Route
        path="/agents/create"
        element={
          <ProtectedRoute>
            <CreateAgent />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment-gateway"
        element={
          <ProtectedRoute>
            <PaymentGatewaySettings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchants/add"
        element={
          <ProtectedRoute>
            <AddMerchantAccount />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clients/create"
        element={
          <ProtectedRoute>
            <CreateClient />
          </ProtectedRoute>
        }
      />

      <Route
        path="/merchants/view/:id"
        element={
          <ProtectedRoute>
            <ViewMerchantAccount />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchants/edit/:id"
        element={
          <ProtectedRoute>
            <EditMerchantAccount />
          </ProtectedRoute>
        }
      />


      <Route path="/welcome-emails" element={<ProtectedRoute><WelcomeEmailDashboard /></ProtectedRoute>} />
      <Route path="/welcome-emails/settings" element={<ProtectedRoute><WelcomeEmailSettings /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;