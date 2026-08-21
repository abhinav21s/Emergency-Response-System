import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FaHospital, FaAmbulance, FaFilter, FaSync, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { API_CONFIG } from '../../utils/axiosConfig';
import AmbulanceNavbar from '../../components/ambulance/AmbulanceNavbar';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Dark theme CSS for map markers and improved UI to match homepage
const mapStyles = `
  .leaflet-container {
    height: 600px;
    width: 100%;
    z-index: 1;
    border-radius: 12px;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-color);
    overflow: hidden;
  }
  
  /* Style the map controls */
  .leaflet-control-container .leaflet-top,
  .leaflet-control-container .leaflet-bottom {
    z-index: 10;
  }
  
  .leaflet-control-zoom {
    border: none !important;
    border-radius: 8px !important;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
    margin: 15px !important;
  }
  
  .leaflet-control-zoom a {
    background-color: rgba(25, 35, 60, 0.9) !important;
    color: white !important;
    width: 36px !important;
    height: 36px !important;
    line-height: 36px !important;
    font-size: 18px !important;
    font-weight: bold !important;
    transition: all 0.2s ease !important;
  }
  
  .leaflet-control-zoom a:hover {
    background-color: rgba(79, 70, 229, 0.9) !important;
    color: white !important;
  }
  
  .leaflet-control-attribution {
    background-color: rgba(15, 23, 42, 0.7) !important;
    color: var(--text-secondary) !important;
    font-size: 10px !important;
    padding: 3px 8px !important;
    border-radius: 4px 0 0 0 !important;
  }
  
  .leaflet-control-attribution a {
    color: var(--primary) !important;
  }
  
  .marker {
    border-radius: 50% !important;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.5) !important;
    border: 2px solid rgba(255, 255, 255, 0.9) !important;
  }
  
  .hospital-marker-accepting {
    background-color: #10b981 !important;
  }
  
  .hospital-marker-not-accepting {
    background-color: #ef4444 !important;
  }
  
  .ambulance-marker {
    background-color: #6366f1 !important;
  }
  
  .leaflet-popup {
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.7));
  }
  
  .map-popup .leaflet-popup-content-wrapper {
    background-color: rgba(17, 25, 40, 0.8);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: var(--text-primary);
    border-radius: 16px;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0;
    overflow: hidden;
  }
  
  .map-popup .leaflet-popup-content {
    margin: 0;
    min-width: 280px;
    max-width: 320px;
  }
  
  .map-popup .leaflet-popup-tip {
    background-color: rgba(17, 25, 40, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
  }
  
  .popup-header {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(79, 70, 229, 0.9));
    color: white;
    padding: 14px 18px;
    font-weight: 600;
    font-size: 1.1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    letter-spacing: 0.5px;
  }
  
  .popup-body {
    padding: 16px 18px;
    background-color: rgba(15, 23, 42, 0.4);
  }
  
  .popup-info-item {
    margin-bottom: 12px;
    display: flex;
    align-items: flex-start;
  }
  
  .popup-info-item i {
    margin-right: 12px;
    color: rgba(99, 102, 241, 0.9);
    width: 18px;
    font-size: 1.1rem;
    text-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
  }
  
  .popup-info-label {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
    margin-right: 6px;
    letter-spacing: 0.3px;
  }
  
  .popup-status {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.3px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  }
  
  .popup-status.accepting {
    background-color: rgba(16, 185, 129, 0.25);
    color: rgb(16, 185, 129);
    border: 1px solid rgba(16, 185, 129, 0.3);
    text-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
  }
  
  .popup-status.not-accepting {
    background-color: rgba(239, 68, 68, 0.25);
    color: rgb(239, 68, 68);
    border: 1px solid rgba(239, 68, 68, 0.3);
    text-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
  }
  
  .popup-doctors {
    margin-top: 15px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 15px;
  }
  
  .popup-doctors-title {
    font-weight: 600;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 0.5px;
  }
  
  .popup-doctors-title i {
    margin-right: 10px;
    color: rgba(99, 102, 241, 0.9);
    text-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
  }
  
  .doctor-item {
    padding: 8px 0;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }
  
  .doctor-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
    transform: translateX(3px);
  }
  
  .doctor-item:last-child {
    border-bottom: none;
  }
  
  .doctor-name {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 0.3px;
  }
  
  .doctor-specialty {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 2px;
  }
  
  /* Enhanced UI Styles with Dark Theme */
  .hospital-search-page {
    background-color: var(--bg-dark);
    min-height: 100vh;
    color: var(--text-primary);
  }
  
  .card {
    background-color: var(--bg-dark-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-md);
    transition: transform 0.2s, box-shadow 0.2s;
    overflow: hidden;
  }
  
  .card:hover {
    box-shadow: var(--shadow-lg);
  }
  
  .card-header {
    padding: 15px 20px;
    font-weight: 600;
    border-bottom: 1px solid var(--border-color);
    background-color: var(--bg-dark-tertiary);
  }
  
  .card-body {
    padding: 20px;
  }
  
  .bg-primary {
    background: var(--gradient-primary) !important;
  }
  
  .bg-success {
    background: var(--gradient-success) !important;
  }
  
  .hospital-item {
    transition: all 0.3s ease;
    cursor: pointer;
    border-radius: 16px !important;
    background-color: rgba(17, 25, 40, 0.7) !important;
    backdrop-filter: blur(10px) !important;
    -webkit-backdrop-filter: blur(10px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: var(--text-primary);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    padding: 16px !important;
    margin-bottom: 16px !important;
    position: relative;
    overflow: hidden;
  }
  
  .hospital-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, rgba(99, 102, 241, 0), rgba(99, 102, 241, 0.8), rgba(99, 102, 241, 0));
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .hospital-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    background-color: rgba(25, 35, 55, 0.8) !important;
  }
  
  .hospital-item:hover::before {
    opacity: 1;
  }
  
  .hospital-item.border-primary {
    border: 1px solid rgba(99, 102, 241, 0.5) !important;
    background-color: rgba(99, 102, 241, 0.15) !important;
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.25);
  }
  
  .hospital-item.border-primary::before {
    background: linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 1), rgba(99, 102, 241, 0.2));
    opacity: 1;
  }
  
  .hospital-name {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 10px;
    color: rgba(255, 255, 255, 0.95);
    letter-spacing: 0.3px;
  }
  
  .hospital-info-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .hospital-info-item i {
    color: rgba(99, 102, 241, 0.9);
    margin-right: 12px;
    font-size: 1.1rem;
    min-width: 20px;
    text-align: center;
  }
  
  .doctors-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .doctors-label {
    font-weight: 500;
    margin-bottom: 3px;
    color: rgba(255, 255, 255, 0.85);
  }
  
  .doctor-badge {
    display: inline-block;
    background-color: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.3);
    color: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 0.85rem;
    margin-right: 5px;
    margin-bottom: 5px;
  }
  
  .hospital-status {
    display: inline-flex;
    align-items: center;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    margin-top: 5px;
  }
  
  .hospital-status.accepting {
    background-color: rgba(16, 185, 129, 0.2);
    color: rgb(16, 185, 129);
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  .hospital-status.not-accepting {
    background-color: rgba(239, 68, 68, 0.2);
    color: rgb(239, 68, 68);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  .hospital-status i {
    margin-right: 6px;
  }
  
  .btn-primary {
    background: var(--gradient-primary);
    border: none;
    box-shadow: 0 4px 6px rgba(99, 102, 241, 0.25);
    transition: all 0.2s;
  }
  
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 8px rgba(99, 102, 241, 0.3);
    background: var(--gradient-accent);
  }
  
  .btn-primary:active {
    transform: translateY(0);
  }
  
  .badge {
    padding: 6px 10px;
    font-weight: 500;
    border-radius: 6px;
  }
  
  .bg-success {
    background: var(--gradient-success) !important;
  }
  
  .bg-danger {
    background: var(--gradient-danger) !important;
  }
  
  .text-success {
    color: var(--success) !important;
  }
  
  .text-danger {
    color: var(--danger) !important;
  }
  
  .text-secondary {
    color: var(--text-secondary) !important;
  }
  
  .hospital-list {
    max-height: 400px;
    overflow-y: auto;
    padding-right: 5px;
  }
  
  .hospital-list::-webkit-scrollbar {
    width: 6px;
  }
  
  .hospital-list::-webkit-scrollbar-track {
    background: var(--bg-dark-tertiary);
    border-radius: 10px;
  }
  
  .hospital-list::-webkit-scrollbar-thumb {
    background: var(--primary);
    border-radius: 10px;
  }
  
  .hospital-list::-webkit-scrollbar-thumb:hover {
    background: var(--primary-hover);
  }
  
  .form-control, .form-select {
    background-color: var(--bg-dark-tertiary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
  }
  
  .form-control:focus, .form-select:focus {
    background-color: var(--bg-dark-tertiary);
    border-color: var(--primary);
    box-shadow: 0 0 0 0.25rem rgba(99, 102, 241, 0.25);
    color: var(--text-primary);
  }
  
  .form-label {
    color: var(--text-secondary);
  }
  
  .form-check-input {
    background-color: var(--bg-dark-tertiary);
    border: 1px solid var(--border-color);
  }
  
  .form-check-input:checked {
    background-color: var(--primary);
    border-color: var(--primary);
  }
  
  .alert-danger {
    background-color: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    color: var(--danger);
  }
  
  .alert-success {
    background-color: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.3);
    color: var(--success);
  }
`;

// Custom hospital marker icon - simple colored ball
const createHospitalIcon = (isAccepting) => {
  return L.divIcon({
    className: `marker hospital-marker-${isAccepting ? 'accepting' : 'not-accepting'}`,
    html: ``,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

// Custom ambulance marker icon - simple colored ball
const ambulanceIcon = L.divIcon({
  className: 'marker ambulance-marker',
  html: ``,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

// Component to recenter map when ambulance location changes
const MapRecenter = ({ position }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position, 13);
    }
  }, [position, map]);
  
  return null;
};

// Component to center map on a specific hospital and open its popup
const MapCenterOnHospital = ({ hospital, getHospitalPosition, markerRefs, mapLocked }) => {
  const map = useMap();
  
  useEffect(() => {
    // Only recenter if the map is not locked
    if (hospital && !mapLocked) {
      const position = getHospitalPosition(hospital);
      if (position) {
        map.setView(position, 15);
        
        // Open the popup for this hospital if the marker reference exists
        if (markerRefs.current[hospital._id]) {
          markerRefs.current[hospital._id].openPopup();
        }
      }
    }
  }, [hospital, map, getHospitalPosition, markerRefs, mapLocked]);
  
  return null;
};

const HospitalSearch = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  
  // State variables
  const [ambulance, setAmbulance] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [mapCenterHospital, setMapCenterHospital] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchParams, setSearchParams] = useState({
    maxDistance: 10,
    acceptingOnly: false
  });
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedPatientType, setSelectedPatientType] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapLocked, setMapLocked] = useState(false);
  const [locationTrackingActive, setLocationTrackingActive] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLocation, setManualLocation] = useState({ latitude: '', longitude: '' });
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const watchPositionId = React.useRef(null);
  
  // Ref to store marker references for opening popups
  const markerRefs = React.useRef({});
  
  // Start continuous location tracking - now fully automatic
  const startLocationTracking = () => {
    if (navigator.geolocation) {
      // Only set loading if not already tracking
      if (!locationTrackingActive) {
        setLocationLoading(true);
      }
      
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          // Only show success message on first location acquisition
          if (!locationTrackingActive) {
            setSuccess('Location updated successfully');
          }
          setLocationLoading(false);
          setLocationTrackingActive(true);
          
          // Update ambulance location on server if we have user data
          if (user && user._id && ambulance) {
            updateAmbulanceLocation(latitude, longitude);
          }
        },
        (error) => {
          console.error('Error getting initial location:', error);
          setLocationLoading(false);
          setLocationTrackingActive(false);
          
          // Check if permission was denied
          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermissionDenied(true);
            setError(`Location access denied. You can either enable location services in your browser settings or enter your location manually below.`);
            setShowManualLocation(true);
          } else {
            // Only show error if this is the first attempt
            if (!locationTrackingActive) {
              setError(`Unable to get your location: ${error.message}. Please ensure location services are enabled or use manual location input.`);
              setShowManualLocation(true);
            }
            
            // Try again after a delay if location access fails (but not if permission denied)
            setTimeout(() => {
              if (!locationTrackingActive && !locationLoading && !locationPermissionDenied) {
                startLocationTracking();
              }
            }, 10000); // Try again after 10 seconds
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
      
      // Only set up watch if we don't already have one
      if (watchPositionId.current === null) {
        // Start watching position for real-time updates
        watchPositionId.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            setLocationTrackingActive(true);
            setLocationLoading(false);
            
            // Update ambulance location on server if we have user data
            if (user && user._id && ambulance) {
              updateAmbulanceLocation(latitude, longitude);
            }
          },
          (error) => {
            console.error('Error watching location:', error);
            setLocationTrackingActive(false);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
      }
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };
  
  // Stop location tracking
  const stopLocationTracking = () => {
    if (watchPositionId.current !== null) {
      navigator.geolocation.clearWatch(watchPositionId.current);
      watchPositionId.current = null;
      setLocationTrackingActive(false);
      setSuccess('Location tracking stopped');
    }
  };
  
  // This function is kept for compatibility but no longer exposed in the UI
  // Location tracking is now fully automatic
  const getUserLocation = () => {
    startLocationTracking();
  };
  
  // Handle manual location input
  const handleManualLocationChange = (e) => {
    const { name, value } = e.target;
    setManualLocation(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Submit manual location
  const submitManualLocation = () => {
    const lat = parseFloat(manualLocation.latitude);
    const lng = parseFloat(manualLocation.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      setError('Please enter valid latitude and longitude values.');
      return;
    }
    
    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90 degrees.');
      return;
    }
    
    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180 degrees.');
      return;
    }
    
    // Set the manual location as user location
    setUserLocation({ latitude: lat, longitude: lng });
    setShowManualLocation(false);
    setError('');
    setSuccess('Manual location set successfully! You can now search for nearby hospitals.');
    
    // Update ambulance location on server if we have user data
    if (user && user._id && ambulance) {
      updateAmbulanceLocation(lat, lng);
    }
  };
  
  // Reset location permission and try again
  const retryLocationAccess = () => {
    setLocationPermissionDenied(false);
    setShowManualLocation(false);
    setError('');
    startLocationTracking();
  };
  
  // Update ambulance location on server
  const updateAmbulanceLocation = async (latitude, longitude) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('ambulance_token');
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        return;
      }
      
      await axios.put(`${API_CONFIG.BASE_URL}/ambulances/${user._id}/location`, {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude] // GeoJSON format: [longitude, latitude]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        }
      });
      
      // Update local ambulance state
      setAmbulance(prev => ({
        ...prev,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      }));
      
      console.log('Ambulance location updated on server');
    } catch (error) {
      console.error('Error updating ambulance location:', error);
      // Don't show error to user as we already have the location in local state
    }
  };
  
  // Fetch ambulance data and start location tracking
  useEffect(() => {
    const fetchAmbulanceData = async () => {
      try {
        if (!user || !user._id) return;
        
        const token = localStorage.getItem('token') || localStorage.getItem('ambulance_token');
        if (!token) {
          setError('Authentication token missing. Please log in again.');
          return;
        }
        
        const response = await axios.get(`${API_CONFIG.BASE_URL}/ambulances/${user._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-auth-token': token
          }
        });
        
        if (response.data && response.data.ambulance) {
          setAmbulance(response.data.ambulance);
          
          // Start continuous location tracking after fetching ambulance data
          startLocationTracking();
        }
      } catch (error) {
        console.error('Error fetching ambulance data:', error);
        setError('Failed to load ambulance data. Please refresh and try again.');
      }
    };
    
    if (user) {
      fetchAmbulanceData();
    }
    
    // Clean up function to stop location tracking when component unmounts
    return () => {
      stopLocationTracking();
    };
  }, [user]);
  
  // Auto-start location tracking when component mounts
  useEffect(() => {
    console.log('Starting automatic location tracking...');
    startLocationTracking();
    
    // Set up interval to ensure location tracking stays active
    const locationCheckInterval = setInterval(() => {
      if (!locationTrackingActive && !locationLoading) {
        console.log('Location tracking not active, restarting...');
        startLocationTracking();
      }
    }, 30000); // Check every 30 seconds
    
    // Clean up when component unmounts
    return () => {
      clearInterval(locationCheckInterval);
      stopLocationTracking();
    };
  }, [locationTrackingActive, locationLoading]);
  
  // Fetch hospitals - wrapped in useCallback to prevent infinite loops
  const fetchHospitals = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token') || localStorage.getItem('ambulance_token');
      if (!token || !user || !user._id) {
        setError('Authentication token missing or user not logged in.');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/ambulances/${user._id}/nearby-hospitals`, {
        params: {
          maxDistance: searchParams.maxDistance,
          acceptingOnly: searchParams.acceptingOnly
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`Received ${response.data.length} hospitals from server`);
        setHospitals(response.data);
      } else {
        setHospitals([]);
      }
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      setError(`Failed to fetch hospitals: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user, searchParams]);
  
  // Fetch hospitals on component mount and when search params change
  useEffect(() => {
    if (user) {
      fetchHospitals();
    }
  }, [user, searchParams]);
  
  // Hospital status change handler removed as requested
  
  // Clear hospital selection
  const clearHospitalSelection = () => {
    if (window.confirm('Are you sure you want to clear your hospital selection?')) {
      setSelectedHospital(null);
      localStorage.removeItem('selectedHospital');
      setSuccess('Hospital selection cleared');
    }
  };

  // Handle hospital selection
  const selectHospital = (hospital) => {
    // Check if a hospital is already selected
    const currentHospital = localStorage.getItem('selectedHospital');
    
    if (currentHospital && JSON.parse(currentHospital)._id !== hospital._id) {
      // If trying to select a different hospital, show confirmation
      if (window.confirm(`You already have ${JSON.parse(currentHospital).hospitalName} selected. Do you want to change to ${hospital.hospitalName}?`)) {
        setMapLocked(false); // Ensure map is unlocked for new selection
        setSelectedHospital(hospital);
        setMapCenterHospital(hospital);
        // Save selected hospital to localStorage for persistence across components
        localStorage.setItem('selectedHospital', JSON.stringify(hospital));
      }
    } else {
      // First time selecting or selecting the same hospital
      setMapLocked(false); // Ensure map is unlocked for new selection
      setSelectedHospital(hospital);
      setMapCenterHospital(hospital);
      localStorage.setItem('selectedHospital', JSON.stringify(hospital));
    }
  };
  
  // Handle search parameter changes
  const handleSearchParamChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Send notification to hospital
  const sendNotification = async () => {
    if (!selectedHospital) {
      setError('Please select a hospital first.');
      return;
    }
    
    if (!selectedGender) {
      setError('Please select patient gender first.');
      return;
    }
    
    if (!selectedPatientType) {
      setError('Please select patient type first.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setNotificationSent(false);
      
      const token = localStorage.getItem('token') || localStorage.getItem('ambulance_token');
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Get the optional message from the input field
      const messageElement = document.getElementById('emergencyMessage');
      const message = messageElement ? messageElement.value : '';
      
      // Format gender properly for display
      const formattedGender = selectedGender === 'male' ? 'Male' : 
                              selectedGender === 'female' ? 'Female' : 
                              selectedGender === 'other' ? 'Other' : selectedGender;
      
      // Debug the values being sent
      console.log('Sending gender:', formattedGender);
      console.log('Sending patient type:', selectedPatientType);
      
      await axios.post(`${API_CONFIG.BASE_URL}/emergencies/notify`, {
        ambulanceId: ambulance._id,
        hospitalId: selectedHospital._id,
        gender: formattedGender,
        patientType: selectedPatientType,
        message: message
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        }
      });
      
      setSuccess(`✅ Emergency notification successfully sent to ${selectedHospital.hospitalName}! They have been notified about the ${selectedPatientType} emergency for a ${formattedGender} patient.`);
      setNotificationSent(true);
      
      // Clear the message input after successful send
      if (messageElement) {
        messageElement.value = '';
      }
      
      // Emit socket event if available
      if (socket && socket.connected) {
        socket.emit('emergency_notification', {
          ambulanceId: ambulance._id,
          hospitalId: selectedHospital._id,
          gender: formattedGender,
          patientType: selectedPatientType,
          message: message
        });
      }
      
      // Auto-clear success message and notification status after 10 seconds
      setTimeout(() => {
        setSuccess('');
        setNotificationSent(false);
      }, 10000);
    } catch (error) {
      console.error('Error sending notification:', error);
      setError(`Failed to send notification: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Get current distance to hospital based on current ambulance position
  const getCurrentDistanceToHospital = (hospital) => {
    if (!hospital || !hospital.location || !hospital.location.coordinates) {
      return null;
    }
    
    // Get current ambulance position
    const ambulancePosition = getAmbulancePosition();
    if (!ambulancePosition || ambulancePosition.length !== 2) {
      return hospital.distance; // Fall back to server-provided distance
    }
    
    // Calculate distance using current ambulance position
    // GeoJSON format is [longitude, latitude]
    const hospitalLon = hospital.location.coordinates[0];
    const hospitalLat = hospital.location.coordinates[1];
    
    // ambulancePosition is [latitude, longitude]
    const ambulanceLat = ambulancePosition[0];
    const ambulanceLon = ambulancePosition[1];
    
    // Debug distance calculation
    console.log('Hospital coordinates:', hospitalLat, hospitalLon);
    console.log('Ambulance coordinates:', ambulanceLat, ambulanceLon);
    
    const distance = calculateDistance(ambulanceLat, ambulanceLon, hospitalLat, hospitalLon);
    console.log('Calculated distance:', distance);
    
    return distance;
  };
  
  // Get ambulance position for map
  const getAmbulancePosition = () => {
    // If we have user location from browser, use that
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      return [userLocation.latitude, userLocation.longitude];
    }
    // Otherwise fall back to ambulance data from server
    else if (ambulance && ambulance.location && 
        ambulance.location.coordinates && 
        ambulance.location.coordinates.length === 2) {
      return [ambulance.location.coordinates[1], ambulance.location.coordinates[0]];
    }
    return [12.9716, 77.5946]; // Default to Bangalore
  };
  
  // Check if hospital has valid coordinates
  const hasValidCoordinates = (hospital) => {
    return hospital && 
           hospital.location && 
           hospital.location.coordinates && 
           Array.isArray(hospital.location.coordinates) && 
           hospital.location.coordinates.length === 2 &&
           !isNaN(hospital.location.coordinates[0]) && 
           !isNaN(hospital.location.coordinates[1]);
  };
  
  // Get hospital position for map
  const getHospitalPosition = (hospital) => {
    if (hasValidCoordinates(hospital)) {
      return [hospital.location.coordinates[1], hospital.location.coordinates[0]];
    }
    return null;
  };
  
  return (
    <div className="hospital-search-page">
      <style>{mapStyles}</style>
      <AmbulanceNavbar />
      
      <Container fluid className="py-4">
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        {/* Manual Location Input */}
        {showManualLocation && (
          <Row className="mb-4">
            <Col md={12}>
              <Card className="shadow-sm border-warning">
                <Card.Header className="bg-warning text-dark">
                  <h5 className="mb-0">
                    <FaMapMarkerAlt className="me-2" />
                    Manual Location Input
                  </h5>
                </Card.Header>
                <Card.Body>
                  <p className="mb-3">
                    Since automatic location detection is not available, please enter your current location coordinates manually. 
                    You can find your coordinates using Google Maps or other location services.
                  </p>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Latitude</Form.Label>
                        <Form.Control
                          type="number"
                          name="latitude"
                          value={manualLocation.latitude}
                          onChange={handleManualLocationChange}
                          placeholder="e.g., 12.9716"
                          step="0.000001"
                        />
                        <Form.Text className="text-muted">
                          Range: -90 to 90
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Longitude</Form.Label>
                        <Form.Control
                          type="number"
                          name="longitude"
                          value={manualLocation.longitude}
                          onChange={handleManualLocationChange}
                          placeholder="e.g., 77.5946"
                          step="0.000001"
                        />
                        <Form.Text className="text-muted">
                          Range: -180 to 180
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={4} className="d-flex align-items-end">
                      <div className="mb-3 w-100">
                        <Button 
                          variant="success" 
                          onClick={submitManualLocation}
                          className="me-2"
                        >
                          Set Location
                        </Button>
                        {!locationPermissionDenied && (
                          <Button 
                            variant="outline-primary" 
                            onClick={retryLocationAccess}
                          >
                            Retry Auto-Location
                          </Button>
                        )}
                      </div>
                    </Col>
                  </Row>
                  <Alert variant="info" className="mb-0">
                    <strong>Tip:</strong> To find your coordinates, go to Google Maps, right-click on your location, 
                    and select "What's here?" The coordinates will appear at the bottom.
                  </Alert>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
        
        <Row className="mb-4">
          <Col md={12}>
            <Card className="shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Hospital Search</h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Maximum Distance (km)</Form.Label>
                      <Form.Control
                        type="number"
                        name="maxDistance"
                        value={searchParams.maxDistance}
                        onChange={handleSearchParamChange}
                        min="1"
                        max="50"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mt-4">
                      <Form.Check
                        type="checkbox"
                        label="Show only hospitals accepting emergencies"
                        name="acceptingOnly"
                        checked={searchParams.acceptingOnly}
                        onChange={handleSearchParamChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <div className="d-flex justify-content-between mb-4">
                  <Button 
                    variant="primary" 
                    onClick={fetchHospitals} 
                    disabled={loading}
                    className="d-flex align-items-center"
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <FaSync className="me-2" /> Refresh Hospitals
                      </>
                    )}
                  </Button>
                  
                  {/* Location status indicator */}
                  {locationLoading ? (
                    <div className="d-flex align-items-center text-info">
                      <Spinner 
                        as="span" 
                        animation="border" 
                        size="sm" 
                        role="status" 
                        aria-hidden="true" 
                        className="me-2"
                      />
                      Updating location...
                    </div>
                  ) : locationTrackingActive ? (
                    <div className="d-flex align-items-center text-success">
                      <FaMapMarkerAlt className="me-2" />
                      Location tracking active
                    </div>
                  ) : (
                    <div className="d-flex align-items-center text-warning">
                      <FaMapMarkerAlt className="me-2" />
                      Waiting for location...
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row>
          <Col md={8}>
            <Card className="shadow-sm mb-4">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Hospital Map</h5>
              </Card.Header>
              <Card.Body>
                <MapContainer 
                  center={getAmbulancePosition()} 
                  zoom={13} 
                  style={{ height: '600px', width: '100%' }}
                  className="map-popup" // Add this class to ensure all popups get the styling
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* Recenter map when ambulance position changes */}
                  <MapRecenter position={getAmbulancePosition()} />
                  
                  {/* Center map on selected hospital */}
                  {mapCenterHospital && (
                    <MapCenterOnHospital 
                      hospital={mapCenterHospital} 
                      getHospitalPosition={getHospitalPosition}
                      markerRefs={markerRefs}
                      mapLocked={mapLocked}
                    />
                  )}
                  
                  {/* Ambulance marker */}
                  <Marker 
                    position={getAmbulancePosition()} 
                    icon={ambulanceIcon}
                  >
                    <Popup className="map-popup">
                      <div>
                        <div className="popup-header">
                          Your Ambulance
                        </div>
                        <div className="popup-body">
                          <div className="popup-info-item">
                            <i className="fas fa-ambulance"></i>
                            <div>
                              <span className="popup-info-label">Vehicle:</span>
                              {ambulance?.vehicleNumber || 'Unknown'}
                            </div>
                          </div>
                          
                          <div className="popup-info-item">
                            <i className="fas fa-map-pin"></i>
                            <div>
                              <span className="popup-info-label">Current Location</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                  
                  {/* Hospital markers */}
                  {hospitals.map(hospital => {
                    const position = getHospitalPosition(hospital);
                    if (!position) return null;
                    
                    return (
                      <Marker 
                        key={hospital._id}
                        position={position}
                        icon={createHospitalIcon()}
                        eventHandlers={{
                          click: () => selectHospital(hospital),
                        }}
                        ref={(ref) => {
                          if (ref) {
                            markerRefs.current[hospital._id] = ref;
                          }
                        }}
                      >
                        <Popup className="map-popup">
                          <div>
                            <div className="popup-header">
                              {hospital.hospitalName}
                            </div>
                            <div className="popup-body">
                              <div className="popup-info-item">
                                <i className="fas fa-route"></i>
                                <div>
                                  <span className="popup-info-label">Distance:</span>
                                  {(() => {
                                    const currentDistance = getCurrentDistanceToHospital(hospital);
                                    return currentDistance ? 
                                      `${currentDistance.toFixed(1)} km away` : 
                                      'Unknown';
                                  })()} 
                                </div>
                              </div>
                              
                              {/* Emergency acceptance status removed as requested */}
                              
                              {/* Gender selection */}
                              <div className="popup-section mt-3">
                                <div className="popup-section-title mb-2">
                                  <i className="fas fa-venus-mars me-2"></i> Patient Gender
                                </div>
                                <div className="d-flex gap-2 mb-3">
                                  <button 
                                    className={`btn btn-sm ${selectedGender === 'male' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      L.DomEvent.disableClickPropagation(e.currentTarget);
                                      setMapLocked(true); // Lock map before changing state
                                      setSelectedGender('male');
                                    }}
                                  >
                                    Male
                                  </button>
                                  <button 
                                    className={`btn btn-sm ${selectedGender === 'female' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      L.DomEvent.disableClickPropagation(e.currentTarget);
                                      setMapLocked(true); // Lock map before changing state
                                      setSelectedGender('female');
                                    }}
                                  >
                                    Female
                                  </button>
                                  <button 
                                    className={`btn btn-sm ${selectedGender === 'other' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      L.DomEvent.disableClickPropagation(e.currentTarget);
                                      setMapLocked(true); // Lock map before changing state
                                      setSelectedGender('other');
                                    }}
                                  >
                                    Other
                                  </button>
                                </div>
                              </div>
                              
                              {/* Patient type selection */}
                              <div className="popup-section">
                                <div className="popup-section-title mb-2">
                                  <i className="fas fa-procedures me-2"></i> Patient Type
                                </div>
                                <div className="d-flex flex-wrap gap-2 mb-3">
                                  <button 
                                    className={`btn btn-sm ${selectedPatientType === 'RTA' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      L.DomEvent.disableClickPropagation(e.currentTarget);
                                      setMapLocked(true); // Lock map before changing state
                                      setSelectedPatientType('RTA');
                                    }}
                                  >
                                    RTA
                                  </button>
                                  <button 
                                    className={`btn btn-sm ${selectedPatientType === 'Gynec' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      L.DomEvent.disableClickPropagation(e.currentTarget);
                                      setMapLocked(true); // Lock map before changing state
                                      setSelectedPatientType('Gynec');
                                    }}
                                  >
                                    Gynec
                                  </button>
                                  <button 
                                    className={`btn btn-sm ${selectedPatientType === 'Neuro' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      L.DomEvent.disableClickPropagation(e.currentTarget);
                                      setMapLocked(true); // Lock map before changing state
                                      setSelectedPatientType('Neuro');
                                    }}
                                  >
                                    Neuro
                                  </button>
                                  <button 
                                    className={`btn btn-sm ${selectedPatientType === 'Poison' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      L.DomEvent.disableClickPropagation(e.currentTarget);
                                      setMapLocked(true); // Lock map before changing state
                                      setSelectedPatientType('Poison');
                                    }}
                                  >
                                    Poison
                                  </button>
                                </div>
                              </div>
                              
                              {/* Message box (optional) */}
                              <div className="popup-section">
                                <div className="popup-section-title mb-2">
                                  <i className="fas fa-comment-medical me-2"></i> Message (Optional)
                                </div>
                                <Form.Control
                                  type="text"
                                  placeholder="Brief message about patient condition"
                                  className="mb-3"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    L.DomEvent.disableClickPropagation(e.currentTarget);
                                    setMapLocked(true); // Lock map while typing
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    L.DomEvent.disableClickPropagation(e.currentTarget);
                                    setMapLocked(true); // Lock map when clicking input
                                  }}
                                  onBlur={() => setMapLocked(false)} // Unlock map when done typing
                                  id="emergencyMessage"
                                />
                              </div>
                              
                              <div className="popup-notification-btn">
                                <button 
                                  className="btn btn-primary w-100 mt-3"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    L.DomEvent.disableClickPropagation(e.currentTarget);
                                    setMapLocked(false); // Unlock map for next selection
                                    selectHospital(hospital);
                                    sendNotification();
                                  }}
                                >
                                  <i className="fas fa-ambulance me-2"></i>
                                  Send Emergency Notification
                                </button>
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4}>
            <Card className="shadow-sm mb-4" style={{
              backgroundColor: 'rgba(17, 25, 40, 0.7)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}>
              <Card.Header style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(79, 70, 229, 0.9))',
                border: 'none',
                padding: '16px 20px',
              }}>
                <h5 className="mb-0" style={{
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                }}>Hospital List</h5>
              </Card.Header>
              <Card.Body style={{
                padding: '20px',
                backgroundColor: 'rgba(15, 23, 42, 0.4)'
              }}>
                {loading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Loading hospitals...</p>
                  </div>
                ) : hospitals.length === 0 ? (
                  <p className="text-center py-4">No hospitals found</p>
                ) : (
                  <div className="hospital-list">
                    {hospitals.map(hospital => (
                      <div 
                        key={hospital._id} 
                        className={`hospital-item ${selectedHospital && selectedHospital._id === hospital._id ? 'selected-hospital' : ''}`}
                        onClick={() => {
                          setMapLocked(false); // Ensure map is unlocked when selecting from list
                          selectHospital(hospital);
                          setMapCenterHospital(hospital);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="hospital-name">
                          {selectedHospital && selectedHospital._id === hospital._id && (
                            <span className="selected-indicator" title="Currently Selected">
                              <i className="fas fa-check-circle"></i>
                            </span>
                          )}
                          {hospital.hospitalName}
                        </div>
                        
                        <div className="hospital-info-item">
                          <i className="fas fa-map-marker-alt"></i>
                          <div>
                            {(() => {
                              const currentDistance = getCurrentDistanceToHospital(hospital);
                              return currentDistance ? 
                                `${currentDistance.toFixed(1)} km away` : 
                                'Distance unknown';
                            })()}
                          </div>
                        </div>
                        
                        {hospital.phone && (
                          <div className="hospital-info-item">
                            <i className="fas fa-phone-alt"></i>
                            <div>{hospital.phone}</div>
                          </div>
                        )}
                        
                        {/* Available doctors */}
                        {hospital.doctors && hospital.doctors.filter(doctor => doctor.isAvailable).length > 0 && (
                          <div className="hospital-info-item mt-2">
                            <i className="fas fa-user-md"></i>
                            <div className="doctors-list">
                              <div className="doctors-label">Available Doctors:</div>
                              {hospital.doctors
                                .filter(doctor => doctor.isAvailable)
                                .map((doctor, index) => (
                                  <div key={doctor._id || index} className="doctor-badge">
                                    {doctor.name} ({doctor.specialization})
                                  </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Emergency acceptance status removed as requested */}
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
            
            {/* Hospital selection info message */}
            {!selectedHospital && (
              <div className="hospital-selection-info">
                <i className="fas fa-info-circle"></i>
                Select a hospital from the list to view details and send notifications.
              </div>
            )}
            
            {selectedHospital && (
              <Card className="shadow-sm">
                <Card.Header className="bg-success text-white position-relative">
                  <h5 className="mb-0">Selected Hospital</h5>
                  <button 
                    className="clear-selection-btn" 
                    onClick={clearHospitalSelection}
                    title="Clear hospital selection"
                  >
                    <i className="fas fa-times"></i> Clear
                  </button>
                </Card.Header>
                <Card.Body>
                  <h5 className="mb-3">{selectedHospital.hospitalName}</h5>
                  
                  {selectedHospital.address && (
                    <div className="mb-3">
                      <h6>Address:</h6>
                      <p>
                        {[
                          selectedHospital.address.street,
                          selectedHospital.address.city,
                          selectedHospital.address.state,
                          selectedHospital.address.zipCode
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                  
                  {/* Emergency acceptance status removed as requested */}
                  
                  <Button 
                    variant={notificationSent ? "success" : "primary"}
                    className="w-100"
                    onClick={sendNotification}
                    disabled={loading || notificationSent}
                  >
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" className="me-2" />
                        Sending...
                      </>
                    ) : notificationSent ? (
                      <>
                        ✅ Notification Sent Successfully!
                      </>
                    ) : (
                      'Send Emergency Notification'
                    )}
                  </Button>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HospitalSearch;
