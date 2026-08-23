import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaUserMd, FaBell, FaHome, FaSignOutAlt, FaUserCircle } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import HospitalNotifications from './HospitalNotifications';

const HospitalNavbar = () => {
  const { logout } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navbarStyle = {
    background: '#ffffff',
    borderBottom: '1.5px solid #cbd5e1',
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
    marginBottom: '1.5rem',
    padding: '0.75rem 0',
  };

  const brandStyle = {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: '1.15rem',
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
  };

  const navLinkStyle = {
    color: '#334155',
    margin: '0 0.25rem',
    padding: '0.5rem 0.9rem',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.92rem',
    transition: 'all 0.15s ease',
  };

  const activeNavLinkStyle = {
    ...navLinkStyle,
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    fontWeight: '700',
  };

  const logoutBtnStyle = {
    background: '#dc2626',
    borderColor: '#b91c1c',
    color: '#ffffff',
    padding: '0.45rem 1rem',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.88rem',
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.2)',
  };

  return (
    <>
      <Navbar expand="lg" className="w-100" style={navbarStyle}>
        <Container>
          <Navbar.Brand as={Link} to="/hospital/dashboard" style={brandStyle}>
            <span style={{
              background: '#eef2ff',
              color: '#4f46e5',
              padding: '6px 8px',
              borderRadius: '8px',
              marginRight: '10px',
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              <FaUserMd style={{ fontSize: '1.15rem' }} />
            </span>
            Hospital Command Portal
          </Navbar.Brand>

          <Navbar.Toggle
            aria-controls="hospital-navbar"
            style={{
              borderColor: '#cbd5e1',
              backgroundColor: '#f8fafc',
              padding: '6px 10px',
              borderRadius: '8px'
            }}
          />

          <Navbar.Collapse id="hospital-navbar">
            <Nav className="me-auto mt-2 mt-lg-0">
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

            <Nav className="d-flex align-items-center mt-2 mt-lg-0">
              <Nav.Link 
                as={Link} 
                to="/hospital/profile" 
                style={isActive('/hospital/profile') ? activeNavLinkStyle : navLinkStyle}
                className="me-lg-2"
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
