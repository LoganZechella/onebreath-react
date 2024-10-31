import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import SampleRegistrationForm from './SampleRegistrationForm';

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
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2
        },
        false
      );

      scannerRef.current.render(
        (decodedText: string) => {
          const chipIdMatch = decodedText.match(/P\d{5}/);
          if (chipIdMatch) {
            setScannedChipId(chipIdMatch[0]);
            setShowRegistrationForm(true);
            if (scannerRef.current) {
              scannerRef.current.pause();
            }
          } else {
            setError('Invalid QR code format. Expected chip ID format: PXXXXX');
          }
        },
        (errorMessage: string) => {
          console.error("QR Scan error:", errorMessage);
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      setScannedChipId(null);
      setError(null);
      setShowRegistrationForm(false);
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
      setError('Failed to register sample. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 m-4 max-w-2xl w-full">
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

        <div id="qr-reader" className="w-full max-w-md mx-auto"></div>

        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Position the QR code within the frame to scan
        </div>

        <SampleRegistrationForm
          isOpen={showRegistrationForm}
          onClose={() => {
            setShowRegistrationForm(false);
            if (scannerRef.current) {
              scannerRef.current.resume();
            }
          }}
          onSubmit={handleRegistrationSubmit}
          initialChipId={scannedChipId || undefined}
        />
      </div>
    </div>
  );
}
