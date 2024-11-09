import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  timestamp: string;
}

export default function CountdownTimer({ timestamp }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showSeparator, setShowSeparator] = useState(true);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const startTime = new Date(timestamp).getTime();
      const endTime = startTime + (2 * 60 * 60 * 1000); // 2 hours in milliseconds
      const now = new Date().getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        setTimeRemaining('Time expired');
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

    // Update time every second
    calculateTimeRemaining();
    const timeInterval = setInterval(calculateTimeRemaining, 1000);

    // Flash separator every 500ms
    const flashInterval = setInterval(() => {
      setShowSeparator(prev => !prev);
    }, 500);

    return () => {
      clearInterval(timeInterval);
      clearInterval(flashInterval);
    };
  }, [timestamp, showSeparator]);

  return (
    <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
      {timeRemaining} remaining
    </p>
  );
} 