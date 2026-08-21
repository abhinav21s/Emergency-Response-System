import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import HospitalNavbar from '../../components/hospital/HospitalNavbar';
import { FaUserMd, FaAmbulance, FaBed, FaHospital, FaSignOutAlt } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import Loader from '../../components/common/Loader';
import api from '../../utils/axiosConfig';

const HospitalDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { socket, onEvent } = useContext(SocketContext);
  
  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalDoctors: 0,
    availableDoctors: 0,
    pendingRequests: 0,
    acceptedRequests: 0
  });

  // Fetch hospital data
  useEffect(() => {
    const fetchHospitalData = async () => {
      try {
        if (!user || !user._id) {
          console.error('User or user ID is missing');
          setLoading(false);
          return;
        }

        const res = await api.get(`/hospitals/${user._id}`);
        setHospital(res.data.hospital || res.data);
        
        // Set doctors if available in response
        if (res.data.doctors) {
          setDoctors(res.data.doctors);
          
          // Calculate stats
          const availableDocs = res.data.doctors.filter(doctor => doctor.isAvailable).length;
          
          setStats(prevStats => ({
            ...prevStats,
            totalDoctors: res.data.doctors.length,
            availableDoctors: availableDocs
          }));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching hospital data:', error);
        setError('Failed to load hospital data');
        setLoading(false);
      }
    };
    
    if (user && user._id) {
      fetchHospitalData();
    }
  }, [user]);
  
  // Fetch emergency requests
  useEffect(() => {
    const fetchEmergencyRequests = async () => {
      try {
        if (!user || !user._id) {
          console.error('User or user ID is missing');
          return;
        }

        console.log('Fetching emergency requests for hospital:', user._id);
        
        // Use the correct endpoint for emergencies with strict filtering
        const res = await api.get('/emergencies', {
          params: { hospital: user._id }
        });
        
        console.log('Emergency requests received:', res.data);
        
        if (Array.isArray(res.data)) {
          // Additional filtering on client side to ensure only this hospital's requests are shown
          const filteredRequests = res.data.filter(req => {
            // Check if the hospital ID matches the current user's ID
            const hospitalId = req.hospital?._id || req.hospital;
            const matches = hospitalId === user._id;
            
            if (!matches) {
              console.warn(`Filtering out emergency request ${req._id} for hospital ${hospitalId} (not matching current user ${user._id})`);
            }
            
            return matches;
          });
          
          console.log(`Filtered ${res.data.length - filteredRequests.length} emergency requests that don't belong to this hospital`);
          console.log('Final emergency requests:', filteredRequests);
          
          setEmergencyRequests(filteredRequests);
          
          // Update stats with filtered data
          const pending = filteredRequests.filter(req => req.status === 'Requested').length;
          const accepted = filteredRequests.filter(req => ['Accepted', 'En Route', 'Arrived'].includes(req.status)).length;
          
          setStats(prevStats => ({
            ...prevStats,
            pendingRequests: pending,
            acceptedRequests: accepted
          }));
        } else {
          console.error('Unexpected response format:', res.data);
        }
      } catch (error) {
        console.error('Error fetching emergency requests:', error);
      }
    };
    
    if (user && user._id) {
      fetchEmergencyRequests();
    }
  }, [user]);
  


  // Handle doctor availability change
  const handleDoctorAvailability = (data) => {
    console.log('Received doctor availability update:', data);
    
    if (data && data.doctorId && (data.hospitalId === user._id)) {
      setDoctors(prev => 
        prev.map(doc => 
          doc._id === data.doctorId 
            ? { ...doc, isAvailable: data.isAvailable } 
            : doc
        )
      );
      
      // Update available doctors count
      if (data.isAvailable) {
        setStats(prev => ({
          ...prev,
          availableDoctors: prev.availableDoctors + 1
        }));
      } else {
        setStats(prev => ({
          ...prev,
          availableDoctors: Math.max(0, prev.availableDoctors - 1)
        }));
      }
    }
  };

  // Listen for socket events - only for doctor availability now
  useEffect(() => {
    if (!socket || !user) {
      console.log('Socket or user not available, cannot set up listeners');
      return;
    }

    console.log('Setting up socket listeners for hospital dashboard');
    
    // Only listen for doctor availability events in the dashboard
    const cleanupDoctorAvailability = onEvent('hospital:doctor-availability', handleDoctorAvailability);
    
    return () => {
      // Clean up all listeners
      cleanupDoctorAvailability();
      
      console.log('Cleaned up socket listeners');
    };
  }, [socket, user, onEvent]);

  // Note: Emergency notification functionality has been moved to the global HospitalNotifications component
  
  // Note: Emergency notification functionality has been moved to the global HospitalNotifications component

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <h3>Error</h3>
          <p>{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </Container>
    );
  }

  if (!hospital) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <h3>Hospital Not Found</h3>
          <p>Unable to load hospital data</p>
          <Button as={Link} to="/">Go Home</Button>
        </div>
      </Container>
    );
  }

  return (
    <>
      <HospitalNavbar />
      <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <Card className="hospital-status-card">
            <Card.Header>
              <h5 className="section-title" style={{ color: '#4e73df', fontWeight: '600' }}>Hospital Status</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h3 className="hospital-name mb-0" style={{ color: '#3a3b45', fontWeight: '700' }}>{hospital.hospitalName}</h3>
                  <p className="hospital-subtitle mb-0" style={{ color: '#6e707e' }}>{hospital.address?.city}, {hospital.address?.state}</p>
                </div>
              </div>
              
              <hr/>
              
              <Row className="mb-4">
                <Col md={3}>
                  <div className="stat-card">
                  <div className="stat-icon" style={{ color: '#4e73df' }}>
                    <FaUserMd />
                  </div>
                  <div className="stat-value" style={{ color: '#2e59d9' }}>{stats.totalDoctors}</div>
                  <div className="stat-label" style={{ color: '#5a5c69' }}>Total Doctors</div>
                </div>
                </Col>
                <Col md={3}>
                  <div className="stat-card">
                  <div className="stat-icon" style={{ color: '#1cc88a' }}>
                    <FaUserMd />
                  </div>
                  <div className="stat-value" style={{ color: '#169a6f' }}>{stats.availableDoctors}</div>
                  <div className="stat-label" style={{ color: '#5a5c69' }}>Available Doctors</div>
                </div>
                </Col>
                <Col md={3}>
                  <div className="stat-card">
                  <div className="stat-icon" style={{ color: '#f6c23e' }}>
                    <FaAmbulance />
                  </div>
                  <div className="stat-value" style={{ color: '#dda20a' }}>{stats.pendingRequests}</div>
                  <div className="stat-label" style={{ color: '#5a5c69' }}>Pending Requests</div>
                </div>
                </Col>
                <Col md={3}>
                  <div className="stat-card">
                  <div className="stat-icon" style={{ color: '#e74a3b' }}>
                    <FaAmbulance />
                  </div>
                  <div className="stat-value" style={{ color: '#c72a1c' }}>{stats.acceptedRequests}</div>
                  <div className="stat-label" style={{ color: '#5a5c69' }}>Accepted Requests</div>
                </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col>
          <Card className="emergency-request-section">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="section-title mb-0" style={{ color: '#4e73df', fontWeight: '600' }}>Recent Emergency Requests</h5>
              <Button as={Link} to="/hospital/emergency-requests" variant="outline-primary" size="sm" className="btn-action btn-view">
                View All
              </Button>
            </Card.Header>
            <Card.Body>
              {emergencyRequests.length === 0 ? (
                <p className="text-center" style={{ color: '#858796', textShadow: '0 1px 2px rgba(255, 255, 255, 0.5)' }}>No emergency requests at the moment</p>
              ) : (
                emergencyRequests.slice(0, 3).map((request, index) => (
                  <Card key={request._id || index} className="emergency-request-card mb-3">
                    <Card.Body>
                      <div className="d-flex justify-content-between">
                        <div>
                          <h6 className="request-title mb-1" style={{ color: '#4e73df', fontWeight: '600' }}>
                            <FaAmbulance className="me-2" style={{ color: '#e74a3b' }} />
                            {request.ambulanceName || 'Ambulance'} - {request.emergencyType}
                          </h6>
                          <p className="request-details mb-2">
                            <strong>Severity:</strong>{' '}
                            <Badge className={`badge-severity ${request.severity.toLowerCase()}`}>
                              {request.severity}
                            </Badge>
                          </p>
                          <p className="request-details mb-0"><strong>Notes:</strong> {request.notes}</p>
                        </div>
                        <div className="d-flex flex-column align-items-end">
                          <Badge 
                            className={`badge-status ${request.status.toLowerCase()}`}
                          >
                            {request.status}
                          </Badge>
                          <small className="request-meta mt-2">
                            {new Date(request.createdAt).toLocaleString()}
                          </small>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="btn-action btn-view mt-3"
                            as={Link}
                            to={`/hospital/emergency-requests/${request._id}`}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      </Container>
    </>
  );
};

export default HospitalDashboard;
