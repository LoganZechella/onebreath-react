declare global {
  class Html5QrcodeScanner {
    constructor(
      elementId: string,
      config: {
        fps: number;
        qrbox: { width: number; height: number };
        aspectRatio?: number;
        videoConstraints?: {
          facingMode?: { ideal: string };
        };
      },
      verbose: boolean
    );
    render(
      successCallback: (decodedText: string) => void,
      errorCallback: (errorMessage: string) => void
    ): void;
    clear(): void;
    pause(): void;
    resume(): void;
  }
}

export {}; 