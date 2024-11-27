import { useState } from 'react';
import { sampleService } from '../../services/api';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIInsightsModal({ isOpen, onClose }: AIInsightsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<string>('');

  const fetchInsights = async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    try {
      const data = await sampleService.getAIAnalysis();
      if (data.success) {
        setInsights(data.insights);
      } else if (data.error?.includes('timed out') && retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchInsights(retryCount + 1);
      } else {
        setError(data.error || 'Failed to generate insights');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderInsights = (text: string) => {
    const sections = text.split('\n\n');
    return sections.map((section, index) => {
      if (section.startsWith('1.')) {
        return (
          <div key={index} className="mb-6">
            {section.split('\n').map((line, lineIndex) => {
              if (line.match(/^\d\./)) {
                return (
                  <h3 key={lineIndex} className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    {line}
                  </h3>
                );
              } else if (line.startsWith('   -')) {
                return (
                  <li key={lineIndex} className="ml-6 mb-2 text-gray-600 dark:text-gray-300">
                    {line.replace('   - ', '')}
                  </li>
                );
              }
              return null;
            })}
          </div>
        );
      } else {
        return (
          <p key={index} className="text-gray-600 dark:text-gray-300 mb-4">
            {section}
          </p>
        );
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Insights</h2>
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
          
          <div className="prose dark:prose-invert max-w-none">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 dark:text-red-400 text-center py-8">
                {error}
              </div>
            ) : insights ? (
              <div className="space-y-4">
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