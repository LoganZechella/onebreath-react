import { Sample } from '../../types';

interface SampleCardProps {
  sample: Sample;
  onUpdateStatus: (chipId: string, status: string, location: string) => Promise<void>;
}

export default function SampleCard({ sample, onUpdateStatus }: SampleCardProps) {
  const handleStatusChange = async (newStatus: string) => {
    try {
      await onUpdateStatus(sample.chip_id, newStatus, sample.location || '');
    } catch (error) {
      console.error('Error updating sample status:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {sample.chip_id}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Location: {sample.location || 'Not specified'}
          </p>
        </div>
        <div className="flex space-x-2">
          {sample.status === 'In Process' && (
            <button
              onClick={() => handleStatusChange('Ready for Pickup')}
              className="px-3 py-1 text-sm bg-accent-light text-accent-dark rounded-full hover:bg-accent-dark hover:text-white transition-colors"
            >
              &#10004;
            </button>
          )}
          {sample.status === 'Ready for Pickup' && (
            <button
              onClick={() => handleStatusChange('Picked up. Ready for Analysis')}
              className="px-3 py-1 text-sm bg-accent-dark text-white rounded-full hover:bg-accent-light hover:text-accent-dark transition-colors font-bold"
            >
              Pickup
            </button>
          )}
        </div>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">
        <p>Patient ID: {sample.patient_id || 'Not assigned'}</p>
        {sample.expected_completion_time && (
          <p>Expected Completion: {new Date(sample.expected_completion_time).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
