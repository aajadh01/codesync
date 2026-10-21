import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import { isCodeSyncNativeApp } from './utils/isNativeApp';

// Pages
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Lists from './pages/Lists';
import ListDetails from './pages/ListDetails';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

// Helper component for protecting private routes
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-base text-zinc-100">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Smart Root Route: Directs native Android app to app views, and Web to landing/dashboard
const RootRoute = () => {
  const { user, loading } = useContext(AuthContext);
  const inApp = isCodeSyncNativeApp();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-base text-zinc-100">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Inside the Android App: Never show static landing page with "Download APK" buttons!
  if (inApp) {
    return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
  }

  // In Web Browser: If user is already logged in, take them straight to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Smart Root Route */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/auth" element={<Auth />} />

          {/* Protected MERN App Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lists"
            element={
              <ProtectedRoute>
                <Lists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lists/:id"
            element={
              <ProtectedRoute>
                <ListDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
