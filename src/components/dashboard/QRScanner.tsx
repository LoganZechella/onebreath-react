import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SampleRegistrationForm from './SampleRegistrationForm';

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
  const [cameraStarted, setCameraStarted] = useState(false);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let scanner: any = null;

    const initializeScanner = async () => {
      if (!isOpen) return;

      try {
        // Clean up any existing scanner
        if (scannerRef.current) {
          await scannerRef.current.clear();
          scannerRef.current = null;
        }

        // Request camera permission
        await navigator.mediaDevices.getUserMedia({ video: true });

        // Initialize scanner
        scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: window.innerWidth < 640 ? { width: 200, height: 200 } : { width: 250, height: 250 },
            aspectRatio: window.innerWidth < 640 ? 4/3 : 16/9,
            videoConstraints: {
              facingMode: { ideal: 'environment' },
              width: { min: 640, ideal: window.innerWidth < 640 ? 1280 : 1920, max: 1920 },
              height: { min: 480, ideal: window.innerWidth < 640 ? 960 : 1080, max: 1080 }
            },
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: window.innerWidth < 640 ? 1.5 : 2,
            hideMotivationalMessage: true,
            verbose: false
          },
          false
        );

        await scanner.render(
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
          (errorMessage: string) => {
            if (errorMessage.includes('permission')) {
              setError('Camera access denied. Please grant permission and try again.');
            }
          }
        );

        scannerRef.current = scanner;
        setCameraStarted(true);
      } catch (err) {
        console.error('Camera permission error:', err);
        setError('Camera access denied. Please grant permission and try again.');
      }
    };

    if (isOpen) {
      const qrContainer = document.getElementById('qr-reader-container');
      if (qrContainer) {
        qrContainer.innerHTML = '<div id="qr-reader"></div>';
        initializeScanner();
      }
    }

    return () => {
      const cleanup = async () => {
        if (scannerRef.current) {
          try {
            await scannerRef.current.clear();
            scannerRef.current = null;
          } catch (err) {
            console.error('Error cleaning up scanner:', err);
          }
        }
        const qrContainer = document.getElementById('qr-reader-container');
        if (qrContainer) {
          qrContainer.innerHTML = '';
        }
        setCameraStarted(false);
        setError(null);
      };
      cleanup();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative h-full flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-lg sm:rounded-2xl shadow-xl overflow-hidden">
          <div className="p-3 sm:p-6">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Scan Sample QR Code
              </h2>
              <button 
                onClick={onClose}
                className="p-1 sm:p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 sm:p-4 bg-red-50 text-red-800 rounded-lg text-sm sm:text-base">
                {error}
                <button 
                  onClick={() => {
                    setError(null);
                    if (scannerRef.current) {
                      scannerRef.current.resume();
                    }
                  }}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  Try Again
                </button>
              </div>
            )}

            <div className="relative">
              <div id="qr-reader-mount" className="w-full aspect-[4/3] sm:aspect-video max-h-[80vh] mx-auto rounded-lg overflow-hidden">
                {!cameraStarted && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-8 bg-gray-100 dark:bg-gray-900 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary mb-3 sm:mb-4"></div>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      Starting camera...
                    </p>
                  </div>
                )}
                <div id="qr-reader" className="w-full h-full bg-black rounded-lg"></div>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
            if (scannerRef.current) {
              scannerRef.current.resume();
            }
          }}
          onSubmit={onScanSuccess}
          initialChipId={scannedChipId || undefined}
        />
      )}
    </div>,
    document.body
  );
}
