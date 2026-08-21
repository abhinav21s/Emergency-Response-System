import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import api from '../../services/api';
import Loader from '../../components/common/Loader';
import HospitalNavbar from '../../components/hospital/HospitalNavbar';
import '../../styles/profile-text-visibility.css'; // Reusing the profile text visibility styles

const HospitalProfile = () => {
  const { user, updateProfile } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    hospitalName: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    },
    location: {
      type: 'Point',
      coordinates: [0, 0] // [longitude, latitude]
    }
  });

  // Fetch hospital data
  useEffect(() => {
    const fetchHospitalData = async () => {
      try {
        console.log('Current user:', user);
        
        if (!user || !user._id) {
          console.log('User or user ID missing');
          setError('User information missing. Please log in again.');
          setLoading(false);
          return;
        }

        console.log('Attempting to fetch hospital data for ID:', user._id);
        
        try {
          // Use the centralized API service which already handles authentication
          const res = await api.get(`hospitals/${user._id}`);
          console.log('Hospital data response:', res.data);
          
          if (!res.data || !res.data.hospital) {
            throw new Error('Hospital data missing in response');
          }
          
          const hospitalData = res.data.hospital;
          
          // Set form data with the hospital data
          setFormData({
            name: hospitalData.name || '',
            email: hospitalData.email || '',
            phone: hospitalData.phone || '',
            hospitalName: hospitalData.hospitalName || '',
            address: {
              street: hospitalData.address?.street || '',
              city: hospitalData.address?.city || '',
              state: hospitalData.address?.state || '',
              zipCode: hospitalData.address?.zipCode || '',
              country: hospitalData.address?.country || 'India'
            },
            location: {
              type: 'Point',
              coordinates: [
                hospitalData.location?.coordinates[0] || 0,
                hospitalData.location?.coordinates[1] || 0
              ]
            }
          });
          
          setError('');
        } catch (apiError) {
          console.error('API error:', apiError);
          
          // Try to get data from localStorage as fallback
          const cachedHospitalData = localStorage.getItem('hospitalData');
          if (cachedHospitalData) {
            try {
              const parsedData = JSON.parse(cachedHospitalData);
              console.log('Using cached hospital data:', parsedData);
              
              // Set form data with cached data
              setFormData({
                name: parsedData.name || '',
                email: parsedData.email || user.email || '',
                phone: parsedData.phone || '',
                hospitalName: parsedData.hospitalName || '',
                address: {
                  street: parsedData.address?.street || '',
                  city: parsedData.address?.city || '',
                  state: parsedData.address?.state || '',
                  zipCode: parsedData.address?.zipCode || '',
                  country: parsedData.address?.country || 'India'
                },
                location: {
                  type: 'Point',
                  coordinates: [
                    parsedData.location?.coordinates[0] || 0,
                    parsedData.location?.coordinates[1] || 0
                  ]
                }
              });
              
              setError('Using locally cached data. Some information may be outdated.');
            } catch (cacheError) {
              console.error('Cache parsing error:', cacheError);
              setError('Failed to load hospital profile data. Please try again later.');
            }
          } else {
            // If no cached data, use user data as fallback
            setFormData({
              name: user.name || '',
              email: user.email || '',
              phone: user.phone || '',
              hospitalName: '',
              address: {
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: 'India'
              },
              location: {
                type: 'Point',
                coordinates: [0, 0]
              }
            });
            
            setError('Failed to load hospital profile data. Please fill in your hospital information.');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching hospital data:', error);
        setError('Failed to load hospital profile data');
        setLoading(false);
      }
    };
    
    fetchHospitalData();
  }, [user._id]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
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
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };
  
  // Handle coordinate changes
  const handleCoordinateChange = (e) => {
    const { name, value } = e.target;
    const index = name === 'longitude' ? 0 : 1;
    
    setFormData(prevState => ({
      ...prevState,
      location: {
        ...prevState.location,
        coordinates: [
          index === 0 ? parseFloat(value) : prevState.location.coordinates[0],
          index === 1 ? parseFloat(value) : prevState.location.coordinates[1]
        ]
      }
    }));
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prevState => ({
            ...prevState,
            location: {
              ...prevState.location,
              coordinates: [
                position.coords.longitude,
                position.coords.latitude
              ]
            }
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Failed to get current location. Please enter coordinates manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUpdating(true);
    
    try {
      // Prepare update data
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        hospitalName: formData.hospitalName,
        address: formData.address,
        location: formData.location
      };
      
      if (!user || !user._id) {
        setError('User information missing. Please log in again.');
        setUpdating(false);
        return;
      }

      try {
        // Update profile using the centralized API service
        const response = await api.put(`hospitals/${user._id}`, updateData);
        
        if (response.status === 200) {
          // Update local user context if needed
          if (typeof updateProfile === 'function') {
            await updateProfile(updateData);
          }
          
          // Cache the updated data locally
          localStorage.setItem('hospitalData', JSON.stringify(updateData));
        }
      } catch (apiError) {
        console.error('API update error:', apiError);
        throw new Error('Failed to update profile. Server connection issue.');
      }
      
      setSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="profile-page">
      <HospitalNavbar />
      <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <h2>Hospital Profile</h2>
          <p className="text-muted">Manage your hospital information and settings</p>
        </Col>
      </Row>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={8}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Basic Information</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="name">
                      <Form.Label>Administrator Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter administrator name"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="email">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        value={formData.email}
                        disabled
                        readOnly
                      />
                      <Form.Text className="text-muted">
                        Email cannot be changed
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="phone">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="hospitalName">
                      <Form.Label>Hospital Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="hospitalName"
                        value={formData.hospitalName}
                        onChange={handleChange}
                        placeholder="Enter hospital name"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
            
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Address Information</h5>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3" controlId="address.street">
                  <Form.Label>Street Address</Form.Label>
                  <Form.Control
                    type="text"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    placeholder="Enter street address"
                    required
                  />
                </Form.Group>
                
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="address.city">
                      <Form.Label>City</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleChange}
                        placeholder="Enter city"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="address.state">
                      <Form.Label>State</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.state"
                        value={formData.address.state}
                        onChange={handleChange}
                        placeholder="Enter state"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId="address.zipCode">
                      <Form.Label>ZIP Code</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={handleChange}
                        placeholder="Enter ZIP code"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3" controlId="address.country">
                      <Form.Label>Country</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.country"
                        value={formData.address.country}
                        onChange={handleChange}
                        placeholder="Enter country"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={5}>
                    <Form.Group className="mb-3" controlId="longitude">
                      <Form.Label>Longitude</Form.Label>
                      <Form.Control
                        type="number"
                        name="longitude"
                        value={formData.location.coordinates[0]}
                        onChange={handleCoordinateChange}
                        placeholder="Enter longitude"
                        step="0.000001"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={5}>
                    <Form.Group className="mb-3" controlId="latitude">
                      <Form.Label>Latitude</Form.Label>
                      <Form.Control
                        type="number"
                        name="latitude"
                        value={formData.location.coordinates[1]}
                        onChange={handleCoordinateChange}
                        placeholder="Enter latitude"
                        step="0.000001"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={2} className="d-flex align-items-end mb-3">
                    <Button 
                      variant="secondary" 
                      onClick={getCurrentLocation}
                      className="w-100"
                    >
                      Update
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
            

          </Col>
          
          <Col md={4}>

            

            
            <Button 
              variant="primary" 
              type="submit" 
              className="w-100 mb-3"
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update Profile'}
            </Button>
          </Col>
        </Row>
      </Form>
    </Container>
    </div>
  );
};

export default HospitalProfile;
