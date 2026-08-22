import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import HospitalNavbar from '../../components/hospital/HospitalNavbar';
import { FaBed, FaHospital, FaHeartbeat } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import Loader from '../../components/common/Loader';
import api from '../../utils/axiosConfig';

const HospitalDashboard = () => {
  const { user } = useContext(AuthContext);
  const { socket, onEvent } = useContext(SocketContext);
  
  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [stats, setStats] = useState({
    totalDoctors: 0,
    availableDoctors: 0,
    pendingRequests: 0,
    acceptedRequests: 0
  });

  // Fetch hospital data
  const fetchHospitalData = async () => {
    try {
      if (!user || !user._id) {
        setLoading(false);
        return;
      }

      const res = await api.get(`/hospitals/${user._id}`);
      const hData = res.data.hospital || res.data;
      setHospital(hData);
      
      if (res.data.doctors) {
        setDoctors(res.data.doctors);
        const availableDocs = res.data.doctors.filter(d => d.isAvailable).length;
        setStats(prev => ({
          ...prev,
          totalDoctors: res.data.doctors.length,
          availableDoctors: availableDocs
        }));
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching hospital data:', err);
      setError('Failed to load hospital data');
      setLoading(false);
    }
  };

  // Fetch emergency requests
  const fetchEmergencyRequests = async () => {
    try {
      if (!user || !user._id) return;
      const res = await api.get('/emergencies', {
        params: { hospital: user._id }
      });
      
      if (Array.isArray(res.data)) {
        setEmergencyRequests(res.data);
        const pending = res.data.filter(req => req.status === 'Requested').length;
        const accepted = res.data.filter(req => ['Accepted', 'En Route', 'Arrived'].includes(req.status)).length;
        setStats(prev => ({
          ...prev,
          pendingRequests: pending,
          acceptedRequests: accepted
        }));
      }
    } catch (err) {
      console.error('Error fetching emergency requests:', err);
    }
  };

  useEffect(() => {
    if (user && user._id) {
      fetchHospitalData();
      fetchEmergencyRequests();
    }
  }, [user]); // eslint-disable-line

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !user) return;

    const handleIncomingPatient = (data) => {
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
        setEmergencyRequests((prev) => [newObj, ...prev.filter((e) => e._id !== newObj._id)]);
      }
      fetchEmergencyRequests();
      setSuccessNotice('New incoming emergency patient alert received!');
      setTimeout(() => setSuccessNotice(''), 5000);
    };

    const handleEmergencyNotification = (data) => {
      // For hospital:emergency-notification (new bridge emergencies), refresh the list
      if (data && data.type === 'NEW_EMERGENCY') {
        fetchEmergencyRequests();
        setSuccessNotice('New emergency request received.');
        setTimeout(() => setSuccessNotice(''), 4000);
      }
    };

    const handleDoctorUpdate = () => {
      fetchHospitalData();
    };

    // Update the local list when an emergency status changes (Accept/Complete) — no modal
    const handleStatusUpdate = (data) => {
      if (data && data.emergencyId) {
        setEmergencyRequests((prev) =>
          prev.map((e) => e._id === data.emergencyId ? { ...e, status: data.status } : e)
        );
      }
    };

    const cleanupEmergency = onEvent('hospital:incoming-patient', handleIncomingPatient);
    const cleanupEmergencyNotification = onEvent('hospital:emergency-notification', handleEmergencyNotification);
    const cleanupDoctor = onEvent('hospital:doctor-availability', handleDoctorUpdate);
    const cleanupStatusUpdate = onEvent('hospital:emergency-status-updated', handleStatusUpdate);

    return () => {
      cleanupEmergency();
      cleanupEmergencyNotification();
      cleanupDoctor();
      cleanupStatusUpdate();
    };
  }, [socket, user, onEvent]); // eslint-disable-line

  // Update Bed Capacity
  const handleUpdateCapacity = async (updates) => {
    if (!hospital || !user) return;
    setSavingCapacity(true);
    try {
      const payload = {
        ...updates
      };
      const res = await api.put(`/hospitals/${user._id}`, payload);
      setHospital(res.data);
      setSuccessNotice('Hospital capacity updated and synced with 108 dispatch network.');
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err) {
      setError(`Failed to update capacity: ${err.message}`);
    } finally {
      setSavingCapacity(false);
    }
  };

  // Accept Emergency Request
  const handleUpdateEmergencyStatus = async (emergencyId, newStatus) => {
    try {
      await api.put(`/emergencies/${emergencyId}`, { status: newStatus });
      setEmergencyRequests(prev =>
        prev.map(e => (e._id === emergencyId ? { ...e, status: newStatus } : e))
      );
      setSuccessNotice(`Emergency status updated to ${newStatus}.`);
      setTimeout(() => setSuccessNotice(''), 3000);
      fetchEmergencyRequests();
    } catch (err) {
      setError(`Failed to update emergency: ${err.message}`);
    }
  };

  if (loading) return <Loader />;

  if (error && !hospital) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  const emergencyBeds = hospital?.beds?.emergency ?? 12;
  const icuBeds = hospital?.beds?.icu ?? 6;
  const isAccepting = hospital?.accepting !== false;

  return (
    <>
      <HospitalNavbar />
      <Container fluid className="py-4" style={{ maxWidth: '1240px' }}>
        
        {/* Alerts & Notifications */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {successNotice && (
          <Alert variant="success" dismissible onClose={() => setSuccessNotice('')}>
            {successNotice}
          </Alert>
        )}

        {/* Hospital Header & Status */}
        <Row className="mb-4">
          <Col>
            <Card className="shadow-sm border-0" style={{ background: '#fff', borderRadius: '14px' }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
                  <div>
                    <h2 className="mb-1" style={{ color: '#0f172a', fontWeight: '700' }}>
                      {hospital?.hospitalName || hospital?.name || 'Hospital Dashboard'}
                    </h2>
                    <p className="mb-0 text-muted">
                      {hospital?.address?.city || 'Bengaluru'}, {hospital?.address?.state || 'Karnataka'} &bull; Phone: {hospital?.phone || 'Not set'}
                    </p>
                  </div>
                  
                  <div className="d-flex align-items-center gap-3">
                    <Button
                      variant={isAccepting ? 'success' : 'danger'}
                      disabled={savingCapacity}
                      onClick={() => handleUpdateCapacity({ accepting: !isAccepting })}
                      style={{ padding: '8px 18px', fontWeight: '600', borderRadius: '8px' }}
                    >
                      {isAccepting ? 'Accepting Emergencies' : 'On Diversion (Full)'}
                    </Button>
                    <Button
                      as="a"
                      href="http://localhost:5173/map"
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline-primary"
                      style={{ padding: '8px 16px', fontWeight: '600', borderRadius: '8px' }}
                    >
                      View 108 Command Map
                    </Button>
                  </div>
                </div>

                <hr style={{ borderColor: '#e2e8f0' }} />

                {/* Live Statistics Row */}
                <Row className="g-3">
                  <Col md={3} sm={6}>
                    <div className="p-3 text-center" style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div className="text-muted small fw-bold text-uppercase mb-1">Total Doctors</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1359bd' }}>
                        {stats.totalDoctors}
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="p-3 text-center" style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div className="text-muted small fw-bold text-uppercase mb-1">Available Doctors</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16a34a' }}>
                        {stats.availableDoctors}
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="p-3 text-center" style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div className="text-muted small fw-bold text-uppercase mb-1">Pending Emergencies</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#d97706' }}>
                        {stats.pendingRequests}
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="p-3 text-center" style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div className="text-muted small fw-bold text-uppercase mb-1">Accepted / En Route</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#059669' }}>
                        {stats.acceptedRequests}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Live Bed Capacity Management Section */}
        <Row className="mb-4">
          <Col>
            <Card className="shadow-sm border-0" style={{ background: '#fff', borderRadius: '14px' }}>
              <Card.Header className="bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold" style={{ color: '#0f172a' }}>
                  Live Bed Capacity Management (Real-Time 108 Sync)
                </h5>
                <span className="text-muted small">Changes broadcast live to 108 dispatch network</span>
              </Card.Header>
              <Card.Body className="p-4">
                <Row className="g-4">
                  
                  {/* Emergency Beds Card */}
                  <Col md={4}>
                    <div className="p-4 text-center" style={{ background: '#f0f7ff', borderRadius: '12px', border: '1.5px solid #bfdbfe' }}>
                      <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                        <FaBed style={{ color: '#1359bd', fontSize: '1.1rem' }} />
                        <span className="fw-bold small text-uppercase" style={{ color: '#1e40af', letterSpacing: '0.04em' }}>
                          Emergency Beds Free
                        </span>
                      </div>
                      <span style={{ fontSize: '2.6rem', fontWeight: '800', color: '#1e3a8a', display: 'block', marginBottom: '14px' }}>
                        {emergencyBeds}
                      </span>
                      <div className="d-flex justify-content-center gap-3">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          style={{ minWidth: '46px', height: '38px', fontWeight: '800', fontSize: '1.2rem', borderRadius: '8px', background: '#fff' }}
                          disabled={savingCapacity || emergencyBeds <= 0}
                          onClick={() => handleUpdateCapacity({
                            beds: { emergency: Math.max(0, emergencyBeds - 1), icu: icuBeds, total: 60 }
                          })}
                        >
                          -
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          style={{ minWidth: '46px', height: '38px', fontWeight: '800', fontSize: '1.2rem', borderRadius: '8px', background: '#1359bd', border: 'none' }}
                          disabled={savingCapacity}
                          onClick={() => handleUpdateCapacity({
                            beds: { emergency: emergencyBeds + 1, icu: icuBeds, total: 60 }
                          })}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </Col>

                  {/* ICU Beds Card */}
                  <Col md={4}>
                    <div className="p-4 text-center" style={{ background: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #bbf7d0' }}>
                      <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                        <FaHeartbeat style={{ color: '#16a34a', fontSize: '1.1rem' }} />
                        <span className="fw-bold small text-uppercase" style={{ color: '#166534', letterSpacing: '0.04em' }}>
                          ICU Beds Free
                        </span>
                      </div>
                      <span style={{ fontSize: '2.6rem', fontWeight: '800', color: icuBeds > 0 ? '#15803d' : '#dc2626', display: 'block', marginBottom: '14px' }}>
                        {icuBeds}
                      </span>
                      <div className="d-flex justify-content-center gap-3">
                        <Button
                          variant="outline-success"
                          size="sm"
                          style={{ minWidth: '46px', height: '38px', fontWeight: '800', fontSize: '1.2rem', borderRadius: '8px', background: '#fff' }}
                          disabled={savingCapacity || icuBeds <= 0}
                          onClick={() => handleUpdateCapacity({
                            beds: { emergency: emergencyBeds, icu: Math.max(0, icuBeds - 1), total: 60 }
                          })}
                        >
                          -
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          style={{ minWidth: '46px', height: '38px', fontWeight: '800', fontSize: '1.2rem', borderRadius: '8px', background: '#16a34a', border: 'none' }}
                          disabled={savingCapacity}
                          onClick={() => handleUpdateCapacity({
                            beds: { emergency: emergencyBeds, icu: icuBeds + 1, total: 60 }
                          })}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </Col>

                  {/* Total Managed Capacity */}
                  <Col md={4}>
                    <div className="p-4 text-center" style={{ background: '#f8fafc', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                      <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                        <FaHospital style={{ color: '#475569', fontSize: '1.1rem' }} />
                        <span className="fw-bold small text-uppercase" style={{ color: '#475569', letterSpacing: '0.04em' }}>
                          Total Free Capacity
                        </span>
                      </div>
                      <span style={{ fontSize: '2.6rem', fontWeight: '800', color: '#0f172a', display: 'block', marginBottom: '14px' }}>
                        {emergencyBeds + icuBeds}
                      </span>
                      <div className="d-flex justify-content-center align-items-center">
                        <Badge bg={isAccepting ? 'success' : 'danger'} style={{ fontSize: '0.85rem', padding: '7px 14px', borderRadius: '20px' }}>
                          Status: {isAccepting ? 'Accepting Patients' : 'Full Diversion'}
                        </Badge>
                      </div>
                    </div>
                  </Col>

                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Emergency Requests Section */}
        <Row className="mb-4">
          <Col>
            <Card className="shadow-sm border-0" style={{ background: '#fff', borderRadius: '14px' }}>
              <Card.Header className="bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold" style={{ color: '#0f172a' }}>
                  Live Emergency Inbound Requests ({emergencyRequests.length})
                </h5>
                <Button as={Link} to="/hospital/emergency-requests" variant="outline-primary" size="sm" style={{ fontWeight: '600' }}>
                  Manage All Requests
                </Button>
              </Card.Header>
              <Card.Body className="p-4">
                {emergencyRequests.length === 0 ? (
                  <p className="text-center text-muted py-4 mb-0">
                    No active emergency patient arrivals at this time. All units standby.
                  </p>
                ) : (
                  <div className="d-grid gap-3">
                    {emergencyRequests.slice(0, 5).map((req, idx) => (
                      <Card key={req._id || idx} style={{ border: '1.5px solid #e2e8f0', borderRadius: '10px' }}>
                        <Card.Body className="p-3">
                          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div>
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                                  {req.emergencyType || 'Ambulance Arrival'}
                                </strong>
                                <Badge bg={req.status === 'Accepted' ? 'success' : req.status === 'Requested' ? 'warning' : 'info'}>
                                  {req.status}
                                </Badge>
                                <Badge bg={req.severity === 'High' || req.severity === 'Critical' ? 'danger' : 'secondary'}>
                                  {req.severity || 'High'}
                                </Badge>
                              </div>
                              <div style={{ fontSize: '0.86rem', color: '#475569' }}>
                                {req.notes || 'Emergency dispatch en route.'}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                                {new Date(req.createdAt).toLocaleTimeString()} &bull; Driver: {req.driverName || '108 Operator'}
                              </div>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                              {req.status === 'Requested' && (
                                <>
                                  <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleUpdateEmergencyStatus(req._id, 'Accepted')}
                                    style={{ fontWeight: '700', padding: '6px 14px' }}
                                  >
                                    Accept Inbound
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleUpdateEmergencyStatus(req._id, 'Cancelled')}
                                    style={{ fontWeight: '600', padding: '6px 12px' }}
                                  >
                                    Decline
                                  </Button>
                                </>
                              )}
                              {req.status === 'Accepted' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleUpdateEmergencyStatus(req._id, 'Completed')}
                                  style={{ fontWeight: '700', padding: '6px 14px' }}
                                >
                                  Complete & Admit
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
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
