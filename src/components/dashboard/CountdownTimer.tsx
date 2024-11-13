import { useState, useEffect } from 'react';
import { sampleService } from '../../services/api';

interface CountdownTimerProps {
  timestamp: string;
  chipId: string;
  sampleType: string;
  currentStatus: string;
  onStatusUpdate?: () => void;
}

export default function CountdownTimer({ 
  timestamp, 
  chipId, 
  sampleType, 
  currentStatus,
  onStatusUpdate 
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showSeparator, setShowSeparator] = useState(true);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = async () => {
      const startTime = new Date(timestamp).getTime();
      const endTime = startTime + (2 * 60 * 60 * 1000); // 2 hours in milliseconds
      const now = new Date().getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        setTimeRemaining('Time expired');
        
        // Only update status if it's currently "In Process"
        if (currentStatus === 'In Process' && !hasExpired) {
          setHasExpired(true);
          try {
            await sampleService.updateSample({
              chip_id: chipId,
              status: 'Ready for Pickup',
              sample_type: sampleType
            });
            onStatusUpdate?.();
          } catch (error) {
            console.error('Failed to update sample status:', error);
          }
        }
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const formattedHours = String(hours).padStart(2, '0');
      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(seconds).padStart(2, '0');

      setTimeRemaining(`${formattedHours}${showSeparator ? ':' : ' '}${formattedMinutes}${showSeparator ? ':' : ' '}${formattedSeconds}`);
    };

    if (timestamp) {
      calculateTimeRemaining();
      const timeInterval = setInterval(calculateTimeRemaining, 1000);
      const flashInterval = setInterval(() => {
        setShowSeparator(prev => !prev);
      }, 500);

      return () => {
        clearInterval(timeInterval);
        clearInterval(flashInterval);
      };
    }
  }, [timestamp, showSeparator, chipId, sampleType, currentStatus, hasExpired, onStatusUpdate]);

  return (
    <p className="text-sm text-gray-600 dark:text-gray-300">
      {timeRemaining ? (
        <>
          {timeRemaining} {timeRemaining !== 'Time expired' ? 'remaining' : ''}
        </>
      ) : (
        'Calculating...'
      )}
    </p>
  );
} 