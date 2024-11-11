import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sampleService } from '../../services/api';
import { Sample } from '../../types';
import SampleCard from '../../components/dashboard/SampleCard';
import QRScanner from '../../components/dashboard/QRScanner';
import SampleRegistrationForm from '../../components/dashboard/SampleRegistrationForm';
import { Toaster } from 'react-hot-toast';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Handle direct URL access with chipID
  useEffect(() => {
    const chipID = searchParams.get('chipID');
    if (chipID && /^P\d{5}$/.test(chipID)) {
      setShowManualEntry(true);
    }
  }, [searchParams]);

  const fetchSamples = async () => {
    try {
      setLoading(true);
      const data = await sampleService.getSamples();
      setSamples(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch samples');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, []);

  const handleUpdateSample = async (chipId: string, status: string, sampleType: string) => {
    try {
      await sampleService.updateSample({
        chip_id: chipId,
        status,
        sample_type: sampleType
      });
      await fetchSamples();
    } catch (err) {
      setError('Failed to update sample');
      console.error(err);
    }
  };

  const handleSampleRegistration = async (sampleData: {
    chip_id: string;
    patient_id: string;
    sample_type: string;
  }) => {
    try {
      setError(null);
      await sampleService.registerSample({
        ...sampleData,
        status: 'In Process',
        timestamp: new Date().toISOString()
      });

      await fetchSamples();
      setShowScanner(false);
      setShowManualEntry(false);
      // Clear URL parameters after successful registration
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      setError((error as Error).message);
      console.error('Error registering sample:', error);
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
        onClose={() => {
          setShowManualEntry(false);
          if (searchParams.get('chipID')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
        onSubmit={handleSampleRegistration}
        initialChipId={searchParams.get('chipID') || ''}
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

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* In Process Section */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                In Process
              </h2>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-primary-light/20 text-primary-dark dark:text-primary-light">
                {samples.filter(s => s.status === 'In Process').length} Active
              </span>
            </div>
            <div className="space-y-4">
              {samples
                .filter(sample => sample.status === 'In Process')
                .map(sample => (
                  <SampleCard 
                    key={sample.chip_id} 
                    sample={sample} 
                    onUpdateStatus={handleUpdateSample}
                    onPickupComplete={fetchSamples}
                  />
                ))}
              {samples.filter(s => s.status === 'In Process').length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No samples in process
                </div>
              )}
            </div>
          </section>

          {/* Ready for Pickup Section */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Ready for Pickup
              </h2>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-accent-light/20 text-accent-dark dark:text-accent-light">
                {samples.filter(s => s.status === 'Ready for Pickup').length} Active
              </span>
            </div>
            <div className="space-y-4">
              {samples
                .filter(sample => sample.status === 'Ready for Pickup')
                .map(sample => (
                  <SampleCard 
                    key={sample.chip_id} 
                    sample={sample} 
                    onUpdateStatus={handleUpdateSample}
                    onPickupComplete={fetchSamples}
                  />
                ))}
              {samples.filter(s => s.status === 'Ready for Pickup').length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No samples ready for pickup
                </div>
              )}
            </div>
          </section>

          {/* Ready for Analysis Section */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                Ready for Analysis
              </h2>
              <span className="px-3 py-1.5 text-sm font-medium rounded-full bg-secondary-light/20 
                     text-secondary-dark dark:text-secondary-light whitespace-nowrap">
                {samples.filter(s => s.status === 'Picked up. Ready for Analysis').length} Active
              </span>
            </div>
            <div className="space-y-4">
              {samples
                .filter(sample => sample.status === 'Picked up. Ready for Analysis')
                .map(sample => (
                  <SampleCard 
                    key={sample.chip_id} 
                    sample={sample} 
                    onUpdateStatus={handleUpdateSample}
                    onPickupComplete={fetchSamples}
                  />
                ))}
              {samples.filter(s => s.status === 'Picked up. Ready for Analysis').length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No samples ready for analysis
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
