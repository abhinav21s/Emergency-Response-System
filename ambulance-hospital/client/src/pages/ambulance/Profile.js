import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Toast, ToastContainer } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import axios from 'axios';
import Loader from '../../components/common/Loader';
import AmbulanceNavbar from '../../components/ambulance/AmbulanceNavbar';
import '../../styles/ambulance-text-visibility.css';
import '../../styles/profile-text-visibility.css'; // Added for improved text visibility
import './profile.css'; // Custom profile styles

const AmbulanceProfile = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ambulance, setAmbulance] = useState(null);
  const [driverStats, setDriverStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showTripNotification, setShowTripNotification] = useState(false);
  const [tripNotification, setTripNotification] = useState({});
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    ambulanceId: '',
    driverName: '',
    driverLicense: '',
    vehicleType: '',
    vehicleNumber: '',
    organizationName: '',
    organizationAddress: '',
    organizationContact: '',
    latitude: '',
    longitude: ''
  });

  // Listen for trip completion socket events
  useEffect(() => {
    if (!socket || !user) return;
    
    console.log('Setting up socket listener for trip completion events');
    
    const handleTripCompletion = (data) => {
      console.log('Trip completion notification received:', data);
      
      // Show notification toast
      setTripNotification({
        driverName: data.driverName || 'Unknown Driver',
        hospitalId: data.hospitalId,
        completedAt: data.completedAt
      });
      setShowTripNotification(true);
      
      // Refresh driver trip statistics
      fetchDriverTripStats();
    };
    
    // Listen for trip completion events
    socket.on('trip:completed', handleTripCompletion);
    
    return () => {
      socket.off('trip:completed', handleTripCompletion);
    };
  }, [socket, user]);
  
  // Fetch ambulance data and driver trip statistics
  useEffect(() => {
    const fetchAmbulanceData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication token missing. Please log in again.');
          setLoading(false);
          return;
        }

        // Use absolute URL with port 5001 as required
        const res = await axios.get(`http://localhost:5001/api/ambulances/${user._id}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-auth-token': token
          },
          timeout: 5000
        });
        
        const ambulanceData = res.data.ambulance || res.data;
        
        setAmbulance(ambulanceData);
        
        // Set form data
        setFormData({
          name: ambulanceData.name || '',
          email: ambulanceData.email || '',
          phone: ambulanceData.phone || '',
          ambulanceId: ambulanceData.ambulanceId || '',
          driverName: ambulanceData.driverName || '',
          driverLicense: ambulanceData.driverLicense || '',
          vehicleType: ambulanceData.vehicleType || '',
          vehicleNumber: ambulanceData.vehicleNumber || '',
          organizationName: ambulanceData.organization?.name || '',
          organizationAddress: ambulanceData.organization?.address || '',
          organizationContact: ambulanceData.organization?.contactNumber || '',
          latitude: ambulanceData.location?.coordinates[1] || '',
          longitude: ambulanceData.location?.coordinates[0] || ''
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching ambulance data:', error);
        setError('Failed to load ambulance profile data');
        setLoading(false);
      }
    };
    
    fetchAmbulanceData();
    fetchDriverTripStats();
  }, [user._id]);
  
  // Fetch driver trip statistics
  const fetchDriverTripStats = async () => {
    try {
      setLoadingStats(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoadingStats(false);
        return;
      }

      const res = await axios.get(`http://localhost:5001/api/ambulances/${user._id}/driver-trips`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        },
        timeout: 5000
      });
      
      setDriverStats(res.data.drivers || []);
      setLoadingStats(false);
    } catch (error) {
      console.error('Error fetching driver trip statistics:', error);
      setLoadingStats(false);
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Could not get your current location. Please enter coordinates manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser. Please enter coordinates manually.');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUpdating(true);
    
    try {
      // Prepare update data
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        driverName: formData.driverName,
        vehicleType: formData.vehicleType,
        vehicleNumber: formData.vehicleNumber,
        organization: {
          name: formData.organizationName,
          address: formData.organizationAddress,
          contactNumber: formData.organizationContact
        },
        location: {
          type: 'Point',
          coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)]
        }
      };
      
      // Update profile
      await updateProfile(updateData);
      
      setSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="profile-page">
      <AmbulanceNavbar />
      <Container className="py-5">
      {/* Trip Completion Notification Toast */}
      <ToastContainer position="top-end" className="p-3">
        <Toast 
          show={showTripNotification} 
          onClose={() => setShowTripNotification(false)} 
          delay={5000} 
          autohide
          bg="success"
        >
          <Toast.Header closeButton>
            <strong className="me-auto">Trip Completed</strong>
            <small>{new Date(tripNotification.completedAt).toLocaleTimeString()}</small>
          </Toast.Header>
          <Toast.Body className="text-white">
            Driver <strong>{tripNotification.driverName}</strong> has completed a trip.
            The trip counter has been updated.
          </Toast.Body>
        </Toast>
      </ToastContainer>
      <h1 className="ambulance-profile-title">Ambulance Profile</h1>
      <p className="profile-subtitle">Manage your ambulance information and settings</p>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      {loading ? (
        <Loader />
      ) : (
        <>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={8}>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Basic Information</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="name">
                        <Form.Label>Administrator Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Enter administrator name"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="email">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          value={formData.email}
                          disabled
                          readOnly
                        />
                        <Form.Text className="text-muted">
                          Email cannot be changed
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="phone">
                        <Form.Label>Phone Number</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Enter phone number"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="ambulanceId">
                        <Form.Label>Ambulance ID</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.ambulanceId}
                          disabled
                          readOnly
                        />
                        <Form.Text className="text-muted">
                          Ambulance ID cannot be changed
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="driverName">
                        <Form.Label>Driver Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="driverName"
                          value={formData.driverName}
                          onChange={handleChange}
                          placeholder="Enter driver name"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="driverLicense">
                        <Form.Label>Driver License</Form.Label>
                        <Form.Control
                          type="text"
                          value={formData.driverLicense}
                          disabled
                          readOnly
                        />
                        <Form.Text className="text-muted">
                          License number cannot be changed
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="vehicleType">
                        <Form.Label>Vehicle Type</Form.Label>
                        <Form.Select
                          name="vehicleType"
                          value={formData.vehicleType}
                          onChange={handleChange}
                          required
                        >
                          <option value="Basic">Basic</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Critical Care">Critical Care</option>
                          <option value="Neonatal">Neonatal</option>
                          <option value="Patient Transport">Patient Transport</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3" controlId="vehicleNumber">
                        <Form.Label>Vehicle Number</Form.Label>
                        <Form.Control
                          type="text"
                          name="vehicleNumber"
                          value={formData.vehicleNumber}
                          onChange={handleChange}
                          placeholder="Enter vehicle number"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={5}>
                      <Form.Group className="mb-3" controlId="latitude">
                        <Form.Label>Latitude</Form.Label>
                        <Form.Control
                          type="text"
                          name="latitude"
                          value={formData.latitude}
                          onChange={handleChange}
                          placeholder="Enter latitude"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={5}>
                      <Form.Group className="mb-3" controlId="longitude">
                        <Form.Label>Longitude</Form.Label>
                        <Form.Control
                          type="text"
                          name="longitude"
                          value={formData.longitude}
                          onChange={handleChange}
                          placeholder="Enter longitude"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={2} className="d-flex align-items-end mb-3">
                      <Button 
                        variant="secondary" 
                        onClick={getCurrentLocation}
                        className="w-100"
                      >
                        Update
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={4}>
              <Card className="mb-4">
                <Card.Header>
                  <h5 className="mb-0">Organization Information</h5>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3" controlId="organizationName">
                    <Form.Label>Organization Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleChange}
                      placeholder="Enter organization name"
                      required
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3" controlId="organizationAddress">
                    <Form.Label>Organization Address</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="organizationAddress"
                      value={formData.organizationAddress}
                      onChange={handleChange}
                      placeholder="Enter organization address"
                      required
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3" controlId="organizationContact">
                    <Form.Label>Organization Contact</Form.Label>
                    <Form.Control
                      type="tel"
                      name="organizationContact"
                      value={formData.organizationContact}
                      onChange={handleChange}
                      placeholder="Enter organization contact"
                      required
                    />
                  </Form.Group>
                </Card.Body>
              </Card>
              
              <Button 
                variant="primary" 
                type="submit" 
                className="w-100 mb-3"
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Profile'}
              </Button>
            </Col>
          </Row>
        </Form>
        
        {/* Driver Trip Statistics Section */}
        <h2 className="mt-5 mb-3">Driver Trip Statistics</h2>
        <p className="text-muted mb-4">View completed trips by driver for payment analysis</p>
        
        {loadingStats ? (
          <Loader />
        ) : (
          <Row>
            {driverStats.length > 0 ? (
              driverStats.map((driver, index) => (
                <Col md={4} key={index} className="mb-4">
                  <Card className="h-100 driver-stats-card">
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">{driver.driverName}</h5>
                      <Badge bg="success" pill>{driver.totalTrips} Trips</Badge>
                    </Card.Header>
                    <Card.Body>
                      <div className="d-flex justify-content-between mb-3">
                        <span className="text-muted">Total Completed Trips:</span>
                        <span className="fw-bold">{driver.totalTrips}</span>
                      </div>
                      
                      <h6 className="mb-3">Recent Trips:</h6>
                      {driver.completedTrips.slice(0, 5).map((trip, tripIndex) => (
                        <div key={tripIndex} className="trip-item mb-2 p-2 border-bottom">
                          <div className="d-flex justify-content-between">
                            <small>{new Date(trip.date).toLocaleDateString()}</small>
                            <small className="text-primary">{trip.emergencyType}</small>
                          </div>
                          <div className="d-flex justify-content-between">
                            <small className="text-muted">Severity:</small>
                            <small>
                              <Badge 
                                bg={trip.severity === 'Critical' ? 'danger' : 
                                    trip.severity === 'High' ? 'warning' : 
                                    trip.severity === 'Medium' ? 'info' : 'secondary'}
                                pill
                              >
                                {trip.severity}
                              </Badge>
                            </small>
                          </div>
                        </div>
                      ))}
                    </Card.Body>
                    <Card.Footer className="bg-white">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Payment Due:</span>
                        <span className="fw-bold text-success">
                          ₹{(driver.totalTrips * 500).toLocaleString()}
                        </span>
                      </div>
                    </Card.Footer>
                  </Card>
                </Col>
              ))
            ) : (
              <Col md={12}>
                <Alert variant="info">
                  No completed trips found for any drivers. Trip statistics will appear here once trips are completed.
                </Alert>
              </Col>
            )}
          </Row>
        )}
        </>
      )}
    </Container>
    </div>
  );
};

export default AmbulanceProfile;
