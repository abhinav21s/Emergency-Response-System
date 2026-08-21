import React, { useState, useContext } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaAmbulance, FaSignInAlt } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import '../../styles/register.css';

const AmbulanceLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from query params or default to dashboard
  const from = location.state?.from?.pathname || '/ambulance/dashboard';
  
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
    
    // Add mobile-specific validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }
    
    try {
      const success = await login(formData.email.trim(), formData.password, 'ambulance');
      if (success) {
        // Clear form data on successful login
        setFormData({ email: '', password: '' });
        navigate(from, { replace: true });
      } else {
        setError('Invalid email or password. Please check your credentials and try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="selection-page">
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={5}>
            <Card className="login-card">
              <div className="login-header ambulance-header">
                <div className="icon-container">
                  <FaAmbulance size={32} />
                </div>
                <h2>Ambulance Login</h2>
                <p>Access your ambulance dashboard</p>
              </div>
              
              <Card.Body className="login-body">
                {error && (
                  <Alert variant="danger" className="login-alert">
                    {error}
                  </Alert>
                )}
                
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-4">
                    <Form.Label className="login-label">Email Address</Form.Label>
                    <div className="login-input-group">
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="login-input"
                      />
                    </div>
                  </Form.Group>
                  
                  <Form.Group className="mb-4">
                    <Form.Label className="login-label">Password</Form.Label>
                    <div className="login-input-group">
                      <Form.Control
                        type="password"
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="login-input"
                      />
                    </div>
                  </Form.Group>
                  
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <Form.Check
                      type="checkbox"
                      label="Remember me"
                      id="remember-ambulance"
                      className="login-checkbox"
                    />
                    <Link to="/forgot-password" className="login-link ambulance-link">Forgot Password?</Link>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="login-button ambulance-button" 
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader small /> : (
                      <>
                        <span>Login to Dashboard</span>
                        <FaSignInAlt />
                      </>
                    )}
                  </Button>
                </Form>
                
                <div className="login-footer">
                  <p>Don't have an account?</p>
                  <Link to="/ambulance/register" className="register-link ambulance-register">
                    Register as Ambulance
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AmbulanceLogin;
