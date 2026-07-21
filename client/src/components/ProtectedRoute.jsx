import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 text-slate-100">
        <p className="text-sm text-slate-300">Checking authentication...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
