import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaAmbulance, FaBell, FaHome, FaSignOutAlt, FaHospital, FaUserCircle } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import BouncingBall from '../common/BouncingBall';

const AmbulanceNavbar = () => {
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
    <Navbar expand="lg" className="w-100" style={{...navbarStyle, position: 'relative', overflow: 'hidden'}}>
      <BouncingBall />
      <Container>
        <Navbar.Brand as={Link} to="/ambulance/dashboard" style={brandStyle}>
          <FaAmbulance style={{ marginRight: '10px', fontSize: '1.2rem', color: 'rgba(99, 102, 241, 0.9)' }} />
          Justice Emergency Response
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="ambulance-navbar" />
        <Navbar.Collapse id="ambulance-navbar">
          <Nav className="me-auto">
            <Nav.Link 
              as={Link} 
              to="/ambulance/dashboard" 
              style={isActive('/ambulance/dashboard') ? activeNavLinkStyle : navLinkStyle}
            >
              <FaHome className="me-2" /> Dashboard
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/ambulance/hospitals" 
              style={isActive('/ambulance/hospitals') ? activeNavLinkStyle : navLinkStyle}
            >
              <FaHospital className="me-2" /> Hospital Search
            </Nav.Link>
            <Nav.Link 
              as={Link} 
              to="/ambulance/notifications" 
              style={isActive('/ambulance/notifications') ? activeNavLinkStyle : navLinkStyle}
            >
              <FaBell className="me-2" /> Notifications
            </Nav.Link>
          </Nav>
          <Nav className="d-flex align-items-center">
            <Nav.Link 
              as={Link} 
              to="/ambulance/profile" 
              style={isActive('/ambulance/profile') ? activeNavLinkStyle : navLinkStyle}
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
  );
};

export default AmbulanceNavbar;
