import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import 'animate.css';

export default function Layout() {
  useEffect(() => {
    AOS.init();
  }, []);

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="container mx-auto px-4">
        <Outlet />
      </main>
    </div>
  );
}
