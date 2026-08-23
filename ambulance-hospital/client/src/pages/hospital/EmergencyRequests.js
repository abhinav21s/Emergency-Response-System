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
      
      // Forward to Port 5000 dispatch engine
      const outcome = newStatus === 'Accepted' ? 'confirmed' : 'declined';
      const targetReq = emergencies.find(e => e._id === emergencyId);
      const payload = {
        tripId: targetReq?.tripId || emergencyId,
        outcome,
        hospitalId: user?._id,
        reason: newStatus === 'Accepted' ? 'Accepted by hospital team' : 'Declined by hospital team',
      };

      api.post('/bridge/hospital-response', payload).catch(() => {});
      fetch('http://localhost:5000/api/hospital-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});

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
            <h2 style={{ color: '#0f2942', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.02em' }}>
              Emergency Inbound Requests
            </h2>
            <p style={{ color: '#334e68', fontSize: '1rem', fontWeight: 600 }}>
              Manage and respond to live 108 ambulance inbound requests in real time
            </p>
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
          <Card className="shadow-sm border-0" style={{ background: '#f5f8fc', border: '1.5px solid #cbd5e1', borderRadius: '14px' }}>
            <Card.Body className="text-center py-5">
              <FaAmbulance size={50} style={{ color: '#1e56a0', marginBottom: '16px' }} />
              <h4 style={{ color: '#0f2942', fontWeight: 800 }}>No Active Emergency Requests</h4>
              <p style={{ color: '#334e68', fontWeight: 600 }}>
                No active ambulance arrivals at this time. New dispatches will notify here automatically.
              </p>
            </Card.Body>
          </Card>
        ) : (
          emergencies.map((emergency) => (
            <Card key={emergency._id || Math.random()} className="mb-4 shadow-sm border-0" style={{ borderRadius: '14px', border: '1.5px solid #cbd5e1', overflow: 'hidden', background: '#f5f8fc' }}>
              <Card.Header className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ background: '#ffffff', borderBottomColor: '#cbd5e1' }}>
                <h5 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ color: '#0f2942', fontWeight: 800 }}>
                  <FaAmbulance className="text-danger" style={{ fontSize: '1.25rem' }} />
                  {emergency.emergencyType || '108 Ambulance Inbound'}
                </h5>
                <Badge bg={getStatusBadgeColor(emergency.status)} style={{ fontSize: '0.88rem', padding: '6px 14px', borderRadius: '20px', fontWeight: 800 }}>
                  {emergency.status || 'Requested'}
                </Badge>
              </Card.Header>
              <Card.Body className="p-4" style={{ background: '#ffffff' }}>
                <Row className="g-4">
                  <Col md={8}>
                    <Row className="g-3">
                      <Col md={6}>
                        <div className="mb-3">
                          <h6 style={{ color: '#1e56a0', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Ambulance Details
                          </h6>
                          <p className="mb-1" style={{ color: '#1e3a5f', fontSize: '0.92rem' }}>
                            <strong style={{ color: '#0f2942' }}>Unit / Driver:</strong> {emergency.driverName || emergency.ambulanceDetails?.name || '108 Unit'}
                          </p>
                          <p className="mb-0" style={{ color: '#1e3a5f', fontSize: '0.92rem' }}>
                            <strong style={{ color: '#0f2942' }}>Vehicle:</strong> {emergency.vehicleNumber || emergency.ambulanceDetails?.vehicleNumber || 'KA-01-EA-108'}
                          </p>
                        </div>
                        
                        <div>
                          <h6 style={{ color: '#1e56a0', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Patient Information
                          </h6>
                          <p className="mb-1" style={{ color: '#1e3a5f', fontSize: '0.92rem' }}>
                            <strong style={{ color: '#0f2942' }}>Condition:</strong> {emergency.patient?.condition || 'Emergency Inbound'}
                          </p>
                          <p className="mb-0" style={{ color: '#1e3a5f', fontSize: '0.92rem' }}>
                            <strong style={{ color: '#0f2942' }}>Severity:</strong> <Badge bg={emergency.severity === 'High' ? 'danger' : 'warning'} style={{ fontWeight: 800 }}>{emergency.severity || 'High'}</Badge>
                          </p>
                        </div>
                      </Col>
                      
                      <Col md={6}>
                        <div className="mb-3">
                          <h6 style={{ color: '#1e56a0', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Inbound Notes
                          </h6>
                          <p className="mb-0" style={{ color: '#0f2942', fontWeight: 600, fontSize: '0.92rem', background: '#f5f8fc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            {emergency.notes || 'Emergency dispatch en route to hospital trauma bay.'}
                          </p>
                        </div>
                        
                        <div>
                          <h6 style={{ color: '#1e56a0', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Dispatched At
                          </h6>
                          <p className="mb-0" style={{ color: '#334e68', fontWeight: 600, fontSize: '0.88rem' }}>
                            {emergency.createdAt ? new Date(emergency.createdAt).toLocaleString() : 'Live Inbound'}
                          </p>
                        </div>
                      </Col>
                    </Row>
                  </Col>
                  
                  <Col md={4} className="border-start" style={{ borderLeftColor: '#cbd5e1' }}>
                    <div className="d-flex flex-column justify-content-center h-100">
                      <h6 style={{ color: '#1e56a0', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
                        Hospital Action
                      </h6>
                      
                      {emergency.status === 'Requested' && (
                        <div className="d-grid gap-2">
                          <Button 
                            variant="success" 
                            onClick={() => updateEmergencyStatus(emergency._id, 'Accepted')}
                            size="lg"
                            className="py-2 fw-bold"
                            style={{ background: '#0f766e', borderColor: '#0d655e', borderRadius: '10px', boxShadow: '0 4px 12px rgba(15,118,110,0.25)' }}
                          >
                            Accept Inbound & Prepare Bay
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            onClick={() => updateEmergencyStatus(emergency._id, 'Cancelled')}
                            size="sm"
                            style={{ borderRadius: '8px', fontWeight: 700 }}
                          >
                            Decline (Reroute)
                          </Button>
                        </div>
                      )}
                      
                      {(emergency.status === 'Accepted' || emergency.status === 'En Route' || emergency.status === 'Arrived') && (
                        <div className="d-grid gap-2">
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '8px', color: '#166534', fontWeight: 700, fontSize: '0.85rem' }}>
                            Inbound accepted. Trauma team is on standby.
                          </div>
                          <Button 
                            variant="primary" 
                            onClick={() => updateEmergencyStatus(emergency._id, 'Completed')}
                            size="lg"
                            className="py-2 fw-bold"
                            style={{ background: '#1e56a0', borderColor: '#163172', borderRadius: '10px', boxShadow: '0 4px 12px rgba(30,86,160,0.25)' }}
                          >
                            Complete & Admit Patient
                          </Button>
                        </div>
                      )}
                      
                      {(emergency.status === 'Completed' || emergency.status === 'Cancelled') && (
                        <div className="p-3 text-center" style={{ background: '#f5f8fc', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
                          <span className={`fw-bold text-${emergency.status === 'Completed' ? 'success' : 'danger'}`} style={{ fontSize: '0.92rem' }}>
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
