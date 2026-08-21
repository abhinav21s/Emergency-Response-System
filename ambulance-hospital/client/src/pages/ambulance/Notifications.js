import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Alert } from 'react-bootstrap';
import { FaBell, FaHospital, FaAmbulance, FaCalendarAlt, FaPaperPlane, FaExclamationTriangle } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import AmbulanceNavbar from '../../components/ambulance/AmbulanceNavbar';
import api from '../../utils/axiosConfig';
import '../../../src/styles/notification-styles.css';

const AmbulanceNotifications = () => {
  const { user } = useContext(AuthContext);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        if (!user || !user._id) {
          console.error('User or user ID is missing');
          return;
        }

        setLoading(true);
        console.log('Fetching sent notifications for ambulance:', user._id);
        
        // Fetch sent notifications directly from emergencies collection
        // This is more reliable than using the notifications endpoint
        try {
          const sentRes = await api.get(`/emergencies?ambulance=${user._id}`);
          console.log('Sent emergency notifications:', sentRes.data);
          
          // Transform the emergency data to match the notification format
          // Fetch hospital details for each emergency to get the hospital name
          const formattedNotifications = await Promise.all(sentRes.data.map(async emergency => {
            // Try to get hospital details
            let hospitalName = 'Unknown Hospital';
            try {
              if (emergency.hospital) {
                const hospitalRes = await api.get(`/hospitals/${emergency.hospital}`);
                if (hospitalRes.data && hospitalRes.data.hospital && hospitalRes.data.hospital.hospitalName) {
                  hospitalName = hospitalRes.data.hospital.hospitalName;
                }
              }
            } catch (err) {
              console.warn('Error fetching hospital details:', err);
              // If we can't get the hospital name, use the one from the emergency if available
              hospitalName = emergency.hospitalName || 'Hospital';
            }
            
            return {
              _id: emergency._id,
              emergencyType: emergency.emergencyType || 'Ambulance Arrival',
              severity: emergency.severity || 'Medium',
              status: emergency.status || 'Requested',
              hospitalName: hospitalName,
              hospitalId: emergency.hospital,
              createdAt: emergency.createdAt,
              message: emergency.notes || 'Emergency notification from ambulance'
            };
          }));
          
          setSentNotifications(formattedNotifications);
        } catch (apiError) {
          console.error('Error fetching from emergencies endpoint:', apiError);
          // Fallback to the notifications endpoint if the emergencies endpoint fails
          const fallbackRes = await api.get(`/notifications/ambulance/${user._id}/sent`);
          console.log('Fallback - Sent notifications:', fallbackRes.data);
          setSentNotifications(fallbackRes.data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications. Please try again later.');
        setLoading(false);
      }
    };

    if (user && user._id) {
      fetchNotifications();
    }
  }, [user]);

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'hospital':
        return <FaHospital className="text-primary" />;
      case 'emergency':
        return <FaAmbulance className="text-danger" />;
      default:
        return <FaBell className="text-warning" />;
    }
  };

  const getNotificationBadge = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return <Badge bg="danger">High</Badge>;
      case 'medium':
        return <Badge bg="warning">Medium</Badge>;
      case 'low':
        return <Badge bg="success">Low</Badge>;
      default:
        return <Badge bg="secondary">Normal</Badge>;
    }
  };

  if (loading) {
    return (
      <>
        <AmbulanceNavbar />
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
          <Loader />
        </Container>
      </>
    );
  }

  return (
    <>
      <AmbulanceNavbar />
      <Container className="py-4">
        <Row>
          <Col>
            <h2 className="mb-4">
              <FaBell className="me-2 text-warning" /> Notifications
            </h2>
            
            {error && (
              <Alert variant="danger">{error}</Alert>
            )}
            
            <div className="notification-header d-flex justify-content-between align-items-center mb-4">
              <h4 className="mb-0">
                <FaPaperPlane className="me-2" /> Sent Emergency Notifications
                {sentNotifications.length > 0 && (
                  <Badge bg="primary" pill className="ms-2">{sentNotifications.length}</Badge>
                )}
              </h4>
            </div>

            {sentNotifications.length === 0 ? (
              <div className="notification-empty">
                <FaPaperPlane className="notification-empty-icon" />
                <h4 className="notification-empty-title">No Sent Notifications</h4>
                <p className="notification-empty-text">You haven't sent any emergency notifications to hospitals yet.</p>
              </div>
            ) : (
              <div className="notification-list">
                {sentNotifications.map((notification) => (
                  <Card key={notification._id} className="notification-card mb-3">
                    <Card.Body>
                      <div className="d-flex align-items-start">
                        <div className="notification-icon sent me-3">
                          <FaExclamationTriangle />
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="notification-title mb-0">{notification.emergencyType || 'Emergency Notification'}</h5>
                            <Badge 
                              className={`notification-badge ${notification.severity?.toLowerCase() || 'medium'}`}
                            >
                              {notification.severity || 'Medium'}
                            </Badge>
                          </div>
                          <p className="notification-message">
                            Sent to: <strong>{notification.hospitalName || 'Unknown Hospital'}</strong>
                          </p>
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="notification-meta">
                              <FaCalendarAlt className="me-1" />
                              {formatDate(notification.createdAt)}
                            </div>
                            <div className={`notification-status ${notification.status?.toLowerCase() || 'requested'}`}>
                              {notification.status || 'Sent'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default AmbulanceNotifications;
