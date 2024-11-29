import { useState, useRef } from 'react';

interface StatisticsSummaryProps {
  insights: string;
}

interface Stat {
  label: string;
  value: string;
}

export default function StatisticsSummary({ insights }: StatisticsSummaryProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const renderStats = () => {
    if (!insights) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          No statistical data available
        </div>
      );
    }

    const sections = insights.split('\n\n');
    const statsComponents: JSX.Element[] = [];

    sections.forEach((section, index) => {
      if (index === 0) return; // Skip the title section

      const lines = section.split('\n');
      const title = lines[0].trim();
      
      if (!title) return;
      
      const stats: Stat[] = [];
      let currentCompound = '';
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        if (line.endsWith(':')) {
          currentCompound = line.slice(0, -1);
        } else if (line.includes(':')) {
          const [label, value] = line.split(':').map(s => s.trim());
          if (label && value) {
            stats.push({ label, value });
          }
        }
      }

      if (stats.length === 0) return;

      statsComponents.push(
        <div 
          key={`section-${index}`} 
          className="min-w-[300px] bg-white dark:bg-gray-800 rounded-xl p-6 
                   shadow-md border border-gray-200 dark:border-gray-700
                   hover:shadow-lg transition-all duration-200"
        >
          <h4 className="text-xl font-semibold text-primary dark:text-primary-light mb-4">
            {title}
          </h4>
          {currentCompound && (
            <h5 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
              {currentCompound}
            </h5>
          )}
          <div className="grid grid-cols-1 gap-3">
            {stats.map((stat, statIdx) => (
              <div 
                key={`stat-${statIdx}`} 
                className="flex flex-col bg-gray-50 dark:bg-gray-700/50 
                         rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-700 
                         transition-colors duration-200"
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </span>
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    });

    return statsComponents;
  };

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Statistical Summary
      </h2>
      
      <div className="relative">
        {showLeftScroll && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-gray-800/90 
                     p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700
                     transition-all duration-200 border border-gray-200 dark:border-gray-600"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {showRightScroll && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-gray-800/90 
                     p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700
                     transition-all duration-200 border border-gray-200 dark:border-gray-600"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="overflow-x-auto hide-scrollbar flex gap-4 pb-4"
        >
          {renderStats()}
        </div>
      </div>
    </div>
  );
} 