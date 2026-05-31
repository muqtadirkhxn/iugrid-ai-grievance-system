import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './lib/auth-store';
import { fetchUserProfile, createUserProfile, getUserFromAuth, resetDbCheck } from './lib/data-layer';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'student' | 'admin' }) {
  const { user, token, setUser } = useAuthStore();
  const [loading, setLoading] = useState(!user || !token);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!token) { navigate('/login'); return; }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          useAuthStore.getState().logout();
          navigate('/login');
          return;
        }

        if (!user && session.user) {
          let profile = await fetchUserProfile(session.user.id);
          if (!profile) {
            profile = getUserFromAuth(session);
            await createUserProfile(profile);
          }
          setUser(profile);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    if (!user || !token) checkAuth();
    else setLoading(false);
  }, [token, user, requiredRole, navigate, setUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!token || !user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { user, token, setUser, logout } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        (async () => {
          resetDbCheck();
          let profile = await fetchUserProfile(session.user.id);
          if (!profile) {
            profile = getUserFromAuth(session);
            await createUserProfile(profile);
          }
          setUser(profile);
        })();
      } else if (event === 'SIGNED_OUT') {
        logout();
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [setUser, logout]);

  return (
    <Routes>
      <Route path="/login" element={!token || !user ? <Login /> : <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />} />
      <Route path="/dashboard" element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/" element={!token || !user ? <Navigate to="/login" replace /> : <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return <Router><AppRoutes /></Router>;
}

export default App;

