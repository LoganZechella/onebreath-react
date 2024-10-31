import { useState, useEffect } from 'react';

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
  const [validationError, setValidationError] = useState<string>('');

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setVolume('');
      setCo2('');
      setError('');
      setValidationError('');
    }
  }, [isOpen]);

  const validateInputs = (): boolean => {
    const volumeNum = parseFloat(volume);
    const co2Num = parseFloat(co2);
    const errorNum = parseInt(error);

    if (isNaN(volumeNum) || volumeNum < 0 || volumeNum > 100) {
      setValidationError('Volume must be between 0 and 100 mL');
      return false;
    }

    if (isNaN(co2Num) || co2Num < 0 || co2Num > 100) {
      setValidationError('CO₂ percentage must be between 0 and 100%');
      return false;
    }

    if (error && (isNaN(errorNum) || errorNum < 1 || errorNum > 7)) {
      setValidationError('Error code must be between 1 and 7');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInputs()) {
      return;
    }

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
      setValidationError('Failed to submit form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate__animated animate__fadeIn">
      <div className="bg-white dark:bg-surface-dark rounded-lg p-6 max-w-md w-full mx-4 animate__animated animate__slideInUp">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">Sample Pickup - {chipId}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {validationError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-sm">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="final-volume" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Final Volume (mL)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                id="final-volume"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                step="0.1"
                min="0"
                max="100"
                className="block w-full rounded-md border-gray-300 dark:border-gray-700 
                         dark:bg-gray-800 dark:text-white shadow-sm 
                         focus:border-primary focus:ring-primary"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">mL</span>
              </div>
            </div>
          </div>

          <div>
            <label 
              htmlFor="average-co2" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Average CO₂ (%)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                id="average-co2"
                value={co2}
                onChange={(e) => setCo2(e.target.value)}
                step="0.1"
                min="0"
                max="100"
                className="block w-full rounded-md border-gray-300 dark:border-gray-700 
                         dark:bg-gray-800 dark:text-white shadow-sm 
                         focus:border-primary focus:ring-primary"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">%</span>
              </div>
            </div>
          </div>

          <div>
            <label 
              htmlFor="error-code" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Error Code (1-7, if any)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                id="error-code"
                value={error}
                onChange={(e) => setError(e.target.value)}
                min="1"
                max="7"
                className="block w-full rounded-md border-gray-300 dark:border-gray-700 
                         dark:bg-gray-800 dark:text-white shadow-sm 
                         focus:border-primary focus:ring-primary"
                placeholder="Leave empty if no error"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter a number between 1-7 if there was an error during collection
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                       dark:hover:bg-gray-600 rounded transition-colors"
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
