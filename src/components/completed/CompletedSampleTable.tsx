import { Sample } from '../../types';

interface CompletedSampleTableProps {
  samples: Sample[];
}

export default function CompletedSampleTable({ samples }: CompletedSampleTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg">
      <table className="min-w-full bg-white dark:bg-gray-800">
        <thead>
          <tr className="bg-primary text-white dark:bg-primary-dark">
            <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
              Chip ID
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
              Patient ID
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
              Final Volume
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
              Average CO₂
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
              Completed
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {samples.map((sample) => (
            <tr 
              key={sample.chip_id} 
              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {sample.chip_id}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {sample.patient_id || 'Not assigned'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {sample.location || 'Not specified'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {sample.final_volume ? (
                    <span className="font-medium text-primary dark:text-primary-light">
                      {sample.final_volume} mL
                    </span>
                  ) : 'N/A'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {sample.average_co2 ? (
                    <span className="font-medium text-primary dark:text-primary-light">
                      {sample.average_co2}%
                    </span>
                  ) : 'N/A'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {formatDate(sample.timestamp)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
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