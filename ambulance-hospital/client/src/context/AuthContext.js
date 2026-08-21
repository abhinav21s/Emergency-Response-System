import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import api, { API_CONFIG } from '../services/api';

// Toast configuration to prevent duplicates and ensure they disappear automatically
const TOAST_CONFIG = {
  toastId: 'auth-toast', // Use the same ID to prevent duplicates
  autoClose: 1500, // Close faster (1.5 seconds)
  hideProgressBar: true, // Hide the progress bar
  closeOnClick: true,
  pauseOnHover: false, // Don't pause on hover
  draggable: true,
  position: 'bottom-right', // Position in bottom right
  theme: 'dark' // Use dark theme to match app style
};

// Create a custom axios instance for auth calls with proper base URL
const authAxios = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add an interceptor to silently handle network errors
authAxios.interceptors.response.use(
  response => response,
  error => {
    // Silently handle network errors without console errors
    if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
      console.log('API server not available - UI only mode');
      return Promise.resolve({ data: { valid: false, uiOnlyMode: true } });
    }
    return Promise.reject(error);
  }
);

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoLogin, setAutoLogin] = useState(false); // Disable auto-login by default
  const [apiAvailable, setApiAvailable] = useState(true);

  // Check API availability on mount
  useEffect(() => {
    const checkApiAvailability = async () => {
      try {
        // Try to connect to the API server with the correct port
        const response = await axios.get(`${API_CONFIG.BASE_URL}/health`, { 
          timeout: 3000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        if (response.status === 200) {
          console.log('API server is available');
          setApiAvailable(true);
        } else {
          console.log('API server returned non-200 status');
          setApiAvailable(false);
        }
      } catch (error) {
        console.log('API server not available:', error.message);
        setApiAvailable(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkApiAvailability();
  }, []);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        // If auto-login is disabled, don't attempt to load user from token
        if (!autoLogin) {
          // Clear any existing tokens to prevent auto-login
          localStorage.removeItem('hospital_token');
          localStorage.removeItem('ambulance_token');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete authAxios.defaults.headers.common['Authorization'];
          delete authAxios.defaults.headers.common['x-auth-token'];
          setLoading(false);
          return;
        }
        
        // Try to get role-specific tokens first, then fall back to the generic token
        const hospitalToken = localStorage.getItem('hospital_token');
        const ambulanceToken = localStorage.getItem('ambulance_token');
        const token = hospitalToken || ambulanceToken || localStorage.getItem('token');
        
        // Try to get cached user data
        const cachedUser = localStorage.getItem('user');
        
        if (!token) {
          setLoading(false);
          return;
        }
        
        // Set auth token headers for both direct axios and api instance
        authAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        authAxios.defaults.headers.common['x-auth-token'] = token;
        
        // If we have cached user data, use it immediately to prevent logout on refresh
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            setUser(parsedUser);
          } catch (e) {
            console.error('Error parsing cached user data:', e);
          }
        }
        
        // Check if API is available first
        try {
          // Verify token with explicit headers to ensure authentication
          const res = await authAxios.get('/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-auth-token': token
            },
            timeout: 5000 // Add a reasonable timeout
          }).catch(error => {
            // If verification fails but we have cached user data, still use it
            // This prevents logout on network issues or API unavailability
            console.log('Token verification failed, using cached data:', error.message);
            if (cachedUser) {
              return { data: { valid: true, user: JSON.parse(cachedUser) } };
            }
            throw error;
          });
          
          if (res.data && res.data.valid) {
            // Token is valid, set user data
            const userData = res.data.user;
            setUser(userData);
            
            // Update cached user data
            localStorage.setItem('user', JSON.stringify(userData));
          } else if (cachedUser) {
            // If token verification returned invalid but we have cached user data,
            // still use the cached data to prevent logout on temporary API issues
            console.log('Using cached user data as fallback');
            try {
              const parsedUser = JSON.parse(cachedUser);
              setUser(parsedUser);
            } catch (e) {
              console.error('Error parsing cached user data:', e);
              setUser(null);
            }
          } else {
            // No valid token and no cached data
            setUser(null);
          }
        } catch (error) {
          // Handle API connection errors by trying mock auth
          console.log("API server not available - trying mock authentication");
          setApiAvailable(false);
          
          // Try to verify with mock auth
          localStorage.removeItem('token');
          delete authAxios.defaults.headers.common['Authorization'];
          delete authAxios.defaults.headers.common['x-auth-token'];
        }
      } catch (error) {
        console.log("Auth verification error:", error.message);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, [autoLogin]);

  // Toggle auto login behavior
  const toggleAutoLogin = (value) => {
    setAutoLogin(value);
    if (!value) {
      // If turning off auto-login, also log out
      logout();
    }
  };

  // Register user
  const register = async (email, password, role, additionalData) => {
    try {
      setLoading(true);
      console.log('Registering with data:', { email, password, ...additionalData }, 'role:', role);
      
      // Format the data correctly for the API
      const userData = {
        email,
        password,
        ...additionalData
      };
      
      // Use the correct endpoint format
      const endpoint = `/auth/register/${role}`;
      console.log(`Attempting registration with URL: ${API_CONFIG.BASE_URL}${endpoint}`);
      
      const res = await authAxios.post(endpoint, userData);
      
      // Save token to local storage (only if auto-login is enabled)
      if (autoLogin && res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        // Set auth token header
        authAxios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      }
      
      // Set user in state
      if (res.data) {
        setUser(res.data);
      }
      
      toast.success(`${role === 'hospital' ? 'Hospital' : 'Ambulance'} registered successfully!`, TOAST_CONFIG);
      
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(message, TOAST_CONFIG);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password, role) => {
    try {
      setLoading(true);
      
      // Validate inputs
      if (!email || !password) {
        toast.error('Email and password are required', TOAST_CONFIG);
        return false;
      }
      
      // Prepare login data
      const loginData = {
        email,
        password
      };
      
      // Try to login with the API
      console.log(`Attempting server login with role: ${role}`);
      
      // Make API call to the correct endpoint using authAxios
      const endpoint = `/auth/login/${role}`;
      console.log(`Login endpoint: ${API_CONFIG.BASE_URL}${endpoint}`);
      
      const response = await authAxios.post(endpoint, loginData);
      
      console.log('Login response:', response.data);
      
      // Extract token and user data from response
      const token = response.data.token || response.data.accessToken;
      const userData = response.data.user || response.data;
      
      if (!token) {
        toast.error('Authentication token missing from response', TOAST_CONFIG);
        return false;
      }
      
      // Ensure role is included in user data
      userData.role = role;
      
      // Save user data and token to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set auth token header
      authAxios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Set user in state
      setUser(userData);
      
      toast.success(`Logged in successfully as ${role}`, TOAST_CONFIG);
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed', TOAST_CONFIG);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    try {
      // Remove all tokens and user data from local storage
      localStorage.removeItem('hospital_token');
      localStorage.removeItem('ambulance_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('hospital_user');
      localStorage.removeItem('ambulance_user');
      
      // Remove all auth headers
      delete authAxios.defaults.headers.common['Authorization'];
      delete authAxios.defaults.headers.common['x-auth-token'];
      
      // Clear user from state
      setUser(null);
      
      // Redirect to home page instead of login page
      window.location.href = '/';
      
      // Clear any existing toasts before showing logout message
      toast.dismiss();
      toast.info('Logged out successfully', TOAST_CONFIG);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      
      // Get token for authentication
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token missing. Please log in again.');
      }
      
      // Make API call with explicit authentication
      const res = await authAxios.put(`/${user.role}s/${user._id}`, userData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        }
      });
      
      // Update user in state
      setUser({
        ...user,
        ...res.data
      });
      
      toast.dismiss();
      toast.success('Profile updated successfully', TOAST_CONFIG);
      
      return res.data;
    } catch (error) {
      console.error('Update profile error:', error);
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Failed to update profile', TOAST_CONFIG);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        autoLogin,
        register,
        login,
        logout,
        updateProfile,
        toggleAutoLogin,
        apiAvailable
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
