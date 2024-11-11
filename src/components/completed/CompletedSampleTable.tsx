import { Sample } from '../../types';

interface CompletedSampleTableProps {
  samples: Sample[];
}

const getSampleType = (sample: Sample): string => {
  if (sample.sample_type) {
    return sample.sample_type;
  }
  
  switch (sample.location) {
    case 'CT - Radiology':
      return 'LC Negative';
    case 'BCC - 3rd Floor Clinic':
      return 'LC Positive';
    default:
      return 'Not specified';
  }
};

export default function CompletedSampleTable({ samples }: CompletedSampleTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Sort samples by date and then by patient ID
  const sortedSamples = [...samples].sort((a, b) => {
    // First compare by date
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    
    // If dates are equal, compare by patient ID
    const patientA = a.patient_id || '';
    const patientB = b.patient_id || '';
    
    // Extract numbers from patient IDs for numerical comparison
    const numA = parseInt(patientA.replace(/\D/g, '')) || 0;
    const numB = parseInt(patientB.replace(/\D/g, '')) || 0;
    
    return numA - numB;
  });

  return (
    <div className="w-full overflow-x-auto shadow-lg rounded-lg">
      <table className="w-full table-auto bg-white dark:bg-gray-800">
        <thead>
          <tr className="bg-primary text-white dark:bg-primary-dark">
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              Chip ID
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              Patient ID
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              Sample Type
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              Final Vol
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              Avg CO₂
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              Error
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              Completed
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedSamples.map((sample) => (
            <tr 
              key={sample.chip_id} 
              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {sample.chip_id}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {sample.patient_id || 'N/A'}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {getSampleType(sample)}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {sample.final_volume ? `${sample.final_volume}` : 'N/A'}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {sample.average_co2 ? `${sample.average_co2}%` : 'N/A'}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {sample.error || 'N/A'}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {formatDate(sample.timestamp)}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Complete
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 