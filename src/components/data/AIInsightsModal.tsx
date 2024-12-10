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
  keyFinding: string;
  content: string[];
  stats: Stat[];
  analysis: string;
}

interface ExpandedSection {
  section: AnalysisSection;
  chatHistory: { role: 'user' | 'assistant'; content: string }[];
}

export default function AIInsightsModal({ isOpen, onClose }: AIInsightsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [sections, setSections] = useState<AnalysisSection[]>([]);
  const [expandedSection, setExpandedSection] = useState<ExpandedSection | null>(null);
  const [userQuestion, setUserQuestion] = useState('');

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
    const sections = text.split('\n\n').filter(Boolean);
    const parsedSections: AnalysisSection[] = [];
    let currentSection: AnalysisSection | null = null;

    sections.forEach(section => {
      const lines = section.split('\n').filter(line => line.trim());
      
      // Check if this is a new section header
      if (lines[0].startsWith('###')) {
        if (currentSection) {
          parsedSections.push(currentSection);
        }
        currentSection = {
          title: lines[0].replace(/^###\s*/, '').trim(),
          keyFinding: '',
          content: [],
          stats: [],
          analysis: ''
        };
        return;
      }

      // Skip processing if we don't have a current section
      if (!currentSection) return;

      // Process the content based on the line type
      lines.forEach(line => {
        // Skip processing if somehow we lost our current section
        if (!currentSection) return;

        const trimmedLine = line.trim();
        
        // Process the line based on its content
        if (trimmedLine.startsWith('**Key Finding:**')) {
          currentSection.keyFinding = trimmedLine.replace('**Key Finding:**', '').trim();
        } else if (trimmedLine.startsWith('**Statistical Details:**')) {
          // Stats array is already initialized, no need to do anything here
        } else if (trimmedLine.startsWith('**Analysis:**')) {
          currentSection.analysis = '';
        } else if (trimmedLine.startsWith('-')) {
          // Add stat if we're in a stats section
          const statLine = trimmedLine.substring(1).trim();
          const [label, value] = statLine.split(':').map(s => s.trim());
          if (label && value) {
            currentSection.stats.push({ label, value });
          }
        } else if (trimmedLine && !trimmedLine.startsWith('**')) {
          // If we're in an analysis section and this is plain text, append it
          if (currentSection.analysis !== undefined) {
            currentSection.analysis += (currentSection.analysis ? ' ' : '') + trimmedLine;
          }
          // Add to general content
          currentSection.content.push(trimmedLine);
        }
      });
    });

    // Don't forget to add the last section
    if (currentSection) {
      parsedSections.push(currentSection);
    }

    setSections(parsedSections);
  };

  const handleSectionClick = (section: AnalysisSection) => {
    setExpandedSection({
      section,
      chatHistory: [{
        role: 'assistant',
        content: `Let's explore the key finding: ${section.keyFinding}\n\nI can help you understand the details and implications of this finding. What would you like to know more about?`
      }]
    });
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expandedSection || !userQuestion.trim()) return;

    const newHistory = [
      ...expandedSection.chatHistory,
      { role: 'user' as const, content: userQuestion },
      { role: 'assistant' as const, content: 'Analyzing your question...' }
    ];

    setExpandedSection({ ...expandedSection, chatHistory: newHistory });
    setUserQuestion('');

    try {
      const response = await sampleService.getAIResponse(userQuestion, expandedSection.section);
      if (response.success && response.message) {
        newHistory[newHistory.length - 1].content = response.message;
        setExpandedSection({ ...expandedSection, chatHistory: newHistory });
      } else {
        newHistory[newHistory.length - 1].content = 'Sorry, I could not generate a response at this time.';
        setExpandedSection({ ...expandedSection, chatHistory: newHistory });
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      newHistory[newHistory.length - 1].content = 'Sorry, I encountered an error while processing your question.';
      setExpandedSection({ ...expandedSection, chatHistory: newHistory });
    }
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
          <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
            <div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent 
                           bg-gradient-to-r from-primary to-primary-dark dark:from-primary-light dark:to-primary">
                {expandedSection ? expandedSection.section.title : 'Clinical VOC Analysis'}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {expandedSection ? 'Detailed Analysis View' : 'Advanced biomarker analysis for cancer detection'}
              </p>
            </div>
            <div className="flex gap-2">
              {expandedSection && (
                <button
                  onClick={() => setExpandedSection(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 
                           dark:hover:text-gray-200 transition-colors p-2 rounded-lg
                           hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                </button>
              )}
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
                  className="space-y-12"
                >
                  {expandedSection ? (
                    <div className="flex flex-col h-[60vh]">
                      {/* Expanded Section Content */}
                      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                        {expandedSection.chatHistory.map((message, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-4 ${
                                message.role === 'user'
                                  ? 'bg-primary text-white ml-4'
                                  : 'bg-gray-100 dark:bg-gray-700 mr-4'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Question Input */}
                      <form onSubmit={handleQuestionSubmit} className="mt-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={userQuestion}
                            onChange={(e) => setUserQuestion(e.target.value)}
                            placeholder="Ask a question about this finding..."
                            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 
                                     bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white
                                     focus:ring-2 focus:ring-primary dark:focus:ring-primary-light
                                     focus:border-transparent"
                          />
                          <button
                            type="submit"
                            disabled={!userQuestion.trim()}
                            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg
                                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Send
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    sections.map((section, index) => (
                      <motion.div
                        key={`section-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="analysis-section cursor-pointer group"
                        onClick={() => handleSectionClick(section)}
                      >
                        {/* Section Header */}
                        <div className="mb-6">
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white relative inline-block">
                            {section.title}
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r 
                                        from-primary/30 to-transparent rounded-full"></div>
                          </h3>
                        </div>

                        {/* Key Finding */}
                        <div className="mb-6 transform transition-all duration-200 group-hover:scale-[1.02]">
                          <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-6
                                      border-l-4 border-primary shadow-sm group-hover:shadow-md
                                      group-hover:border-l-8 transition-all duration-200">
                            <h4 className="text-sm uppercase tracking-wider text-primary dark:text-primary-light 
                                       font-semibold mb-2 flex items-center justify-between">
                              Key Finding
                              <svg className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors" 
                                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </h4>
                            <p className="text-gray-900 dark:text-white text-lg font-medium leading-relaxed">
                              {section.keyFinding || 'No key finding available'}
                            </p>
                          </div>
                        </div>

                        {/* Statistical Details */}
                        {section.stats && section.stats.length > 0 && (
                          <div className="mb-6 opacity-90 group-hover:opacity-100 transition-opacity">
                            <h4 className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 
                                       font-semibold mb-4">
                              Statistical Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {section.stats.map((stat, statIdx) => (
                                <motion.div
                                  key={`stat-${statIdx}`}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: statIdx * 0.05 }}
                                  className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm
                                         border border-gray-200 dark:border-gray-700
                                         group-hover:shadow-md transition-shadow duration-200"
                                >
                                  <div className="flex justify-between items-start">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                      {stat.label}
                                    </span>
                                    <span className="text-base font-semibold text-gray-900 dark:text-white
                                                 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                                      {stat.value}
                                    </span>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Analysis */}
                        {section.analysis && (
                          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6
                                      opacity-90 group-hover:opacity-100 transition-opacity">
                            <h4 className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 
                                       font-semibold mb-3">
                              Analysis
                            </h4>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {section.analysis}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
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