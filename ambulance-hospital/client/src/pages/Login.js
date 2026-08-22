import React, { useState, useContext } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHospital, FaEnvelope, FaLock } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import Loader from '../components/common/Loader';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/hospital/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const success = await login(email, password, 'hospital');
      if (success) {
        navigate(from, { replace: true });
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please contact support.');
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
                <FaHospital size={40} />
              </div>
              <h3>Hospital Login</h3>
              <p className="mb-0">Emergency Response Management Portal</p>
            </Card.Header>

            <Card.Body className="p-4">
              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaEnvelope />
                    </span>
                    <Form.Control
                      type="email"
                      placeholder="Enter your registered email"
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

                <Button variant="primary" type="submit" className="w-100" disabled={isLoading}>
                  {isLoading ? <Loader small /> : 'Sign In'}
                </Button>
              </Form>
            </Card.Body>

            <Card.Footer className="text-center py-3">
              <div className="small">
                New hospital? <Link to="/hospital/register">Register here</Link>
              </div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;