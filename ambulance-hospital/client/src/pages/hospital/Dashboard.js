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
      if (!data) return;
      if (data.hospitalId && user._id && String(data.hospitalId) !== String(user._id)) {
        return;
      }
      fetchEmergencyRequests();
      setSuccessNotice('New incoming emergency patient alert received!');
      setTimeout(() => setSuccessNotice(''), 5000);
    };

    const handleEmergencyNotification = (data) => {
      if (!data || data.type !== 'NEW_EMERGENCY') return;
      if (data.hospitalId && user._id && String(data.hospitalId) !== String(user._id)) {
        return;
      }
      fetchEmergencyRequests();
      setSuccessNotice('New emergency request received.');
      setTimeout(() => setSuccessNotice(''), 4000);
    };

    const handleDoctorUpdate = () => {
      fetchHospitalData();
    };

    // Update the local list when an emergency status changes (Accept/Complete) — no modal
    const handleStatusUpdate = (data) => {
      if (!data) return;
      if (data.hospitalId && user._id && String(data.hospitalId) !== String(user._id)) {
        return;
      }
      const targetId = data.emergencyId || data.tripId;
      if (targetId) {
        setEmergencyRequests((prev) =>
          prev.map((e) => e._id === targetId || e.tripId === targetId ? { ...e, status: data.status } : e)
        );
      }
      fetchEmergencyRequests();
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

  // Accept / Decline Emergency Request
  const handleUpdateEmergencyStatus = async (emergencyId, newStatus) => {
    try {
      await api.put(`/emergencies/${emergencyId}`, { status: newStatus });
      setEmergencyRequests(prev =>
        prev.map(e => (e._id === emergencyId ? { ...e, status: newStatus } : e))
      );

      // Sync back to Port 5000 dispatch engine
      const isAcceptOrComplete = newStatus === 'Accepted' || newStatus === 'Completed' || newStatus === 'En Route' || newStatus === 'Arrived';
      const outcome = isAcceptOrComplete ? 'confirmed' : 'declined';
      const targetReq = emergencyRequests.find(e => e._id === emergencyId || e.tripId === emergencyId);
      const payload = {
        tripId: targetReq?.tripId || targetReq?._id || emergencyId,
        outcome,
        hospitalId: user?._id,
        reason: isAcceptOrComplete ? 'Accepted by hospital dashboard' : 'Declined by hospital dashboard',
      };

      api.post('/bridge/hospital-response', payload).catch(() => {});
      fetch('http://localhost:5000/api/hospital-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});

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
            <Card className="shadow-sm border-0" style={{ background: '#f5f8fc', border: '1.5px solid #cbd5e1', borderRadius: '14px' }}>
              <Card.Body className="p-4" style={{ background: '#ffffff', borderRadius: '14px' }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
                  <div>
                    <h2 className="mb-1" style={{ color: '#0f2942', fontWeight: 800, fontSize: '1.9rem', letterSpacing: '-0.02em' }}>
                      {hospital?.hospitalName || hospital?.name || 'Hospital Command Dashboard'}
                    </h2>
                    <p className="mb-0" style={{ color: '#334e68', fontSize: '0.95rem', fontWeight: 600 }}>
                      {hospital?.address?.city || 'Bengaluru'}, {hospital?.address?.state || 'Karnataka'} &bull; Contact: {hospital?.phone || '080-2222-108'}
                    </p>
                  </div>
                  
                  <div className="d-flex align-items-center gap-3">
                    <Button
                      variant={isAccepting ? 'success' : 'danger'}
                      disabled={savingCapacity}
                      onClick={() => handleUpdateCapacity({ accepting: !isAccepting })}
                      style={{
                        padding: '9px 20px',
                        fontWeight: 800,
                        borderRadius: '10px',
                        background: isAccepting ? '#0f766e' : '#dc2626',
                        borderColor: isAccepting ? '#0d655e' : '#b91c1c',
                        boxShadow: '0 4px 12px rgba(15, 41, 66, 0.15)'
                      }}
                    >
                      {isAccepting ? 'Accepting Emergencies' : 'On Diversion (Full)'}
                    </Button>
                    <Button
                      as="a"
                      href="http://localhost:5173/map"
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outline-primary"
                      style={{
                        padding: '9px 18px',
                        fontWeight: 700,
                        borderRadius: '10px',
                        borderColor: '#1e56a0',
                        color: '#1e56a0',
                        background: '#ffffff'
                      }}
                    >
                      View 108 Command Map
                    </Button>
                  </div>
                </div>

                <hr style={{ borderColor: '#cbd5e1' }} />

                {/* Live Statistics Row */}
                <Row className="g-3">
                  <Col md={3} sm={6}>
                    <div className="p-3 text-center" style={{ background: '#f5f8fc', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}>
                      <div style={{ color: '#1e56a0', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Doctors</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f2942' }}>
                        {stats.totalDoctors}
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="p-3 text-center" style={{ background: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #bbf7d0' }}>
                      <div style={{ color: '#166534', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Available Doctors</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d' }}>
                        {stats.availableDoctors}
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="p-3 text-center" style={{ background: '#fffbeb', borderRadius: '12px', border: '1.5px solid #fde68a' }}>
                      <div style={{ color: '#92400e', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Pending Emergencies</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b45309' }}>
                        {stats.pendingRequests}
                      </div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="p-3 text-center" style={{ background: '#eff6ff', borderRadius: '12px', border: '1.5px solid #bfdbfe' }}>
                      <div style={{ color: '#1e40af', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Accepted / En Route</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1d4ed8' }}>
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
            <Card className="shadow-sm border-0" style={{ background: '#f5f8fc', border: '1.5px solid #cbd5e1', borderRadius: '14px' }}>
              <Card.Header className="border-bottom p-3 d-flex justify-content-between align-items-center" style={{ background: '#ffffff', borderBottomColor: '#cbd5e1' }}>
                <h5 className="mb-0 fw-bold" style={{ color: '#0f2942', fontWeight: 800 }}>
                  Live Bed Capacity Management (Real-Time 108 Sync)
                </h5>
                <span style={{ color: '#334e68', fontSize: '0.85rem', fontWeight: 600 }}>Changes broadcast live to 108 dispatch network</span>
              </Card.Header>
              <Card.Body className="p-4" style={{ background: '#ffffff' }}>
                <Row className="g-4">
                  
                  {/* Emergency Beds Card */}
                  <Col md={4}>
                    <div className="p-4 text-center" style={{ background: '#eff6ff', borderRadius: '14px', border: '1.5px solid #bfdbfe' }}>
                      <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                        <FaBed style={{ color: '#1e56a0', fontSize: '1.15rem' }} />
                        <span className="fw-bold small text-uppercase" style={{ color: '#1e40af', letterSpacing: '0.04em' }}>
                          Emergency Beds Free
                        </span>
                      </div>
                      <span style={{ fontSize: '2.8rem', fontWeight: '800', color: '#1e3a8a', display: 'block', marginBottom: '14px' }}>
                        {emergencyBeds}
                      </span>
                      <div className="d-flex justify-content-center gap-3">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          style={{ minWidth: '46px', height: '38px', fontWeight: '800', fontSize: '1.2rem', borderRadius: '8px', background: '#ffffff', borderColor: '#1e56a0', color: '#1e56a0' }}
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
                          style={{ minWidth: '46px', height: '38px', fontWeight: '800', fontSize: '1.2rem', borderRadius: '8px', background: '#1e56a0', border: 'none', boxShadow: '0 2px 8px rgba(30,86,160,0.3)' }}
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
                    <div className="p-4 text-center" style={{ background: '#f0fdf4', borderRadius: '14px', border: '1.5px solid #bbf7d0' }}>
                      <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                        <FaHeartbeat style={{ color: '#0f766e', fontSize: '1.15rem' }} />
                        <span className="fw-bold small text-uppercase" style={{ color: '#166534', letterSpacing: '0.04em' }}>
                          ICU Beds Free
                        </span>
                      </div>
                      <span style={{ fontSize: '2.8rem', fontWeight: '800', color: icuBeds > 0 ? '#15803d' : '#dc2626', display: 'block', marginBottom: '14px' }}>
                        {icuBeds}
                      </span>
                      <div className="d-flex justify-content-center gap-3">
                        <Button
                          variant="outline-success"
                          size="sm"
                          style={{ minWidth: '46px', height: '38px', fontWeight: '800', fontSize: '1.2rem', borderRadius: '8px', background: '#ffffff', borderColor: '#0f766e', color: '#0f766e' }}
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
                          style={{ minWidth: '46px', height: '38px', fontWeight: '800', fontSize: '1.2rem', borderRadius: '8px', background: '#0f766e', border: 'none', boxShadow: '0 2px 8px rgba(15,118,110,0.3)' }}
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
                    <div className="p-4 text-center" style={{ background: '#f5f8fc', borderRadius: '14px', border: '1.5px solid #cbd5e1' }}>
                      <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                        <FaHospital style={{ color: '#334e68', fontSize: '1.15rem' }} />
                        <span className="fw-bold small text-uppercase" style={{ color: '#334e68', letterSpacing: '0.04em' }}>
                          Total Free Capacity
                        </span>
                      </div>
                      <span style={{ fontSize: '2.8rem', fontWeight: '800', color: '#0f2942', display: 'block', marginBottom: '14px' }}>
                        {emergencyBeds + icuBeds}
                      </span>
                      <div className="d-flex justify-content-center align-items-center">
                        <Badge bg={isAccepting ? 'success' : 'danger'} style={{ fontSize: '0.88rem', padding: '8px 16px', borderRadius: '20px', fontWeight: 800 }}>
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
