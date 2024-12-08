import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sample, PickupData } from '../../types';
import EditableField from './EditableField';
import CountdownTimer from './CountdownTimer';
import toast from 'react-hot-toast';
import PickupForm from './PickupForm';
import { updateSampleWithPickupData } from '../../services/api';

interface EditableSampleCardProps {
  sample: Sample;
  onUpdateStatus: (chipId: string, status: string, sampleType: string) => Promise<void>;
  onUpdateSample: (sample: Sample) => Promise<void>;
  onPickupComplete?: () => Promise<void>;
}

export default function EditableSampleCard({ sample, onUpdateStatus, onUpdateSample, onPickupComplete }: EditableSampleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showChipIdWarning, setShowChipIdWarning] = useState(false);
  const [fields, setFields] = useState({
    chipId: { value: sample.chip_id, isEditing: false, isValid: true },
    patientId: { value: sample.patient_id || '', isEditing: false, isValid: true },
    sampleType: { value: sample.sample_type || '', isEditing: false, isValid: true },
    notes: { value: sample.notes || '', isEditing: false, isValid: true }
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const [showPickupForm, setShowPickupForm] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleChipIdEdit = () => {
    if (!showChipIdWarning) {
      setShowChipIdWarning(true);
      return;
    }
    setFields(prev => ({
      ...prev,
      chipId: { ...prev.chipId, isEditing: true }
    }));
  };

  const handleFieldEdit = (field: keyof typeof fields, value: string) => {
    setFields(prev => ({
      ...prev,
      [field]: { ...prev[field], value }
    }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowChipIdWarning(false);
    setFields({
      chipId: { value: sample.chip_id, isEditing: false, isValid: true },
      patientId: { value: sample.patient_id || '', isEditing: false, isValid: true },
      sampleType: { value: sample.sample_type || '', isEditing: false, isValid: true },
      notes: { value: sample.notes || '', isEditing: false, isValid: true }
    });
    setIsExpanded(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateSample({
        ...sample,
        chip_id: fields.chipId.value,
        patient_id: fields.patientId.value,
        sample_type: fields.sampleType.value || sample.sample_type || '',
        notes: fields.notes.value
      });
      setIsEditing(false);
      setShowChipIdWarning(false);
      setIsExpanded(false);
      toast.success('Sample updated successfully');
    } catch (error) {
      toast.error('Failed to save changes');
      console.error('Error saving changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(true);
    setIsEditing(true);
  };

  const formatStartTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };

  const handlePickupFormSubmit = async (chipId: string, volume: number, co2: number, patientId: string, error?: string) => {
    try {
      const pickupData: PickupData = {
        volume,
        co2_level: co2,
        patient_id: patientId,
        error
      };

      await updateSampleWithPickupData(
        chipId,
        'Picked up. Ready for Analysis',
        sample.sample_type || '',
        pickupData
      );

      setShowPickupForm(false);
      if (onPickupComplete) {
        await onPickupComplete();
      }
    } catch (error) {
      console.error('Error processing pickup:', error);
    }
  };

  const renderEditableFields = () => (
    <div className="space-y-4 mt-4">
      <EditableField
        label="Chip ID"
        value={fields.chipId.value}
        onChange={(value) => handleFieldEdit('chipId', value)}
        error={!fields.chipId.isValid ? 'Invalid Chip ID format (PXXXXX)' : undefined}
        isEditing={isEditing}
        onStartEdit={handleChipIdEdit}
        warning={showChipIdWarning}
      />
      {showChipIdWarning && !fields.chipId.isEditing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded"
        >
          Warning: Changing the Chip ID of a registered sample should only be done if absolutely necessary.
        </motion.div>
      )}
      <EditableField
        label="Patient ID"
        value={fields.patientId.value}
        onChange={(value) => handleFieldEdit('patientId', value)}
        error={!fields.patientId.isValid ? 'Invalid Patient ID format' : undefined}
        isEditing={isEditing}
      />
      <EditableField
        label="Sample Type"
        value={fields.sampleType.value}
        onChange={(value) => handleFieldEdit('sampleType', value)}
        error={!fields.sampleType.isValid ? 'Please select a valid sample type' : undefined}
        isEditing={isEditing}
        type="select"
        options={['LC Positive', 'LC Negative']}
      />
      <EditableField
        label="Notes"
        value={fields.notes.value}
        onChange={(value) => handleFieldEdit('notes', value)}
        error={!fields.notes.isValid ? 'Notes must be 500 characters or less' : undefined}
        isEditing={isEditing}
        type="textarea"
        maxLength={500}
      />
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        ref={cardRef}
        layout
        initial={false}
        animate={{
          scale: isExpanded ? 1.02 : 1,
          zIndex: isExpanded ? 10 : 1,
        }}
        className={`relative rounded-lg shadow-md overflow-hidden
          ${isExpanded 
            ? 'bg-white dark:bg-gray-800 shadow-lg ring-2 ring-primary/20 dark:ring-primary/30' 
            : 'bg-white dark:bg-gray-700'
          }
          ${isEditing 
            ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
            : ''
          }
          transition-all duration-200 ease-in-out cursor-pointer`}
        onClick={handleCardClick}
      >
        <motion.div 
          className={`p-4 relative z-10 transition-colors duration-200
            ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {sample.chip_id}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-300">
                Sample Type: {sample.sample_type || 'Not specified'}
              </p>
              {sample.status === 'In Process' && (
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mt-2">
                  <p>Started: {sample.timestamp ? formatStartTime(sample.timestamp) : 'Not started'}</p>
                  <CountdownTimer
                    timestamp={sample.timestamp}
                    chipId={sample.chip_id}
                    sampleType={sample.sample_type || 'Unknown'}
                    currentStatus={sample.status}
                    onStatusUpdate={onPickupComplete}
                  />
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              {sample.status === 'In Process' && (
                <button
                  onClick={handleEditButtonClick}
                  className="px-3 py-1 text-sm bg-indigo-100 text-indigo-800 rounded-full 
                             hover:bg-indigo-700 hover:text-white 
                             dark:bg-indigo-900 dark:text-indigo-100 dark:hover:bg-indigo-600
                             transition-colors duration-200 ease-in-out
                             font-medium shadow-sm
                             flex items-center justify-center gap-1
                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                             dark:focus:ring-offset-gray-800"
                  aria-label="Edit sample"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-4 h-4"
                  >
                    <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
                  </svg>
                  {isEditing ? 'Editing' : 'Edit'}
                </button>
              )}
              {sample.status === 'Ready for Pickup' && (
                <button
                  onClick={() => setShowPickupForm(true)}
                  className="px-3 py-1 text-sm bg-accent-dark text-white rounded-full 
                           hover:bg-accent-light hover:text-accent-dark transition-colors font-bold"
                >
                  Pickup
                </button>
              )}
              {sample.status === 'Picked up. Ready for Analysis' && (
                <button
                  onClick={() => onUpdateStatus(sample.chip_id, 'Complete', sample.sample_type || '')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-full 
                           hover:bg-green-700 transition-colors font-bold"
                >
                  Complete
                </button>
              )}
            </div>
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-4 ${isEditing ? 'bg-white dark:bg-gray-800 p-4 rounded-lg' : ''}`}
            >
              {renderEditableFields()}
              
              {/* Action buttons */}
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 flex justify-end space-x-3"
                >
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium rounded-lg
                             text-gray-700 dark:text-gray-300
                             bg-gray-100 dark:bg-gray-700
                             hover:bg-gray-200 dark:hover:bg-gray-600
                             border border-gray-200 dark:border-gray-600
                             transition-colors duration-200
                             focus:outline-none focus:ring-2 focus:ring-offset-2 
                             focus:ring-gray-500 dark:focus:ring-offset-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-white 
                             bg-primary hover:bg-primary-dark
                             rounded-lg transition-colors duration-200
                             disabled:opacity-50 disabled:cursor-not-allowed
                             focus:outline-none focus:ring-2 focus:ring-offset-2 
                             focus:ring-primary dark:focus:ring-offset-gray-800
                             flex items-center space-x-2"
                  >
                    {isSaving ? (
                      <>
                        <motion.svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </motion.svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
      <PickupForm
        chipId={sample.chip_id}
        patientId={sample.patient_id || 'Unknown'}
        isOpen={showPickupForm}
        onClose={() => setShowPickupForm(false)}
        onSubmit={handlePickupFormSubmit}
      />
    </AnimatePresence>
  );
} 