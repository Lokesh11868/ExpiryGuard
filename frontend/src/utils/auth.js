export const setAuthToken = (token) => localStorage.setItem('token', token);
export const getAuthToken = () => localStorage.getItem('token');
export const removeAuthToken = () => localStorage.removeItem('token');