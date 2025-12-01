import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthPage } from '@/components/auth/AuthPage';
import { useAuth } from '@/contexts/AuthContext';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/chat');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <AuthPage />;
}