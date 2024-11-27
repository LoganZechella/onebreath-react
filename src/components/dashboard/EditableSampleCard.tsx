import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sample } from '../../types';
import EditableField from './EditableField';
import CountdownTimer from './CountdownTimer';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
          setIsExpanded(false);
        }
      });
    }
  }, []);

  useEffect(() => {
    console.log('Expansion state changed:', isExpanded);
  }, [isExpanded]);

  const handleCardClick = () => {
    console.log('Card clicked');
    if (!isExpanded) {
      console.log('Expanding card');
      setIsExpanded(true);
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
    setFields(prev => ({
      ...prev,
      chipId: { ...prev.chipId, isEditing: false }
    }));
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
      onPickupComplete?.();
    } catch (error) {
      toast.error('Failed to save changes');
      console.error('Error saving changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await onUpdateStatus(sample.chip_id, newStatus, sample.sample_type || '');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
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

  const renderEditableFields = () => (
    <div className="space-y-4 mt-4">
      <EditableField
        label="Chip ID"
        value={fields.chipId.value}
        onChange={(value) => handleFieldEdit('chipId', value)}
        error={!fields.chipId.isValid ? 'Invalid Chip ID format (PXXXXX)' : undefined}
        isEditing={fields.chipId.isEditing}
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
          Click again to edit.
        </motion.div>
      )}
      <EditableField
        label="Patient ID"
        value={fields.patientId.value}
        onChange={(value) => handleFieldEdit('patientId', value)}
        error={!fields.patientId.isValid ? 'Invalid Patient ID format (BDx-XXX)' : undefined}
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
          zIndex: isExpanded ? 10 : 1
        }}
        className={`relative bg-white dark:bg-gray-700 rounded-lg shadow-md 
                   ${isExpanded ? 'shadow-xl' : ''} overflow-hidden cursor-pointer`}
        onClick={handleCardClick}
      >
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-0"
            onClick={() => {
              if (!isEditing) {
                setIsExpanded(false);
              }
            }}
          />
        )}

        <motion.div 
          className="p-4 relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Original card content */}
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
                  onClick={() => handleStatusUpdate('Ready for Pickup')}
                  className="px-3 py-1 text-sm bg-accent-light text-accent-dark rounded-full hover:bg-accent-dark hover:text-white transition-colors"
                >
                  &#10004;
                </button>
              )}
              {sample.status === 'Ready for Pickup' && (
                <button
                  onClick={() => handleStatusUpdate('Picked up. Ready for Analysis')}
                  className="px-3 py-1 text-sm bg-accent-dark text-white rounded-full hover:bg-accent-light hover:text-accent-dark transition-colors font-bold"
                >
                  Pickup
                </button>
              )}
              {sample.status === 'Picked up. Ready for Analysis' && (
                <button
                  onClick={() => handleStatusUpdate('Complete')}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors font-bold"
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
              className="mt-4"
            >
              {renderEditableFields()}
              
              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 flex justify-end space-x-3"
              >
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800
                               dark:text-gray-300 dark:hover:text-gray-100 rounded-lg
                               hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary
                               hover:bg-primary-dark rounded-lg transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed
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
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-dark
                             dark:text-primary-light dark:hover:text-primary transition-colors
                             rounded-lg hover:bg-primary/10"
                  >
                    Edit Sample
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 