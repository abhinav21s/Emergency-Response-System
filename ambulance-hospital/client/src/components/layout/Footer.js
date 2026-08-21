import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaAmbulance, FaHospital, FaPhone, FaEnvelope, FaMapMarkerAlt, FaGithub, FaLinkedin, FaUserMd, FaBell, FaSearch } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="designlab-footer" style={{ 
      padding: '4rem 0 2rem',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, var(--designlab-bg) 0%, rgba(0, 5, 15, 0.98) 100%)',
      borderTop: '1px solid rgba(79, 141, 255, 0.1)',
    }}>
      {/* Background grid pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: 'linear-gradient(rgba(79, 141, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79, 141, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        zIndex: 0
      }}></div>
      
      {/* Radial gradient overlay */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        height: '200%',
        background: 'radial-gradient(circle at center, rgba(79, 141, 255, 0.05) 0%, rgba(10, 16, 34, 0) 50%)',
        zIndex: 0
      }}></div>
      
      <Container style={{ position: 'relative', zIndex: 1 }}>
        <div className="designlab-card" style={{ 
          padding: '3rem',
          marginBottom: '3rem',
          background: 'linear-gradient(160deg, rgba(5, 17, 36, 0.7) 0%, rgba(0, 10, 31, 0.8) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 'var(--designlab-radius-lg)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2), 0 0 30px rgba(79, 141, 255, 0.1)',
          border: '1px solid rgba(79, 141, 255, 0.15)'
        }}>
          <Row className="mb-5">
          <Col lg={4} md={6} className="mb-4 mb-md-0">
            <div className="d-flex align-items-center mb-4">
              <div className="designlab-feature-icon me-2" style={{ width: '40px', height: '40px', marginBottom: 0 }}>
                <FaAmbulance size={20} />
              </div>
              <h5 style={{ marginBottom: '0', fontWeight: '800', fontSize: '1.4rem', textShadow: '0 2px 5px rgba(0, 0, 0, 0.7)' }}>
                <span style={{ background: 'linear-gradient(to right, #4f8dff, #2563eb)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 2px 10px rgba(79, 141, 255, 0.8)' }}>Justice</span>
                <span style={{ color: '#ffffff' }}> Emergency</span>
              </h5>
            </div>
            <p style={{ fontSize: '1rem', marginBottom: '1.5rem', color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)', fontWeight: '500' }}>
              Connecting ambulances with hospitals in real-time for faster emergency response and better patient outcomes.
            </p>
            <div className="d-flex align-items-center mb-3">
              <div className="designlab-feature-icon me-3" style={{ width: '36px', height: '36px', marginBottom: 0 }}>
                <FaPhone size={16} />
              </div>
              <span style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>+91 9901217271</span>
            </div>
            <div className="d-flex align-items-center mb-3">
              <div className="designlab-feature-icon me-3" style={{ width: '36px', height: '36px', marginBottom: 0 }}>
                <FaEnvelope size={16} />
              </div>
              <span style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>mauryaaditya00@gmail.com</span>
            </div>
            <div className="d-flex align-items-center">
              <div className="designlab-feature-icon me-3" style={{ width: '36px', height: '36px', marginBottom: 0 }}>
                <FaMapMarkerAlt size={16} />
              </div>
              <span style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>Kogilu agrahara yelhanka Banglore 560064</span>
            </div>
          </Col>
          
          {/* Quick Links section removed as requested */}
          
          <Col lg={4} md={6} className="mb-4 mb-md-0">
            <h5 style={{ marginBottom: '1.5rem', fontWeight: '700', color: '#ffffff', textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)' }}>For Hospitals</h5>
            <ul className="list-unstyled">
              <li className="mb-3 d-flex align-items-center">
                <div className="designlab-feature-icon me-3" style={{ 
                  width: '36px', 
                  height: '36px', 
                  marginBottom: 0,
                  background: 'var(--designlab-gradient-purple-pink)' 
                }}>
                  <FaHospital size={16} color="white" />
                </div>
                <span style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>Hospital Registration</span>
              </li>
              <li className="mb-3 d-flex align-items-center">
                <div className="designlab-feature-icon me-3" style={{ 
                  width: '36px', 
                  height: '36px', 
                  marginBottom: 0,
                  background: 'var(--designlab-gradient-purple-pink)' 
                }}>
                  <FaUserMd size={16} color="white" />
                </div>
                <span style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>Doctor Management</span>
              </li>
              <li className="mb-3 d-flex align-items-center">
                <div className="designlab-feature-icon me-3" style={{ 
                  width: '36px', 
                  height: '36px', 
                  marginBottom: 0,
                  background: 'var(--designlab-gradient-purple-pink)' 
                }}>
                  <FaBell size={16} color="white" />
                </div>
                <span style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>Emergency Notifications</span>
              </li>
            </ul>
          </Col>
          
          <Col lg={4} md={6}>
            <h5 style={{ marginBottom: '1.5rem', fontWeight: '700', color: '#ffffff', textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)' }}>For Ambulances</h5>
            <ul className="list-unstyled">
              <li className="mb-3 d-flex align-items-center">
                <div className="designlab-feature-icon me-3" style={{ 
                  width: '36px', 
                  height: '36px', 
                  marginBottom: 0,
                  background: 'var(--designlab-gradient-blue-teal)' 
                }}>
                  <FaAmbulance size={16} color="white" />
                </div>
                <span style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>Ambulance Registration</span>
              </li>
              <li className="mb-3 d-flex align-items-center">
                <div className="designlab-feature-icon me-3" style={{ 
                  width: '36px', 
                  height: '36px', 
                  marginBottom: 0,
                  background: 'var(--designlab-gradient-blue-teal)' 
                }}>
                  <FaSearch size={16} color="white" />
                </div>
                <span style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>Hospital Search</span>
              </li>
              <li className="mb-3 d-flex align-items-center">
                <div className="designlab-feature-icon me-3" style={{ 
                  width: '36px', 
                  height: '36px', 
                  marginBottom: 0,
                  background: 'var(--designlab-gradient-blue-teal)' 
                }}>
                  <FaMapMarkerAlt size={16} color="white" />
                </div>
                <span style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>Real-time Navigation</span>
              </li>
            </ul>
          </Col>
        </Row>
        </div>
        
        <div className="designlab-footer-bottom" style={{ 
          padding: '1.5rem',
          borderRadius: 'var(--designlab-radius-lg)',
          background: 'linear-gradient(160deg, rgba(0, 10, 31, 0.9) 0%, rgba(0, 5, 15, 0.95) 100%)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(79, 141, 255, 0.1)'
        }}>
          <Row>
            <Col md={6} className="text-center text-md-start mb-3 mb-md-0">
              <p className="mb-0" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>
                &copy; {currentYear} Justice Emergency Response System. All rights reserved.
              </p>
            </Col>
            <Col md={6} className="text-center text-md-end">
              <a href="https://github.com" className="text-decoration-none me-3" target="_blank" rel="noopener noreferrer">
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4f8dff, #2563eb)',
                  boxShadow: '0 0 15px rgba(79, 141, 255, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <FaGithub size={16} color="white" />
                </div>
              </a>
              <a href="https://linkedin.com" className="text-decoration-none" target="_blank" rel="noopener noreferrer">
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                  <FaLinkedin size={16} color="white" />
                </div>
              </a>
            </Col>
          </Row>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
