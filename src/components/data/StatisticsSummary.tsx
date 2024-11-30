import { useState, useRef } from 'react';

interface StatisticsSummaryProps {
  insights: string;
}

interface VOCStat {
  name: string;
  nanomoles: {
    mean: string;
    median: string;
    range: string;
    sampleCount: string;
  };
  perLiter: {
    mean: string;
    median: string;
    range: string;
    sampleCount: string;
  };
}

interface AdditionalStat {
  name: string;
  mean: string;
  median: string;
  range: string;
  sampleCount: string;
}

interface StatSection {
  title: string;
  vocStats?: VOCStat[];
  additionalStats?: AdditionalStat[];
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
    const vocStats: VOCStat[] = [];
    let currentVOC: Partial<VOCStat> = {};
    let currentSection = '';

    sections.forEach((section) => {
      const lines = section.split('\n').filter(line => line.trim());
      const title = lines[0].trim();

      if (title === 'VOC Measurements (nanomoles):') {
        currentSection = 'nanomoles';
      } else if (title === 'VOC Measurements (nanomoles/liter of breath):') {
        currentSection = 'perLiter';
      } else if (title === 'Additional Measurements:') {
        const additionalStats: AdditionalStat[] = [];
        let currentStat: Partial<AdditionalStat> = {};

        lines.slice(1).forEach(line => {
          if (line.endsWith(':')) {
            if (currentStat.name) {
              additionalStats.push(currentStat as AdditionalStat);
            }
            currentStat = { name: line.slice(0, -1) };
          } else {
            const [key, value] = line.split(': ');
            switch (key) {
              case 'Mean':
                currentStat.mean = value;
                break;
              case 'Median':
                currentStat.median = value;
                break;
              case 'Range':
                currentStat.range = value;
                break;
              case 'Sample Count':
                currentStat.sampleCount = value;
                break;
            }
          }
        });
        if (currentStat.name) {
          additionalStats.push(currentStat as AdditionalStat);
        }

        parsedSections.push({
          title: 'Additional Measurements',
          additionalStats
        });
      } else {
        const currentLine = lines[0];
        if (currentLine.endsWith(':')) {
          if (currentVOC.name) {
            vocStats.push(currentVOC as VOCStat);
          }
          currentVOC = { 
            name: currentLine.slice(0, -1),
            nanomoles: { mean: '', median: '', range: '', sampleCount: '' },
            perLiter: { mean: '', median: '', range: '', sampleCount: '' }
          };
        } else if (currentSection && currentVOC.name) {
          const [key, value] = currentLine.split(': ');
          const statSection = currentSection === 'nanomoles' ? 'nanomoles' : 'perLiter';
          
          if (currentVOC[statSection]) {
            switch (key) {
              case 'Mean':
                currentVOC[statSection].mean = value;
                break;
              case 'Median':
                currentVOC[statSection].median = value;
                break;
              case 'Range':
                currentVOC[statSection].range = value;
                break;
              case 'Sample Count':
                currentVOC[statSection].sampleCount = value;
                break;
            }
          }
        }
      }
    });

    if (currentVOC.name) {
      vocStats.push(currentVOC as VOCStat);
    }

    if (vocStats.length > 0) {
      parsedSections.unshift({
        title: 'VOC Measurements',
        vocStats
      });
    }

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
        className="inline-block min-w-[400px] flex-none bg-white dark:bg-gray-800 rounded-lg p-4 
                 shadow-sm border border-gray-200 dark:border-gray-700
                 hover:shadow-md transition-all duration-200"
      >
        <h4 className="text-sm font-semibold text-primary dark:text-primary-light mb-3">
          {section.title}
        </h4>
        
        {section.vocStats && (
          <div className="space-y-4">
            {section.vocStats.map((voc, index) => (
              <div key={`voc-${index}`} className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="font-medium text-gray-900 dark:text-white mb-2">{voc.name}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Concentration (nmol)</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Mean: {voc.nanomoles.mean}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300 block">
                      Range: {voc.nanomoles.range}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Per Liter (nmol/L)</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Mean: {voc.perLiter.mean}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300 block">
                      Range: {voc.perLiter.range}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {section.additionalStats && (
          <div className="grid grid-cols-2 gap-4">
            {section.additionalStats.map((stat, statIdx) => (
              <div 
                key={`stat-${statIdx}`} 
                className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 block">
                  {stat.name}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Mean: {stat.mean}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300 block">
                  Range: {stat.range}
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
            className="overflow-x-auto hide-scrollbar flex gap-3 mx-6 py-2 whitespace-nowrap"
          >
            {renderStats()}
          </div>
        </div>
      </div>
    </div>
  );
} 