import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
// import * as d3 from 'd3';

interface AnalyzedSample {
  chip_id: string;
  timestamp: string;
  final_volume: number;
  average_co2: number;
  'Pentanal': number;
  'Decanal': number;
  '2-Butanone': number;
  '2-hydroxy-acetaldehyde': number;
  '2-hydroxy-3-butanone': number;
  '4-HHE': number;
  '4HNE': number;
  'Dx': string;
}

export default function DataViewer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [samples, setSamples] = useState<AnalyzedSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('bar');
  const [xAxis, setXAxis] = useState('timestamp');
  const [yAxis, setYAxis] = useState('average_co2');
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchAnalyzedSamples = async () => {
      try {
        const response = await fetch('https://onebreathpilot.onrender.com/analyzed');
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

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    if (!chartRef.current || samples.length === 0) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Create chart based on selected options
    // ... Chart creation logic ...

  }, [samples, chartType, xAxis, yAxis]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 animate__animated animate__fadeIn">
      <section className="bg-white/70 backdrop-blur-xl rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Data Visualization</h2>
          <button
            onClick={() => {/* Implement AI analysis */}}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded transition-colors"
          >
            Get Insights
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="scatter">Scatter Plot</option>
          </select>
          <select
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="timestamp">Timestamp</option>
            <option value="chip_id">Chip ID</option>
          </select>
          <select
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="average_co2">Average CO2</option>
            <option value="final_volume">Final Volume</option>
          </select>
        </div>

        <div className="aspect-w-16 aspect-h-9">
          <canvas ref={chartRef}></canvas>
        </div>
      </section>
    </div>
  );
}
