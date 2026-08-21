import React, { useState, useEffect, useContext, useRef } from 'react';
import { Container, Row, Col, Button, Badge, Toast, ToastContainer } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaHospital, FaUserMd, FaAmbulance, FaPhone, FaExchangeAlt, FaUserNurse, 
  FaCircle, FaMapMarkerAlt, FaIdCard, FaBuilding, FaSignOutAlt } from 'react-icons/fa';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import Loader from '../../components/common/Loader';
import AmbulanceNavbar from '../../components/ambulance/AmbulanceNavbar';
import './simple-dashboard.css';

const AmbulanceDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { socket, onEvent } = useContext(SocketContext);
  
  const [ambulance, setAmbulance] = useState(null);
  const [currentEmergency, setCurrentEmergency] = useState(null);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('CONNECTED');
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState({ title: '', message: '' });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationUpdateStatus, setLocationUpdateStatus] = useState('Waiting');
  const watchPositionId = useRef(null);
  const [stats, setStats] = useState({
    totalHospitals: 0,
    availableHospitals: 0,
    totalDoctors: 0,
    availableDoctors: 0
  });

  // Fetch stats data
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token missing');
        return;
      }

      const response = await axios.get('http://localhost:5001/api/stats', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        }
      });

      if (response.data) {
        console.log('Stats data received:', response.data);
        setStats({
          totalHospitals: response.data.hospitalCount || 0,
          availableHospitals: response.data.hospitalCount || 0, // Initially assume all hospitals are available
          totalDoctors: response.data.doctorCount || 0,
          availableDoctors: response.data.doctorCount || 0 // Initially assume all doctors are available
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Initial stats fetch and periodic updates
  useEffect(() => {
    fetchStats(); // Initial fetch
    
    // Set up periodic updates
    const intervalId = setInterval(fetchStats, 30000); // Update every 30 seconds
    
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  // Update stats when hospitals or doctors change
  useEffect(() => {
    if (nearbyHospitals.length > 0) {
      setStats(prevStats => ({
        ...prevStats,
        availableHospitals: nearbyHospitals.filter(h => h.availableDoctors > 0).length,
        totalHospitals: nearbyHospitals.length,
        availableDoctors: nearbyHospitals.reduce((acc, h) => acc + (h.availableDoctors || 0), 0),
        totalDoctors: nearbyHospitals.reduce((acc, h) => acc + ((h.doctors && h.doctors.length) || 0), 0)
      }));
    }
  }, [nearbyHospitals]);

  // Load selected hospital from localStorage
  useEffect(() => {
    try {
      const savedHospital = localStorage.getItem('selectedHospital');
      if (savedHospital) {
        const parsedHospital = JSON.parse(savedHospital);
        setSelectedHospital(parsedHospital);
        console.log('Loaded selected hospital from localStorage:', parsedHospital.hospitalName);
      }
    } catch (error) {
      console.error('Error loading selected hospital from localStorage:', error);
    }
  }, []);

  // Location tracking functionality
  useEffect(() => {
    // Start tracking location when component mounts
    startLocationTracking();
    
    // Clean up when component unmounts
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Function to start tracking location
  const startLocationTracking = () => {
    if (navigator.geolocation) {
      setLocationUpdateStatus('Initializing');
      
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          updateLocationOnServer(latitude, longitude);
          setLocationUpdateStatus('Active');
        },
        (error) => {
          console.error('Error getting initial location:', error);
          setLocationUpdateStatus('Error: ' + error.message);
          setNotification({
            title: 'Location Error',
            message: `Could not get your location: ${error.message}. Please enable location services.`
          });
          setShowNotification(true);
        },
        { enableHighAccuracy: true }
      );
      
      // Start watching position for real-time updates
      watchPositionId.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          updateLocationOnServer(latitude, longitude);
          setLocationUpdateStatus('Active');
        },
        (error) => {
          console.error('Error watching location:', error);
          setLocationUpdateStatus('Error: ' + error.message);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    } else {
      setLocationUpdateStatus('Not Supported');
      setNotification({
        title: 'Location Not Supported',
        message: 'Your browser does not support geolocation.'
      });
      setShowNotification(true);
    }
  };

  // Function to stop tracking location
  const stopLocationTracking = () => {
    if (watchPositionId.current !== null) {
      navigator.geolocation.clearWatch(watchPositionId.current);
      watchPositionId.current = null;
      setLocationUpdateStatus('Stopped');
    }
  };

  // Function to update location on server
  const updateLocationOnServer = async (latitude, longitude) => {
    try {
      if (!user || !user._id) {
        console.error('No user data available, cannot update location');
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token missing');
        return;
      }
      
      console.log(`Updating ambulance location: [${latitude}, ${longitude}]`);
      
      // Send location update to server
      const response = await axios.put(
        `http://localhost:5001/api/ambulances/${user._id}/location`,
        {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude] // GeoJSON format: [longitude, latitude]
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-auth-token': token
          }
        }
      );
      
      if (response.data && response.data.success) {
        console.log('Location updated successfully:', response.data);
        
        // Update ambulance object with new location
        if (ambulance) {
          setAmbulance(prev => ({
            ...prev,
            location: {
              type: 'Point',
              coordinates: [longitude, latitude]
            }
          }));
        }
        
        // Emit location update via socket if available
        if (socket) {
          socket.emit('ambulance:location-update', {
            ambulanceId: user._id,
            location: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error updating location on server:', error);
    }
  };

  // Fetch ambulance data
  useEffect(() => {
    const fetchAmbulanceData = async () => {
      try {
        if (!user || !user._id) {
          console.log('No user data available, cannot fetch ambulance data');
          setLoading(false);
          return;
        }
        
        // Get token for authentication
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Authentication token missing');
          setLoading(false);
          setServerStatus('DISCONNECTED');
          return;
        }
        
        console.log(`Fetching ambulance data for user ID: ${user._id}`);
        
        // Try multiple approaches to fetch data
        let response;
        let error;
        
        // First try with absolute URL
        try {
          response = await axios.get(`http://localhost:5001/api/ambulances/${user._id}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-auth-token': token
            },
            timeout: 5000
          });
        } catch (err) {
          console.warn('Failed to fetch with absolute URL:', err.message);
          error = err;
          
          // Try with relative URL as fallback
          try {
            response = await axios.get(`/api/ambulances/${user._id}`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-auth-token': token
              }
            });
            // Clear error if relative URL succeeds
            error = null;
          } catch (relativeErr) {
            console.error('Failed to fetch with relative URL:', relativeErr.message);
            // Keep the original error if both approaches fail
          }
        }
        
        // If we have a response, process it
        if (response && response.data) {
          console.log('Ambulance data received:', response.data);
          setAmbulance(response.data.ambulance || response.data);
          setCurrentEmergency(response.data.currentEmergency);
          setServerStatus('CONNECTED');
        } else if (error) {
          // Re-throw the error to be caught by the outer catch block
          throw error;
        }
      } catch (error) {
        console.error('Error fetching ambulance data:', error);
        setServerStatus('DISCONNECTED');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAmbulanceData();
  }, [user]);
  
  // Fetch nearby hospitals
  useEffect(() => {
    const fetchNearbyHospitals = async () => {
      try {
        if (!ambulance || !ambulance.location || !ambulance.location.coordinates) {
          console.log('No ambulance location data available');
          return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Authentication token missing');
          return;
        }
        
        const { coordinates } = ambulance.location;
        console.log(`Fetching nearby hospitals for coordinates: ${coordinates}`);
        
        // Try multiple approaches to fetch data
        let response;
        let error;
        
        // First try with absolute URL
        try {
          response = await axios.get(`http://localhost:5001/api/ambulances/${user._id}/nearby-hospitals`, {
            params: {
              maxDistance: 10000 // 10km radius
            },
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-auth-token': token
            },
            timeout: 5000
          });
        } catch (err) {
          console.warn('Failed to fetch with absolute URL:', err.message);
          error = err;
          
          // Try with relative URL as fallback
          try {
            response = await axios.get(`/api/ambulances/${user._id}/nearby-hospitals`, {
              params: {
                maxDistance: 10000 // 10km radius
              },
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-auth-token': token
              }
            });
            // Clear error if relative URL succeeds
            error = null;
          } catch (relativeErr) {
            console.error('Failed to fetch with relative URL:', relativeErr.message);
            // Keep the original error if both approaches fail
          }
        }
        
        // If we have a response, process it
        if (response && response.data) {
          console.log('Nearby hospitals received:', response.data);
          
          // Handle different API response structures
          const hospitals = response.data.hospitals || response.data || [];
          
          // Safely set nearby hospitals with error checking
          if (Array.isArray(hospitals)) {
            setNearbyHospitals(hospitals);
            
            // Update stats with safe access
            setStats({
              totalHospitals: hospitals.length,
              availableHospitals: hospitals.filter(h => h && h.isAcceptingEmergencies).length,
              totalDoctors: hospitals.reduce((acc, h) => acc + ((h && h.doctors && Array.isArray(h.doctors)) ? h.doctors.length : 0), 0),
              availableDoctors: hospitals.reduce((acc, h) => 
                acc + ((h && h.doctors && Array.isArray(h.doctors)) ? h.doctors.filter(d => d && d.isAvailable).length : 0), 0)
            });
          } else {
            console.error('Invalid hospital data format:', response.data);
          }
        } else if (error) {
          // Re-throw the error to be caught by the outer catch block
          throw error;
        }
      } catch (error) {
        console.error('Error fetching nearby hospitals:', error);
        setServerStatus('DISCONNECTED');
      }
    };
    
    fetchNearbyHospitals();
  }, [ambulance, selectedHospital]);
  
  // Listen for socket events
  useEffect(() => {
    if (onEvent && user) {
      // Listen for hospital updates
      const hospitalUpdateHandler = (data) => {
        console.log('Hospital update received:', data);
        // Update nearby hospitals list if the hospital is in it
        setNearbyHospitals(prevHospitals => {
          return prevHospitals.map(hospital => {
            if (hospital._id === data.hospitalId) {
              return { ...hospital, ...data.updates };
            }
            return hospital;
          });
        });
        
        // Show notification for hospital updates
        if (data.updates && data.hospitalName) {
          setNotification({
            title: `Hospital Update`,
            message: `${data.hospitalName} updated their information`
          });
          setShowNotification(true);
        }
      };
      
      // Listen for doctor availability updates
      const doctorAvailabilityHandler = (data) => {
        console.log('Doctor availability update received:', data);
        // Update nearby hospitals list if the hospital is in it
        setNearbyHospitals(prevHospitals => {
          return prevHospitals.map(hospital => {
            if (hospital._id === data.hospitalId) {
              // Update the doctor in the hospital's doctors array
              const updatedDoctors = hospital.doctors?.map(doctor => {
                if (doctor._id === data.doctorId) {
                  return { ...doctor, isAvailable: data.isAvailable };
                }
                return doctor;
              }) || [];
              return { ...hospital, doctors: updatedDoctors };
            }
            return hospital;
          });
        });
        
        // Show notification for doctor availability
        if (data.hospitalName && data.doctorName) {
          setNotification({
            title: `Doctor Availability`,
            message: `Dr. ${data.doctorName} at ${data.hospitalName} is now ${data.isAvailable ? 'available' : 'unavailable'}`
          });
          setShowNotification(true);
        }
      };
      
      // Listen for emergency acknowledgments
      const emergencyAckHandler = (data) => {
        console.log('Emergency acknowledgment received:', data);
        if (data.hospitalName) {
          setNotification({
            title: `Hospital ${data.status}`,
            message: `Hospital ${data.hospitalName} acknowledged your notification`
          });
          setShowNotification(true);
        }
      };
      
      // Register event handlers
      onEvent('ambulance:hospital-update', hospitalUpdateHandler);
      onEvent('ambulance:doctor-availability', doctorAvailabilityHandler);
      onEvent('ambulance:emergency-acknowledgment', emergencyAckHandler);
      
      // Cleanup function
      return () => {
        // Remove event handlers
        onEvent('ambulance:hospital-update', hospitalUpdateHandler, true);
        onEvent('ambulance:doctor-availability', doctorAvailabilityHandler, true);
        onEvent('ambulance:emergency-acknowledgment', emergencyAckHandler, true);
      };
    }
  }, [onEvent, user]);

  // Function to select a hospital
  const handleSelectHospital = (hospital) => {
    setSelectedHospital(hospital);
    setNotification({
      title: 'Hospital Selected',
      message: `${hospital.hospitalName} has been selected`
    });
    setShowNotification(true);
  };

  // Function to call the hospital
  const handleCallHospital = () => {
    if (selectedHospital && selectedHospital.phone) {
      window.location.href = `tel:${selectedHospital.phone}`;
    } else {
      setNotification({
        title: 'Cannot Call Hospital',
        message: 'No phone number available for this hospital'
      });
      setShowNotification(true);
    }
  };

  // Function to change hospital
  const handleChangeHospital = () => {
    // Navigate to hospital selection page
    window.location.href = '/ambulance/hospital-selection';
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Loader />
      </Container>
    );
  }

  return (
    <>
      <AmbulanceNavbar />
      {/* Notification Toast */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1070 }}>
        <Toast 
          show={showNotification} 
          onClose={() => setShowNotification(false)} 
          delay={5000} 
          autohide
        >
          <Toast.Header closeButton>
            <strong className="me-auto">{notification.title}</strong>
          </Toast.Header>
          <Toast.Body>{notification.message}</Toast.Body>
        </Toast>
      </ToastContainer>

      <div className="dashboard-wrapper">
        <div className="dashboard-grid">
          {/* Server Status */}
          <div className="dashboard-card server-status">
            <div className="card-header">
              <div className={`icon-box ${serverStatus === 'CONNECTED' ? 'green' : 'red'}`}>
                <FaCircle className="icon" />
              </div>
              <h3>Server Status</h3>
            </div>
            <div className="card-content">
              <h2 className={`status-text ${serverStatus === 'CONNECTED' ? 'text-success' : 'text-danger'}`}>
                {serverStatus}
              </h2>
              <p className="status-description">
                {serverStatus === 'CONNECTED' 
                  ? 'You are connected to the emergency network' 
                  : 'Connection to emergency network lost'}
              </p>
            </div>
          </div>

          {/* Hospitals Available */}
          <div className="dashboard-card hospitals-available">
            <div className="card-header">
              <div className="icon-box blue" style={{ backgroundColor: '#4e73df' }}>
                <FaHospital className="icon" style={{ color: '#ffffff' }} />
              </div>
              <h3 style={{ color: '#4e73df', fontWeight: '600' }}>Hospitals Available</h3>
            </div>
            <div className="card-content">
              <div className="stat-number" style={{ fontSize: '2rem', fontWeight: '600', color: '#4e73df' }}>{stats.totalHospitals > 0 ? stats.totalHospitals : 0}</div>
              <div className="stat-description" style={{ fontSize: '1rem', color: '#5a5c69' }}>hospitals registered in the system</div>
              {nearbyHospitals.length > 0 && (
                <div className="hospitals-list">
                  <h4 style={{ color: '#4e73df', marginTop: '15px', fontSize: '16px' }}>Nearby Hospitals:</h4>
                  <ul style={{ listStyleType: 'none', padding: '0', margin: '10px 0' }}>
                    {nearbyHospitals.slice(0, 3).map(hospital => (
                      <li key={hospital._id} style={{ padding: '5px 0', borderBottom: '1px solid #e3e6f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <FaHospital style={{ marginRight: '8px', color: '#4e73df' }} />
                          <span style={{ fontWeight: '500' }}>{hospital.hospitalName}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#5a5c69', marginLeft: '24px' }}>
                          {hospital.availableDoctors} doctors available
                        </div>
                      </li>
                    ))}
                  </ul>
                  {nearbyHospitals.length > 3 && (
                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#4e73df' }}>
                      + {nearbyHospitals.length - 3} more hospitals
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected Hospital */}
          <div className="dashboard-card selected-hospital">
            <div className="card-header">
              <div className="icon-box teal">
                <FaHospital className="icon" />
              </div>
              <h3>Selected Hospital</h3>
            </div>
            <div className="card-content">
              {selectedHospital ? (
                <div className="hospital-details">
                  <h3 className="hospital-name">{selectedHospital.hospitalName}</h3>
                  
                  <div className="detail-row">
                    <FaMapMarkerAlt className="detail-icon" />
                    <div>
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">
                        {selectedHospital.address ? 
                          `${selectedHospital.address.street}, ${selectedHospital.address.city}, ${selectedHospital.address.state} ${selectedHospital.address.zipCode}` : 
                          'Address not available'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="detail-row">
                    <FaPhone className="detail-icon" />
                    <div>
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{selectedHospital.phone || 'Not provided'}</span>
                    </div>
                  </div>
                  
                  {/* Emergency acceptance status removed as requested */}
                  
                  <div className="detail-row">
                    <FaUserMd className="detail-icon" />
                    <div>
                      <span className="detail-label">Doctors:</span>
                      <Badge className="status-badge" bg="primary">
                        {(selectedHospital.doctors && Array.isArray(selectedHospital.doctors)) ? 
                          `${selectedHospital.doctors.filter(d => d && d.isAvailable).length} of ${selectedHospital.doctors.length}` : 
                          '1 of 1'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="specializations">
                    <span className="detail-label">Available Specializations:</span>
                    <div className="specialization-badges">
                      {(selectedHospital.specializations && Array.isArray(selectedHospital.specializations) && 
                        selectedHospital.specializations.length > 0) ? 
                        selectedHospital.specializations.map((spec, index) => (
                          <Badge key={index} bg="secondary" className="specialization-badge">{spec}</Badge>
                        )) : 
                        <Badge bg="secondary" className="specialization-badge">General</Badge>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="select-hospital-btn">
                  <p>No hospital selected</p>
                  <Button 
                    variant="outline-light"
                    as={Link}
                    to="/ambulance/hospitals"
                  >
                    Select Hospital
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Ambulance Information */}
          <div className="dashboard-card ambulance-info">
            <div className="card-header">
              <div className="icon-box blue" style={{ backgroundColor: '#4e73df' }}>
                <FaAmbulance className="icon" style={{ color: '#ffffff' }} />
              </div>
              <h3 style={{ color: '#4e73df', fontWeight: '600' }}>Ambulance Information</h3>
            </div>
            <div className="card-content">
              {ambulance ? (
                <div className="ambulance-details">
                  <div className="detail-row">
                    <FaIdCard className="detail-icon" style={{ color: '#4e73df' }} />
                    <div>
                      <span className="detail-label" style={{ color: '#5a5c69' }}>Ambulance ID:</span>
                      <span className="detail-value" style={{ color: '#3a3b45', fontWeight: '500' }}>{ambulance._id}</span>
                    </div>
                  </div>

                  {ambulance.driverName && (
                    <div className="detail-row">
                      <FaUserMd className="detail-icon" style={{ color: '#4e73df' }} />
                      <div>
                        <span className="detail-label" style={{ color: '#5a5c69' }}>Driver:</span>
                        <span className="detail-value" style={{ color: '#3a3b45', fontWeight: '500' }}>{ambulance.driverName}</span>
                      </div>
                    </div>
                  )}
                  
                  {ambulance.vehicleNumber && (
                    <div className="detail-row">
                      <FaAmbulance className="detail-icon" style={{ color: '#e74a3b' }} />
                      <div>
                        <span className="detail-label" style={{ color: '#5a5c69' }}>Vehicle Number:</span>
                        <span className="detail-value" style={{ color: '#3a3b45', fontWeight: '500' }}>{ambulance.vehicleNumber}</span>
                      </div>
                    </div>
                  )}
                  
                  {ambulance.organizationName && (
                    <div className="detail-row">
                      <FaBuilding className="detail-icon" style={{ color: '#36b9cc' }} />
                      <div>
                        <span className="detail-label" style={{ color: '#5a5c69' }}>Organization:</span>
                        <span className="detail-value" style={{ color: '#3a3b45', fontWeight: '500' }}>{ambulance.organizationName}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Location Information */}
                  <div className="detail-row">
                    <FaMapMarkerAlt className="detail-icon" style={{ color: '#e74a3b' }} />
                    <div>
                      <span className="detail-label" style={{ color: '#5a5c69' }}>Location Status:</span>
                      <Badge bg={locationUpdateStatus === 'Active' ? 'success' : 
                              locationUpdateStatus === 'Initializing' ? 'warning' : 
                              locationUpdateStatus.includes('Error') ? 'danger' : 'secondary'}
                        style={{ marginLeft: '5px' }}>
                        {locationUpdateStatus}
                      </Badge>
                    </div>
                  </div>
                  
                  {currentLocation && (
                    <div className="detail-row">
                      <FaMapMarkerAlt className="detail-icon" style={{ color: '#1cc88a' }} />
                      <div>
                        <span className="detail-label" style={{ color: '#5a5c69' }}>Current Coordinates:</span>
                        <span className="detail-value" style={{ color: '#3a3b45', fontWeight: '500', fontSize: '0.9rem' }}>
                          [{currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}]
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {currentEmergency && (
                    <div className="emergency-info">
                      <h4 style={{ color: '#4e73df', fontWeight: '600' }}>Current Emergency</h4>
                      <div className="detail-row">
                        <FaCircle className="detail-icon" style={{ color: '#f6c23e' }} />
                        <div>
                          <span className="detail-label" style={{ color: '#5a5c69' }}>Status:</span>
                          <Badge bg={
                            currentEmergency.status === 'Requested' ? 'warning' :
                            currentEmergency.status === 'Accepted' ? 'success' :
                            currentEmergency.status === 'En Route' ? 'info' :
                            currentEmergency.status === 'Arrived' ? 'primary' :
                            currentEmergency.status === 'Completed' ? 'secondary' : 'danger'
                          }>
                            {currentEmergency.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="no-data">No ambulance data available</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card quick-actions">
            <div className="card-header">
              <div className="icon-box yellow" style={{ backgroundColor: '#f6c23e' }}>
                <FaCircle className="icon" style={{ color: '#ffffff' }} />
              </div>
              <h3 style={{ color: '#4e73df', fontWeight: '600' }}>Quick Actions</h3>
            </div>
            <div className="card-content">
              <div className="action-buttons">
                <Button 
                  className="action-btn call-hospital"
                  onClick={handleCallHospital}
                  disabled={!selectedHospital || !selectedHospital.phone}
                  style={{ backgroundColor: '#4e73df', borderColor: '#4e73df' }}
                >
                  <FaPhone className="btn-icon" /> Call Hospital
                </Button>
                
                <Button 
                  className="action-btn change-hospital"
                  as={Link}
                  to="/ambulance/hospitals"
                  style={{ backgroundColor: '#1cc88a', borderColor: '#1cc88a' }}
                >
                  <FaExchangeAlt className="btn-icon" /> Change Hospital
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AmbulanceDashboard;
