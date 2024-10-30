import { useState, useEffect } from 'react';
import PickupForm from './PickupForm';

interface Sample {
  chip_id: string;
  location: string;
  status: string;
  timestamp: string;
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
    <div className="bg-white rounded-lg shadow-md p-4 animate__animated animate__fadeIn">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold">{sample.chip_id}</h3>
          <p className="text-sm text-gray-600">Location: {sample.location}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{sample.status}</p>
          {sample.status === 'In Process' && (
            <p className="text-sm text-gray-600">{timeRemaining}</p>
          )}
        </div>
      </div>

      <div className="flex justify-center mt-4 space-x-2">
        {sample.status === 'In Process' && (
          <>
            <button
              onClick={handleFinishEarly}
              className="p-2 bg-transparent hover:bg-gray-100 rounded-full transition-colors"
            >
              <img 
                src="/assets/images/icons8-check-ios-17-filled-96.png" 
                alt="Finish" 
                className="w-6 h-6 opacity-60"
              />
            </button>
            <button
              onClick={handleEdit}
              className="text-sm text-gray-600 underline hover:text-gray-800"
            >
              Edit
            </button>
          </>
        )}
        {sample.status === 'Ready for Pickup' && (
          <button
            onClick={handlePickup}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition-colors"
          >
            Pickup
          </button>
        )}
      </div>

      {showEditMenu && (
        <div className="absolute mt-2 bg-white rounded-lg shadow-lg p-2 z-10">
          <button 
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
            onClick={() => {/* Handle update */}}
          >
            Update
          </button>
          <button 
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
            onClick={() => {/* Handle upload */}}
          >
            Upload
          </button>
          <button 
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
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
