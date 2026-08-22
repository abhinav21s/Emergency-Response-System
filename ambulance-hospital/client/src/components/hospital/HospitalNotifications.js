import React, { useState, useEffect, useContext } from 'react';
import { Toast, ToastContainer, Modal, Button } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const notificationSoundUrl = '/sounds/notification.mp3';

const HospitalNotifications = () => {
  const { user } = useContext(AuthContext);
  const { socket, onEvent } = useContext(SocketContext);
  const navigate = useNavigate();
  
  const [showToast, setShowToast] = useState(false);
  const [notification, setNotification] = useState({ title: '', body: '', time: '' });
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(null);

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

  // Handle emergency notification
  const handleEmergencyNotification = (data) => {
    if (!data) return;
    
    const emergencyData = data.emergency || data;
    
    // Strict guard: if the status is NOT Requested, NEVER show the modal!
    const currentStatus = emergencyData.status || data.status;
    if (currentStatus && currentStatus !== 'Requested') {
      console.log('Skipping emergency modal because status is:', currentStatus);
      return;
    }

    const hospitalId = emergencyData.hospital?._id || emergencyData.hospital || data.hospitalId;
    if (hospitalId && user?._id && hospitalId !== user._id) {
      return;
    }
    
    let ambulanceName = '108 Ambulance';
    
    if (data.ambulance) {
      ambulanceName = data.ambulance.name || data.ambulance.vehicleNumber || '108 Ambulance';
    } else if (emergencyData.ambulanceName) {
      ambulanceName = emergencyData.ambulanceName;
    } else if (data.ambulanceName) {
      ambulanceName = data.ambulanceName;
    }
    
    playNotificationSound();
    
    setEmergencyAlert({
      id: emergencyData._id || 'unknown',
      ambulanceName: `${ambulanceName}`,
      emergencyType: emergencyData.emergencyType || '108 Emergency Inbound',
      severity: emergencyData.severity || 'High',
      time: new Date().toLocaleTimeString(),
      message: data.message || emergencyData.notes || 'Emergency dispatch en route to hospital.',
      gender: emergencyData.gender || 'Unknown',
      patientType: emergencyData.patientType || 'General Emergency'
    });
    
    setShowEmergencyModal(true);
    
    setNotification({
      title: 'Incoming Emergency Patient',
      body: `${ambulanceName} is inbound with emergency patient`,
      time: new Date().toLocaleTimeString()
    });
    setShowToast(true);
  };

  const handleEmergencyConfirm = () => {
    setShowEmergencyModal(false);
    navigate('/hospital/emergency-requests');
  };

  const handleIncomingAmbulance = (data) => {
    if (!data) return;
    
    // Guard against showing modal for already accepted/completed emergencies
    const currentStatus = data.status || data.emergency?.status;
    if (currentStatus === 'Accepted' || currentStatus === 'Completed' || currentStatus === 'Cancelled') {
      return;
    }

    playNotificationSound();
    setEmergencyAlert({
      id: data.tripId || data.emergencyId || 'incoming',
      ambulanceName: data.ambulanceName || '108 Ambulance',
      emergencyType: '108 Ambulance Patient Arrival',
      severity: 'High',
      time: new Date().toLocaleTimeString(),
      message: `ETA: ${data.etaMinutes || 5} minutes &bull; ${data.distanceKm || '2.5'} km away. Please prepare trauma team.`,
      gender: 'Unknown',
      patientType: 'Emergency Scene Inbound'
    });
    setShowEmergencyModal(true);
    setNotification({
      title: 'Incoming Emergency Patient',
      body: `${data.ambulanceName || 'Ambulance'} is en route &mdash; ETA ${data.etaMinutes || 5} min`,
      time: new Date().toLocaleTimeString()
    });
    setShowToast(true);
  };

  // Listen for socket events
  useEffect(() => {
    if (!socket || !user) return;

    // Only listen to new requests for the modal popup, NOT status updates
    const cleanupHospitalEmergency = onEvent('hospital:emergency-notification', (data) => {
      if (data && data.type === 'NEW_EMERGENCY' && (!data.emergency || data.emergency.status === 'Requested')) {
        handleEmergencyNotification(data);
      }
    });
    
    // Incoming ambulance from 108 dispatch system (via Port 5000 bridge)
    const cleanupIncomingPatient = onEvent('hospital:incoming-patient', handleIncomingAmbulance);

    return () => {
      cleanupHospitalEmergency();
      cleanupIncomingPatient();
    };
  }, [socket, user, onEvent, navigate]); // eslint-disable-line

  return (
    <>
      {/* Toast notification */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1070 }}>
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg="info"
          text="white"
        >
          <Toast.Header closeButton>
            <strong className="me-auto">{notification.title}</strong>
            <small>{notification.time}</small>
          </Toast.Header>
          <Toast.Body>{notification.body}</Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Emergency Alert Modal */}
      {emergencyAlert && (
        <Modal 
          show={showEmergencyModal} 
          onHide={() => setShowEmergencyModal(false)}
          centered
          className="emergency-modal"
          backdrop="static"
        >
          <Modal.Header className="bg-danger text-white">
            <Modal.Title className="d-flex align-items-center">
              <span className="me-2">EMERGENCY ALERT &mdash; HIGH PRIORITY</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="text-center mb-3">
              <h4 className="text-danger fw-bold">{emergencyAlert.emergencyType}</h4>
              <p className="lead mb-0 text-dark fw-bold">{emergencyAlert.ambulanceName}</p>
            </div>
            
            <div className="alert alert-warning">
              <p className="mb-0" dangerouslySetInnerHTML={{ __html: emergencyAlert.message }} />
            </div>
            
            <div className="mt-3 text-muted small d-flex justify-content-between">
              <span>Time: {emergencyAlert.time}</span>
              <span>Severity: <strong className="text-danger">{emergencyAlert.severity}</strong></span>
            </div>
          </Modal.Body>
          <Modal.Footer className="d-flex justify-content-between">
            <Button 
              variant="outline-secondary" 
              onClick={() => setShowEmergencyModal(false)}
            >
              Dismiss
            </Button>
            <Button 
              variant="danger" 
              onClick={handleEmergencyConfirm}
              className="px-4"
            >
              View Inbound Details & Respond
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export default HospitalNotifications;
