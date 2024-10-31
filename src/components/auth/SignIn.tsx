import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';

interface SignInProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignIn({ isOpen, onClose }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (error) {
      setError('Failed to sign in. Please check your credentials.');
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate__animated animate__fadeIn">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 animate__animated animate__slideInUp">
        <img 
          src="onebreath-react/src/assets/images/BDx_Logo_Light_Cropped.png" 
          alt="Logo of Breath Diagnostics"
          className="w-48 mx-auto mb-6"
        />
        
        {loading && (
          <div className="spinner mx-auto mb-4" />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-gray-700">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
