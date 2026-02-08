import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/common/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { RegistryPage } from './components/materials/RegistryPage';
import { CreatePage } from './components/create/CreatePage';
import { ProfilePage } from './components/profile/ProfilePage';
import { MaterialViewPage } from './components/materials/MaterialViewPage';
import { MaterialsListPage } from './components/materials/MaterialsListPage';
import { MaterialsDebugPage } from './components/materials/MaterialsDebugPage';
import { LeaderboardPage } from './components/materials/LeaderboardPage';
import LandingPage from './components/LandingPage';

const ClerkProviderWithRouter: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

  if (!publishableKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink mb-2">Missing Clerk key</h1>
          <p className="text-muted">Set VITE_CLERK_PUBLISHABLE_KEY in your environment.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ClerkProviderWithRouter>
          <AuthProvider>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Public Routes (Clerk SSO callback: /login/sso-callback) */}
          <Route path="/login/*" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <RegistryPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreatePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/threads"
            element={
              <ProtectedRoute>
                <Layout>
                  <MaterialsListPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <LeaderboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/materials/:materialId"
            element={
              <ProtectedRoute>
                <Layout>
                  <MaterialViewPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/threads/:threadId/sessions/:sessionId"
            element={
              <ProtectedRoute>
                <Layout>
                  <MaterialViewPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/threads/:threadId"
            element={
              <ProtectedRoute>
                <Layout>
                  <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold text-ink mb-4">
                      View material
                    </h1>
                    <p className="text-muted">
                      Page in development. Here will be a detailed view of the material.
                    </p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/debug/materials"
            element={
              <ProtectedRoute>
                <Layout>
                  <MaterialsDebugPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/dashboard"
            element={
              <Layout>
                <RegistryPage />
              </Layout>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-ink mb-4">404</h1>
                  <p className="text-muted mb-6">Page not found</p>
                  <a
                    href="/"
                    className="text-primary hover:text-primary-hover underline"
                  >
                    Return to home
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
        </AuthProvider>
    </ClerkProviderWithRouter>
  </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

