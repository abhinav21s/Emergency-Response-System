import React, { useState, useContext, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaHospital, FaAmbulance, FaEnvelope, FaLock, FaUser, FaPhone, FaMapMarkerAlt, FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import '../styles/register.css';

const Register = () => {
  const [userType, setUserType] = useState('hospital');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    // Hospital specific
    hospitalName: '',
    contactPerson: '',
    position: '',
    // Ambulance specific
    ambulanceNumber: '',
    licenseNumber: '',
    vehicleType: ''
  });
  
  const [errors, setErrors] = useState({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Reset form when userType changes
    setFormData({
      ...formData,
      hospitalName: userType === 'hospital' ? formData.hospitalName : '',
      contactPerson: userType === 'hospital' ? formData.contactPerson : '',
      position: userType === 'hospital' ? formData.position : '',
      name: userType === 'ambulance' ? formData.name : '',
      ambulanceNumber: userType === 'ambulance' ? formData.ambulanceNumber : '',
      licenseNumber: userType === 'ambulance' ? formData.licenseNumber : '',
      vehicleType: userType === 'ambulance' ? formData.vehicleType : ''
    });
    setErrors({});
    setFormSubmitted(false);
  }, [userType]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    
    // Live validation
    if (formSubmitted) {
      validateField(name, value);
    }
    
    // Check password strength when password field changes
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };
  
  const checkPasswordStrength = (password) => {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  };
  
  const validateField = (name, value) => {
    let newErrors = { ...errors };
    
    switch (name) {
      case 'email':
        if (!value) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          newErrors.email = 'Email is invalid';
        } else {
          delete newErrors.email;
        }
        break;
        
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else {
          delete newErrors.password;
        }
        
        // Check if confirm password matches
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else if (formData.confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;
        
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
        
      case 'phone':
        if (!value) {
          newErrors.phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(value.replace(/\D/g, ''))) {
          newErrors.phone = 'Phone number must be 10 digits';
        } else {
          delete newErrors.phone;
        }
        break;
        
      // Hospital specific validations
      case 'hospitalName':
        if (userType === 'hospital' && !value) {
          newErrors.hospitalName = 'Hospital name is required';
        } else {
          delete newErrors.hospitalName;
        }
        break;
        
      case 'contactPerson':
        if (userType === 'hospital' && !value) {
          newErrors.contactPerson = 'Contact person name is required';
        } else {
          delete newErrors.contactPerson;
        }
        break;
        
      // Ambulance specific validations
      case 'name':
        if (userType === 'ambulance' && !value) {
          newErrors.name = 'Driver name is required';
        } else {
          delete newErrors.name;
        }
        break;
        
      case 'ambulanceNumber':
        if (userType === 'ambulance' && !value) {
          newErrors.ambulanceNumber = 'Ambulance number is required';
        } else {
          delete newErrors.ambulanceNumber;
        }
        break;
        
      case 'vehicleType':
        if (userType === 'ambulance' && !value) {
          newErrors.vehicleType = 'Vehicle type is required';
        } else {
          delete newErrors.vehicleType;
        }
        break;
        
      default:
        break;
    }
    
    setErrors(newErrors);
    return newErrors;
  };
  
  const validateForm = () => {
    let newErrors = {};
    let isValid = true;
    
    // Common validations
    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
      isValid = false;
    }
    
    if (!formData.address) {
      newErrors.address = 'Address is required';
      isValid = false;
    }
    
    // User type specific validations
    if (userType === 'hospital') {
      if (!formData.hospitalName) {
        newErrors.hospitalName = 'Hospital name is required';
        isValid = false;
      }
      
      if (!formData.contactPerson) {
        newErrors.contactPerson = 'Contact person name is required';
        isValid = false;
      }
      
      if (!formData.position) {
        newErrors.position = 'Position is required';
        isValid = false;
      }
    } else {
      if (!formData.name) {
        newErrors.name = 'Driver name is required';
        isValid = false;
      }
      
      if (!formData.ambulanceNumber) {
        newErrors.ambulanceNumber = 'Ambulance number is required';
        isValid = false;
      }
      
      if (!formData.licenseNumber) {
        newErrors.licenseNumber = 'License number is required';
        isValid = false;
      }
      
      if (!formData.vehicleType) {
        newErrors.vehicleType = 'Vehicle type is required';
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        role: userType
      };
      
      if (userType === 'hospital') {
        registrationData.hospitalName = formData.hospitalName;
        registrationData.address = {
          street: formData.address,
          city: '',
          state: '',
          zipCode: '',
          country: 'India'
        };
        registrationData.contactPerson = {
          name: formData.contactPerson,
          position: formData.position,
          phone: formData.phone
        };
      } else {
        registrationData.name = formData.name;
        registrationData.phone = formData.phone;
        registrationData.ambulanceNumber = formData.ambulanceNumber;
        registrationData.licenseNumber = formData.licenseNumber;
        registrationData.vehicleType = formData.vehicleType;
      }
      
      const success = await register(registrationData, userType);
      if (success) {
        navigate(`/${userType}/dashboard`, { replace: true });
      } else {
        setErrors({...errors, general: 'Registration failed. Please try again.'});
      }
    } catch (err) {
      setErrors({...errors, general: err.response?.data?.message || 'Registration failed'});
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderTooltip = (content) => (
    <Tooltip id="tooltip">
      {content}
    </Tooltip>
  );
  
  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 4) return 'Medium';
    return 'Strong';
  };
  
  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return 'danger';
    if (passwordStrength <= 4) return 'warning';
    return 'success';
  };
  
  return (
    <div className="justice-register-page">
      {/* Glowing effects */}
      <div className="glow-effect glow-blue"></div>
      <div className="glow-effect glow-purple"></div>
      <div className="glow-effect glow-pink"></div>
      
      <Container>
        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="glass-card">
              <Card.Header className="glass-card-header text-center">
                <div className="justice-logo">
                  {userType === 'hospital' ? (
                    <FaHospital size={40} />
                  ) : (
                    <FaAmbulance size={40} />
                  )}
                </div>
                <h3 className="text-white mt-3">{userType === 'hospital' ? 'Hospital Registration' : 'Ambulance Registration'}</h3>
                <p className="mb-0 text-white-50">Justice Emergency Response System</p>
              </Card.Header>
              
              <Card.Body className="p-4">
                {errors.general && (
                  <Alert variant="danger" className="d-flex align-items-center">
                    <FaExclamationTriangle className="me-2" />
                    {errors.general}
                  </Alert>
                )}
                
                <div className="d-flex justify-content-center mb-4">
                  <div className="toggle-container">
                    <Button
                      variant={userType === 'hospital' ? 'primary' : 'outline-primary'}
                      className={`toggle-btn ${userType === 'hospital' ? 'active' : ''}`}
                      onClick={() => setUserType('hospital')}
                    >
                      <FaHospital className="me-2" />
                      Hospital
                    </Button>
                    <Button
                      variant={userType === 'ambulance' ? 'primary' : 'outline-primary'}
                      className={`toggle-btn ${userType === 'ambulance' ? 'active' : ''}`}
                      onClick={() => setUserType('ambulance')}
                    >
                      <FaAmbulance className="me-2" />
                      Ambulance
                    </Button>
                  </div>
                </div>
                
                <Form onSubmit={handleSubmit} noValidate>
                  <Row>
                    {userType === 'hospital' ? (
                      // Hospital registration form
                      <>
                        <Col md={12} className="mb-3">
                          <Form.Group>
                            <Form.Label>Hospital Name</Form.Label>
                            <div className="input-group">
                              <span className="input-group-text">
                                <FaHospital />
                              </span>
                              <Form.Control
                                type="text"
                                name="hospitalName"
                                placeholder="Enter hospital name"
                                value={formData.hospitalName}
                                onChange={handleChange}
                                isInvalid={!!errors.hospitalName}
                                required
                              />
                              <Form.Control.Feedback type="invalid">
                                {errors.hospitalName}
                              </Form.Control.Feedback>
                            </div>
                          </Form.Group>
                        </Col>
                        
                        <Col md={6} className="mb-3">
                          <Form.Group>
                            <Form.Label>Contact Person Name</Form.Label>
                            <div className="input-group">
                              <span className="input-group-text">
                                <FaUser />
                              </span>
                              <Form.Control
                                type="text"
                                name="contactPerson"
                                placeholder="Enter contact person name"
                                value={formData.contactPerson}
                                onChange={handleChange}
                                isInvalid={!!errors.contactPerson}
                                required
                              />
                              <Form.Control.Feedback type="invalid">
                                {errors.contactPerson}
                              </Form.Control.Feedback>
                            </div>
                          </Form.Group>
                        </Col>
                        
                        <Col md={6} className="mb-3">
                          <Form.Group>
                            <Form.Label>Position</Form.Label>
                            <Form.Control
                              type="text"
                              name="position"
                              placeholder="Enter position in hospital"
                              value={formData.position}
                              onChange={handleChange}
                              isInvalid={!!errors.position}
                              required
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.position}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </>
                    ) : (
                      // Ambulance registration form
                      <>
                        <Col md={12} className="mb-3">
                          <Form.Group>
                            <Form.Label>Driver Name</Form.Label>
                            <div className="input-group">
                              <span className="input-group-text">
                                <FaUser />
                              </span>
                              <Form.Control
                                type="text"
                                name="name"
                                placeholder="Enter driver name"
                                value={formData.name}
                                onChange={handleChange}
                                isInvalid={!!errors.name}
                                required
                              />
                              <Form.Control.Feedback type="invalid">
                                {errors.name}
                              </Form.Control.Feedback>
                            </div>
                          </Form.Group>
                        </Col>
                        
                        <Col md={6} className="mb-3">
                          <Form.Group>
                            <Form.Label>
                              Ambulance Number
                              <OverlayTrigger placement="top" overlay={renderTooltip("Enter the official registration number of the ambulance")}>
                                <FaInfoCircle className="ms-2 text-muted" />
                              </OverlayTrigger>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="ambulanceNumber"
                              placeholder="e.g., DL-12-AB-1234"
                              value={formData.ambulanceNumber}
                              onChange={handleChange}
                              isInvalid={!!errors.ambulanceNumber}
                              required
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.ambulanceNumber}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={6} className="mb-3">
                          <Form.Group>
                            <Form.Label>
                              License Number
                              <OverlayTrigger placement="top" overlay={renderTooltip("Enter the driver's license number")}>
                                <FaInfoCircle className="ms-2 text-muted" />
                              </OverlayTrigger>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="licenseNumber"
                              placeholder="Enter license number"
                              value={formData.licenseNumber}
                              onChange={handleChange}
                              isInvalid={!!errors.licenseNumber}
                              required
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors.licenseNumber}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={12} className="mb-3">
                          <Form.Group>
                            <Form.Label>
                              Vehicle Type
                              <OverlayTrigger placement="top" overlay={renderTooltip("Select the type of ambulance based on its capabilities")}>
                                <FaInfoCircle className="ms-2 text-muted" />
                              </OverlayTrigger>
                            </Form.Label>
                            <Form.Select
                              name="vehicleType"
                              value={formData.vehicleType}
                              onChange={handleChange}
                              isInvalid={!!errors.vehicleType}
                              required
                            >
                              <option value="">Select vehicle type</option>
                              <option value="Basic">Basic Ambulance</option>
                              <option value="Advanced">Advanced Life Support</option>
                              <option value="Critical">Critical Care</option>
                              <option value="Neonatal">Neonatal Transport</option>
                              <option value="Mobile">Mobile ICU</option>
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">
                              {errors.vehicleType}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </>
                    )}
                    
                    {/* Common fields for both */}
                    <Col md={12} className="mb-3">
                      <Form.Group>
                        <Form.Label>Email Address</Form.Label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaEnvelope />
                          </span>
                          <Form.Control
                            type="email"
                            name="email"
                            placeholder="Enter email address"
                            value={formData.email}
                            onChange={handleChange}
                            isInvalid={!!errors.email}
                            required
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.email}
                          </Form.Control.Feedback>
                        </div>
                      </Form.Group>
                    </Col>
                    
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label>Phone Number</Form.Label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaPhone />
                          </span>
                          <Form.Control
                            type="tel"
                            name="phone"
                            placeholder="Enter 10-digit phone number"
                            value={formData.phone}
                            onChange={handleChange}
                            isInvalid={!!errors.phone}
                            required
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.phone}
                          </Form.Control.Feedback>
                        </div>
                      </Form.Group>
                    </Col>
                    
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label>Address</Form.Label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaMapMarkerAlt />
                          </span>
                          <Form.Control
                            type="text"
                            name="address"
                            placeholder="Enter address"
                            value={formData.address}
                            onChange={handleChange}
                            isInvalid={!!errors.address}
                            required
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.address}
                          </Form.Control.Feedback>
                        </div>
                      </Form.Group>
                    </Col>
                    
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label>
                          Password
                          <OverlayTrigger placement="top" overlay={renderTooltip("Password must be at least 8 characters with a mix of letters, numbers, and symbols")}>
                            <FaInfoCircle className="ms-2 text-muted" />
                          </OverlayTrigger>
                        </Form.Label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaLock />
                          </span>
                          <Form.Control
                            type="password"
                            name="password"
                            placeholder="Enter password"
                            value={formData.password}
                            onChange={handleChange}
                            isInvalid={!!errors.password}
                            required
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.password}
                          </Form.Control.Feedback>
                        </div>
                        {formData.password && (
                          <div className="password-strength mt-2">
                            <div className="d-flex align-items-center">
                              <div className="strength-meter">
                                {[1, 2, 3, 4, 5].map((level) => (
                                  <div 
                                    key={level} 
                                    className={`strength-segment ${level <= passwordStrength ? `bg-${getPasswordStrengthColor()}` : ''}`}
                                  />
                                ))}
                              </div>
                              <span className={`ms-2 text-${getPasswordStrengthColor()}`}>
                                {getPasswordStrengthLabel()}
                              </span>
                            </div>
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label>Confirm Password</Form.Label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaLock />
                          </span>
                          <Form.Control
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            isInvalid={!!errors.confirmPassword}
                            required
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.confirmPassword}
                          </Form.Control.Feedback>
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <div className="terms-section mb-3">
                    <Form.Check
                      type="checkbox"
                      id="terms"
                      className="mb-2"
                      label={
                        <span>
                          I agree to the <Link to="#" className="text-primary">Terms and Conditions</Link> and <Link to="#" className="text-primary">Privacy Policy</Link>
                        </span>
                      }
                      required
                    />
                  </div>
                  
                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100 register-btn mt-3" 
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader small /> : (
                      <>
                        {userType === 'hospital' ? 'Register Hospital' : 'Register Ambulance'}
                        <FaCheckCircle className="ms-2" />
                      </>
                    )}
                  </Button>
                </Form>
              </Card.Body>
              
              <Card.Footer className="text-center py-3">
                <div className="small">
                  Already have an account? <Link to="/login" className="text-primary fw-bold">Login here</Link>
                </div>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Register; 