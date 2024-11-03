import { useEffect, useRef, useState } from 'react';
import SampleRegistrationForm from './SampleRegistrationForm';

// Remove type-only import and declare Html5QrcodeScanner as any temporarily
declare const Html5QrcodeScanner: any;

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (sampleData: {
    chip_id: string;
    patient_id: string;
    location: string;
  }) => Promise<void>;
}

export default function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [scannedChipId, setScannedChipId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Clean up any existing scanner
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }

    // Initialize new scanner
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        videoConstraints: {
          facingMode: { ideal: 'environment' }
        }
      },
      false
    );

    scanner.render(
      (decodedText: string) => {
        const chipIdMatch = decodedText.match(/P\d{5}/);
        if (chipIdMatch) {
          setScannedChipId(chipIdMatch[0]);
          setShowRegistrationForm(true);
          scanner.pause();
        } else {
          setError('Invalid QR code format. Expected chip ID format: PXXXXX');
        }
      },
      (error: string) => {
        console.warn('QR Code scanning error:', error);
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleRegistrationSubmit = async (sampleData: {
    chip_id: string;
    patient_id: string;
    location: string;
  }) => {
    try {
      await onScanSuccess(sampleData);
      setShowRegistrationForm(false);
      onClose();
    } catch (error) {
      console.error('Error submitting registration:', error);
      setError('Failed to register sample. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-xl">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Scan Sample QR Code
              </h2>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg">
                {error}
                <button 
                  onClick={() => setError(null)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div id="qr-reader" className="w-full" />

            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Position the QR code within the frame to scan
            </div>
          </div>
        </div>
      </div>

      {showRegistrationForm && (
        <SampleRegistrationForm
          isOpen={showRegistrationForm}
          onClose={() => {
            setShowRegistrationForm(false);
            scannerRef.current?.resume();
          }}
          onSubmit={handleRegistrationSubmit}
          initialChipId={scannedChipId || undefined}
        />
      )}
    </div>
  );
}
