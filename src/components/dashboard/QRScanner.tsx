import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SampleRegistrationForm from './SampleRegistrationForm';

declare const Html5Qrcode: any;

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (sampleData: {
    chip_id: string;
    patient_id: string;
    sample_type: string;
  }) => Promise<void>;
}

// Add new styled components for the scanner overlay
const ScannerOverlay = () => (
  <div className="absolute inset-0 pointer-events-none">
    <div className="relative w-full h-full">
      {/* Scanning frame */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-72 sm:h-72">
        {/* Animated corners */}
        <div className="absolute left-0 top-0 w-12 h-12 border-l-4 border-t-4 border-primary animate-pulse"></div>
        <div className="absolute right-0 top-0 w-12 h-12 border-r-4 border-t-4 border-primary animate-pulse"></div>
        <div className="absolute left-0 bottom-0 w-12 h-12 border-l-4 border-b-4 border-primary animate-pulse"></div>
        <div className="absolute right-0 bottom-0 w-12 h-12 border-r-4 border-b-4 border-primary animate-pulse"></div>
        
        {/* Scanning line animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-0.5 bg-primary/50 animate-scanner-line"></div>
        </div>
      </div>
    </div>
  </div>
);

export default function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scannedChipId, setScannedChipId] = useState<string | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  const initializeScanner = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      const scanner = new Html5Qrcode("qr-reader");
      const cameras = await Html5Qrcode.getCameras();
      
      if (cameras && cameras.length > 0) {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText: string) => {
            try {
              const url = new URL(decodedText);
              const chipID = url.searchParams.get('chipID');
              
              if (chipID && /^P\d{5}$/.test(chipID)) {
                setScannedChipId(chipID);
                setShowRegistrationForm(true);
                await scanner.stop();
              }
            } catch (error) {
              setError('Invalid QR code format');
            }
          },
          undefined
        );
        
        scannerRef.current = scanner;
      }
    } catch (err) {
      setError('Failed to initialize camera');
    }
  }, []);

  const cleanup = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch (err) {
      console.warn('Cleanup warning:', err);
    } finally {
      setError(null);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    }
    return () => {
      cleanup();
    };
  }, [isOpen, initializeScanner, cleanup]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl">
            {showRegistrationForm ? (
              <SampleRegistrationForm
                isOpen={showRegistrationForm}
                chipId={scannedChipId || ''}
                initialChipId={scannedChipId || ''}
                onClose={() => {
                  setShowRegistrationForm(false);
                  onClose();
                }}
                onSubmit={onScanSuccess}
              />
            ) : (
              <div className="relative">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Scan Sample QR Code</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Scanner View */}
                <div className="relative aspect-[4/3] bg-black">
                  <div id="qr-reader" ref={videoRef} className="absolute inset-0" />
                  <ScannerOverlay />
                </div>

                {/* Controls */}
                <div className="p-4 flex justify-center">
                  <button 
                    onClick={() => {/* Add camera flip logic */}}
                    className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20"
                  >
                    Flip Camera
                  </button>
                </div>

                {error && (
                  <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
