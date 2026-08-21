import axios from 'axios';

// Centralized API configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:5001/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Export the API config for use in other files
export { API_CONFIG };

// Create axios instance with default config
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true, // Important for CORS
  timeout: API_CONFIG.TIMEOUT,
  // Retry logic for failed requests
  retry: API_CONFIG.RETRY_ATTEMPTS,
  retryDelay: API_CONFIG.RETRY_DELAY
});

// Set default axios config for all direct axios calls
axios.defaults.baseURL = API_CONFIG.BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;
axios.defaults.timeout = API_CONFIG.TIMEOUT;

// Create a fallback instance that uses relative URLs
const fallbackApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true,
  timeout: 10000
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add it to headers
    if (token) {
      config.headers['x-auth-token'] = token;
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor with retry logic
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  async (error) => {
    const { config } = error;
    
    // Only retry on network errors or 5xx server errors
    if (!error.response || (error.response.status >= 500 && error.response.status < 600)) {
      // Set retry count if it doesn't exist
      config.retryCount = config.retryCount || 0;
      
      // Check if we should retry the request
      if (config.retryCount < (config.retry || 3)) {
        config.retryCount += 1;
        console.log(`Retrying request (${config.retryCount}/${config.retry || 3}): ${config.url}`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, config.retryDelay || 1000));
        
        // Try with fallback if this is the last retry and we're using absolute URL
        if (config.retryCount === (config.retry || 3) && config.url.includes(API_CONFIG.BASE_URL)) {
          console.log('Switching to relative URL for final retry attempt');
          // Convert absolute URL to relative
          const relativeUrl = config.url.replace(API_CONFIG.BASE_URL, '');
          return fallbackApi({
            ...config,
            url: relativeUrl
          });
        }
        
        return api(config);
      }
    }
    
    // Handle response errors
    if (error.response) {
      console.error('API Error:', {
        url: error.config.url,
        status: error.response.status,
        message: error.response.data?.message || error.message
      });
    } else if (error.request) {
      console.error('API Error: No response received', error.request);
    } else {
      console.error('API Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Apply the same interceptor to fallbackApi
fallbackApi.interceptors.response.use(
  api.interceptors.response.handlers[0].fulfilled,
  api.interceptors.response.handlers[0].rejected
);

export { fallbackApi };
export default api;
