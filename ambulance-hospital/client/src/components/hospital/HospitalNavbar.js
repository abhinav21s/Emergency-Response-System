import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaUserMd, FaBell, FaHome, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import BouncingBall from '../common/BouncingBall';
import HospitalNotifications from './HospitalNotifications';

const HospitalNavbar = () => {
  const { logout } = useContext(AuthContext);
  const location = useLocation();

  // Helper function to determine if a link is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Glass morphism navbar styles
  const navbarStyle = {
    background: 'rgba(17, 25, 40, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    marginBottom: '1.5rem',
    padding: '0.75rem 0',
  };

  const brandStyle = {
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
  };

  const navLinkStyle = {
    color: 'rgba(255, 255, 255, 0.8)',
    margin: '0 0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  };

  const activeNavLinkStyle = {
    ...navLinkStyle,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: 'rgba(255, 255, 255, 0.95)',
    boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
  };

  const logoutBtnStyle = {
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8))',
    border: 'none',
    boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontWeight: '500',
    letterSpacing: '0.3px',
  };

  return (
    <>
      <Navbar expand="lg" className="w-100" style={{...navbarStyle, position: 'relative', overflow: 'hidden'}}>
        <BouncingBall />
        <Container>
          <Navbar.Brand as={Link} to="/hospital/dashboard" style={brandStyle}>
            <FaUserMd style={{ marginRight: '10px', fontSize: '1.2rem', color: 'rgba(99, 102, 241, 0.9)' }} />
            Justice Emergency Response
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="hospital-navbar" />
          <Navbar.Collapse id="hospital-navbar">
            <Nav className="me-auto">
              <Nav.Link 
                as={Link} 
                to="/hospital/dashboard" 
                style={isActive('/hospital/dashboard') ? activeNavLinkStyle : navLinkStyle}
              >
                <FaHome className="me-2" /> Dashboard
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/hospital/doctor-management" 
                style={isActive('/hospital/doctor-management') ? activeNavLinkStyle : navLinkStyle}
              >
                <FaUserMd className="me-2" /> Doctor Management
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/hospital/emergency-requests" 
                style={isActive('/hospital/emergency-requests') ? activeNavLinkStyle : navLinkStyle}
              >
                <FaBell className="me-2" /> Emergency Requests
              </Nav.Link>
            </Nav>
            <Nav className="d-flex align-items-center">
              <Nav.Link 
                as={Link} 
                to="/hospital/profile" 
                style={isActive('/hospital/profile') ? activeNavLinkStyle : navLinkStyle}
                className="me-2"
              >
                <FaUserCircle className="me-2" /> Profile
              </Nav.Link>
              <Button style={logoutBtnStyle} onClick={logout}>
                <FaSignOutAlt className="me-2" /> Logout
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      {/* Global Hospital Notifications Component */}
      <HospitalNotifications />
    </>
  );
};

export default HospitalNavbar;
