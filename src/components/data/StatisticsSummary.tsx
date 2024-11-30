import { useState, useRef } from 'react';

interface StatisticsSummaryProps {
  insights: string;
}

interface Stat {
  label: string;
  value: string;
}

interface VOCStat {
  concentration: string;
  perLiter: string;
  range: string;
  sampleCount: string;
}

interface StatSection {
  title: string;
  vocStats?: Record<string, VOCStat>;
  generalStats?: Stat[];
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

  const parseInsights = (): StatSection[] => {
    if (!insights) return [];

    const sections = insights.split('\n\n');
    const parsedSections: StatSection[] = [];
    let currentSection: StatSection | null = null;

    sections.forEach((section) => {
      const lines = section.split('\n');
      const title = lines[0].trim();

      if (title === 'VOC Measurements:') {
        currentSection = {
          title: 'VOC Measurements',
          vocStats: {}
        };

        let currentVOC = '';
        lines.slice(1).forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.endsWith(':')) {
            currentVOC = trimmedLine.slice(0, -1);
            currentSection!.vocStats![currentVOC] = {} as VOCStat;
          } else if (currentVOC && trimmedLine) {
            if (trimmedLine.startsWith('Concentration')) {
              currentSection!.vocStats![currentVOC].concentration = trimmedLine.split(': ')[1];
            } else if (trimmedLine.startsWith('Per Liter')) {
              currentSection!.vocStats![currentVOC].perLiter = trimmedLine.split(': ')[1];
            } else if (trimmedLine.startsWith('Range')) {
              currentSection!.vocStats![currentVOC].range = trimmedLine.split(': ')[1];
            } else if (trimmedLine.startsWith('Sample Count')) {
              currentSection!.vocStats![currentVOC].sampleCount = trimmedLine.split(': ')[1];
            }
          }
        });

        parsedSections.push(currentSection);
      } else if (title === 'Additional Measurements:') {
        currentSection = {
          title: 'Additional Measurements',
          generalStats: []
        };

        let currentStat = '';
        lines.slice(1).forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.endsWith(':')) {
            currentStat = trimmedLine.slice(0, -1);
          } else if (currentStat && trimmedLine) {
            const [label, value] = trimmedLine.split(': ');
            if (label && value) {
              currentSection!.generalStats!.push({ label: `${currentStat} - ${label}`, value });
            }
          }
        });

        parsedSections.push(currentSection);
      }
    });

    return parsedSections;
  };

  const renderStats = () => {
    if (!insights) {
      return (
        <div className="text-center text-gray-500 dark:text-gray-400 py-2">
          No statistical data available
        </div>
      );
    }

    const sections = parseInsights();
    return sections.map((section, sectionIndex) => (
      <div 
        key={`section-${sectionIndex}`} 
        className="min-w-[300px] bg-white dark:bg-gray-800 rounded-lg p-4 
                 shadow-sm border border-gray-200 dark:border-gray-700
                 hover:shadow-md transition-all duration-200"
      >
        <h4 className="text-sm font-semibold text-primary dark:text-primary-light mb-3">
          {section.title}
        </h4>
        
        {section.vocStats && (
          <div className="space-y-4">
            {Object.entries(section.vocStats).map(([voc, stats], index) => (
              <div key={`voc-${index}`} className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="font-medium text-gray-900 dark:text-white mb-2">{voc}</div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Concentration</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{stats.concentration}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Per Liter</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{stats.perLiter}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Range</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{stats.range}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {section.generalStats && (
          <div className="grid grid-cols-2 gap-2">
            {section.generalStats.map((stat, statIdx) => (
              <div 
                key={`stat-${statIdx}`} 
                className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2"
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
        )}
      </div>
    ));
  };

  return (
    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-gray-700 mb-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="py-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Data Overview
          </h2>
        </div>

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