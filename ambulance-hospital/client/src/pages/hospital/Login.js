import React, { useState, useContext } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHospital, FaSignInAlt } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import '../../styles/register.css';

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
  
  // Get redirect path from query params or default to dashboard
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
        setError('Invalid email or password');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
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
              <div className="login-header hospital-header">
                <div className="icon-container">
                  <FaHospital size={32} />
                </div>
                <h2>Hospital Login</h2>
                <p>Access your hospital dashboard</p>
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
                      id="remember-hospital"
                      className="login-checkbox"
                    />
                    <Link to="/forgot-password" className="login-link hospital-link">Forgot Password?</Link>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="login-button hospital-button" 
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
                  <Link to="/hospital/register" className="register-link hospital-register">
                    Register as Hospital
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

export default HospitalLogin;
