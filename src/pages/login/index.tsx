import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SignIn from '../../components/auth/SignIn';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showSignIn, setShowSignIn] = useState(true);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark">
      <SignIn isOpen={showSignIn} onClose={() => setShowSignIn(false)} />
    </div>
  );
} 