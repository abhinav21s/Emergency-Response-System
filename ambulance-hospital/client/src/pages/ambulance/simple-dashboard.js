import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaHospital, FaUserMd, FaAmbulance, FaPhone, FaExchangeAlt, FaUserNurse } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import Loader from '../../components/common/Loader';
import './simple-dashboard.css';

const AmbulanceDashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Loader />
      </Container>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-grid">
        {/* Server Status */}
        <div className="dashboard-card server-status">
          <div className="card-header">
            <div className="icon-box green">
              <div className="icon"></div>
            </div>
            <h3>Server Status</h3>
          </div>
          <div className="card-content">
            <h2 className="status-text">DISCONNECTED</h2>
          </div>
        </div>

        {/* Hospitals Available */}
        <div className="dashboard-card hospitals-available">
          <div className="card-header">
            <div className="icon-box blue">
              <FaHospital className="icon" />
            </div>
            <h3>Hospitals Available</h3>
          </div>
          <div className="card-content">
            <h2 className="count-text">0</h2>
          </div>
        </div>

        {/* Selected Hospital */}
        <div className="dashboard-card selected-hospital">
          <div className="card-header">
            <div className="icon-box teal">
              <FaHospital className="icon" />
            </div>
            <h3>Selected Hospital</h3>
          </div>
          <div className="card-content">
            <div className="select-hospital-btn">
              <Button variant="outline-light">Select Hospital</Button>
            </div>
          </div>
        </div>

        {/* Ambulance Information */}
        <div className="dashboard-card ambulance-info">
          <div className="card-header">
            <div className="icon-box red">
              <FaAmbulance className="icon" />
            </div>
            <h3>Ambulance Information</h3>
          </div>
          <div className="card-content">
            {/* Empty for now */}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card quick-actions">
          <div className="card-header">
            <div className="icon-box yellow">
              <div className="icon"></div>
            </div>
            <h3>Quick Actions</h3>
          </div>
          <div className="card-content">
            <div className="action-buttons">
              <Button className="action-btn call-hospital">
                <FaPhone className="btn-icon" /> Call Hospital
              </Button>
              
              <Button 
                as={Link} 
                to="/ambulance/hospitals" 
                className="action-btn change-hospital"
              >
                <FaExchangeAlt className="btn-icon" /> Change Hospital
              </Button>
              
              <Button className="action-btn update-profile">
                <FaUserNurse className="btn-icon" /> Update Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbulanceDashboard;
