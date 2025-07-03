export interface QRScannerProps {
  /** Callback with decoded data once a scan succeeds */
  onScanSuccess: (data: string) => void;
  /** Optional error handler when decoding fails */
  onScanError?: (error: string) => void;
}