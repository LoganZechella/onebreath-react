import { useState } from 'react';
import { sampleService } from '../../services/api';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Stat {
  label: string;
  value: string;
}

interface Compound {
  name: string;
  stats: Stat[];
}

export default function AIInsightsModal({ isOpen, onClose }: AIInsightsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<string>('');

  console.log('Current insights state:', insights);

  const fetchInsights = async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await sampleService.getAIAnalysis();
      console.log('API Response:', data);
      if (data.success && data.insights) {
        console.log('Setting insights:', data.insights);
        setInsights(data.insights);
      } else if (data.error?.includes('timed out') && retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchInsights(retryCount + 1);
      } else {
        setError(data.error || 'Failed to generate insights');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderInsights = (text: string) => {
    console.log('Raw insights text:', text);
    
    const sections = text.split('\n\n').filter(Boolean);
    
    return (
      <div className="space-y-8">
        {sections.map((section, index) => {
          if (index === 0) {
            return (
              <h3 key={`title-${index}`} className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {section}
              </h3>
            );
          }
          
          const lines = section.split('\n');
          const title = lines[0];
          
          if (!title) return null;
          
          const compounds: Compound[] = [];
          let currentCompound: Compound | null = null;
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            if (line.endsWith(':')) {
              if (currentCompound) {
                compounds.push(currentCompound);
              }
              currentCompound = {
                name: line.slice(0, -1),
                stats: []
              };
            } else if (currentCompound && line.includes(':')) {
              const [label, value] = line.split(':').map(s => s.trim());
              if (label && value) {
                currentCompound.stats.push({ label, value });
              }
            }
          }
          
          if (currentCompound) {
            compounds.push(currentCompound);
          }
          
          return (
            <div key={`section-${index}`} className="measurement-section mb-8">
              <h4 className="text-xl font-semibold text-primary dark:text-primary-light mb-6">
                {title}
              </h4>
              <div className="grid gap-6">
                {compounds.map((compound, idx) => (
                  <div key={`compound-${idx}`} className="measurement-card p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h5 className="compound-name text-lg font-medium mb-3">
                      {compound.name}
                    </h5>
                    <div className="stat-grid grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {compound.stats.map((stat, statIdx) => (
                        <div key={`stat-${statIdx}`} className="stat-item">
                          <span className="stat-label text-sm text-gray-500 dark:text-gray-400 block">
                            {stat.label}
                          </span>
                          <span className="stat-value font-medium">
                            {stat.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-auto insights-fade-in">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Insights</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Analysis based on collected samples</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 
                       dark:hover:text-gray-200 transition-colors p-2 rounded-lg
                       hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="prose dark:prose-invert max-w-none modal-content overflow-y-auto max-h-[60vh] pr-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 dark:text-red-400 text-center py-8">
                {error}
              </div>
            ) : insights ? (
              <div className="space-y-6">
                {renderInsights(insights)}
              </div>
            ) : (
              <div className="text-center py-8">
                <button
                  onClick={() => fetchInsights(0)}
                  className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg
                           transition-colors shadow-lg hover:shadow-primary/20"
                >
                  Generate Insights
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 