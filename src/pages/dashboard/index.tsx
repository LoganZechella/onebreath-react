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
    <div className="container mx-auto px-4 py-8 animate__animated animate__fadeIn">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowScanner(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full 
                   shadow-lg transition-colors flex items-center space-x-2"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 4v16m8-8H4" 
            />
          </svg>
          <span>New Sample</span>
        </button>
      </div>

      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScanSuccess}
      />

      <div className="grid gap-8">
        {/* In Process Section */}
        <section className="bg-white/70 backdrop-blur-xl rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">In Process</h2>
          <div className="grid gap-4">
            {samples
              .filter(sample => sample.status === 'In Process')
              .map(sample => (
                <SampleCard key={sample.chip_id} sample={sample} />
              ))}
          </div>
        </section>

        {/* Ready for Pickup Section */}
        <section className="bg-white/70 backdrop-blur-xl rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Ready for Pickup</h2>
          <div className="grid gap-4">
            {samples
              .filter(sample => sample.status === 'Ready for Pickup')
              .map(sample => (
                <SampleCard key={sample.chip_id} sample={sample} />
              ))}
          </div>
        </section>

        {/* Ready for Analysis Section */}
        <section className="bg-white/70 backdrop-blur-xl rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Ready for Analysis</h2>
          <div className="grid gap-4">
            {samples
              .filter(sample => sample.status === 'Picked up. Ready for Analysis')
              .map(sample => (
                <SampleCard key={sample.chip_id} sample={sample} />
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
