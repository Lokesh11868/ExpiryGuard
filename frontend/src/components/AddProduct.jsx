import { useState } from 'react';
import BarcodeScanner from './BarcodeScanner';
import ScanningTools from './AddProductFields/ScanningTools';
import ProductFormFields from './AddProductFields/ProductFormFields';
import { useProductForm } from '../hooks/useProductForm';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

const AddProduct = () => {
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const {
    formData,
    setFormData,
    isUploading,
    isLoadingBarcode,
    scannedProductInfo,
    useBestBefore,
    setUseBestBefore,
    manufacturingDate,
    setManufacturingDate,
    bestBeforeMonths,
    setBestBeforeMonths,
    calculatedExpiryDate,
    handleFormSubmit,
    handleImageUpload,
    handleBarcodeScanned
  } = useProductForm();

  const {
    isListening,
    voiceTranscript,
    audioLevel,
    isProcessingVoice,
    handleMicClick
  } = useVoiceRecognition((voiceData) => {
    setFormData(prev => ({ ...prev, ...voiceData }));
  });

  return (
    <>
      <div className="max-w-6xl mx-auto py-8">
        <div className="mb-10 text-center lg:text-left px-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Add New Product</h1>
          <p className="text-slate-500 mt-2 text-lg">Use scanning tools or enter details manually.</p>
        </div>

        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <ScanningTools
            onBarcodeOpen={() => setShowBarcodeScanner(true)}
            isLoadingBarcode={isLoadingBarcode}
            barcode={formData.barcode}
            scannedProductInfo={scannedProductInfo}
            onImageUpload={handleImageUpload}
            isUploading={isUploading}
            imageUrl={formData.image_url}
          />

          <ProductFormFields
            formData={formData}
            setFormData={setFormData}
            isListening={isListening}
            handleMicClick={handleMicClick}
            audioLevel={audioLevel}
            voiceTranscript={voiceTranscript}
            isProcessingVoice={isProcessingVoice}
            useBestBefore={useBestBefore}
            setUseBestBefore={setUseBestBefore}
            manufacturingDate={manufacturingDate}
            setManufacturingDate={setManufacturingDate}
            bestBeforeMonths={bestBeforeMonths}
            setBestBeforeMonths={setBestBeforeMonths}
            calculatedExpiryDate={calculatedExpiryDate}
          />
        </form>
      </div>

      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </>
  );
};

export default AddProduct;


