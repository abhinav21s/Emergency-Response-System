import React, { useState, useContext } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHospital, FaSignInAlt, FaLock, FaEnvelope } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';

const HospitalLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/hospital/dashboard';
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const success = await login(formData.email, formData.password, 'hospital');
      if (success) {
        navigate(from, { replace: true });
      } else {
        setError('Invalid email or password. Please verify credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div style={{ background: '#e9edf2', minHeight: 'calc(100vh - 70px)', padding: '50px 0', display: 'flex', alignItems: 'center' }}>
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={5}>
            <Card style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(15, 41, 66, 0.1)' }}>
              {/* Card Header */}
              <div style={{ background: '#0f2942', color: '#ffffff', padding: '28px 24px', textAlign: 'center' }}>
                <div style={{
                  background: '#1e56a0',
                  color: '#ffffff',
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                  <FaHospital size={28} />
                </div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: '#ffffff' }}>Hospital Facility Login</h3>
                <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 500 }}>
                  Access real-time trauma bed management and 108 dispatches
                </p>
              </div>
              
              <Card.Body style={{ padding: '30px 28px' }}>
                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '10px', fontWeight: 600, fontSize: '0.9rem' }}>
                    {error}
                  </Alert>
                )}
                
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label style={{ color: '#0f2942', fontWeight: 700, fontSize: '0.88rem' }}>
                      <FaEnvelope className="me-2 text-primary" /> Hospital Email Address
                    </Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="e.g. fortis@hospital.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      style={{
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0f2942',
                        fontSize: '0.95rem'
                      }}
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-4">
                    <Form.Label style={{ color: '#0f2942', fontWeight: 700, fontSize: '0.88rem' }}>
                      <FaLock className="me-2 text-primary" /> Password
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      style={{
                        padding: '11px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0f2942',
                        fontSize: '0.95rem'
                      }}
                    />
                  </Form.Group>
                  
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      background: '#1e56a0',
                      borderColor: '#163172',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '1rem',
                      borderRadius: '10px',
                      padding: '12px',
                      boxShadow: '0 4px 12px rgba(30, 86, 160, 0.25)',
                      marginBottom: '18px'
                    }}
                  >
                    {isLoading ? <Loader small /> : (
                      <>
                        <FaSignInAlt className="me-2" /> Login to Command Center
                      </>
                    )}
                  </Button>
                  
                  <div className="text-center" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <span style={{ color: '#334e68', fontSize: '0.9rem', fontWeight: 500 }}>
                      New hospital facility?{' '}
                    </span>
                    <Link to="/hospital/register" style={{ color: '#0f766e', fontWeight: 800, fontSize: '0.9rem' }}>
                      Register Facility
                    </Link>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HospitalLogin;
