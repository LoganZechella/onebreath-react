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

interface StatSection {
  title: string;
  vocStats?: VOCStat[];
}

const formatFieldName = (fieldName: string): string => {
  const formattingRules: Record<string, string> = {
    'final_volume': 'Final Volume (mL)',
    'average_co2': 'Avg. CO2 (%)',
    '2-Butanone': '2-Butanone',
    'Pentanal': 'Pentanal',
    'Decanal': 'Decanal',
    '2-hydroxy-acetaldehyde': '2-Hydroxy-acetaldehyde',
    '2-hydroxy-3-butanone': '2-Hydroxy-3-butanone',
    '4-HHE': '4-HHE',
    '4-HNE': '4-HNE'
  };

  return formattingRules[fieldName] || fieldName;
};

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

    // First, find and process final_volume and average_co2
    const priorityStats = ['final_volume', 'average_co2'];
    priorityStats.forEach(statName => {
      const stat = sections.find(section => 
        section.toLowerCase().includes(statName.toLowerCase())
      );
      if (stat) {
        const lines = stat.split('\n').filter(line => line.trim());
        vocStats.push({
          name: statName,
          nanomoles: {
            mean: lines.find(l => l.startsWith('Mean:'))?.split(': ')[1] || '',
            median: lines.find(l => l.startsWith('Median:'))?.split(': ')[1] || '',
            range: lines.find(l => l.startsWith('Range:'))?.split(': ')[1] || '',
            sampleCount: lines.find(l => l.startsWith('Sample Count:'))?.split(': ')[1] || ''
          },
          perLiter: {
            mean: '',
            median: '',
            range: '',
            sampleCount: ''
          }
        });
      }
    });

    // Find the nanomoles and per liter sections
    const nanomolesIndex = sections.findIndex(s => s.includes('VOC Measurements (nanomoles):'));
    const perLiterIndex = sections.findIndex(s => s.includes('VOC Measurements (nanomoles/liter of breath):'));
    
    if (nanomolesIndex !== -1 && perLiterIndex !== -1) {
      // Get all sections between these markers and the next marker or end
      const nanomolesEnd = perLiterIndex;
      const perLiterEnd = sections.findIndex((s, i) => i > perLiterIndex && s.includes('Additional Measurements:'));
      
      // Process nanomoles sections
      for (let i = nanomolesIndex + 1; i < nanomolesEnd; i++) {
        const section = sections[i];
        const lines = section.split('\n').filter(line => line.trim());
        if (lines.length > 0 && lines[0].endsWith(':')) {
          const vocName = lines[0].slice(0, -1);
          
          // Skip priority stats
          if (priorityStats.includes(vocName.toLowerCase())) continue;
          
          let voc = vocStats.find(v => v.name === vocName);
          if (!voc) {
            voc = {
              name: vocName,
              nanomoles: {
                mean: '',
                median: '',
                range: '',
                sampleCount: ''
              },
              perLiter: {
                mean: '',
                median: '',
                range: '',
                sampleCount: ''
              }
            };
            vocStats.push(voc);
          }
          
          lines.slice(1).forEach(line => {
            const [key, value] = line.split(': ');
            switch (key) {
              case 'Mean':
                voc!.nanomoles.mean = value;
                break;
              case 'Median':
                voc!.nanomoles.median = value;
                break;
              case 'Range':
                voc!.nanomoles.range = value;
                break;
              case 'Sample Count':
                voc!.nanomoles.sampleCount = value;
                break;
            }
          });
        }
      }
      
      // Process per liter sections
      const perLiterEndIndex = perLiterEnd === -1 ? sections.length : perLiterEnd;
      for (let i = perLiterIndex + 1; i < perLiterEndIndex; i++) {
        const section = sections[i];
        const lines = section.split('\n').filter(line => line.trim());
        if (lines.length > 0 && lines[0].endsWith(':')) {
          const vocName = lines[0].slice(0, -1);
          
          // Skip priority stats
          if (priorityStats.includes(vocName.toLowerCase())) continue;
          
          const voc = vocStats.find(v => v.name === vocName);
          if (voc) {
            lines.slice(1).forEach(line => {
              const [key, value] = line.split(': ');
              switch (key) {
                case 'Mean':
                  voc.perLiter.mean = value;
                  break;
                case 'Median':
                  voc.perLiter.median = value;
                  break;
                case 'Range':
                  voc.perLiter.range = value;
                  break;
                case 'Sample Count':
                  voc.perLiter.sampleCount = value;
                  break;
              }
            });
          }
        }
      }
    }

    // Convert all stats to sections
    vocStats.forEach(stat => {
      parsedSections.push({
        title: 'VOC Measurements',
        vocStats: [stat]
      });
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
    return sections.map((section, sectionIndex) => {
      if (!section.vocStats || section.vocStats.length === 0) {
        return null;
      }

      const stat = section.vocStats[0];
      const isPriorityStat = stat.name === 'final_volume' || stat.name === 'average_co2';

      return (
        <div 
          key={`section-${sectionIndex}`} 
          className="inline-block min-w-[300px] max-w-[300px] h-[140px] flex-none bg-white dark:bg-gray-800 
                   rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700
                   hover:shadow-md transition-all duration-200 overflow-hidden"
        >
          <h4 className="text-sm font-semibold text-primary dark:text-primary-light mb-2 truncate">
            {formatFieldName(stat.name)}
          </h4>
          
          {isPriorityStat ? (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2 h-[80px]">
              <span className="text-xs text-gray-500 dark:text-gray-400 block">
                Value
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Mean: {stat.name === 'final_volume' 
                  ? Math.round(parseFloat(stat.nanomoles.mean))
                  : parseFloat(stat.nanomoles.mean).toFixed(1)}
                {stat.name === 'final_volume' ? ' mL' : '%'}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-300 block truncate">
                Range: {stat.nanomoles.range}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Concentration (nmol)
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
                    Mean: {parseFloat(stat.nanomoles.mean).toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 block truncate">
                    Range: {stat.nanomoles.range}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Per Liter (nmol/L)
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
                    Mean: {parseFloat(stat.perLiter.mean).toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 block truncate">
                    Range: {stat.perLiter.range}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }).filter(Boolean);
  };

  return (
    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm 
                    border-b border-gray-200 dark:border-gray-700 mb-4 h-[200px]">
      <div className="max-w-7xl mx-auto px-4 h-full">
        <div className="py-2 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Data Overview
          </h2>
        </div>

        <div className="relative h-[calc(100%-40px)]">
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
            className="overflow-x-auto overflow-y-hidden hide-scrollbar flex gap-3 mx-6 py-2 h-full"
          >
            {renderStats()}
          </div>
        </div>
      </div>
    </div>
  );
} 