import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import axios from 'axios';
import Loader from '../../components/common/Loader';

const EmergencyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { onEvent, emitEvent } = useContext(SocketContext);
  
  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch emergency details
  useEffect(() => {
    const fetchEmergency = async () => {
      try {
        const res = await axios.get(`/api/emergencies/${id}`);
        setEmergency(res.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching emergency details:', error);
        setError('Failed to load emergency details');
        setLoading(false);
      }
    };
    
    fetchEmergency();
  }, [id]);

  // Listen for socket events
  useEffect(() => {
    // Hospital response
    const unsubscribeResponse = onEvent('ambulance:hospital-response', (data) => {
      if (data.emergencyId === id) {
        setEmergency(prev => ({
          ...prev,
          status: data.status
        }));
        
        setSuccess(`Hospital updated emergency status to ${data.status}`);
      }
    });
    
    return () => {
      unsubscribeResponse();
    };
  }, [onEvent, id]);

  // Update emergency status
  const updateEmergencyStatus = async (newStatus) => {
    try {
      const res = await axios.patch(`/api/emergencies/${id}/status`, {
        status: newStatus
      });
      
      setEmergency({
        ...emergency,
        status: res.data.status,
        timeline: res.data.timeline
      });
      
      setSuccess(`Emergency status updated to ${newStatus}`);
      
      // Emit socket event
      emitEvent('ambulance:status-update', {
        emergencyId: id,
        hospitalId: emergency.hospital,
        ambulanceId: user._id,
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating emergency status:', error);
      setError('Failed to update emergency status');
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

  if (!emergency) {
    return (
      <Container>
        <Alert variant="danger">
          Emergency not found or you don't have permission to view it.
        </Alert>
        <Button 
          variant="primary" 
          onClick={() => navigate('/ambulance/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>Emergency Details</h2>
            <Badge 
              bg={getStatusBadgeColor(emergency.status)} 
              className="p-2 fs-6"
            >
              {emergency.status}
            </Badge>
          </div>
        </Col>
      </Row>
      
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
      
      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Patient Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <p className="mb-2">
                    <strong>Name:</strong> {emergency.patient?.name || 'Unknown'}
                  </p>
                  {emergency.patient?.age && (
                    <p className="mb-2">
                      <strong>Age:</strong> {emergency.patient.age}
                    </p>
                  )}
                  {emergency.patient?.gender && (
                    <p className="mb-2">
                      <strong>Gender:</strong> {emergency.patient.gender}
                    </p>
                  )}
                  <p className="mb-2">
                    <strong>Condition:</strong> {emergency.patient?.condition}
                  </p>
                  <p className="mb-2">
                    <strong>Emergency Type:</strong> {emergency.emergencyType}
                  </p>
                  <p className="mb-2">
                    <strong>Severity:</strong>{' '}
                    <Badge bg={getSeverityBadgeColor(emergency.severity)}>
                      {emergency.severity}
                    </Badge>
                  </p>
                </Col>
                <Col md={6}>
                  {emergency.patient?.vitalSigns && (
                    <>
                      <p className="mb-2">
                        <strong>Vital Signs:</strong>
                      </p>
                      <ul className="list-unstyled ps-3">
                        {emergency.patient.vitalSigns.bloodPressure && (
                          <li className="mb-1">Blood Pressure: {emergency.patient.vitalSigns.bloodPressure}</li>
                        )}
                        {emergency.patient.vitalSigns.heartRate && (
                          <li className="mb-1">Heart Rate: {emergency.patient.vitalSigns.heartRate} bpm</li>
                        )}
                        {emergency.patient.vitalSigns.respiratoryRate && (
                          <li className="mb-1">Respiratory Rate: {emergency.patient.vitalSigns.respiratoryRate} breaths/min</li>
                        )}
                        {emergency.patient.vitalSigns.temperature && (
                          <li className="mb-1">Temperature: {emergency.patient.vitalSigns.temperature}°C</li>
                        )}
                        {emergency.patient.vitalSigns.oxygenSaturation && (
                          <li className="mb-1">Oxygen Saturation: {emergency.patient.vitalSigns.oxygenSaturation}%</li>
                        )}
                      </ul>
                    </>
                  )}
                </Col>
              </Row>
              
              {emergency.notes && (
                <div className="mt-3">
                  <strong>Notes:</strong>
                  <p className="mb-0">{emergency.notes}</p>
                </div>
              )}
            </Card.Body>
          </Card>
          
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Timeline</h5>
            </Card.Header>
            <Card.Body>
              <div className="timeline">
                {emergency.timeline.map((item, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-date">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                    <div className="timeline-content">
                      <Badge bg={getStatusBadgeColor(item.status)}>
                        {item.status}
                      </Badge>
                      {item.notes && <p className="mb-0 mt-1">{item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Hospital Information</h5>
            </Card.Header>
            <Card.Body>
              {emergency.hospital ? (
                <>
                  <p className="mb-2">
                    <strong>Hospital:</strong> {emergency.hospital.hospitalName}
                  </p>
                  <p className="mb-2">
                    <strong>Address:</strong><br />
                    {emergency.hospital.address?.street}<br />
                    {emergency.hospital.address?.city}, {emergency.hospital.address?.state} {emergency.hospital.address?.zipCode}
                  </p>
                  <p className="mb-2">
                    <strong>Phone:</strong> {emergency.hospital.phone}
                  </p>
                  <p className="mb-2">
                    <strong>Contact Person:</strong><br />
                    {emergency.hospital.contactPerson?.name}<br />
                    {emergency.hospital.contactPerson?.position}<br />
                    {emergency.hospital.contactPerson?.phone}
                  </p>
                </>
              ) : (
                <p className="text-muted">No hospital assigned yet</p>
              )}
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header>
              <h5 className="mb-0">Actions</h5>
            </Card.Header>
            <Card.Body>
              {emergency.status === 'Requested' && (
                <div className="d-grid gap-2">
                  <p className="text-warning mb-3">
                    Waiting for hospital to accept your request.
                  </p>
                  <Button 
                    variant="danger" 
                    onClick={() => updateEmergencyStatus('Cancelled')}
                  >
                    Cancel Request
                  </Button>
                </div>
              )}
              
              {emergency.status === 'Accepted' && (
                <div className="d-grid gap-2">
                  <p className="text-success mb-3">
                    Hospital has accepted your emergency request.
                    You can now proceed to the hospital.
                  </p>
                  <Button 
                    variant="primary" 
                    onClick={() => updateEmergencyStatus('En Route')}
                  >
                    Mark as En Route
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={() => updateEmergencyStatus('Cancelled')}
                  >
                    Cancel Emergency
                  </Button>
                </div>
              )}
              
              {emergency.status === 'En Route' && (
                <div className="d-grid gap-2">
                  <p className="text-info mb-3">
                    You are en route to the hospital.
                    Update status when you arrive.
                  </p>
                  <Button 
                    variant="primary" 
                    onClick={() => updateEmergencyStatus('Arrived')}
                  >
                    Mark as Arrived
                  </Button>
                </div>
              )}
              
              {emergency.status === 'Arrived' && (
                <div className="d-grid gap-2">
                  <p className="text-primary mb-3">
                    You have arrived at the hospital.
                    Patient is being transferred to hospital care.
                  </p>
                  <Button 
                    variant="success" 
                    onClick={() => updateEmergencyStatus('Completed')}
                  >
                    Complete Emergency
                  </Button>
                </div>
              )}
              
              {(emergency.status === 'Completed' || emergency.status === 'Cancelled') && (
                <p className={`text-${emergency.status === 'Completed' ? 'success' : 'danger'} mb-3`}>
                  This emergency has been {emergency.status.toLowerCase()}.
                  No further action is required.
                </p>
              )}
              
              <Button 
                variant="secondary" 
                className="w-100 mt-3"
                onClick={() => navigate('/ambulance/dashboard')}
              >
                Back to Dashboard
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EmergencyDetails;
