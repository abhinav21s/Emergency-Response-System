import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Alert } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import api from '../../utils/axiosConfig';
import Loader from '../../components/common/Loader';
import HospitalNavbar from '../../components/hospital/HospitalNavbar';
import { FaAmbulance } from 'react-icons/fa';
import '../../styles/emergency-text-visibility.css';

const EmergencyRequests = () => {
  const { user } = useContext(AuthContext);
  const { socket, onEvent } = useContext(SocketContext);
  
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch emergency requests
  const fetchEmergencies = async () => {
    try {
      if (!user || !user._id) return;
      const res = await api.get('/emergencies', {
        params: { hospital: user._id }
      });
      
      if (Array.isArray(res.data)) {
        setEmergencies(res.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching emergency requests:', err);
      setError('Failed to load emergency requests');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user._id) {
      fetchEmergencies();
    }
  }, [user]); // eslint-disable-line

  // Socket event listener
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewEmergency = (data) => {
      if (data) {
        const emergencyData = data.emergency || data;
        const newObj = {
          _id: emergencyData._id || data.emergencyId || data.tripId || `temp-${Date.now()}`,
          emergencyType: emergencyData.emergencyType || '108 Ambulance Arrival',
          severity: emergencyData.severity || 'High',
          status: emergencyData.status || 'Requested',
          notes: emergencyData.notes || data.message || `Ambulance ${data.ambulanceName || '108'} en route. ETA: ${data.etaMinutes || 5} min.`,
          driverName: data.driverName || 'On-duty Driver',
          createdAt: emergencyData.createdAt || new Date().toISOString()
        };
        setEmergencies((prev) => [newObj, ...prev.filter((e) => e._id !== newObj._id)]);
      }
      fetchEmergencies();
      setSuccess('New emergency inbound request received.');
      setTimeout(() => setSuccess(''), 5000);
    };

    const cleanupPatient = onEvent('hospital:incoming-patient', handleNewEmergency);
    const cleanupNotification = onEvent('hospital:emergency-notification', handleNewEmergency);
    const cleanupRequest = onEvent('hospital:ambulance-request', handleNewEmergency);

    // Handle status changes (Accept/Complete) — update local state only
    const handleStatusUpdate = (data) => {
      if (data && data.emergencyId) {
        setEmergencies((prev) =>
          prev.map((e) => e._id === data.emergencyId ? { ...e, status: data.status } : e)
        );
      }
    };
    const cleanupStatus = onEvent('hospital:emergency-status-updated', handleStatusUpdate);

    return () => {
      cleanupPatient();
      cleanupNotification();
      cleanupRequest();
      cleanupStatus();
    };
  }, [socket, user, onEvent]); // eslint-disable-line

  // Update emergency status
  const updateEmergencyStatus = async (emergencyId, newStatus) => {
    try {
      if (!emergencyId) {
        setError('Cannot update emergency: Invalid emergency ID');
        return;
      }
      
      await api.put(`/emergencies/${emergencyId}`, {
        status: newStatus
      });
      
      setEmergencies(prev => 
        prev.map(emergency => 
          emergency._id === emergencyId 
            ? { ...emergency, status: newStatus }
            : emergency
        )
      );
      
      setSuccess(`Emergency status updated to ${newStatus}`);
      setTimeout(() => setSuccess(''), 4000);
      
      if (socket) {
        socket.emit('hospital:response', {
          emergencyId,
          hospitalId: user._id,
          status: newStatus,
          message: `Hospital updated status to ${newStatus}`
        });
      }
    } catch (err) {
      console.error('Error updating emergency status:', err);
      setError(`Failed to update status: ${err.response?.data?.message || err.message}`);
    }
  };

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

  if (loading) return <Loader />;

  return (
    <>
      <HospitalNavbar />
      <Container className="mt-4 emergency-requests" style={{ maxWidth: '1180px' }}>
        <Row className="mb-4">
          <Col>
            <h2>Emergency Requests</h2>
            <p className="text-muted">Manage and respond to live 108 ambulance inbound requests</p>
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
          <Card className="shadow-sm border-0">
            <Card.Body className="text-center py-5">
              <FaAmbulance size={50} className="text-muted mb-3" />
              <h4>No Emergency Requests</h4>
              <p className="text-muted">
                No active ambulance arrivals at this time.
              </p>
            </Card.Body>
          </Card>
        ) : (
          emergencies.map((emergency) => (
            <Card key={emergency._id || Math.random()} className="mb-4 shadow-sm border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
              <Card.Header className="d-flex justify-content-between align-items-center bg-white p-3 border-bottom">
                <h5 className="mb-0 fw-bold" style={{ color: '#0f172a' }}>
                  <FaAmbulance className="me-2 text-danger" />
                  {emergency.emergencyType || '108 Ambulance Arrival'}
                </h5>
                <Badge bg={getStatusBadgeColor(emergency.status)} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                  {emergency.status || 'Requested'}
                </Badge>
              </Card.Header>
              <Card.Body className="p-4">
                <Row className="g-4">
                  <Col md={8}>
                    <Row className="g-3">
                      <Col md={6}>
                        <div className="mb-3">
                          <h6 className="fw-bold text-muted small text-uppercase">Ambulance Details</h6>
                          <p className="mb-1">
                            <strong>Unit / Driver:</strong> {emergency.driverName || emergency.ambulanceDetails?.name || '108 Operator'}
                          </p>
                          <p className="mb-0">
                            <strong>Vehicle:</strong> {emergency.vehicleNumber || emergency.ambulanceDetails?.vehicleNumber || '108 Ambulance'}
                          </p>
                        </div>
                        
                        <div>
                          <h6 className="fw-bold text-muted small text-uppercase">Patient Information</h6>
                          <p className="mb-1">
                            <strong>Condition:</strong> {emergency.patient?.condition || 'Critical Trauma'}
                          </p>
                          <p className="mb-0">
                            <strong>Severity:</strong> <Badge bg={emergency.severity === 'High' ? 'danger' : 'warning'}>{emergency.severity || 'High'}</Badge>
                          </p>
                        </div>
                      </Col>
                      
                      <Col md={6}>
                        <div className="mb-3">
                          <h6 className="fw-bold text-muted small text-uppercase">Inbound Notes</h6>
                          <p className="mb-0 text-dark">
                            {emergency.notes || 'Emergency dispatch en route to hospital.'}
                          </p>
                        </div>
                        
                        <div>
                          <h6 className="fw-bold text-muted small text-uppercase">Dispatched At</h6>
                          <p className="mb-0 text-muted">
                            {emergency.createdAt ? new Date(emergency.createdAt).toLocaleString() : 'Just now'}
                          </p>
                        </div>
                      </Col>
                    </Row>
                  </Col>
                  
                  <Col md={4} className="border-start">
                    <div className="d-flex flex-column justify-content-center h-100">
                      <h6 className="fw-bold text-muted small text-uppercase mb-3">Hospital Action</h6>
                      
                      {emergency.status === 'Requested' && (
                        <div className="d-grid gap-2">
                          <Button 
                            variant="success" 
                            onClick={() => updateEmergencyStatus(emergency._id, 'Accepted')}
                            size="lg"
                            className="py-2 fw-bold"
                          >
                            Accept Inbound
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            onClick={() => updateEmergencyStatus(emergency._id, 'Cancelled')}
                            size="sm"
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                      
                      {(emergency.status === 'Accepted' || emergency.status === 'En Route' || emergency.status === 'Arrived') && (
                        <div className="d-grid gap-2">
                          <p className="text-success small mb-2 fw-bold">
                            Inbound accepted. ER team standby.
                          </p>
                          <Button 
                            variant="primary" 
                            onClick={() => updateEmergencyStatus(emergency._id, 'Completed')}
                            size="lg"
                            className="py-2 fw-bold"
                          >
                            Complete & Admit Patient
                          </Button>
                        </div>
                      )}
                      
                      {(emergency.status === 'Completed' || emergency.status === 'Cancelled') && (
                        <div className="p-3 text-center" style={{ background: '#f8fafc', borderRadius: '8px' }}>
                          <span className={`fw-bold text-${emergency.status === 'Completed' ? 'success' : 'danger'}`}>
                            {emergency.status === 'Completed' ? 'Patient Handed Off & Admitted' : 'Arrival Cancelled'}
                          </span>
                        </div>
                      )}
                    </div>
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
