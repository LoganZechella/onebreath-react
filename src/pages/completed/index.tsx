import { useState, useEffect } from 'react';
import { sampleService } from '../../services/api';
import { Sample } from '../../types';
import CompletedSampleCard from '../../components/completed/CompletedSampleCard';
import { Toaster } from 'react-hot-toast';

export default function CompletedSamples() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompletedSamples();
  }, []);

  const fetchCompletedSamples = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sampleService.getCompletedSamples();
      setSamples(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch completed samples';
      setError(errorMessage);
      console.error('Error:', err);
      setSamples([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDataset = async () => {
    try {
      const blob = await sampleService.downloadDataset();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'completed_samples.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download dataset');
      console.error(err);
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
      <Toaster position="top-right" />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Completed Samples
          </h1>
          <button
            onClick={handleDownloadDataset}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full 
                     shadow-lg transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download Dataset</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-lg text-red-800 mb-6">
            <p>{error}</p>
            <button 
              onClick={fetchCompletedSamples}
              className="mt-2 bg-red-100 px-4 py-2 rounded hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        )}

        {samples.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No completed samples available
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {samples.map(sample => (
              <CompletedSampleCard key={sample.chip_id} sample={sample} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
