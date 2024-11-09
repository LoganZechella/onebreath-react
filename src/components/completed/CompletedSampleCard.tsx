import { Sample } from '../../types';

interface CompletedSampleCardProps {
  sample: Sample;
}

export default function CompletedSampleCard({ sample }: CompletedSampleCardProps) {
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
    <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {sample.chip_id}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Patient ID: {sample.patient_id || 'Not assigned'}
          </p>
        </div>
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
          Complete
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <p>
          <span className="font-medium">Sample Type:</span> {sample.sample_type || 'Not specified'}
        </p>
        <p>
          <span className="font-medium">Batch Number:</span> {sample.batch_number || 'N/A'}
        </p>
        <p>
          <span className="font-medium">Final Volume:</span> {sample.final_volume ? `${sample.final_volume} mL` : 'N/A'}
        </p>
        <p>
          <span className="font-medium">Average CO2:</span> {sample.average_co2 ? `${sample.average_co2}%` : 'N/A'}
        </p>
        {sample.error && (
          <p className="text-red-600 dark:text-red-400">
            <span className="font-medium">Error:</span> {sample.error}
          </p>
        )}
        <p>
          <span className="font-medium">Completed:</span> {formatDate(sample.timestamp)}
        </p>
        {sample.document_urls && sample.document_urls.length > 0 && (
          <div className="mt-4">
            <p className="font-medium mb-2">Attached Documents:</p>
            <div className="flex flex-wrap gap-2">
              {sample.document_urls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark dark:text-primary-light 
                           dark:hover:text-primary underline"
                >
                  Document {index + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 