import { useState, useEffect } from 'react';
import PickupForm from './PickupForm';

interface Sample {
  chip_id: string;
  location: string;
  status: string;
  timestamp: string;
  batch_number?: string;
  expected_completion_time?: string;
  final_volume?: number;
  average_co2?: number;
  error?: string;
  patient_id?: string;
}

interface SampleCardProps {
  sample: Sample;
  onStatusUpdate?: (chipId: string, newStatus: string) => void;
}

export default function SampleCard({ sample, onStatusUpdate }: SampleCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showPickupForm, setShowPickupForm] = useState(false);

  useEffect(() => {
    if (sample.status === 'In Process') {
      const updateTimer = () => {
        const startTime = new Date(sample.timestamp).getTime();
        const endTime = startTime + 7200000; // 2 hours in milliseconds
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
          setTimeRemaining('Awaiting status update...');
          return;
        }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s remaining`);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [sample.timestamp, sample.status]);

  const handleFinishEarly = async () => {
    try {
      const response = await fetch('https://onebreathpilot.onrender.com/update_sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chip_id: sample.chip_id,
          status: 'Ready for Pickup'
        }),
      });

      if (response.ok) {
        onStatusUpdate?.(sample.chip_id, 'Ready for Pickup');
      }
    } catch (error) {
      console.error('Error updating sample status:', error);
    }
  };

  const handlePickup = () => {
    setShowPickupForm(true);
  };

  const handlePickupSubmit = async (
    chipId: string, 
    volume: number, 
    co2: number, 
    error?: string
  ) => {
    try {
      const response = await fetch('https://onebreathpilot.onrender.com/update_sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chip_id: chipId,
          status: 'Picked up. Ready for Analysis',
          final_volume: volume,
          average_co2: co2,
          ...(error && { error })
        }),
      });

      if (response.ok) {
        onStatusUpdate?.(chipId, 'Picked up. Ready for Analysis');
      } else {
        throw new Error('Failed to update sample');
      }
    } catch (error) {
      console.error('Error updating sample:', error);
      throw error;
    }
  };

  const handleEdit = () => {
    setShowEditMenu(!showEditMenu);
  };

  return (
    <div className="relative bg-white/90 dark:bg-surface-dark/90 rounded-xl shadow-lg p-6 
            backdrop-blur-sm border border-gray-100 dark:border-gray-800
            transition-all duration-300 hover:shadow-xl hover:scale-[1.02]
            animate__animated animate__fadeIn">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white 
                     flex items-center gap-2">
            {sample.chip_id}
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary 
                            dark:bg-primary-dark/20 dark:text-primary-light">
              {sample.location}
            </span>
          </h3>
          <div className="space-y-1 mt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Added: {new Date(sample.timestamp).toLocaleDateString()}
            </p>
            {sample.batch_number && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Batch: {sample.batch_number}
              </p>
            )}
            {sample.patient_id && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Patient ID: {sample.patient_id}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="font-medium px-3 py-1 rounded-full text-sm
                       bg-accent/10 text-accent-dark dark:text-accent-light">
            {sample.status}
          </p>
          {sample.status === 'In Process' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {timeRemaining}
            </p>
          )}
        </div>
      </div>

      {sample.status === 'Picked up. Ready for Analysis' && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            {sample.final_volume !== undefined && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Final Volume</p>
                <p className="font-medium">{sample.final_volume} mL</p>
              </div>
            )}
            {sample.average_co2 !== undefined && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Average CO₂</p>
                <p className="font-medium">{sample.average_co2}%</p>
              </div>
            )}
          </div>
          {sample.error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              Error: {sample.error}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end mt-4 space-x-3">
        {sample.status === 'In Process' && (
          <>
            <button
              onClick={handleFinishEarly}
              className="btn-icon"
            >
              <img 
                src="/assets/images/icons8-check-ios-17-filled-96.png" 
                alt="Finish" 
                className="w-6 h-6 opacity-60 hover:opacity-100 transition-opacity"
              />
            </button>
            <button
              onClick={handleEdit}
              className="text-sm text-primary dark:text-primary-light 
                         hover:text-primary-dark dark:hover:text-primary 
                         transition-colors"
            >
              Edit
            </button>
          </>
        )}
        {sample.status === 'Ready for Pickup' && (
          <button
            onClick={handlePickup}
            className="btn-primary"
          >
            Pickup
          </button>
        )}
      </div>

      {showEditMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-surface-dark 
                        rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 
                        p-1 z-10 animate__animated animate__fadeIn">
          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200
                       hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            onClick={() => {/* Handle update */}}
          >
            Update
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200
                       hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            onClick={() => {/* Handle upload */}}
          >
            Upload
          </button>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200
                       hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            onClick={() => setShowEditMenu(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {showPickupForm && (
        <PickupForm
          chipId={sample.chip_id}
          isOpen={showPickupForm}
          onClose={() => setShowPickupForm(false)}
          onSubmit={handlePickupSubmit}
        />
      )}
    </div>
  );
}
