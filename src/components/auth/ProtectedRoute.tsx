import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const typedUser = user as User | null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!typedUser) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !typedUser.claims?.admin) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
} 