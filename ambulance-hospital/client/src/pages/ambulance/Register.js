import React, { useState, useContext } from 'react';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaAmbulance, FaEnvelope, FaLock, FaUser, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaIdCard, FaCarAlt, FaBuilding } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import '../../styles/register.css';

const AmbulanceRegister = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '', // User name
    phone: '',
    role: 'ambulance',
    ambulanceId: '',
    driverName: '',
    driverLicense: '',
    vehicleNumber: '',
    currentEmergency: null,
    organization: {
      name: '',
      address: '',
      contactNumber: ''
    },
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716]
    },
    active: true
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested objects
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prevState => ({
        ...prevState,
        [parent]: {
          ...prevState[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prevState => ({
        ...prevState,
        [name]: value
      }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.name) newErrors.name = 'Your name is required';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    if (!formData.driverName) newErrors.driverName = 'Driver name is required';
    if (!formData.driverLicense) newErrors.driverLicense = 'Driver license is required';
    if (!formData.vehicleNumber) newErrors.vehicleNumber = 'Vehicle number is required';
    if (!formData.organization.name) newErrors['organization.name'] = 'Organization name is required';
    if (!formData.organization.address) newErrors['organization.address'] = 'Organization address is required';
    if (!formData.organization.contactNumber) newErrors['organization.contactNumber'] = 'Organization contact number is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create registration data object
      const registrationData = {
        name: formData.name,
        phone: formData.phone,
        driverName: formData.driverName,
        driverLicense: formData.driverLicense,
        vehicleNumber: formData.vehicleNumber,
        organization: formData.organization,
        location: formData.location
      };
      
      // Only include ambulanceId if it's not empty
      if (formData.ambulanceId && formData.ambulanceId.trim() !== '') {
        registrationData.ambulanceId = formData.ambulanceId.trim();
      }
      
      await register(
        formData.email.trim(),
        formData.password,
        'ambulance',
        registrationData
      );
      
      navigate('/ambulance/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Registration failed';
      setErrors({ general: msg });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="register-page">
      <Container>
        <div className="register-container ambulance-container">
          <div className="register-header ambulance-header">
            <div className="register-icon ambulance-icon">
              <FaAmbulance size={32} />
            </div>
            <h1>Ambulance Registration</h1>
            <p>Join the Justice Emergency Response System</p>
          </div>
          
          {errors.general && (
            <Alert variant="danger" className="register-alert">
              {errors.general}
            </Alert>
          )}
          
          <Form onSubmit={handleSubmit} className="register-form">
            <h4 className="section-title">Account Information</h4>
            <Row>
              <Col lg={12} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaUser className="input-icon" />
                  </div>
                  <Form.Control
                    type="text"
                    id="name"
                    name="name"
                    placeholder=" "
                    value={formData.name}
                    onChange={handleChange}
                    isInvalid={!!errors.name}
                    className="custom-form-control"
                  />
                  <Form.Label htmlFor="name">Your Name</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                </div>
              </Col>
              
              <Col md={6} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaEnvelope className="input-icon" />
                  </div>
                  <Form.Control
                    type="email"
                    id="email"
                    name="email"
                    placeholder=" "
                    value={formData.email}
                    onChange={handleChange}
                    isInvalid={!!errors.email}
                    className="custom-form-control"
                  />
                  <Form.Label htmlFor="email">Email Address</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </div>
              </Col>
              
              <Col md={6} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaPhone className="input-icon" />
                  </div>
                  <Form.Control
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder=" "
                    value={formData.phone}
                    onChange={handleChange}
                    isInvalid={!!errors.phone}
                    className="custom-form-control"
                  />
                  <Form.Label htmlFor="phone">Phone Number</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors.phone}
                  </Form.Control.Feedback>
                </div>
              </Col>
              
              <Col md={6} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaLock className="input-icon" />
                  </div>
                  <Form.Control
                    type="password"
                    id="password"
                    name="password"
                    placeholder=" "
                    value={formData.password}
                    onChange={handleChange}
                    isInvalid={!!errors.password}
                    className="custom-form-control"
                  />
                  <Form.Label htmlFor="password">Password</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </div>
              </Col>
              
              <Col md={6} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaLock className="input-icon" />
                  </div>
                  <Form.Control
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder=" "
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    isInvalid={!!errors.confirmPassword}
                    className="custom-form-control"
                  />
                  <Form.Label htmlFor="confirmPassword">Confirm Password</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors.confirmPassword}
                  </Form.Control.Feedback>
                </div>
              </Col>
            </Row>
            
            <h4 className="section-title">Ambulance Information</h4>
            <Row>
              <Col md={6} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaIdCard className="input-icon" />
                  </div>
                  <Form.Control
                    type="text"
                    id="ambulanceId"
                    name="ambulanceId"
                    placeholder=" "
                    value={formData.ambulanceId}
                    onChange={handleChange}
                    isInvalid={!!errors.ambulanceId}
                    className="custom-form-control"
                    style={{ color: '#fff', background: 'rgba(255, 255, 255, 0.1)' }}
                  />
                  <Form.Label htmlFor="ambulanceId" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Ambulance ID (Optional)</Form.Label>
                  <Form.Text className="text-light" style={{ opacity: 0.8, display: 'block', marginTop: '6px' }}>
                    If left blank, a unique ID like 'AMB-1A2B3C4D' will be automatically generated.
                  </Form.Text>
                  <Form.Control.Feedback type="invalid">
                    {errors.ambulanceId}
                  </Form.Control.Feedback>
                </div>
              </Col>
              
              <Col md={6} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaUser className="input-icon" />
                  </div>
                  <Form.Control
                    type="text"
                    id="driverName"
                    name="driverName"
                    placeholder=" "
                    value={formData.driverName}
                    onChange={handleChange}
                    isInvalid={!!errors.driverName}
                    className="custom-form-control"
                    style={{ color: '#fff', background: 'rgba(255, 255, 255, 0.1)' }}
                  />
                  <Form.Label htmlFor="driverName" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Driver Name</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors.driverName}
                  </Form.Control.Feedback>
                </div>
              </Col>
              
              <Col md={6} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaIdCard className="input-icon" />
                  </div>
                  <Form.Control
                    type="text"
                    id="driverLicense"
                    name="driverLicense"
                    placeholder=" "
                    value={formData.driverLicense}
                    onChange={handleChange}
                    isInvalid={!!errors.driverLicense}
                    className="custom-form-control"
                  />
                  <Form.Label htmlFor="driverLicense">Driver License</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors.driverLicense}
                  </Form.Control.Feedback>
                </div>
              </Col>
              
              <Col md={6} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaCarAlt className="input-icon" />
                  </div>
                  <Form.Control
                    type="text"
                    id="vehicleNumber"
                    name="vehicleNumber"
                    placeholder=" "
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                    isInvalid={!!errors.vehicleNumber}
                    className="custom-form-control"
                  />
                  <Form.Label htmlFor="vehicleNumber">Vehicle Number</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors.vehicleNumber}
                  </Form.Control.Feedback>
                </div>
              </Col>
            </Row>
            
            <h4 className="section-title">Organization Information</h4>
            <Row>
              <Col md={12} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaBuilding className="input-icon" />
                  </div>
                  <Form.Control
                    type="text"
                    id="organization.name"
                    name="organization.name"
                    placeholder=" "
                    value={formData.organization.name}
                    onChange={handleChange}
                    isInvalid={!!errors['organization.name']}
                    className="custom-form-control"
                  />
                  <Form.Label htmlFor="organization.name">Organization Name</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors['organization.name']}
                  </Form.Control.Feedback>
                </div>
              </Col>
              
              <Col md={6} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaMapMarkerAlt className="input-icon" />
                  </div>
                  <Form.Control
                    type="text"
                    id="organization.address"
                    name="organization.address"
                    placeholder=" "
                    value={formData.organization.address}
                    onChange={handleChange}
                    isInvalid={!!errors['organization.address']}
                    className="custom-form-control"
                  />
                  <Form.Label htmlFor="organization.address">Organization Address</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors['organization.address']}
                  </Form.Control.Feedback>
                </div>
              </Col>
              
              <Col md={6} className="mb-4">
                <div className="form-floating custom-form-floating">
                  <div className="input-icon-wrapper">
                    <FaPhone className="input-icon" />
                  </div>
                  <Form.Control
                    type="tel"
                    id="organization.contactNumber"
                    name="organization.contactNumber"
                    placeholder=" "
                    value={formData.organization.contactNumber}
                    onChange={handleChange}
                    isInvalid={!!errors['organization.contactNumber']}
                    className="custom-form-control"
                  />
                  <Form.Label htmlFor="organization.contactNumber">Organization Contact</Form.Label>
                  <Form.Control.Feedback type="invalid">
                    {errors['organization.contactNumber']}
                  </Form.Control.Feedback>
                </div>
              </Col>
            </Row>
            
            <Button 
              type="submit" 
              className="register-button ambulance-button" 
              disabled={isLoading}
            >
              {isLoading ? <Loader small /> : (
                <>
                  <span>Register Ambulance</span>
                  <FaCheckCircle />
                </>
              )}
            </Button>
            
            <div className="register-footer">
              <p>Already have an account?</p>
              <Link to="/ambulance/login" className="login-link ambulance-link">
                Login to your account
              </Link>
            </div>
          </Form>
        </div>
      </Container>
    </div>
  );
};

export default AmbulanceRegister;
