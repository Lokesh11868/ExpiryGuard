import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const BarcodeScanner = ({ onScan, onClose }) => {
  const html5QrCodeRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const startScanner = async () => {
    try {
      const element = document.getElementById("reader");
      if (!element) {
        setTimeout(startScanner, 200);
        return;
      }

      // Cleanup existing instance if any
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) { }
      }

      const html5QrCode = new Html5Qrcode("reader");
      html5QrCodeRef.current = html5QrCode;

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
      ];

      const config = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const width = Math.min(viewfinderWidth * 0.8, 300);
          const height = Math.min(viewfinderHeight * 0.4, 150);
          return { width, height };
        },
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      const successCallback = (decodedText) => {
        html5QrCode.stop().then(() => {
          onScan(decodedText);
        }).catch(() => {
          onScan(decodedText);
        });
      };

      // Try Environment Camera First
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          successCallback,
          () => { } // ignore scan errors
        );
      } catch (err) {
        console.warn("Environment camera failed, trying fallback...", err);
        // Fallback: Get all cameras and try the first one
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          await html5QrCode.start(
            cameras[0].id,
            config,
            successCallback,
            () => { }
          );
        } else {
          throw new Error("No cameras found on this device.");
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Scanner Error:", err);
      setError("Camera Error: " + (err.message || "Please ensure camera access is granted."));
      setLoading(false);
    }
  };

  useEffect(() => {
    // Small delay to ensure DOM is ready and any previous instances are cleared
    const timer = setTimeout(() => {
      startScanner();
    }, 800);

    return () => {
      clearTimeout(timer);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Cleanup error", err));
      }
    };
  }, []);

  const handleManualEntry = () => {
    const manualCode = prompt('Enter barcode:');
    if (manualCode && /^\d+$/.test(manualCode.trim())) {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().then(() => {
          onScan(manualCode.trim());
          onClose();
        }).catch(() => {
          onScan(manualCode.trim());
          onClose();
        });
      } else {
        onScan(manualCode.trim());
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card !bg-white p-8 max-w-sm w-full shadow-2xl relative flex flex-col items-center">
        <h2 className="mb-6 text-xl font-extrabold text-slate-900 tracking-tight uppercase tracking-widest">Live Scanner</h2>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm w-full text-center border border-red-200">
            {error}
            <button
              onClick={() => { setError(''); setLoading(true); startScanner(); }}
              className="mt-3 block w-full py-2 bg-red-600 text-white rounded-lg font-medium shadow-sm"
            >
              Retry Camera
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="mb-6 flex flex-col items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Initializing camera...</p>
          </div>
        )}

        <div className={`relative w-full overflow-hidden rounded-2xl bg-slate-900 aspect-video mb-8 ring-4 ring-slate-100 ${loading || error ? 'hidden' : 'block'}`}>
          <div id="reader" className="w-full h-full"></div>
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-4/5 h-2/5 border-2 border-dashed border-indigo-400/50 rounded-xl bg-indigo-500/10 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.2)]">
              <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,1)] animate-[scan_2.5s_ease-in-out_infinite]"></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleManualEntry}
            className="btn-premium w-full !bg-slate-900"
          >
            Manual Entry
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-colors py-2"
          >
            Close Scanner
          </button>
        </div>

        <p className="mt-5 text-sm text-gray-500 text-center font-medium">
          Align barcode in the center box
        </p>

        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes scan {
            0%, 100% { transform: translateY(-40px); }
            50% { transform: translateY(40px); }
          }
          #reader video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            border-radius: 12px;
          }
          #reader { border: none !important; }
        `}} />
      </div>
    </div>
  );
};

export default BarcodeScanner;