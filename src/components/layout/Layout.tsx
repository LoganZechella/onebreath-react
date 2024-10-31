import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import 'animate.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    AOS.init();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-light to-surface-light 
                    dark:from-background-dark dark:to-surface-dark transition-colors duration-200">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-white hover:text-primary-light transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-2xl font-bold text-white">
            <img src="src/assets/BDx_Logo_Dark.png" alt="OneBreath" className="w-24" />
          </div>
          <div className="w-10" /> {/* Spacer to center the logo */}
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8 lg:py-12 min-h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto" data-aos="fade-up" data-aos-duration="600">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
