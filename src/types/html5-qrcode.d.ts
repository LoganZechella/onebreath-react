declare global {
  interface Html5QrcodeResult {
    decodedText: string;
    result: {
      text: string;
    };
  }

  class Html5Qrcode {
    stop(): Promise<void>;
    clear(): void;
  }

  class Html5QrcodeScanner {
    constructor(
      elementId: string,
      config: {
        fps: number;
        qrbox: { width: number; height: number };
        aspectRatio?: number;
        videoConstraints?: {
          facingMode?: { ideal: string };
          width?: { min: number; ideal: number; max: number };
          height?: { min: number; ideal: number; max: number };
        };
        showTorchButtonIfSupported?: boolean;
        showZoomSliderIfSupported?: boolean;
        defaultZoomValueIfSupported?: number;
        hideMotivationalMessage?: boolean;
      },
      verbose: boolean
    );
    
    render(
      successCallback: (decodedText: string, result?: Html5QrcodeResult) => void | Promise<void>,
      errorCallback: (errorMessage: string, error?: Error) => void
    ): Promise<void>;
    
    clear(): Promise<void>;
    
    getState(): {
      html5Qrcode: Html5Qrcode;
    };
  }
}

export {}; 