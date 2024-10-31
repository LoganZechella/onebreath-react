import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SampleCard from '../../components/dashboard/SampleCard';
import QRScanner from '../../components/dashboard/QRScanner';
import SampleRegistrationForm from '../../components/dashboard/SampleRegistrationForm';
import { Toaster } from 'react-hot-toast';

interface Sample {
  chip_id: string;
  location: string;
  status: string;
  timestamp: string;
  batch_number?: string;
  expected_completion_time?: string;
  final_volume?: number;
  average_co2?: number;
  error?: string;
  patient_id?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const fetchSamples = async () => {
    try {
      setError(null);
      const response = await fetch('https://onebreathpilot.onrender.com/samples');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSamples(data);
    } catch (error) {
      console.error('Error fetching samples:', error);
      setError('Failed to load samples. Please try again later.');
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

  const handleSampleRegistration = async (sampleData: {
    chip_id: string;
    patient_id: string;
    location: string;
  }) => {
    try {
      setError(null);
      const response = await fetch('https://onebreathpilot.onrender.com/register_sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sampleData,
          status: 'In Process',
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register sample');
      }

      await fetchSamples();
      setShowScanner(false);
      setShowManualEntry(false);
    } catch (error) {
      console.error('Error registering sample:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <QRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleSampleRegistration}
      />

      <SampleRegistrationForm
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSubmit={handleSampleRegistration}
      />

      <Toaster position="top-right" />

      <div className="container mx-auto px-4 py-8 animate__animated animate__fadeIn">
        <div className="flex justify-end mb-6 space-x-4">
          <button
            onClick={() => setShowManualEntry(true)}
            className="bg-secondary hover:bg-secondary-dark text-white px-4 py-2 rounded-full 
                     shadow-lg transition-colors flex items-center space-x-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Manual Entry</span>
          </button>
          
          <button
            onClick={() => setShowScanner(true)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full 
                     shadow-lg transition-colors flex items-center space-x-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 4v16m8-8H4" />
            </svg>
            <span>Scan QR Code</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-lg text-red-800 mb-6">
            <p>{error}</p>
            <button 
              onClick={fetchSamples}
              className="mt-2 bg-red-100 px-4 py-2 rounded hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        )}

        {samples.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No active samples found. Add a new sample to get started.
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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

            <section className="section-card" data-aos="fade-up" data-aos-delay="300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ready for Analysis</h2>
                <span className="status-badge bg-secondary/10 text-secondary dark:text-secondary-light">
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
        )}
      </div>
    </>
  );
}
