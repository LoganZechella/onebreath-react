import { useState, useEffect } from 'react';
import { sampleService } from '../../services/api';
import { Sample } from '../../types';
import CompletedSampleCard from '../../components/completed/CompletedSampleCard';
import CompletedSampleTable from '../../components/completed/CompletedSampleTable';
import { Toaster } from 'react-hot-toast';

export default function CompletedSamples() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isDownloading, setIsDownloading] = useState(false);
  const [sortAscending, setSortAscending] = useState(true);

  useEffect(() => {
    fetchCompletedSamples();
  }, []);

  const fetchCompletedSamples = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting fetch...');
      const data = await sampleService.getCompletedSamples();
      console.log('Fetched data:', data);
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
      setIsDownloading(true);
      const blob = await sampleService.downloadDataset();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `completed_samples_${timestamp}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download dataset';
      setError(errorMessage);
      console.error('Error downloading dataset:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log('Current state:', { samples, error, viewMode });

  const sortedSamples = [...samples].sort((a, b) => {
    // First compare by date
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    
    if (dateA < dateB) return sortAscending ? -1 : 1;
    if (dateA > dateB) return sortAscending ? 1 : -1;
    
    // If dates are equal, compare by patient ID
    const patientA = a.patient_id || '';
    const patientB = b.patient_id || '';
    
    // Extract numbers from patient IDs for numerical comparison
    const numA = parseInt(patientA.replace(/\D/g, '')) || 0;
    const numB = parseInt(patientB.replace(/\D/g, '')) || 0;
    
    return numA - numB;
  });

  return (
    <>
      <Toaster position="top-right" />
      <div className="container mx-auto px-2 py-6 max-w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Completed Samples
            </h1>
            <span className="px-3 py-1 text-sm font-medium rounded-full 
                           bg-primary/10 text-primary dark:bg-primary-dark/20 
                           dark:text-primary-light">
              {sortedSamples.length} Total
            </span>
          </div>
          <div className="flex items-center space-x-4">
            {/* Sort Toggle */}
            <button
              onClick={() => setSortAscending(!sortAscending)}
              className="p-2 rounded-md transition-colors text-gray-500 hover:text-primary bg-white dark:bg-gray-800 shadow"
              aria-label={sortAscending ? "Sort newest first" : "Sort oldest first"}
            >
              {sortAscending ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h5m0 0v8m0-8h2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h5m0 0v8m0-8h2m10-4h-5m0 0v8m0-8h2" />
                </svg>
              )}
            </button>

            {/* View Toggle */}
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'text-gray-500 hover:text-primary'
                }`}
                aria-label="Grid view"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'text-gray-500 hover:text-primary'
                }`}
                aria-label="List view"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownloadDataset}
              disabled={isDownloading}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-full 
                       shadow-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
              aria-label="Download Dataset"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="hidden md:inline">Downloading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden md:inline">Download Dataset</span>
                </>
              )}
            </button>
          </div>
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

        {sortedSamples.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No completed samples available
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedSamples.map(sample => (
              <CompletedSampleCard key={sample.chip_id} sample={sample} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <CompletedSampleTable samples={sortedSamples} />
          </div>
        )}
      </div>
    </>
  );
}
