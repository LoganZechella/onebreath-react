import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (chipId: string) => void;
}

export default function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen && !showManualEntry) {
      // Initialize scanner
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 1,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      // Start scanning
      scannerRef.current.render(
        (decodedText) => {
          // Extract chipId from URL
          const url = new URL(decodedText);
          const chipId = url.searchParams.get('chipID');
          if (chipId) {
            if (scannerRef.current) {
              scannerRef.current.clear();
            }
            onScanSuccess(chipId);
          }
        },
        (error) => {
          console.error('QR scan error:', error);
        }
      );
    }

    // Cleanup function
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isOpen, showManualEntry, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate__animated animate__fadeIn">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {showManualEntry ? 'Manual Entry' : 'Scan QR Code'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {showManualEntry ? (
          <ManualEntry
            onSubmit={onScanSuccess}
            onCancel={() => setShowManualEntry(false)}
          />
        ) : (
          <>
            <div 
              id="qr-reader" 
              className="w-full max-w-sm mx-auto"
            />
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowManualEntry(true)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
              >
                Manual Entry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ManualEntryProps {
  onSubmit: (chipId: string) => void;
  onCancel: () => void;
}

function ManualEntry({ onSubmit, onCancel }: ManualEntryProps) {
  const [chipId, setChipId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(chipId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label 
          htmlFor="chipId" 
          className="block text-sm font-medium text-gray-700"
        >
          Chip ID
        </label>
        <input
          type="text"
          id="chipId"
          value={chipId}
          onChange={(e) => setChipId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
                   focus:border-primary focus:ring-primary"
          required
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition-colors"
        >
          Submit
        </button>
      </div>
    </form>
  );
}
