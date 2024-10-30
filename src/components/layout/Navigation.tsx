import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import SignIn from '../auth/SignIn';

export default function Navigation() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSignInClick = () => {
    setIsSignInOpen(true);
  };

  return (
    <>
      <nav className="bg-black/50 sticky top-0 z-10 backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            {/* Hamburger Menu for Mobile */}
            <button 
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg 
                className="w-6 h-6 text-white"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              </svg>
            </button>

            {/* Navigation Links */}
            <ul className={`
              md:flex md:items-center
              ${isMenuOpen ? 'block' : 'hidden'}
              absolute md:relative
              top-full left-0
              w-full md:w-auto
              bg-black/50 md:bg-transparent
              md:space-x-8
              animate__animated
              ${isMenuOpen ? 'animate__slideInDown' : ''}
            `}>
              <li>
                <Link 
                  to="/" 
                  className="block px-4 py-2 text-white hover:text-primary-light transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/completed" 
                  className="block px-4 py-2 text-white hover:text-primary-light transition-colors"
                >
                  Completed Samples
                </Link>
              </li>
              <li>
                <Link 
                  to="/data" 
                  className="block px-4 py-2 text-white hover:text-primary-light transition-colors"
                >
                  Data Viewer
                </Link>
              </li>
              <li>
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="block px-4 py-2 text-white hover:text-primary-light transition-colors"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={handleSignInClick}
                    className="block px-4 py-2 text-white hover:text-primary-light transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </li>
            </ul>
          </div>
        </div>
      </nav>
      
      <SignIn 
        isOpen={isSignInOpen} 
        onClose={() => setIsSignInOpen(false)} 
      />
    </>
  );
}
