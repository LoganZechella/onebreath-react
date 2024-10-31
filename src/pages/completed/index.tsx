import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface CompletedSample {
  timestamp: string;
  chip_id: string;
  patient_id: string;
  final_volume: number;
  average_co2: number;
  error?: string;
  document_urls?: string[];
}

export default function Completed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [samples, setSamples] = useState<CompletedSample[]>([]);
  const [loading, setLoading] = useState(true);

  const sortSamples = (samples: CompletedSample[]): CompletedSample[] => {
    return [...samples].sort((a, b) => {
      // First compare by timestamp
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      
      if (dateA !== dateB) {
        return dateA - dateB; // Oldest first
      }
      
      // If dates are equal, compare by patient ID
      const patientA = a.patient_id || '';
      const patientB = b.patient_id || '';
      
      // Extract numbers from patient IDs for numerical comparison
      const numA = parseInt(patientA.replace(/\D/g, '')) || 0;
      const numB = parseInt(patientB.replace(/\D/g, '')) || 0;
      
      return numA - numB;
    });
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchCompletedSamples = async () => {
      try {
        const response = await fetch('https://onebreathpilot.onrender.com/api/completed_samples');
        const data = await response.json();
        setSamples(sortSamples(data)); // Sort the samples before setting state
      } catch (error) {
        console.error('Error fetching completed samples:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedSamples();
  }, [user, navigate]);

  const handleDownloadDataset = async () => {
    try {
      const response = await fetch('https://onebreathpilot.onrender.com/download_dataset');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'completed_samples.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading dataset:', error);
    }
  };

  const formatNumber = (value: number | string | undefined, isVolume = false): string => {
    if (value === undefined || value === null) return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'N/A';
    return isVolume ? Math.round(num).toString() : num.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate__animated animate__fadeIn">
      <section className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl 
                         border border-white/20 dark:border-gray-700/30">
        {/* Header Section */}
        <div className="p-8 border-b border-gray-200/80 dark:border-gray-700/80">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold bg-clip-text text-transparent 
                           bg-gradient-to-r from-primary to-primary-light
                           dark:from-primary-light dark:to-primary">
                Completed Samples
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300 text-lg font-medium">
                View and download completed sample data
              </p>
            </div>
            <button
              onClick={handleDownloadDataset}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white 
                       px-6 py-3 rounded-xl transition-all duration-300 shadow-lg
                       hover:shadow-primary/20 hover:-translate-y-0.5
                       focus:ring-2 focus:ring-primary/50 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Dataset
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-200 
                             uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-200 
                             uppercase tracking-wider">
                  Chip ID
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-200 
                             uppercase tracking-wider">
                  Patient ID
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-200 
                             uppercase tracking-wider">
                  Volume (mL)
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-200 
                             uppercase tracking-wider">
                  CO₂ (%)
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-200 
                             uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-200 
                             uppercase tracking-wider">
                  Forms
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
              {samples.map((sample, index) => (
                <tr 
                  key={`${sample.chip_id}-${index}`}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 
                           transition-colors backdrop-blur-sm"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-base text-center 
                               text-gray-800 dark:text-gray-100 font-medium">
                    {new Date(sample.timestamp).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-center 
                               font-semibold text-gray-900 dark:text-white">
                    {sample.chip_id || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-center 
                               text-gray-800 dark:text-gray-100">
                    {sample.patient_id || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-center 
                               text-gray-800 dark:text-gray-100 font-medium">
                    {formatNumber(sample.final_volume, true)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-center 
                               text-gray-800 dark:text-gray-100 font-medium">
                    {formatNumber(sample.average_co2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-4 py-1.5 inline-flex text-sm leading-5 font-semibold rounded-full
                                   shadow-sm transition-colors duration-200
                                   ${sample.error 
                                     ? 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200'
                                     : 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200'
                                   }`}>
                      {sample.error ? `Error ${sample.error}` : 'Success'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-center">
                    {sample.document_urls?.length ? (
                      <span className="text-primary hover:text-primary-dark dark:text-primary-light 
                                     dark:hover:text-white hover:underline cursor-pointer
                                     transition-colors duration-200">
                        View
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {samples.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
              No completed samples found
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
