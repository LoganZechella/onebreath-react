import { useState, useEffect } from 'react';

interface PickupFormProps {
  chipId: string;
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (chipId: string, volume: number, co2: number, patientId: string, error?: string) => Promise<void>;
}

export default function PickupForm({ chipId, patientId, isOpen, onClose, onSubmit }: PickupFormProps) {
  const [volume, setVolume] = useState<string>('');
  const [co2, setCo2] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setVolume('');
      setCo2('');
      setError('');
      setValidationError('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const validateInputs = (): boolean => {
    const volumeNum = parseFloat(volume);
    const co2Num = parseFloat(co2);
    const errorNum = parseInt(error);

    if (isNaN(volumeNum) || volumeNum < 0) {
      setValidationError('Volume must be a positive number');
      return false;
    }

    if (isNaN(co2Num) || co2Num < 0 || co2Num > 10) {
      setValidationError('CO₂ percentage must be between 0 and 10%');
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
    if (!validateInputs()) return;
    setLoading(true);

    try {
      await onSubmit(
        chipId,
        parseFloat(volume),
        parseFloat(co2),
        patientId,
        error || ''
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Sample Pickup - {chipId}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {validationError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {validationError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="volume" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Final Volume (mL)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="volume"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  step="any"
                  min="0"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary 
                           focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600
                           dark:text-white transition-colors duration-200 [appearance:textfield] 
                           [&::-webkit-outer-spin-button]:appearance-none 
                           [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter volume"
                />
                <span className="absolute right-3 top-3 text-sm text-gray-500 dark:text-gray-400">
                  mL
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="co2" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Average CO₂ (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="co2"
                  value={co2}
                  onChange={(e) => setCo2(e.target.value)}
                  step="any"
                  min="0"
                  max="10"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary 
                           focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600
                           dark:text-white transition-colors duration-200 [appearance:textfield] 
                           [&::-webkit-outer-spin-button]:appearance-none 
                           [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Enter CO₂ percentage"
                />
                <span className="absolute right-3 top-3 text-sm text-gray-500 dark:text-gray-400">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="error" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Error Code (1-7, if any)
              </label>
              <input
                type="number"
                id="error"
                value={error}
                onChange={(e) => setError(e.target.value)}
                min="1"
                max="7"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary 
                         focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600
                         dark:text-white transition-colors duration-200"
                placeholder="Leave empty if no error"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter a number between 1-7 if there was an error during collection
              </p>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg
                         hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
                         transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 text-sm font-medium text-white bg-primary rounded-lg
                         hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2
                         focus:ring-primary transition-colors duration-200
                         disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  'Confirm Pickup'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
