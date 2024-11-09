import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  timestamp: string;
}

export default function CountdownTimer({ timestamp }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

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

      setTimeRemaining(`${hours}h ${minutes}m remaining`);
    };

    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [timestamp]);

  return (
    <p className="text-sm text-gray-600 dark:text-gray-300">
      {timeRemaining}
    </p>
  );
} 