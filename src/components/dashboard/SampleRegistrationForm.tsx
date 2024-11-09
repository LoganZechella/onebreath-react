import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';

interface SampleRegistrationFormProps {
  isOpen: boolean;
  chipId?: string;
  onClose: () => void;
  onSubmit: (sampleData: {
    chip_id: string;
    patient_id: string;
    sample_type: string;
  }) => Promise<void>;
  initialChipId?: string;
}

export default function SampleRegistrationForm({ 
  isOpen, 
  onClose, 
  onSubmit,
  initialChipId 
}: SampleRegistrationFormProps) {
  const [chipId, setChipId] = useState(initialChipId || '');
  const [patientId, setPatientId] = useState('BDx-');
  const [sampleType, setSampleType] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setChipId(initialChipId || '');
      setPatientId('BDx-');
      setSampleType('');
      setLoading(false);
    }
  }, [isOpen, initialChipId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const toastId = toast.loading('Registering sample...');

    try {
      await onSubmit({
        chip_id: chipId,
        patient_id: patientId,
        sample_type: sampleType
      });
      
      toast.success('Sample registered successfully!', {
        id: toastId,
        duration: 4000,
        icon: '✅'
      });
      
      // Reset form
      setChipId('');
      setPatientId('BDx-');
      setSampleType('');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to register sample', {
        id: toastId,
        duration: 5000,
        icon: '❌'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div 
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl 
                   w-full max-w-xl animate__animated animate__fadeIn"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="p-8">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Sample Registration
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Enter the details for the new sample below
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                       transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Chip ID Field */}
            <div className="space-y-2">
              <label htmlFor="chipId" 
                     className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Chip ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="chipId"
                  pattern="P\d{5}"
                  required
                  value={chipId}
                  onChange={(e) => setChipId(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary 
                           focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600
                           dark:text-white transition-colors duration-200"
                  placeholder="P12345"
                />
                <span className="absolute right-3 top-3 text-sm text-gray-500 dark:text-gray-400">
                  Format: PXXXXX
                </span>
              </div>
            </div>

            {/* Patient ID Field */}
            <div className="space-y-2">
              <label htmlFor="patientId" 
                     className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Patient ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="patientId"
                  pattern="BDx-\d*"
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary 
                           focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600
                           dark:text-white transition-colors duration-200"
                  placeholder="BDx-001"
                />
                <span className="absolute right-3 top-3 text-sm text-gray-500 dark:text-gray-400">
                  Format: BDx-XXX
                </span>
              </div>
            </div>

            {/* Sample Type Field */}
            <div className="space-y-2">
              <label htmlFor="sampleType" 
                     className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Sample Type
              </label>
              <select
                id="sampleType"
                required
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary 
                         focus:ring-2 focus:ring-primary/20 dark:bg-gray-700 dark:border-gray-600
                         dark:text-white transition-colors duration-200 appearance-none"
              >
                <option value="">Select Sample Type</option>
                <option value="positive control">Positive Control</option>
                <option value="negative control">Negative Control</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4 mt-8 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg
                         hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
                         transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 text-sm font-medium text-white bg-primary rounded-lg
                         hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2
                         focus:ring-primary transition-colors duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                         fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" 
                              stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  'Register Sample'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
}