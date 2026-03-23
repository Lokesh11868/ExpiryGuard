import api from '../utils/api';

export const getProducts = async () => {
  const response = await api.get('/get-items');
  return response.data;
};

export const addProduct = async (data) => {
  const response = await api.post('/add-item', data);
  return response.data;
};

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteProduct = async (productId) => {
  await api.delete(`/delete-item/${productId}`);
};

export const batchDelete = async (productIds) => {
  const response = await api.post('/batch-delete', { ids: productIds });
  return response.data;
};

export const batchStatusUpdate = async (productIds, status) => {
  const response = await api.post('/batch-status', { ids: productIds, status });
  return response.data;
};

export const getStatistics = async () => {
  const response = await api.get('/statistics');
  return response.data;
};

export const sendExpiryAlerts = async () => {
  const response = await api.post('/send-expiry-alerts');
  return response.data;
};

export const getProductByBarcode = async (barcode) => {
  try {
    const response = await api.get(`/product-by-barcode/${barcode}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const parseVoice = async (transcript) => {
  const response = await api.post('/parse-voice', { transcript });
  return response.data;
};

export const categorizeProduct = async (product_name) => {
  const response = await api.post('/categorize-product', { product_name });
  return response.data;
};