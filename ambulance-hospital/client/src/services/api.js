import axios from 'axios';

// Create a connection status tracker
let retryCount = 0;
const maxRetries = 3;

// Centralized API configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:5001/api/', // Added a trailing slash
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_CONFIG.TIMEOUT, // 10 seconds timeout
  withCredentials: true, // Include credentials in cross-origin requests
});

// Add request interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Function to check server connection
const checkServerConnection = async () => {
  try {
    // Try to connect to the health endpoint
    await axios.get(`${API_CONFIG.BASE_URL}health`, { 
      timeout: 3000,
      withCredentials: true
    });
    console.log('Server connection confirmed');
    return true;
  } catch (error) {
    console.warn('Server connection check failed:', error.message);
    return false;
  }
};

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle unauthorized errors (401)
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Handle network errors with retry logic
    if (error.code === 'ERR_NETWORK' && retryCount < maxRetries) {
      retryCount++;
      console.log(`Network error, retrying (${retryCount}/${maxRetries})...`);
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * 2 ** retryCount, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Check server connection
      const isConnected = await checkServerConnection();
      if (isConnected) {
        // Retry the original request
        return api(error.config);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
};

// Hospital API
export const hospitalAPI = {
  getProfile: () => api.get('/hospitals/profile'),
  updateProfile: (data) => api.put('/hospitals/profile', data),
  getDoctors: () => api.get('/hospitals/doctors'),
  addDoctor: (doctorData) => api.post('/hospitals/doctors', doctorData),
  updateDoctor: (id, doctorData) => api.put(`/hospitals/doctors/${id}`, doctorData),
  deleteDoctor: (id) => api.delete(`/hospitals/doctors/${id}`),
  toggleAcceptingEmergencies: (status) => api.put('/hospitals/status', { acceptingEmergencies: status }),
  getEmergencyRequests: () => api.get('/hospitals/emergency-requests'),
  respondToEmergency: (emergencyId, response) => api.put(`/hospitals/emergency-requests/${emergencyId}`, response),
};

// Ambulance API
export const ambulanceAPI = {
  getProfile: () => api.get('/ambulances/profile'),
  updateProfile: (data) => api.put('/ambulances/profile', data),
  getNearbyHospitals: (coordinates) => api.get('/ambulances/hospitals', { params: coordinates }),
  requestEmergency: (emergencyData) => api.post('/ambulances/emergency', emergencyData),
  getEmergencyDetails: (id) => api.get(`/ambulances/emergency/${id}`),
  updateEmergencyStatus: (id, status) => api.put(`/ambulances/emergency/${id}/status`, { status }),
};

// Stats API
export const statsAPI = {
  getStats: () => api.get('/stats'),
};



// Export connection status for components to use
export const serverStatus = {
  isConnected: () => true, // Always return true since we've removed offline mode
  checkConnection: checkServerConnection
};

export default api;
