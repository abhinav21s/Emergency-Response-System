import React, { useState, useContext, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHospital, FaAmbulance, FaEnvelope, FaLock } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import Loader from '../components/common/Loader';

const Login = ({ userType: initialUserType }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState(initialUserType || 'hospital');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Update userType when prop changes
  useEffect(() => {
    if (initialUserType) {
      setUserType(initialUserType);
    }
  }, [initialUserType]);
  
  // Get redirect path from query params or default to dashboard
  const from = location.state?.from?.pathname || `/${userType}/dashboard`;
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const success = await login(email, password, userType);
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
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-lg border-0 rounded-lg">
            <Card.Header className="text-center p-4 bg-primary text-white">
              <div className="mb-3">
                {userType === 'hospital' ? (
                  <FaHospital size={40} />
                ) : (
                  <FaAmbulance size={40} />
                )}
              </div>
              <h3>{userType === 'hospital' ? 'Hospital Login' : 'Ambulance Login'}</h3>
              <p className="mb-0">Justice Emergency Response System</p>
            </Card.Header>
            
            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}
              
              <div className="d-flex justify-content-center mb-4">
                <Button
                  variant={userType === 'hospital' ? 'primary' : 'outline-primary'}
                  className="me-2"
                  onClick={() => setUserType('hospital')}
                >
                  Hospital
                </Button>
                <Button
                  variant={userType === 'ambulance' ? 'primary' : 'outline-primary'}
                  onClick={() => setUserType('ambulance')}
                >
                  Ambulance
                </Button>
              </div>
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaEnvelope />
                    </span>
                    <Form.Control
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaLock />
                    </span>
                    <Form.Control
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Remember me"
                  />
                </Form.Group>
                
                <Button variant="primary" type="submit" className="w-100" disabled={isLoading}>
                  {isLoading ? <Loader small /> : 'Login'}
                </Button>
              </Form>
            </Card.Body>
            
            <Card.Footer className="text-center py-3">
              <div className="small">
                Don't have an account? <Link to="/register">Register here</Link>
              </div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;