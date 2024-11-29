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
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const renderStats = () => {
    if (!insights) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-2">
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
          className="min-w-[250px] bg-white dark:bg-gray-800 rounded-lg p-3 
                   shadow-sm border border-gray-200 dark:border-gray-700
                   hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-primary dark:text-primary-light">
              {title}
            </h4>
            {currentCompound && (
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {currentCompound}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat, statIdx) => (
              <div 
                key={`stat-${statIdx}`} 
                className="bg-gray-50 dark:bg-gray-700/50 
                         rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 
                         transition-colors duration-200"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 block">
                  {stat.label}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
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
    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700 mb-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative py-2">
          {showLeftScroll && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-gray-800/90 
                       p-1.5 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700
                       transition-all duration-200 border border-gray-200 dark:border-gray-600"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {showRightScroll && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-gray-800/90 
                       p-1.5 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700
                       transition-all duration-200 border border-gray-200 dark:border-gray-600"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="overflow-x-auto hide-scrollbar flex gap-3 mx-6"
          >
            {renderStats()}
          </div>
        </div>
      </div>
    </div>
  );
} 