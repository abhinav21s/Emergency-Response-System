import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaAmbulance, FaHospital, FaUserMd, FaSignOutAlt, FaUserCircle, FaBell, FaTachometerAlt, FaCog } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';

const Header = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  
  const { isAuthenticated, user, logout, loading } = authContext;
  
  const onLogout = () => {
    logout();
    navigate('/login');
  };
  
  const authLinks = (
    <>
      <Nav className="ms-auto">
        <Dropdown align="end">
          <Dropdown.Toggle as={Button} variant="link" className="designlab-user-dropdown">
            <div className="d-flex align-items-center">
              <div className="designlab-feature-icon me-2" style={{ width: '36px', height: '36px', marginBottom: 0 }}>
                <FaUserCircle size={18} />
              </div>
              <span className="d-none d-md-inline">{user?.username || 'User'}</span>
            </div>
          </Dropdown.Toggle>
          <Dropdown.Menu className="designlab-dropdown-menu">
            <Dropdown.Item as={Link} to="/profile" className="designlab-dropdown-item">
              <div className="d-flex align-items-center">
                <div className="designlab-feature-icon me-2" style={{ 
                  width: '28px', 
                  height: '28px', 
                  marginBottom: 0, 
                  background: 'var(--designlab-gradient-blue-purple)' 
                }}>
                  <FaUserCircle size={14} color="white" />
                </div>
                <span>Profile</span>
              </div>
            </Dropdown.Item>
            <Dropdown.Item as={Link} to={`/${user?.role}/dashboard`} className="designlab-dropdown-item">
              <div className="d-flex align-items-center">
                <div className="designlab-feature-icon me-2" style={{ 
                  width: '28px', 
                  height: '28px', 
                  marginBottom: 0, 
                  background: 'var(--designlab-gradient-purple-pink)' 
                }}>
                  <FaTachometerAlt size={14} color="white" />
                </div>
                <span>Dashboard</span>
              </div>
            </Dropdown.Item>
            <Dropdown.Item as={Link} to="/settings" className="designlab-dropdown-item">
              <div className="d-flex align-items-center">
                <div className="designlab-feature-icon me-2" style={{ 
                  width: '28px', 
                  height: '28px', 
                  marginBottom: 0, 
                  background: 'var(--designlab-gradient-blue-teal)' 
                }}>
                  <FaCog size={14} color="white" />
                </div>
                <span>Settings</span>
              </div>
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={onLogout} className="designlab-dropdown-item">
              <div className="d-flex align-items-center">
                <div className="designlab-feature-icon me-2" style={{ 
                  width: '28px', 
                  height: '28px', 
                  marginBottom: 0, 
                  background: 'var(--designlab-gradient-pink-orange)' 
                }}>
                  <FaSignOutAlt size={14} color="white" />
                </div>
                <span>Logout</span>
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </Nav>
    </>
  );
  
  const guestLinks = (
    <>
      <Nav className="ms-auto">
        {/* Register button removed as requested */}
      </Nav>
    </>
  );
  
  return (
    <Navbar expand="lg" className="designlab-navbar" variant="dark">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <div className="d-flex align-items-center">
            <div className="designlab-feature-icon me-2" style={{ width: '40px', height: '40px', marginBottom: 0 }}>
              <FaAmbulance size={20} />
            </div>
            <div>
              <span className="designlab-gradient-text fw-bold">Justice</span>
              <span className="opacity-75"> Emergency</span>
            </div>
          </div>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" className="d-flex align-items-center">
              <div className="designlab-feature-icon me-2" style={{ 
                width: '28px', 
                height: '28px', 
                marginBottom: 0, 
                background: 'rgba(255, 255, 255, 0.05)' 
              }}>
                <FaAmbulance size={14} />
              </div>
              <span>Home</span>
            </Nav.Link>
            
            <Nav.Link 
              as="a" 
              href="/hospital/login" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="d-flex align-items-center"
            >
              <div className="designlab-feature-icon me-2" style={{ 
                width: '28px', 
                height: '28px', 
                marginBottom: 0, 
                background: 'rgba(255, 255, 255, 0.05)' 
              }}>
                <FaHospital size={14} />
              </div>
              <span>Hospital</span>
            </Nav.Link>
            
            <Nav.Link 
              as="a" 
              href="/ambulance/login" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="d-flex align-items-center"
            >
              <div className="designlab-feature-icon me-2" style={{ 
                width: '28px', 
                height: '28px', 
                marginBottom: 0, 
                background: 'rgba(255, 255, 255, 0.05)' 
              }}>
                <FaAmbulance size={14} />
              </div>
              <span>Ambulance</span>
            </Nav.Link>
            
            {isAuthenticated && !loading && (
              <>
                <Nav.Link as={Link} to={`/${user?.role}/dashboard`} className="d-flex align-items-center">
                  <div className="designlab-feature-icon me-2" style={{ 
                    width: '28px', 
                    height: '28px', 
                    marginBottom: 0, 
                    background: 'rgba(255, 255, 255, 0.05)' 
                  }}>
                    {user?.role === 'hospital' ? (
                      <FaHospital size={14} />
                    ) : (
                      <FaAmbulance size={14} />
                    )}
                  </div>
                  <span>Dashboard</span>
                </Nav.Link>
                {user?.role === 'hospital' && (
                  <Nav.Link as={Link} to="/hospital/doctors" className="d-flex align-items-center">
                    <div className="designlab-feature-icon me-2" style={{ 
                      width: '28px', 
                      height: '28px', 
                      marginBottom: 0, 
                      background: 'rgba(255, 255, 255, 0.05)' 
                    }}>
                      <FaUserMd size={14} />
                    </div>
                    <span>Doctors</span>
                  </Nav.Link>
                )}
                <Nav.Link as={Link} to={`/${user?.role}/notifications`} className="d-flex align-items-center">
                  <div className="designlab-feature-icon me-2" style={{ 
                    width: '28px', 
                    height: '28px', 
                    marginBottom: 0, 
                    background: 'rgba(255, 255, 255, 0.05)' 
                  }}>
                    <FaBell size={14} />
                  </div>
                  <span>Notifications</span>
                </Nav.Link>
              </>
            )}
          </Nav>
          
          {!loading && (isAuthenticated ? authLinks : guestLinks)}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
