import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Alert } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import api from '../../utils/axiosConfig';
import Loader from '../../components/common/Loader';
import HospitalNavbar from '../../components/hospital/HospitalNavbar';
import { FaAmbulance, FaUser, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';
import '../../styles/emergency-text-visibility.css'; // Import the new CSS file for text visibility

const EmergencyRequests = () => {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch emergency requests
  useEffect(() => {
    const fetchEmergencies = async () => {
      try {
        if (!user || !user._id) return;
        
        console.log('Fetching emergency requests for hospital:', user._id);
        
        // Use the correct endpoint to fetch emergencies
        const res = await api.get('/emergencies', {
          params: { hospital: user._id }
        });
        
        console.log('Emergencies fetched:', res.data);
        
        if (Array.isArray(res.data)) {
          setEmergencies(res.data);
        } else {
          console.error('Unexpected response format:', res.data);
          setError('Received invalid data format');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching emergency requests:', error);
        setError('Failed to load emergency requests');
        setLoading(false);
      }
    };
    
    if (user && user._id) {
      fetchEmergencies();
    }
  }, [user]);

  // Listen for socket events
  useEffect(() => {
    if (!socket || !user) return;
    
    console.log('Setting up socket listeners for emergency requests');
    
    // Handle emergency notifications
    const handleEmergencyNotification = (data) => {
      console.log('Received emergency notification:', data);
      
      if (!data) return;
      
      // Extract emergency data from notification
      const emergencyData = data.emergency || data;
      
      // Check if this notification is for this hospital
      if ((data.hospitalId === user._id) || 
          (emergencyData.hospital && emergencyData.hospital === user._id)) {
        
        console.log('Processing emergency notification for this hospital');
        
        // Check if we already have this emergency
        const exists = emergencies.some(e => e._id === emergencyData._id);
        
        if (!exists) {
          console.log('Adding new emergency to list');
          
          // Create a properly formatted emergency object
          const newEmergency = {
            _id: emergencyData._id || `temp-${Date.now()}`,
            status: emergencyData.status || 'Requested',
            severity: emergencyData.severity || 'Medium',
            emergencyType: emergencyData.emergencyType || 'Ambulance Arrival',
            notes: emergencyData.notes || 'No additional information',
            createdAt: emergencyData.createdAt || new Date().toISOString(),
            // Ensure ambulance is a string ID or simple object with safe-to-render properties
            ambulanceDetails: {
              name: (typeof emergencyData.ambulance === 'object' && emergencyData.ambulance?.name) 
                  || data.ambulanceName 
                  || 'Unknown Ambulance',
              id: (typeof emergencyData.ambulance === 'object' ? emergencyData.ambulance?._id : emergencyData.ambulance) 
                  || data.ambulanceId 
                  || 'unknown'
            }
          };
          
          setEmergencies(prev => [newEmergency, ...prev]);
          setSuccess(`New emergency notification received`);
        }
      }
    };
    
    // Listen for various notification events
    socket.on('hospital:emergency-notification', handleEmergencyNotification);
    socket.on('hospital:ambulance-request', handleEmergencyNotification);
    socket.on('emergency:update', handleEmergencyNotification);
    
    return () => {
      socket.off('hospital:emergency-notification', handleEmergencyNotification);
      socket.off('hospital:ambulance-request', handleEmergencyNotification);
      socket.off('emergency:update', handleEmergencyNotification);
      console.log('Emergency request socket listeners removed');
    };
  }, [socket, user, emergencies]);

  // Update emergency status
  const updateEmergencyStatus = async (emergencyId, newStatus) => {
    try {
      if (!emergencyId) {
        setError('Cannot update emergency: Invalid emergency ID');
        return;
      }
      
      console.log(`Updating emergency ${emergencyId} to status: ${newStatus}`);
      
      const res = await api.put(`/emergencies/${emergencyId}`, {
        status: newStatus
      });
      
      console.log('Emergency updated:', res.data);
      
      // Find the emergency to get ambulance ID
      const emergency = emergencies.find(e => e._id === emergencyId);
      const ambulanceId = emergency?.ambulance || emergency?.ambulanceDetails?.id;
      
      // Update local state
      setEmergencies(prev => 
        prev.map(emergency => 
          emergency._id === emergencyId 
            ? { ...emergency, status: newStatus }
            : emergency
        )
      );
      
      setSuccess(`Emergency status updated to ${newStatus}`);
      
      // Emit socket event if socket is available
      if (socket) {
        socket.emit('hospital:response', {
          emergencyId,
          hospitalId: user._id,
          status: newStatus,
          message: `Hospital updated emergency status to ${newStatus}`
        });
        
        // If status is Completed, emit additional event to update trip counter
        if (newStatus === 'Completed' && ambulanceId) {
          console.log(`Emitting trip completion event for ambulance: ${ambulanceId}`);
          socket.emit('emergency:completed', {
            emergencyId,
            hospitalId: user._id,
            ambulanceId: ambulanceId,
            driverName: emergency?.driverName || emergency?.driver || 'Unknown Driver',
            completedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error updating emergency status:', error);
      setError(`Failed to update emergency status: ${error.message || 'Unknown error'}`);
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Requested':
        return 'warning';
      case 'Accepted':
        return 'success';
      case 'En Route':
        return 'info';
      case 'Arrived':
        return 'primary';
      case 'Completed':
        return 'secondary';
      case 'Cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Get severity badge color
  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'Critical':
        return 'danger';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'info';
      case 'Low':
        return 'success';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <HospitalNavbar />
      <Container className="mt-4 emergency-requests">
      <Row className="mb-4">
        <Col>
          <h2>Emergency Requests</h2>
          <p className="text-muted">Manage and respond to ambulance emergency requests</p>
        </Col>
      </Row>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      {emergencies.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <FaAmbulance size={50} className="text-muted mb-3" />
            <h4>No Emergency Requests</h4>
            <p className="text-muted">
              You don't have any emergency requests at the moment.
            </p>
          </Card.Body>
        </Card>
      ) : (
        emergencies.map((emergency) => (
          <Card key={emergency._id || `emergency-${Math.random()}`} className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaAmbulance className="me-2" />
                {emergency.emergencyType || 'Emergency Request'}
              </h5>
              <Badge bg={getStatusBadgeColor(emergency.status)}>
                {emergency.status || 'Unknown Status'}
              </Badge>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={8}>
                  <Row>
                    <Col md={6}>
                      <div className="mb-4">
                        <h6 className="mb-2">Ambulance Details</h6>
                        <p className="mb-1">
                          <strong>Driver Name:</strong> {emergency.driverName || emergency.driver || emergency.ambulanceDetails?.driverName || 'Unknown Driver'} (ID: {emergency.ambulance || emergency.ambulanceDetails?.id || 'Unknown'})
                        </p>
                        <p className="mb-0">
                          <strong>Vehicle Number:</strong> {emergency.vehicleNumber || emergency.ambulanceDetails?.vehicleNumber || 'Unknown'}
                        </p>
                      </div>
                      
                      <div className="mb-4">
                        <h6 className="mb-2">Patient Information</h6>
                        <p className="mb-1">
                          <strong>Gender:</strong> {emergency.gender || emergency.patient?.gender || 'Unknown'}
                        </p>
                        <p className="mb-0">
                          <strong>Patient Type:</strong> {emergency.patientType || 'General Emergency'}
                        </p>
                      </div>
                    </Col>
                    
                    <Col md={6}>
                      <div className="mb-4">
                        <h6 className="mb-2">Emergency Details</h6>
                        <p className="mb-1">
                          <strong>Message:</strong> {emergency.notes || 'No additional notes'}
                        </p>
                        <p className="mb-1">
                          <strong>Arrival Time:</strong> {emergency.createdAt ? new Date(emergency.createdAt).toLocaleString() : 'Unknown time'}
                        </p>
                      </div>
                      
                      <div>
                        <h6 className="mb-2">Current Location</h6>
                        {emergency.location?.coordinates && emergency.location.coordinates.length >= 2 ? (
                          <>
                            <p className="mb-1">
                              <strong>Latitude:</strong> {emergency.location.coordinates[1]}
                            </p>
                            <p className="mb-0">
                              <strong>Longitude:</strong> {emergency.location.coordinates[0]}
                            </p>
                          </>
                        ) : emergency.ambulance?.location?.coordinates && emergency.ambulance.location.coordinates.length >= 2 ? (
                          <>
                            <p className="mb-1">
                              <strong>Latitude:</strong> {emergency.ambulance.location.coordinates[1]}
                            </p>
                            <p className="mb-0">
                              <strong>Longitude:</strong> {emergency.ambulance.location.coordinates[0]}
                            </p>
                          </>
                        ) : (
                          <p className="mb-0 text-muted">No coordinates available</p>
                        )}
                      </div>
                    </Col>
                  </Row>
                </Col>
                
                <Col md={4}>
                  <Card className="h-100">
                    <Card.Header>
                      <h5 className="mb-0">Actions</h5>
                    </Card.Header>
                    <Card.Body>
                      <p className="mb-3">
                        <strong>Request Time:</strong><br />
                        {emergency.createdAt ? new Date(emergency.createdAt).toLocaleString() : 'Unknown time'}
                      </p>
                      
                      {emergency.status === 'Requested' && (
                        <div className="d-grid gap-2">
                          <Button 
                            variant="success" 
                            onClick={() => updateEmergencyStatus(emergency._id, 'Accepted')}
                            size="lg"
                            className="py-3 mb-2"
                          >
                            <i className="fas fa-check-circle me-2"></i>
                            Accept
                          </Button>
                          <Button 
                            variant="danger" 
                            onClick={() => updateEmergencyStatus(emergency._id, 'Cancelled')}
                          >
                            Decline Arrival
                          </Button>
                        </div>
                      )}
                      
                      {(emergency.status === 'Accepted' || emergency.status === 'En Route' || emergency.status === 'Arrived') && (
                        <div className="d-grid gap-2">
                          <p className="text-success mb-3">
                            You have accepted this ambulance arrival.
                          </p>
                          <Button 
                            variant="success" 
                            onClick={() => updateEmergencyStatus(emergency._id, 'Completed')}
                            size="lg"
                            className="py-3"
                          >
                            <i className="fas fa-check-double me-2"></i>
                            Complete
                          </Button>
                        </div>
                      )}
                      
                      {(emergency.status === 'Completed' || emergency.status === 'Cancelled') && (
                        <p className={`text-${emergency.status === 'Completed' ? 'success' : 'danger'} mb-0`}>
                          This arrival notification has been {emergency.status ? emergency.status.toLowerCase() : 'processed'}.
                          No further action is required.
                        </p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        ))
      )}
    </Container>
    </>
  );
};

export default EmergencyRequests;
