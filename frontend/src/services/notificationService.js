import api from '../utils/api';

export async function setSchedulerTime(hour, minute) {
  const response = await api.post('/scheduler/time', { hour, minute });
  return response.data;
}

// Get current notification scheduler time for the logged-in user
export async function getSchedulerTime() {
  const response = await api.get('/scheduler/time');
  return response.data;
}

// Service to enable/disable notifications on the backend
export async function setNotificationsOn(on) {
  const endpoint = on ? '/notifications/on' : '/notifications/off';
  const response = await api.post(endpoint);
  return response.data;
}
