import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SampleCard from '../../components/dashboard/SampleCard';
import QRScanner from '../../components/dashboard/QRScanner';

interface Sample {
  chip_id: string;
  location: string;
  status: string;
  timestamp: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  const fetchSamples = async () => {
    try {
      const response = await fetch('https://onebreathpilot.onrender.com/samples');
      const data = await response.json();
      setSamples(data);
    } catch (error) {
      console.error('Error fetching samples:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    fetchSamples();
    const interval = setInterval(fetchSamples, 60000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const handleScanSuccess = async (chipId: string) => {
    try {
      const response = await fetch('https://onebreathpilot.onrender.com/update_sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chip_id: chipId,
          status: 'In Process',
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        fetchSamples();
        setShowScanner(false);
      } else {
        throw new Error('Failed to register sample');
      }
    } catch (error) {
      console.error('Error registering sample:', error);
      alert('Failed to register sample. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <button
          onClick={() => setShowScanner(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Sample</span>
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* In Process Section */}
        <section className="section-card" data-aos="fade-up" data-aos-delay="100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">In Process</h2>
            <span className="status-badge bg-primary/10 text-primary dark:text-primary-light">
              {samples.filter(s => s.status === 'In Process').length} Active
            </span>
          </div>
          <div className="space-y-4">
            {samples
              .filter(sample => sample.status === 'In Process')
              .map(sample => (
                <SampleCard key={sample.chip_id} sample={sample} />
              ))}
          </div>
        </section>

        {/* Ready for Pickup Section */}
        <section className="section-card" data-aos="fade-up" data-aos-delay="200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ready for Pickup</h2>
            <span className="status-badge bg-accent/10 text-accent-dark dark:text-accent-light">
              {samples.filter(s => s.status === 'Ready for Pickup').length} Active
            </span>
          </div>
          <div className="space-y-4">
            {samples
              .filter(sample => sample.status === 'Ready for Pickup')
              .map(sample => (
                <SampleCard key={sample.chip_id} sample={sample} />
              ))}
          </div>
        </section>

        {/* Ready for Analysis Section */}
        <section className="section-card" data-aos="fade-up" data-aos-delay="300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ready for Analysis</h2>
            <span className="status-badge bg-secondary/10 text-secondary-dark dark:text-secondary-light">
              {samples.filter(s => s.status === 'Picked up. Ready for Analysis').length} Active
            </span>
          </div>
          <div className="space-y-4">
            {samples
              .filter(sample => sample.status === 'Picked up. Ready for Analysis')
              .map(sample => (
                <SampleCard key={sample.chip_id} sample={sample} />
              ))}
          </div>
        </section>
      </div>

      {showScanner && (
        <QRScanner 
          isOpen={showScanner}
          onScanSuccess={handleScanSuccess} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  );
}
