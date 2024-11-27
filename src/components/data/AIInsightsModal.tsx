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
        setInsights(formatInsights(data.insights));
      } else if (data.error?.includes('timed out') && retryCount < 2) {
        // Retry up to 2 times for timeout errors
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchInsights(retryCount + 1);
      } else {
        setError(data.error || 'Failed to generate insights');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = () => {
    fetchInsights(0);
  };

  const formatInsights = (rawInsights: string): string => {
    const sections = rawInsights.split('###').filter(section => section.trim() !== '');
    return sections.map(section => {
      const [title, ...content] = section.split('\n');
      return `
        <div class="insight-section">
          <h3>${title.trim()}</h3>
          ${formatContent(content.join('\n'))}
        </div>
      `;
    }).join('');
  };

  const formatContent = (content: string): string => {
    let formatted = content
      .replace(/- /g, '<li>')
      .replace(/\n/g, '</li>\n');
    formatted = '<ul>' + formatted + '</ul>';
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return formatted;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Insights</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 
                       dark:hover:text-gray-200 transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 dark:text-red-400 text-center py-8">
              {error}
            </div>
          ) : insights ? (
            <div 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: insights }}
            />
          ) : (
            <div className="text-center py-8">
              <button
                onClick={handleGenerateClick}
                className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg
                         transition-colors shadow-lg hover:shadow-primary/20"
              >
                Generate Insights
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 