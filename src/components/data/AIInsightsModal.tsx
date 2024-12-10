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
  confidence?: string;
  significance?: string;
  effectSize?: string;
}

interface AnalysisSection {
  title: string;
  keyFinding?: string;
  content: string[];
  stats?: Stat[];
  clinicallySignificant?: boolean;
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
      let keyFinding = '';
      let clinicallySignificant = false;
      
      const content = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const trimmedLine = line
            .replace(/^\s*[*-]\s+/, '')  // Remove list markers
            .replace(/^#+\s*/, '')       // Remove any header markers
            .trim();

          // Extract key finding
          if (trimmedLine.startsWith('Key Finding:')) {
            keyFinding = trimmedLine.replace('Key Finding:', '').trim();
            return '';
          }

          // Check for clinical significance
          if (trimmedLine.toLowerCase().includes('clinically significant')) {
            clinicallySignificant = true;
          }

          return trimmedLine;
        })
        .filter(Boolean); // Remove empty strings

      const stats: Stat[] = [];
      let currentCompound = '';
      let currentStat: Partial<Stat> = {};
      
      content.forEach(line => {
        if (line.endsWith(':')) {
          currentCompound = line.slice(0, -1).trim();
        } else if (line.includes(':')) {
          const [label, value] = line.split(':').map(s => s.trim());
          if (label && value) {
            if (label.toLowerCase().includes('ci') || label.toLowerCase().includes('confidence')) {
              currentStat.confidence = value;
            } else if (label.toLowerCase().includes('p-value') || label.toLowerCase().includes('significance')) {
              currentStat.significance = value;
            } else if (label.toLowerCase().includes('effect') || label.toLowerCase().includes("cohen's")) {
              currentStat.effectSize = value;
            } else {
              if (Object.keys(currentStat).length > 0) {
                stats.push(currentStat as Stat);
                currentStat = {};
              }
              const fullLabel = currentCompound ? `${currentCompound} - ${label}` : label;
              currentStat = { label: fullLabel, value };
            }
          }
        }
      });

      if (Object.keys(currentStat).length > 0) {
        stats.push(currentStat as Stat);
      }

      return { 
        title,
        keyFinding: keyFinding || undefined,
        content: content.filter(line => !line.includes(':')),
        stats: stats.length > 0 ? stats : undefined,
        clinicallySignificant
      };
    });

    setSections(sections.filter(section => section.title && 
      (section.content.length > 0 || section.keyFinding || (section.stats && section.stats.length > 0))));
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
        className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 my-auto 
                 border border-gray-200 dark:border-gray-700"
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b-2 border-gray-200 dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent 
                           bg-gradient-to-r from-primary to-primary-dark dark:from-primary-light dark:to-primary">
                Clinical VOC Analysis
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Advanced biomarker analysis for cancer detection
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
                    {retryCount > 0 ? `Retry attempt ${retryCount}/3...` : 'Generating clinical analysis...'}
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
                      className={`analysis-section mb-8 ${
                        section.clinicallySignificant ? 'ring-2 ring-primary/20 rounded-xl p-6' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white
                                     relative after:absolute after:bottom-0 after:left-0 after:w-full 
                                     after:h-0.5 after:bg-gradient-to-r after:from-primary/30 after:to-transparent">
                          {section.title}
                        </h3>
                        {section.clinicallySignificant && (
                          <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary 
                                         dark:bg-primary/20 dark:text-primary-light rounded-full">
                            Clinically Significant
                          </span>
                        )}
                      </div>

                      {section.keyFinding && (
                        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg
                                      border-l-4 border-primary">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Key Finding
                          </h4>
                          <p className="text-gray-900 dark:text-white font-medium">
                            {section.keyFinding}
                          </p>
                        </div>
                      )}
                      
                      {section.stats && section.stats.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg
                                      border border-gray-200 dark:border-gray-700
                                      hover:shadow-xl transition-shadow duration-300 mb-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                                <span className="text-sm text-gray-500 dark:text-gray-400 block mb-2">
                                  {stat.label}
                                </span>
                                <span className="text-lg font-semibold text-gray-900 dark:text-white block">
                                  {stat.value}
                                </span>
                                {(stat.confidence || stat.significance || stat.effectSize) && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600
                                                grid grid-cols-1 gap-1">
                                    {stat.confidence && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        95% CI: {stat.confidence}
                                      </span>
                                    )}
                                    {stat.significance && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        p-value: {stat.significance}
                                      </span>
                                    )}
                                    {stat.effectSize && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Effect Size: {stat.effectSize}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {section.content.length > 0 && (
                        <div className="text-gray-700 dark:text-gray-300 space-y-3">
                          {section.content.map((line, lineIdx) => (
                            <p key={lineIdx} className="leading-relaxed">
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