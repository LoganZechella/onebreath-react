import { useState } from 'react';
import { Sample, PickupData } from '../../types';
import PickupForm from './PickupForm';
import { updateSampleWithPickupData } from '../../services/api';
import CountdownTimer from './CountdownTimer';

interface SampleCardProps {
  sample: Sample;
  onUpdateStatus: (chipId: string, status: string, sampleType: string, patientId: string) => Promise<void>;
  onPickupComplete?: () => Promise<void>;
}

export default function SampleCard({ sample, onUpdateStatus, onPickupComplete }: SampleCardProps) {
  const [showPickupForm, setShowPickupForm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    try {
      if (newStatus === 'Picked up. Ready for Analysis') {
        setShowPickupForm(true);
      } else if (newStatus === 'Complete') {
        setShowCompleteConfirm(true);
      } else {
        await onUpdateStatus(
          sample.chip_id,
          newStatus,
          sample.sample_type || '',
          sample.patient_id || 'Unknown'
        );
      }
    } catch (error) {
      console.error('Error updating sample status:', error);
    }
  };

  const handlePickupFormSubmit = async (chipId: string, volume: number, co2: number, patientId: string, error?: string) => {
    try {
      const pickupData: PickupData = {
        volume,
        co2_level: co2,
        patient_id: patientId,
        error
      };

      await updateSampleWithPickupData(
        chipId,
        'Picked up. Ready for Analysis',
        sample.sample_type || '',
        pickupData
      );

      setShowPickupForm(false);
      if (onPickupComplete) {
        await onPickupComplete();
      }
    } catch (error) {
      console.error('Error processing pickup:', error);
    }
  };

  const handleCompleteConfirm = async () => {
    try {
      await onUpdateStatus(
        sample.chip_id,
        'Complete',
        sample.sample_type || '',
        sample.patient_id || 'Unknown'
      );
      setShowCompleteConfirm(false);
    } catch (error) {
      console.error('Error completing sample:', error);
    }
  };

  const formatStartTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleStatusUpdate = async () => {
    // Refresh the samples list or update the local state
    onPickupComplete?.();
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {sample.chip_id}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Sample Type: {sample.sample_type || 'Not specified'}
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
            {sample.status === 'Picked up. Ready for Analysis' && (
              <button
                onClick={() => handleStatusChange('Complete')}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors font-bold"
              >
                Complete
              </button>
            )}
          </div>
        </div>
        {sample.status === 'In Process' && (
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <p>Started: {sample.timestamp ? formatStartTime(sample.timestamp) : 'Not started'}</p>
            <CountdownTimer
              timestamp={sample.timestamp}
              chipId={sample.chip_id}
              sampleType={sample.sample_type || 'Unknown'}
              currentStatus={sample.status}
              onStatusUpdate={handleStatusUpdate}
            />
          </div>
        )}
      </div>

      <PickupForm
        chipId={sample.chip_id}
        patientId={sample.patient_id || 'Unknown'}
        isOpen={showPickupForm}
        onClose={() => setShowPickupForm(false)}
        onSubmit={handlePickupFormSubmit}
      />

      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-4 dark:text-white">
              Confirm Complete
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to mark this sample as complete? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg
                         hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg
                         hover:bg-green-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
