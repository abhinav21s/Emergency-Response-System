import React, { useState, useEffect, useContext, useRef } from 'react';
import { Toast, ToastContainer, Modal, Button } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';

// Import notification sound
const notificationSoundUrl = '/sounds/notification.mp3';

const HospitalNotifications = () => {
  const { user } = useContext(AuthContext);
  const { socket, onEvent } = useContext(SocketContext);
  const navigate = useNavigate();
  
  // Notification states
  const [showToast, setShowToast] = useState(false);
  const [notification, setNotification] = useState({ title: '', body: '', time: '' });
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  // Function to play notification sound
  const playNotificationSound = () => {
    try {
      // Create a new audio element each time
      const audio = new Audio(notificationSoundUrl);
      audio.volume = 0.7; // Set volume to 70%
      
      // Play the sound
      const playPromise = audio.play();
      
      // Handle play promise (modern browsers return a promise)
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing notification sound:', error);
        });
      }
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  // Handle emergency notification
  const handleEmergencyNotification = (data) => {
    console.log('Received emergency notification:', data);
    
    if (!data) return;
    
    // Extract emergency data from notification
    const emergencyData = data.emergency || data;
    
    // Check if this notification is for this hospital
    const hospitalId = emergencyData.hospital?._id || emergencyData.hospital || data.hospitalId;
    
    console.log(`Checking if emergency notification is for this hospital: ${hospitalId} === ${user?._id}`);
    
    // Only process notifications meant for this hospital
    if (hospitalId !== user?._id) {
      console.warn(`Ignoring emergency notification for hospital ${hospitalId} (not matching current user ${user?._id})`);
      return;
    }
    
    console.log('Processing emergency notification for this hospital');
    
    // Get ambulance details
    let ambulanceName = 'Unknown Ambulance';
    let ambulanceId = 'Unknown';
    
    // Check all possible locations for ambulance data
    if (data.ambulance) {
      // New format with ambulance object
      ambulanceName = data.ambulance.name || data.ambulance.vehicleNumber || 'Unknown Ambulance';
      ambulanceId = data.ambulance._id || 'Unknown';
      console.log(`Found ambulance in data.ambulance: ${ambulanceName} (ID: ${ambulanceId})`);
    } else if (emergencyData.ambulanceName) {
      // Direct ambulanceName in emergency data
      ambulanceName = emergencyData.ambulanceName;
      ambulanceId = emergencyData.ambulance || 'Unknown';
      console.log(`Found ambulance name in emergencyData: ${ambulanceName} (ID: ${ambulanceId})`);
    } else if (data.ambulanceName) {
      // Legacy format with ambulanceName at top level
      ambulanceName = data.ambulanceName;
      ambulanceId = data.ambulanceId || emergencyData.ambulance || 'Unknown';
      console.log(`Found ambulance name in data: ${ambulanceName} (ID: ${ambulanceId})`);
    }
    
    // Play notification sound
    playNotificationSound();
    
    // Debug the incoming data
    console.log('Gender from data:', data.gender);
    console.log('Patient type from data:', data.patientType);
    
    // Show emergency alert modal
    setEmergencyAlert({
      id: emergencyData._id || 'unknown',
      ambulanceName: `${ambulanceName} (ID: ${ambulanceId})`,
      emergencyType: emergencyData.emergencyType || 'Emergency Alert',
      severity: emergencyData.severity || 'Medium',
      time: new Date().toLocaleTimeString(),
      message: data.message || emergencyData.notes || 'New emergency request',
      gender: data.gender || emergencyData.gender || 'Unknown',
      patientType: data.patientType || emergencyData.patientType || 'General Emergency'
    });
    
    // Force the modal to show
    console.log('Setting emergency modal to show');
    setShowEmergencyModal(true);
    
    // Also show toast notification
    setNotification({
      title: 'New Emergency Request',
      body: `${ambulanceName} (ID: ${ambulanceId}) is requesting assistance`,
      time: new Date().toLocaleTimeString()
    });
    setShowToast(true);
  };

  // Function to handle emergency modal confirmation
  const handleEmergencyConfirm = () => {
    setShowEmergencyModal(false);
    // Navigate to emergency requests page
    navigate('/hospital/emergency-requests');
  };

  // Listen for socket events
  useEffect(() => {
    if (!socket || !user) {
      console.log('Socket or user not available, cannot set up listeners');
      return;
    }

    console.log('Setting up socket listeners for hospital notifications');
    
    // Use the onEvent function from SocketContext for more reliable event handling
    const cleanupEmergencyNotification = onEvent('ambulance:request', handleEmergencyNotification);
    const cleanupHospitalEmergency = onEvent('hospital:emergency-notification', handleEmergencyNotification);
    const cleanupEmergencyUpdate = onEvent('emergency:update', handleEmergencyNotification);
    
    // Direct socket listeners as backup
    socket.on('ambulance:request', handleEmergencyNotification);
    socket.on('hospital:ambulance-request', handleEmergencyNotification);
    
    // For testing purposes - listen for a test event
    socket.on('test:emergency', (data) => {
      console.log('Received test emergency:', data);
      handleEmergencyNotification(data);
    });
    
    return () => {
      // Clean up all listeners
      cleanupEmergencyNotification();
      cleanupHospitalEmergency();
      cleanupEmergencyUpdate();
      
      // Clean up direct socket listeners
      socket.off('ambulance:request');
      socket.off('hospital:ambulance-request');
      socket.off('test:emergency');
      
      console.log('Cleaned up socket listeners');
    };
  }, [socket, user, onEvent, navigate]);

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
      <Modal
        show={showEmergencyModal}
        onHide={() => setShowEmergencyModal(false)}
        backdrop="static"
        keyboard={false}
        centered
        size="lg"
        className="emergency-modal"
      >
        <Modal.Header closeButton style={{ background: '#dc3545', color: 'white' }}>
          <Modal.Title>
            Emergency Alert - {emergencyAlert?.severity || 'Medium'} Priority
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: '#111928', color: 'white' }}>
          {emergencyAlert && (
            <div>
              <h4>{emergencyAlert.emergencyType || 'Ambulance Arrival'}</h4>
              <p style={{ color: '#a0aec0' }}>Received at {emergencyAlert.time}</p>
              
              <div className="alert" style={{ background: 'rgba(135, 206, 235, 0.2)', color: 'white', border: 'none' }}>
                <strong>Ambulance:</strong> {emergencyAlert.ambulanceName}
              </div>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <div className="card" style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none' }}>
                    <div className="card-body">
                      <h5 className="card-title" style={{ color: 'white' }}>Patient Information</h5>
                      <p><strong>Gender:</strong> {emergencyAlert.gender}</p>
                      <p><strong>Type:</strong> {emergencyAlert.patientType}</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card" style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none' }}>
                    <div className="card-body">
                      <h5 className="card-title" style={{ color: 'white' }}>Additional Information</h5>
                      <p>{emergencyAlert.message}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ background: '#111928', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button 
            variant="secondary" 
            onClick={() => setShowEmergencyModal(false)}
            style={{ background: 'rgba(107, 114, 128, 0.8)', border: 'none' }}
          >
            Close
          </Button>
          <Button 
            variant="danger" 
            onClick={handleEmergencyConfirm}
            style={{ background: '#dc3545', border: 'none' }}
          >
            View Emergency Requests
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default HospitalNotifications;
