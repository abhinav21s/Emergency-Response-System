import React, { useState, useEffect, useContext, useRef } from 'react';
import { Toast, ToastContainer, Modal, Button } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axiosConfig';

const notificationSoundUrl = '/sounds/notification.mp3';

const HospitalNotifications = () => {
  const { user } = useContext(AuthContext);
  const { socket, onEvent } = useContext(SocketContext);
  const navigate = useNavigate();
  
  const [showToast, setShowToast] = useState(false);
  const [notification, setNotification] = useState({ title: '', body: '', time: '' });
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [responding, setResponding] = useState(false);

  // Set of handled requestIds to enforce idempotency and eliminate duplicate popups
  const seenRequestIds = useRef(new Set());

  const playNotificationSound = () => {
    try {
      const audio = new Audio(notificationSoundUrl);
      audio.volume = 0.7;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } catch (error) {
      // ignore
    }
  };

  const handleIncomingAlert = (data) => {
    if (!data) return;

    const reqId = data.requestId || `${data.tripId || data.emergencyId}_${data.hospitalId || 'h'}_${data.attemptCount || 1}`;
    
    // Enforce idempotency
    if (seenRequestIds.current.has(reqId)) {
      return;
    }
    seenRequestIds.current.add(reqId);
    if (seenRequestIds.current.size > 100) {
      const arr = Array.from(seenRequestIds.current);
      seenRequestIds.current = new Set(arr.slice(50));
    }

    const emergencyData = data.emergency || data;
    const currentStatus = emergencyData.status || data.status;
    if (currentStatus && currentStatus !== 'Requested' && currentStatus !== 'pending') {
      return;
    }

    // Hospital matching check
    const hospitalId = emergencyData.hospital?._id || emergencyData.hospital || data.hospitalId;
    if (hospitalId && user?._id && String(hospitalId) !== String(user._id)) {
      return;
    }

    // Name keyword check as secondary safety filter
    if (user?.hospitalName && data.hospital?.name) {
      const uName = user.hospitalName.toLowerCase();
      const targetName = (data.hospital.name || '').toLowerCase();
      const keywords = ['fortis', 'martha', 'manipal', 'apollo', 'victoria', 'nimhans', 'bowring', 'jayadeva', 'aster', 'sakra', 'narayana', 'sparsh', 'santosh'];
      const matchedKw = keywords.find((kw) => targetName.includes(kw));
      if (matchedKw && !uName.includes(matchedKw)) {
        return;
      }
    }

    const ambulanceName =
      data.ambulance?.name ||
      data.ambulanceName ||
      emergencyData.ambulanceName ||
      '108 Ambulance Unit';

    const intake = data.clinicalIntake || emergencyData.clinicalIntake || null;

    playNotificationSound();

    setEmergencyAlert({
      id: emergencyData._id || data.emergencyId || 'unknown',
      tripId: data.tripId || emergencyData.tripId,
      requestId: reqId,
      ambulanceName,
      targetHospitalName: data.targetHospitalName || data.hospital?.name || user?.hospitalName || 'Emergency Hospital',
      emergencyType: intake?.chiefComplaint || emergencyData.emergencyType || '108 Emergency Inbound',
      severity: emergencyData.severity || 'High',
      time: new Date().toLocaleTimeString(),
      etaMinutes: data.etaMinutes || 5,
      distanceKm: data.distanceKm || '2.5',
      message: data.message || emergencyData.notes || `Ambulance ${ambulanceName} en route with emergency patient.`,
      clinicalIntake: intake,
      attemptCount: data.attemptCount || 1,
      isReroute: !!data.isReroute,
    });

    setShowEmergencyModal(true);

    setNotification({
      title: data.isReroute ? 'Rerouted Emergency Patient' : 'Incoming Emergency Patient',
      body: `${ambulanceName} is inbound • ETA ${data.etaMinutes || 5} min (${data.distanceKm || '2.5'} km)`,
      time: new Date().toLocaleTimeString(),
    });
    setShowToast(true);
  };

  const handleHospitalResponse = async (outcome) => {
    if (!emergencyAlert) return;
    setResponding(true);

    try {
      const payload = {
        tripId: emergencyAlert.tripId || emergencyAlert.id,
        outcome,
        hospitalId: user?._id,
        reason: outcome === 'confirmed' ? 'Admission accepted by trauma team' : 'Trauma bay at maximum capacity',
      };

      if (emergencyAlert.id && emergencyAlert.id !== 'unknown') {
        await api.put(`/emergencies/${emergencyAlert.id}`, {
          status: outcome === 'confirmed' ? 'Accepted' : 'Cancelled',
        }).catch(() => {});
      }

      // Sync to Port 5001 bridge
      await api.post('/bridge/hospital-response', payload).catch(() => {});

      // Direct fallback to Port 5000 dispatch engine
      fetch('http://localhost:5000/api/hospital-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});

      setResponding(false);
      setShowEmergencyModal(false);
      navigate('/hospital/emergency-requests');
    } catch (err) {
      console.error('Error responding to emergency alert:', err);
      setResponding(false);
      setShowEmergencyModal(false);
    }
  };

  useEffect(() => {
    if (!socket || !user) return;

    const cleanupNotification = onEvent('hospital:emergency-notification', handleIncomingAlert);
    const cleanupIncoming = onEvent('hospital:incoming-patient', handleIncomingAlert);
    const cleanupStatus = onEvent('hospital:emergency-status-updated', (statusData) => {
      if (statusData && (statusData.status === 'Cancelled' || statusData.status === 'Declined')) {
        setShowEmergencyModal(false);
      }
    });

    return () => {
      cleanupNotification();
      cleanupIncoming();
      cleanupStatus();
    };
  }, [socket, user, onEvent]); // eslint-disable-line

  return (
    <>
      {/* Toast Notification */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1070 }}>
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={6000}
          autohide
          bg="danger"
          text="white"
          style={{ borderRadius: '10px', boxShadow: '0 10px 25px rgba(220,38,38,0.25)' }}
        >
          <Toast.Header closeButton style={{ background: '#dc2626', color: '#ffffff' }}>
            <strong className="me-auto text-white">{notification.title}</strong>
            <small className="text-white opacity-75">{notification.time}</small>
          </Toast.Header>
          <Toast.Body style={{ background: '#b91c1c', color: '#ffffff', fontWeight: 600 }}>
            {notification.body}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Emergency Alert Modal with Full Visibility Styling */}
      {emergencyAlert && (
        <Modal
          show={showEmergencyModal}
          onHide={() => setShowEmergencyModal(false)}
          centered
          size="lg"
          backdrop="static"
        >
          <div style={{ background: '#ffffff', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0', color: '#0f172a' }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: '#ffffff',
              padding: '16px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9 }}>
                  {emergencyAlert.isReroute ? 'Rerouted Emergency Admission Request' : 'Emergency Inbound Alert'}
                </span>
                <h4 style={{ margin: '4px 0 0', fontWeight: 800, fontSize: '1.25rem', color: '#ffffff' }}>
                  {emergencyAlert.targetHospitalName}
                </h4>
              </div>
              <span style={{
                background: '#ffffff',
                color: '#dc2626',
                padding: '6px 14px',
                borderRadius: '20px',
                fontWeight: 800,
                fontSize: '0.88rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}>
                ETA: ~{emergencyAlert.etaMinutes} min
              </span>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b91c1c', marginBottom: '2px' }}>
                    {emergencyAlert.emergencyType}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                    Unit: <span style={{ color: '#0f172a', fontWeight: 800 }}>{emergencyAlert.ambulanceName}</span> &bull; Distance: <span style={{ color: '#0f172a', fontWeight: 800 }}>{emergencyAlert.distanceKm} km</span>
                  </div>
                </div>
                <span style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em'
                }}>
                  CRITICAL INBOUND
                </span>
              </div>

              {/* Paramedic Clinical Intake Details */}
              {emergencyAlert.clinicalIntake ? (
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Paramedic Clinical Intake Assessment
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '0.88rem', color: '#1e293b' }}>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Patient Name: </span>
                      <strong style={{ color: '#0f172a' }}>{emergencyAlert.clinicalIntake.patientName || 'Emergency Patient'}</strong> ({emergencyAlert.clinicalIntake.patientAge || 35} yrs)
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Chief Complaint: </span>
                      <strong style={{ color: '#0f172a' }}>{emergencyAlert.clinicalIntake.chiefComplaint || 'Trauma'}</strong>
                    </div>
                  </div>

                  {/* Vitals Pill Box */}
                  <div style={{
                    marginTop: '12px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '8px',
                    textAlign: 'center',
                    fontSize: '0.82rem'
                  }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>Blood Pressure</div>
                      <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>{emergencyAlert.clinicalIntake.vitals?.bloodPressure || '120/80'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>Heart Rate</div>
                      <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>{emergencyAlert.clinicalIntake.vitals?.heartRate || 80} bpm</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>Resp Rate</div>
                      <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>{emergencyAlert.clinicalIntake.vitals?.respiratoryRate || 16}/min</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>SpO2</div>
                      <div style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.95rem' }}>{emergencyAlert.clinicalIntake.vitals?.spo2 || 98}%</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#334155' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Treatments Given: </span>
                    <strong style={{ color: '#0f172a' }}>{emergencyAlert.clinicalIntake.treatments || 'Oxygen administered, IV line established, cervical collar placed'}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', color: '#92400e', fontSize: '0.88rem', marginBottom: '16px' }}>
                  <p style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: emergencyAlert.message }} />
                </div>
              )}

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', color: '#166534', fontSize: '0.82rem', fontWeight: 600 }}>
                Please confirm whether resuscitation bay and trauma staff are prepared to receive this emergency inbound.
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              padding: '14px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <Button
                variant="outline-danger"
                disabled={responding}
                onClick={() => handleHospitalResponse('declined')}
                style={{ fontWeight: 700, borderRadius: '8px', padding: '9px 16px', fontSize: '0.88rem' }}
              >
                Decline (Reroute Unit)
              </Button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  disabled={responding}
                  onClick={() => setShowEmergencyModal(false)}
                  style={{ fontWeight: 600, borderRadius: '8px', padding: '9px 16px', fontSize: '0.88rem' }}
                >
                  Dismiss
                </Button>
                <Button
                  variant="success"
                  disabled={responding}
                  onClick={() => handleHospitalResponse('confirmed')}
                  style={{
                    background: '#16a34a',
                    borderColor: '#15803d',
                    color: '#ffffff',
                    fontWeight: 800,
                    borderRadius: '8px',
                    padding: '9px 20px',
                    fontSize: '0.9rem',
                    boxShadow: '0 2px 8px rgba(22,163,74,0.3)'
                  }}
                >
                  {responding ? 'Confirming...' : 'Accept Admission & Prepare Bay'}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default HospitalNotifications;
