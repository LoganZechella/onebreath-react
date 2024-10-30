import { useState } from 'react';

interface PickupFormProps {
  chipId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (chipId: string, volume: number, co2: number, error?: string) => Promise<void>;
}

export default function PickupForm({ chipId, isOpen, onClose, onSubmit }: PickupFormProps) {
  const [volume, setVolume] = useState<string>('');
  const [co2, setCo2] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(
        chipId,
        parseFloat(volume),
        parseFloat(co2),
        error || undefined
      );
      onClose();
    } catch (err) {
      console.error('Error submitting pickup form:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate__animated animate__fadeIn">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 animate__animated animate__slideInUp">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sample Pickup - {chipId}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="final-volume" 
              className="block text-sm font-medium text-gray-700"
            >
              Final Volume (mL)
            </label>
            <input
              type="number"
              id="final-volume"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              step="0.1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                       focus:border-primary focus:ring-primary"
              required
            />
          </div>

          <div>
            <label 
              htmlFor="average-co2" 
              className="block text-sm font-medium text-gray-700"
            >
              Average CO2 (%)
            </label>
            <input
              type="number"
              id="average-co2"
              value={co2}
              onChange={(e) => setCo2(e.target.value)}
              step="0.1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                       focus:border-primary focus:ring-primary"
              required
            />
          </div>

          <div>
            <label 
              htmlFor="error-codes" 
              className="block text-sm font-medium text-gray-700"
            >
              Error Code (if any)
            </label>
            <select
              id="error-codes"
              value={error}
              onChange={(e) => setError(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                       focus:border-primary focus:ring-primary"
            >
              <option value="">No Error</option>
              <option value="E01">E01 - Insufficient Volume</option>
              <option value="E02">E02 - Low CO2</option>
              <option value="E03">E03 - High CO2</option>
              <option value="E04">E04 - Collection Time Exceeded</option>
              <option value="E05">E05 - Equipment Malfunction</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded 
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <svg 
                    className="animate-spin h-5 w-5 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : (
                'Confirm Pickup'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
