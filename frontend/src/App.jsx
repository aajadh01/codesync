import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import AppLoadingScreen from './components/AppLoadingScreen';
import AppNetworkErrorScreen from './components/AppNetworkErrorScreen';
import { isCodeSyncNativeApp } from './utils/isNativeApp';

// Pages
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Lists from './pages/Lists';
import ListDetails from './pages/ListDetails';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

/**
 * ProtectedRoute: Enforces authentication and authorization for private app screens.
 * Passes the attempted location so user can be returned there after signing in.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading, authError, retryAuth, logout } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (authError === 'network') {
    return <AppNetworkErrorScreen onRetry={retryAuth} onLogout={logout} />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <Layout>{children}</Layout>;
};

/**
 * Dedicated App Entry Route (/app) for the native Android wrapper and mobile deep links.
 * 1. Restoring session / loading -> AppLoadingScreen
 * 2. Network failure -> AppNetworkErrorScreen (preserves local session)
 * 3. Valid authenticated user -> /dashboard
 * 4. Unauthenticated / expired -> /auth (Sign In)
 * Zero flash of the public landing page!
 */
const AppEntryRoute = () => {
  const { user, loading, authError, retryAuth, logout } = useContext(AuthContext);

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (authError === 'network') {
    return <AppNetworkErrorScreen onRetry={retryAuth} onLogout={logout} />;
  }

  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
};

/**
 * Root Route (/):
 * - If inside the native Android App: automatically routes to /dashboard or /auth (never lands on marketing page).
 * - If in standard desktop/mobile Web browser:
 *   - Authenticated: routes directly to /dashboard.
 *   - Unauthenticated: displays the public marketing Landing page.
 */
const RootRoute = () => {
  const { user, loading, authError, retryAuth, logout } = useContext(AuthContext);
  const inApp = isCodeSyncNativeApp();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (inApp) {
    if (authError === 'network') {
      return <AppNetworkErrorScreen onRetry={retryAuth} onLogout={logout} />;
    }
    return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth" replace />;
  }

  // Web Browser:
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
};

/**
 * Fallback Route:
 * Directs invalid paths back to /app for native wrappers or / for web.
 */
const FallbackRoute = () => {
  const inApp = isCodeSyncNativeApp();
  return <Navigate to={inApp ? '/app' : '/'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Smart Root & App Entry Routes */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/app" element={<AppEntryRoute />} />
          <Route path="/landing" element={<Landing />} />
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
          <Route path="*" element={<FallbackRoute />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
