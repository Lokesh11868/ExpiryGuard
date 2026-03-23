import { Barcode, Camera, Scan, Upload } from 'lucide-react';

const ScanningTools = ({
    onBarcodeOpen,
    isLoadingBarcode,
    barcode,
    scannedProductInfo,
    onImageUpload,
    isUploading,
    imageUrl
}) => {
    return (
        <div className="glass-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Scanning Tools</h2>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                </div>
            </div>

            {/* Barcode Scanner Section */}
            <div className="border border-dashed border-slate-200 rounded-xl p-5 hover:border-indigo-400 hover:bg-slate-50 transition-all duration-300 group">
                <div className="text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Barcode className="h-6 w-6 text-slate-400 group-hover:text-indigo-500" />
                    </div>
                    <div className="text-lg font-bold text-slate-800 mb-1">Barcode Scan</div>
                    <div className="text-xs text-slate-500 mb-4 max-w-[200px] mx-auto leading-relaxed">
                        Quick identification via camera.
                    </div>
                    <button
                        type="button"
                        onClick={onBarcodeOpen}
                        disabled={isLoadingBarcode}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 transition-all shadow-md inline-flex items-center space-x-2 disabled:opacity-50 text-sm font-bold"
                    >
                        <Camera className="h-4 w-4" />
                        <span>{isLoadingBarcode ? 'Scanning...' : 'Open Camera'}</span>
                    </button>

                    {barcode && (
                        <div className="mt-3 p-1.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-mono font-bold text-indigo-700">
                            ID: {barcode}
                        </div>
                    )}

                    {scannedProductInfo && (
                        <div className="mt-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-left animate-in slide-in-from-bottom-1">
                            <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Match</div>
                            <div className="text-xs font-bold text-slate-800 truncate">{scannedProductInfo.product_name}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Image Upload Section */}
            <div className="border border-dashed border-slate-200 rounded-xl p-5 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 group">
                <label className="flex flex-col items-center cursor-pointer">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                            <Scan className="h-6 w-6 text-slate-400 group-hover:text-indigo-500" />
                        </div>
                        <div className="text-lg font-bold text-slate-800 mb-1">Visual OCR</div>
                        <div className="text-xs text-slate-500 mb-4 max-w-[200px] mx-auto">
                            Extract data from labels.
                        </div>
                        <div className="bg-slate-100 text-slate-800 border border-slate-200 px-6 py-2 rounded-lg hover:bg-slate-200 transition-all inline-flex items-center space-x-2 text-sm font-bold">
                            <Upload className="h-4 w-4" />
                            <span>{isUploading ? '...' : 'Upload'}</span>
                        </div>
                    </div>
                    <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        capture="environment"
                        onChange={onImageUpload}
                        disabled={isUploading}
                    />
                </label>

                {isUploading && (
                    <div className="mt-3 text-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
                    </div>
                )}

                {imageUrl && !isUploading && (
                    <div className="mt-3 relative rounded-lg overflow-hidden border-2 border-white shadow-sm">
                        <img src={imageUrl} alt="Product" className="w-full h-24 object-cover" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScanningTools;


