import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SampleRegistrationForm from './SampleRegistrationForm';

declare const Html5QrcodeScanner: any;

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
        <div className="absolute left-0 top-0 w-8 h-8 border-l-2 border-t-2 border-primary animate-pulse"></div>
        <div className="absolute right-0 top-0 w-8 h-8 border-r-2 border-t-2 border-primary animate-pulse"></div>
        <div className="absolute left-0 bottom-0 w-8 h-8 border-l-2 border-b-2 border-primary animate-pulse"></div>
        <div className="absolute right-0 bottom-0 w-8 h-8 border-r-2 border-b-2 border-primary animate-pulse"></div>
        
        {/* Scanning line animation */}
        <div className="absolute left-0 right-0 h-0.5 bg-primary/50 animate-scanner-line"></div>
      </div>
    </div>
  </div>
);

export default function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [scannedChipId, setScannedChipId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const scannerRef = useRef<any>(null);

  const cleanup = useCallback(async () => {
    if (isCleaningUp) return;
    
    setIsCleaningUp(true);
    
    try {
      if (scannerRef.current) {
        // Get the scanner instance
        const scanner = scannerRef.current;
        
        try {
          // First stop the video stream
          const html5QrcodeScanner = scanner.getState()?.html5Qrcode;
          if (html5QrcodeScanner) {
            await html5QrcodeScanner.stop();
          }
        } catch (stopError) {
          console.warn('Stop error (non-critical):', stopError);
        }

        try {
          // Then clear the UI
          await scanner.clear();
        } catch (clearError) {
          console.warn('Clear error (non-critical):', clearError);
        }

        scannerRef.current = null;
      }
    } catch (err) {
      console.warn('Cleanup warning:', err);
    } finally {
      // Reset states
      setCameraStarted(false);
      setError(null);
      setIsCleaningUp(false);
    }
  }, [isCleaningUp]);

  // Handle cleanup when modal closes
  useEffect(() => {
    if (!isOpen && !isCleaningUp) {
      cleanup();
    }
  }, [isOpen, cleanup, isCleaningUp]);

  const initializeScanner = useCallback(async () => {
    if (!isOpen || isCleaningUp) return;

    try {
      await cleanup();
      await new Promise(resolve => setTimeout(resolve, 100));

      const scanner = new Html5QrcodeScanner(
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
        true
      );

      await scanner.render(
        async (decodedText: string) => {
          try {
            const url = new URL(decodedText);
            const chipID = url.searchParams.get('chipID');
            
            if (chipID && /^P\d{5}$/.test(chipID)) {
              setScannedChipId(chipID);
              setShowRegistrationForm(true);
              
              try {
                const html5QrcodeScanner = scanner.getState()?.html5Qrcode;
                if (html5QrcodeScanner) {
                  await html5QrcodeScanner.stop();
                }
              } catch (stopError) {
                console.warn('Error stopping scanner after successful scan:', stopError);
              }
            } else {
              setError('Invalid QR code format. Expected URL with chipID parameter in format PXXXXX');
            }
          } catch (urlError) {
            setError('Invalid QR code format. Expected valid URL with chipID parameter');
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
      console.error('Camera initialization error:', err);
      setError('Failed to initialize camera. Please try again.');
    }
  }, [isOpen, cleanup, isCleaningUp]);

  // Handle the close button click
  const handleClose = useCallback(async () => {
    if (!isCleaningUp) {
      await cleanup();
      onClose();
    }
  }, [cleanup, onClose, isCleaningUp]);

  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      // After getting permission, reinitialize the scanner
      initializeScanner();
    } catch (err) {
      setError('Camera access denied. Please grant permission and try again.');
    }
  };

  useEffect(() => {
    if (isOpen && !isCleaningUp) {
      initializeScanner();
    }

    return () => {
      if (!isCleaningUp) {
        cleanup();
      }
    };
  }, [isOpen, cleanup, isCleaningUp, initializeScanner]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
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
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      )}
      <div className="relative h-full flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header with improved contrast and spacing */}
          <div className="relative px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Scan Sample QR Code
            </h2>
            <button 
              onClick={handleClose}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close scanner"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scanner container with proper padding and aspect ratio */}
          <div className="p-6 flex-1 flex flex-col min-h-0">
            <div className="relative bg-black rounded-lg overflow-hidden shadow-inner">
              <div className="aspect-[4/3] w-full">
                {!cameraStarted && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90">
                    <button
                      onClick={requestCameraPermission}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Request Camera Permissions
                    </button>
                    <p className="mt-4 text-sm text-gray-200">Camera access required for scanning</p>
                  </div>
                )}
                <div id="qr-reader" className="w-full h-full" />
                <ScannerOverlay />
              </div>
            </div>

            {/* Controls with improved styling */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <button 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                <span className="font-medium">Flip Camera</span>
              </button>
            </div>

            {/* Error message handling */}
            {error && (
              <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
