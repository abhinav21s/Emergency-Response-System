import React from 'react';
import ReactDOM from 'react-dom/client';
// CSS imports are now handled in App.js
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import axios from 'axios';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
// CSS imports are now consolidated in App.js

// Override console.error to suppress network errors
const originalConsoleError = console.error;
console.error = function(message, ...args) {
  // Check if it's a network error or API-related error
  if (typeof message === 'string' && (
    message.includes('Network Error') || 
    message.includes('Failed to fetch') ||
    message.includes('ECONNREFUSED') ||
    message.includes('api/auth/verify')
  )) {
    console.log('API server not available - UI only mode');
    return;
  }
  
  // For React errors related to API calls
  if (args.length > 0 && args[0] && typeof args[0] === 'object') {
    if (args[0].message && (
      args[0].message.includes('Network Error') ||
      args[0].message.includes('Failed to fetch') ||
      args[0].message.includes('ECONNREFUSED')
    )) {
      console.log('API server not available - UI only mode');
      return;
    }
  }
  
  // Pass through all other errors
  originalConsoleError.apply(console, [message, ...args]);
};

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:5000/api';
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Add axios interceptor to handle network errors silently
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
      console.log('API server not available - UI only mode');
      return Promise.resolve({ 
        data: { valid: false, uiOnlyMode: true },
        status: 200
      });
    }
    return Promise.reject(error);
  }
);

// Check if server is available
const checkServerConnectivity = async () => {
  try {
    await axios.get('/api/auth/verify', { timeout: 1000 });
    console.log('API server is available');
  } catch (error) {
    console.log('API server not available - UI only mode');
  }
};

// Run connectivity check
checkServerConnectivity();

// Add a global error handler to prevent console errors
window.addEventListener('error', (event) => {
  // Check if it's a network error related to the API
  if (event.message && (
    event.message.includes('Network Error') || 
    event.message.includes('Failed to fetch') ||
    event.message.includes('ECONNREFUSED') ||
    event.message.includes('api/auth/verify')
  )) {
    // Prevent the error from showing in console
    event.preventDefault();
    console.log('API server not available - UI only mode');
    return true; // Prevents the error from propagating
  }
});

// Prevent unhandled promise rejections related to API calls
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
    (event.reason.message && (
      event.reason.message.includes('Network Error') ||
      event.reason.message.includes('Failed to fetch') ||
      event.reason.message.includes('ECONNREFUSED')
    )) ||
    (typeof event.reason === 'string' && event.reason.includes('api/auth/verify'))
  )) {
    event.preventDefault();
    console.log('API server not available - UI only mode');
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <App />
          <ToastContainer position="top-right" autoClose={5000} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
