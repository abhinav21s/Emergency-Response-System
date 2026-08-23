import React, { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaHospital, FaSignInAlt, FaUserPlus, FaTachometerAlt, FaSignOutAlt } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';

const Header = () => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/hospital/login');
  };

  return (
    <Navbar
      expand="lg"
      style={{
        background: '#0f2942',
        borderBottom: '2px solid #1e3a5f',
        padding: '0.85rem 0',
        boxShadow: '0 4px 14px rgba(15, 41, 66, 0.25)',
      }}
    >
      <Container>
        <Navbar.Brand
          as={Link}
          to="/"
          style={{
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1.25rem',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              background: '#1e56a0',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <FaHospital style={{ fontSize: '1.15rem' }} />
          </span>
          <span>Emergency Response Network</span>
        </Navbar.Brand>

        <Navbar.Toggle
          aria-controls="public-header-nav"
          style={{
            borderColor: '#334e68',
            backgroundColor: '#1e3a5f',
            padding: '6px 10px',
            borderRadius: '8px',
          }}
        />

        <Navbar.Collapse id="public-header-nav">
          <Nav className="me-auto mt-2 mt-lg-0">
            <Nav.Link
              as={Link}
              to="/"
              style={{
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '0.92rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
              }}
            >
              Home
            </Nav.Link>
            <Nav.Link
              as="a"
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '0.92rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
              }}
            >
              108 Dispatch Command
            </Nav.Link>
          </Nav>

          <Nav className="d-flex align-items-center gap-2 mt-2 mt-lg-0">
            {isAuthenticated ? (
              <>
                <Button
                  as={Link}
                  to="/hospital/dashboard"
                  style={{
                    background: '#1e56a0',
                    borderColor: '#163172',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    borderRadius: '8px',
                    padding: '7px 16px',
                  }}
                >
                  <FaTachometerAlt className="me-2" /> Dashboard
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={handleLogout}
                  style={{
                    color: '#f87171',
                    borderColor: '#ef4444',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    borderRadius: '8px',
                    padding: '7px 14px',
                  }}
                >
                  <FaSignOutAlt className="me-1" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  as={Link}
                  to="/hospital/login"
                  style={{
                    background: '#1e56a0',
                    borderColor: '#163172',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    boxShadow: '0 2px 8px rgba(30, 86, 160, 0.3)',
                  }}
                >
                  <FaSignInAlt className="me-2" /> Hospital Login
                </Button>
                <Button
                  as={Link}
                  to="/hospital/register"
                  style={{
                    background: '#0f766e',
                    borderColor: '#0d655e',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    boxShadow: '0 2px 8px rgba(15, 118, 110, 0.3)',
                  }}
                >
                  <FaUserPlus className="me-2" /> Register Hospital
                </Button>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
