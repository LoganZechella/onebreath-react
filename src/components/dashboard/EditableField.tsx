import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onStartEdit?: () => void;
  error?: string;
  isEditing: boolean;
  type?: 'text' | 'textarea' | 'select';
  options?: string[];
  maxLength?: number;
  warning?: boolean;
}

export default function EditableField({
  label,
  value,
  onChange,
  onStartEdit,
  error,
  isEditing,
  type = 'text',
  options = [],
  maxLength,
  warning = false
}: EditableFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing && isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing, isFocused]);

  const handleClick = () => {
    if (!isEditing) {
      onStartEdit?.();
      setIsFocused(true);
    }
  };

  const renderInput = () => {
    const baseClassName = `w-full px-3 py-2 rounded-lg border 
                          ${error ? 'border-red-500' : 'border-gray-300'} 
                          ${warning ? 'border-yellow-500' : ''}
                          focus:ring-2 focus:ring-primary/20 
                          dark:bg-gray-700 dark:border-gray-600
                          dark:text-white transition-colors duration-200`;

    if (type === 'textarea') {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClassName} resize-none`}
          rows={3}
          maxLength={maxLength}
          readOnly={!isEditing}
        />
      );
    }

    if (type === 'select') {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseClassName}
          disabled={!isEditing}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseClassName}
        readOnly={!isEditing}
        maxLength={maxLength}
      />
    );
  };

  return (
    <div className="space-y-1" onClick={handleClick}>
      <div className="flex justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {maxLength && type === 'textarea' && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      {renderInput()}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
} 