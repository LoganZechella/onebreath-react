import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import 'animate.css';

export default function Layout() {
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      mirror: false
    });
    // Set dark mode by default
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark/95 to-surface-dark 
                    backdrop-blur-3xl transition-all duration-300">
      <Navigation />
      <main className="container mx-auto px-4 py-6 md:py-8 lg:py-12 min-h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto space-y-8" 
             data-aos="fade-up" 
             data-aos-duration="600">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
