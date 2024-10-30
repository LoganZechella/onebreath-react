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

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchCompletedSamples = async () => {
      try {
        const response = await fetch('https://onebreathpilot.onrender.com/api/completed_samples');
        const data = await response.json();
        setSamples(data);
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

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate__animated animate__fadeIn">
      <section className="bg-white/70 backdrop-blur-xl rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Completed Samples</h2>
          <button
            onClick={handleDownloadDataset}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded transition-colors"
          >
            Download Dataset
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Chip ID</th>
                <th className="px-4 py-2">Patient ID</th>
                <th className="px-4 py-2">Volume</th>
                <th className="px-4 py-2">Avg. CO2</th>
                <th className="px-4 py-2">Error Code</th>
                <th className="px-4 py-2">Form</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample) => (
                <tr key={sample.chip_id}>
                  <td className="px-4 py-2">{new Date(sample.timestamp).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{sample.chip_id}</td>
                  <td className="px-4 py-2">{sample.patient_id}</td>
                  <td className="px-4 py-2">{sample.final_volume}</td>
                  <td className="px-4 py-2">{sample.average_co2}</td>
                  <td className="px-4 py-2">{sample.error || 'N/A'}</td>
                  <td className="px-4 py-2">
                    {sample.document_urls ? 'Yes' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
