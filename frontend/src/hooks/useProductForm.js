import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { addProduct, uploadImage, getProductByBarcode, categorizeProduct } from '../services/productService';
import { isValidDate } from '../utils/dateUtils';

export const useProductForm = () => {
    const [formData, setFormData] = useState({
        product_name: '',
        expiry_date: '',
        image_url: '',
        barcode: '',
        category: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingBarcode, setIsLoadingBarcode] = useState(false);
    const [scannedProductInfo, setScannedProductInfo] = useState(null);

    // Date Calculator State
    const [useBestBefore, setUseBestBefore] = useState(false);
    const [manufacturingDate, setManufacturingDate] = useState('');
    const [bestBeforeMonths, setBestBeforeMonths] = useState('');
    const [calculatedExpiryDate, setCalculatedExpiryDate] = useState('');

    const resetForm = () => {
        setFormData({ product_name: '', expiry_date: '', image_url: '', barcode: '', category: '' });
        setScannedProductInfo(null);
        setUseBestBefore(false);
        setManufacturingDate('');
        setBestBeforeMonths('');
        setCalculatedExpiryDate('');
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.product_name || !formData.category || (!formData.expiry_date && !useBestBefore)) {
            return toast.error('Please fill in Name, Category, and Expiry Date');
        }
        if (useBestBefore && (!manufacturingDate || !bestBeforeMonths)) {
            return toast.error('Please enter manufacturing date and best before months');
        }
        try {
            await addProduct(formData);
            toast.success('Product added successfully!');
            resetForm();
        } catch {
            toast.error('Failed to add product');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error('Image size should be less than 5MB');
        setIsUploading(true);
        try {
            const response = await uploadImage(file);
            setFormData(prev => ({
                ...prev,
                image_url: response.image_url,
                expiry_date: response.expiry_date || prev.expiry_date
            }));
            if (response.best_before_months) {
                setBestBeforeMonths(response.best_before_months);
                setUseBestBefore(true);
                toast.success(`Best before ${response.best_before_months} months detected! Please enter manufacturing date.`);
            }
            if (response.expiry_date) toast.success('Expiry date extracted successfully!');
        } catch {
            toast.error('Failed to process image');
        } finally {
            setIsUploading(false);
        }
    };

    const handleBarcodeScanned = async (barcode) => {
        setIsLoadingBarcode(true);
        try {
            const productData = await getProductByBarcode(barcode);
            setFormData(f => ({
                ...f,
                barcode,
                product_name: productData?.product_name || f.product_name,
                category: productData?.category || f.category
            }));
            setScannedProductInfo(productData || null);
            toast.success(productData ? `Product found: ${productData.product_name}` : 'Barcode scanned!');
        } catch {
            setFormData(f => ({ ...f, barcode }));
            setScannedProductInfo(null);
            toast.info('Barcode scanned! Enter details manually.');
        } finally {
            setIsLoadingBarcode(false);
        }
    };

    // Auto-calculation
    useEffect(() => {
        if (useBestBefore && manufacturingDate && bestBeforeMonths && manufacturingDate.length === 10 && isValidDate(manufacturingDate)) {
            try {
                const [day, month, year] = manufacturingDate.split('/').map(Number);
                const mfgDate = new Date(year, month - 1, day);
                const expiryDate = new Date(mfgDate);
                expiryDate.setMonth(expiryDate.getMonth() + parseInt(bestBeforeMonths));
                const formattedDate = expiryDate.toLocaleDateString('en-GB');
                setCalculatedExpiryDate(formattedDate);
                setFormData(f => ({ ...f, expiry_date: formattedDate }));
            } catch {
                setCalculatedExpiryDate('');
            }
        } else if (useBestBefore) {
            setCalculatedExpiryDate('');
        }
    }, [useBestBefore, manufacturingDate, bestBeforeMonths]);

    // Auto-categorization
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.product_name && formData.product_name.length > 2 && (!formData.category || formData.category === 'Other')) {
                categorizeProduct(formData.product_name).then(data => {
                    if (data.category && data.category !== 'Other') {
                        setFormData(f => ({ ...f, category: data.category }));
                        toast.success(`Category detected: ${data.category}`);
                    }
                });
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [formData.product_name]);

    return {
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
    };
};


