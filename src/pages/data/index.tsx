import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import * as d3 from 'd3';
import AIInsightsModal from '../../components/data/AIInsightsModal';

interface AnalyzedSample {
  chip_id: string;
  batch_number?: number;
  mfg_date?: string;
  location?: string;
  timestamp: string;
  patient_id: string;
  average_co2: number;
  final_volume: number;
  status?: string;
  'Pentanal': number;
  'Decanal': number;
  '2-Butanone': number;
  '2-hydroxy-acetaldehyde': number;
  '2-hydroxy-3-butanone': number;
  '4-HHE': number;
  '4HNE': number;
  'Dx': string;
}

interface ChartData {
  labels: string[];
  data: number[];
}

interface BoxPlotData {
  labels: string[];
  data: number[][];
}

type ProcessedData = ChartData | BoxPlotData;

function isBoxPlotData(data: ProcessedData): data is BoxPlotData {
  return Array.isArray((data as BoxPlotData).data[0]);
}

export default function DataViewer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [samples, setSamples] = useState<AnalyzedSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('bar');
  const [xAxis, setXAxis] = useState('timestamp');
  const [yAxis, setYAxis] = useState('average_co2');
  const [aggregation, setAggregation] = useState('none');
  const [showInsights, setShowInsights] = useState(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const d3Container = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const numericFields = [
    'final_volume', 'average_co2', 'batch_number',
    '2-Butanone', 'Pentanal', 'Decanal', '2-hydroxy-acetaldehyde',
    '2-hydroxy-3-butanone', '4-HHE', '4HNE'
  ];
  
  const dateFields = ['timestamp', 'mfg_date'];
  const categoricalFields = ['location', 'patient_id', 'chip_id', 'Dx'];

  const formatFieldName = (fieldName: string): string => {
    const formattingRules: Record<string, string> = {
      'chip_id': 'Chip ID',
      'batch_number': 'Batch Number',
      'mfg_date': 'Manufacturing Date',
      'location': 'Location',
      'timestamp': 'Date',
      'patient_id': 'Patient ID',
      'average_co2': 'Average CO2 (%)',
      'final_volume': 'Final Volume (mL)',
      '2-Butanone': '2-Butanone (nmole/L breath)',
      'Pentanal': 'Pentanal (nmole/L breath)',
      'Decanal': 'Decanal (nmole/L breath)',
      '2-hydroxy-acetaldehyde': '2-hydroxy-acetaldehyde (nmole/L breath)',
      '2-hydroxy-3-butanone': '2-hydroxy-3-butanone (nmole/L breath)',
      '4-HHE': '4-HHE (nmole/L breath)',
      '4HNE': '4HNE (nmole/L breath)',
      'Dx': 'Diagnosis'
    };

    return formattingRules[fieldName] || fieldName;
  };

  const populateAxisOptions = () => {
    const xAxisOptions = [...numericFields, ...dateFields, ...categoricalFields];
    const yAxisOptions = [...numericFields];
    return { xAxisOptions, yAxisOptions };
  };

  const { xAxisOptions, yAxisOptions } = populateAxisOptions();
  const allFieldsSelected = chartType && xAxis && yAxis;

  // Fetch data when component mounts
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchAnalyzedSamples = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/analyzed`);
        const data = await response.json();
        setSamples(data);
      } catch (error) {
        console.error('Error fetching analyzed samples:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyzedSamples();
  }, [user, navigate]);

  // Create or update visualization when options change
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    if (!chartRef.current || samples.length === 0 || !allFieldsSelected) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const processedData = processData(samples, xAxis, yAxis, aggregation);

    if (chartType === 'boxplot') {
      if (isBoxPlotData(processedData)) {
        createBoxPlot(processedData);
      }
    } else {
      if (!isBoxPlotData(processedData)) {
        createChart(ctx, processedData);
      }
    }
  }, [samples, chartType, xAxis, yAxis, aggregation, allFieldsSelected, isFullscreen]);

  const processData = (
    samples: AnalyzedSample[], 
    xField: string, 
    yField: string, 
    aggregationField: string
  ): ProcessedData => {
    if (chartType === 'boxplot') {
      // Process data for boxplot
      const processedData: BoxPlotData = { labels: [], data: [] };
      
      if (aggregationField === 'none') {
        // Group by x-axis values for boxplot
        const groupedData: Record<string, number[]> = {};
        samples.forEach(sample => {
          const xValue = formatFieldValue(sample[xField as keyof AnalyzedSample], xField);
          const yValue = parseFloat(String(sample[yField as keyof AnalyzedSample]));
          
          if (!isNaN(yValue)) {
            if (!groupedData[xValue]) {
              groupedData[xValue] = [];
            }
            groupedData[xValue].push(yValue);
          }
        });

        Object.entries(groupedData).forEach(([key, values]) => {
          processedData.labels.push(key);
          processedData.data.push(values);
        });
      } else {
        // Group by aggregation field
        const aggregatedData: Record<string, number[]> = {};
        samples.forEach(sample => {
          const key = String(sample[aggregationField as keyof AnalyzedSample]);
          const yValue = parseFloat(String(sample[yField as keyof AnalyzedSample]));

          if (!isNaN(yValue)) {
            if (!aggregatedData[key]) {
              aggregatedData[key] = [];
            }
            aggregatedData[key].push(yValue);
          }
        });

        Object.entries(aggregatedData).forEach(([key, values]) => {
          processedData.labels.push(key);
          processedData.data.push(values);
        });
      }
      
      return processedData;
    } else {
      // Process data for other chart types
      const processedData: ChartData = { labels: [], data: [] };

      if (aggregationField === 'none') {
        samples.forEach(sample => {
          const xValue = formatFieldValue(sample[xField as keyof AnalyzedSample], xField);
          const yValue = parseFloat(String(sample[yField as keyof AnalyzedSample]));

          if (!isNaN(yValue)) {
            processedData.labels.push(xValue);
            processedData.data.push(yValue);
          }
        });
      } else {
        const aggregatedData: Record<string, number[]> = {};
        
        samples.forEach(sample => {
          const key = String(sample[aggregationField as keyof AnalyzedSample]);
          const yValue = parseFloat(String(sample[yField as keyof AnalyzedSample]));

          if (!isNaN(yValue)) {
            if (!aggregatedData[key]) {
              aggregatedData[key] = [];
            }
            aggregatedData[key].push(yValue);
          }
        });

        Object.entries(aggregatedData).forEach(([key, values]) => {
          processedData.labels.push(key);
          processedData.data.push(average(values));
        });
      }

      return processedData;
    }
  };

  const formatFieldValue = (value: any, field: string): string => {
    if (value === undefined || value === null) return 'N/A';
    
    if (dateFields.includes(field)) {
      return new Date(value).toLocaleDateString();
    }
    
    return String(value);
  };

  const average = (arr: number[]): number => {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  const createChart = (ctx: CanvasRenderingContext2D, processedData: ChartData) => {
    chartInstance.current = new Chart(ctx, {
      type: chartType as 'bar' | 'line' | 'scatter',
      data: {
        labels: processedData.labels,
        datasets: [{
          label: formatFieldName(yAxis),
          data: processedData.data,
          backgroundColor: 'rgba(15, 146, 187, 0.5)',
          borderColor: 'rgba(15, 146, 187, 1)',
          borderWidth: 1,
          pointBackgroundColor: 'rgba(15, 146, 187, 1)',
          tension: chartType === 'line' ? 0.4 : undefined
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              padding: 20,
              font: {
                size: 14
              }
            }
          },
          title: {
            display: true,
            text: `${formatFieldName(yAxis)} vs ${formatFieldName(xAxis)}`,
            padding: 20,
            font: {
              size: 16,
              weight: 'bold'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: formatFieldName(yAxis),
              padding: 20,
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            ticks: {
              padding: 10,
              font: {
                size: 12
              }
            }
          },
          x: {
            title: {
              display: true,
              text: formatFieldName(xAxis),
              padding: 20,
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            ticks: {
              padding: 10,
              font: {
                size: 12
              }
            }
          }
        }
      }
    });
  };

  const createBoxPlot = (processedData: BoxPlotData) => {
    if (!d3Container.current) return;

    // Clear previous chart
    d3.select(d3Container.current).selectAll('*').remove();

    const containerWidth = d3Container.current.clientWidth;
    const containerHeight = d3Container.current.clientHeight;
    
    const margin = {
      top: containerHeight * 0.05,
      right: containerWidth * 0.05,
      bottom: containerHeight * 0.1,
      left: containerWidth * 0.1
    };

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const svg = d3.select(d3Container.current)
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Calculate quartiles, median, min, max for each data array
    const boxPlotData = processedData.data.map((d, i) => {
      const sorted = d.sort((a, b) => a - b);
      return {
        label: processedData.labels[i],
        q1: d3.quantile(sorted, 0.25) || 0,
        median: d3.quantile(sorted, 0.5) || 0,
        q3: d3.quantile(sorted, 0.75) || 0,
        min: sorted[0],
        max: sorted[sorted.length - 1]
      };
    });

    // Scales
    const x = d3.scaleBand()
      .range([0, width])
      .domain(processedData.labels)
      .padding(0.1);

    const y = d3.scaleLinear()
      .range([height, 0])
      .domain([
        d3.min(boxPlotData, d => d.min) || 0,
        d3.max(boxPlotData, d => d.max) || 0
      ]);

    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('font-size', `${width * 0.02}px`)
      .attr('dy', '1em');

    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('font-size', `${height * 0.02}px`);

    // Draw box plots
    const boxWidth = x.bandwidth();

    const boxPlots = svg.selectAll('.boxplot')
      .data(boxPlotData)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${x(d.label)},0)`);

    // Draw boxes
    boxPlots.append('rect')
      .attr('x', 0)
      .attr('y', d => y(d.q3))
      .attr('width', boxWidth)
      .attr('height', d => y(d.q1) - y(d.q3))
      .attr('fill', 'rgba(15, 146, 187, 0.5)')
      .attr('stroke', 'rgba(15, 146, 187, 1)');

    // Draw median lines
    boxPlots.append('line')
      .attr('x1', 0)
      .attr('x2', boxWidth)
      .attr('y1', d => y(d.median))
      .attr('y2', d => y(d.median))
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    // Draw whiskers
    boxPlots.append('line')
      .attr('x1', boxWidth / 2)
      .attr('x2', boxWidth / 2)
      .attr('y1', d => y(d.min))
      .attr('y2', d => y(d.q1))
      .attr('stroke', 'black');

    boxPlots.append('line')
      .attr('x1', boxWidth / 2)
      .attr('x2', boxWidth / 2)
      .attr('y1', d => y(d.q3))
      .attr('y2', d => y(d.max))
      .attr('stroke', 'black');

    // Draw whisker caps
    boxPlots.append('line')
      .attr('x1', boxWidth * 0.25)
      .attr('x2', boxWidth * 0.75)
      .attr('y1', d => y(d.min))
      .attr('y2', d => y(d.min))
      .attr('stroke', 'black');

    boxPlots.append('line')
      .attr('x1', boxWidth * 0.25)
      .attr('x2', boxWidth * 0.75)
      .attr('y1', d => y(d.max))
      .attr('y2', d => y(d.max))
      .attr('stroke', 'black');

    // Add axis labels with responsive sizing
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom * 0.8)
      .attr('text-anchor', 'middle')
      .style('font-size', `${width * 0.02}px`)
      .text(formatFieldName(xAxis));

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left * 0.8)
      .attr('text-anchor', 'middle')
      .style('font-size', `${height * 0.02}px`)
      .text(formatFieldName(yAxis));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen animate__animated animate__fadeIn">
      <section className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl 
                          border border-white/20 dark:border-gray-700/30 h-full
                          ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
        <div className={`p-8 border-b border-gray-200/80 dark:border-gray-700/80
                        ${isFullscreen ? 'hidden' : ''}`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold bg-clip-text text-transparent 
                           bg-gradient-to-r from-primary to-primary-light
                           dark:from-primary-light dark:to-primary">
                Data Visualization
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300 font-medium">
                Analyze and visualize sample data
              </p>
            </div>
            <button
              onClick={() => setShowInsights(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white 
                       px-6 py-3 rounded-xl transition-all duration-300 shadow-lg
                       hover:shadow-primary/20 hover:-translate-y-0.5
                       focus:ring-2 focus:ring-primary/50 focus:outline-none"
            >
              Get Insights
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            {/* Chart Type Selector */}
            <div className="relative group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chart Type
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none
                         transition-all duration-300 ease-in-out
                         hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                <option value="">Select Chart Type</option>
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="scatter">Scatter Plot</option>
                <option value="boxplot">Box Plot</option>
              </select>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-primary-light/10 
                           opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity -z-10"></div>
            </div>

            {/* X-Axis Selector */}
            <div className="relative group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                X-Axis
              </label>
              <select
                value={xAxis}
                onChange={(e) => setXAxis(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none
                         transition-all duration-300 ease-in-out
                         hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                <option value="">Select X-Axis</option>
                {xAxisOptions.map(field => (
                  <option key={field} value={field}>
                    {formatFieldName(field)}
                  </option>
                ))}
              </select>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-primary-light/10 
                           opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity -z-10"></div>
            </div>

            {/* Y-Axis Selector */}
            <div className="relative group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Y-Axis
              </label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none
                         transition-all duration-300 ease-in-out
                         hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                <option value="">Select Y-Axis</option>
                {yAxisOptions.map(field => (
                  <option key={field} value={field}>
                    {formatFieldName(field)}
                  </option>
                ))}
              </select>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-primary-light/10 
                           opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity -z-10"></div>
            </div>

            {/* Aggregation Selector */}
            <div className="relative group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Aggregation
              </label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none
                         transition-all duration-300 ease-in-out
                         hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                <option value="none">None</option>
                {categoricalFields.map(field => (
                  <option key={field} value={field}>
                    {formatFieldName(field)}
                  </option>
                ))}
              </select>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-primary-light/10 
                           opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity -z-10"></div>
            </div>
          </div>
        </div>

        <div className={`relative ${isFullscreen ? 'h-screen' : 'h-[calc(80vh-12rem)]'}`}>
          {!allFieldsSelected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">Select visualization options to get started</p>
            </div>
          ) : (
            <div className="relative h-full w-full p-8">
              {/* Fullscreen Toggle Button */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-gray-100 dark:bg-gray-700
                           hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300
                           shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                           text-gray-600 dark:text-gray-300"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>

              {/* Chart Container */}
              <div className={`relative h-full w-full transition-all duration-300
                             ${isFullscreen ? 'animate__animated animate__fadeIn' : ''}`}>
                {chartType === 'boxplot' ? (
                  <div ref={d3Container} className="h-full w-full" />
                ) : (
                  <canvas ref={chartRef} className="h-full w-full" />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <AIInsightsModal 
        isOpen={showInsights && !isFullscreen} 
        onClose={() => setShowInsights(false)} 
      />
    </div>
  );
}
