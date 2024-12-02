import { useState } from 'react';
import { sampleService } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Stat {
  label: string;
  value: string;
}

interface AnalysisSection {
  title: string;
  content: string[];
  stats?: Stat[];
}

export default function AIInsightsModal({ isOpen, onClose }: AIInsightsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [sections, setSections] = useState<AnalysisSection[]>([]);

  const fetchInsights = async (retry = 0) => {
    setLoading(true);
    setError(null);
    setRetryCount(retry);

    try {
      const data = await sampleService.getAIAnalysis();
      
      if (data.success && data.insights) {
        parseInsights(data.insights);
      } else if (data.error?.includes('timed out') && retry < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchInsights(retry + 1);
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

  const parseInsights = (text: string) => {
    const sections = text.split('\n\n').filter(Boolean).map(section => {
      const lines = section.split('\n');
      
      let title = lines[0].replace(/^###\s*/, '').replace(/^#+\s*/, '').trim();
      
      const content = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          return line
            .replace(/^\s*[*-]\s+/, '')  // Remove list markers
            .replace(/^#+\s*/, '')       // Remove any header markers
            .trim();
        });

      const stats: Stat[] = [];
      let currentCompound = '';
      
      content.forEach(line => {
        if (line.endsWith(':')) {
          currentCompound = line.slice(0, -1).trim();
        } else if (line.includes(':')) {
          const [label, value] = line.split(':').map(s => s.trim());
          if (label && value) {
            const fullLabel = currentCompound ? `${currentCompound} - ${label}` : label;
            stats.push({ label: fullLabel, value });
          }
        }
      });

      return { 
        title,
        content: content.filter(line => !line.includes(':')),
        stats: stats.length > 0 ? stats : undefined
      };
    });

    setSections(sections.filter(section => section.title && 
      (section.content.length > 0 || (section.stats && section.stats.length > 0))));
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8"
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 my-auto 
                 border border-gray-200 dark:border-gray-700"
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b-2 border-gray-200 dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent 
                           bg-gradient-to-r from-primary to-primary-dark dark:from-primary-light dark:to-primary">
                AI Analysis Insights
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Advanced analysis of VOC patterns and correlations
              </p>
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

          {/* Content */}
          <div className="prose dark:prose-invert max-w-none modal-content overflow-y-auto max-h-[70vh] pr-4">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 space-y-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin">
                      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary rounded-full animate-spin-fast" 
                           style={{ animationDirection: 'reverse' }}></div>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {retryCount > 0 ? `Retry attempt ${retryCount}/3...` : 'Generating analysis...'}
                  </p>
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <div className="text-red-500 dark:text-red-400 mb-4">
                    {error}
                  </div>
                  <button
                    onClick={() => fetchInsights(0)}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg
                             transition-colors shadow-lg hover:shadow-primary/20"
                  >
                    Try Again
                  </button>
                </motion.div>
              ) : sections.length > 0 ? (
                <motion.div
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  {sections.map((section, index) => (
                    <motion.div
                      key={`section-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="analysis-section"
                    >
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 
                                     relative after:absolute after:bottom-0 after:left-0 after:w-full 
                                     after:h-0.5 after:bg-gradient-to-r after:from-primary/30 after:to-transparent">
                        {section.title}
                      </h3>
                      
                      {section.stats && section.stats.length > 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg
                                      border border-gray-200 dark:border-gray-700
                                      hover:shadow-xl transition-shadow duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {section.stats.map((stat, statIdx) => (
                              <motion.div
                                key={`stat-${statIdx}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: statIdx * 0.05 }}
                                className="stat-card bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg
                                         hover:bg-gray-100 dark:hover:bg-gray-700 
                                         transition-colors duration-200"
                              >
                                <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                                  {stat.label}
                                </span>
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {stat.value}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {section.content.map((line, lineIdx) => (
                            <p key={lineIdx} className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {line}
                            </p>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-8"
                >
                  <button
                    onClick={() => fetchInsights(0)}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg
                             transition-colors shadow-lg hover:shadow-primary/20
                             transform hover:-translate-y-0.5 duration-200"
                  >
                    Generate Analysis
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 