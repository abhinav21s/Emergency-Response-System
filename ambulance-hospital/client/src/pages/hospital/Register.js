import React, { useState, useContext, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { FaHospital, FaEnvelope, FaLock, FaUser, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaSearch } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import 'leaflet/dist/leaflet.css';
import '../../styles/register.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
});

const hospitalPinIcon = L.divIcon({
  className: 'custom-hospital-marker',
  html: `<div style="background:#dc2626;color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid white;">🏥</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34]
});

// Component to dynamically recenter map
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

// Component to handle map clicks to adjust pin
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const HospitalRegister = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    hospitalName: '',
    address: {
      street: '',
      city: 'Bangalore',
      state: 'Karnataka',
      zipCode: '560001',
      country: 'India'
    },
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716] // [lng, lat]
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);

  // Search hospitals using Nominatim / OpenStreetMap
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFormData(prev => ({ ...prev, hospitalName: query }));

    if (errors.hospitalName) {
      setErrors(prev => ({ ...prev, hospitalName: null }));
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' hospital Bangalore')}&limit=5&addressdetails=1`
        );
        const data = await response.json();
        if (data && data.length > 0) {
          setSearchResults(data);
        } else {
          // Fallback search without "hospital" keyword
          const fallbackRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Bangalore')}&limit=5&addressdetails=1`
          );
          const fallbackData = await fallbackRes.json();
          setSearchResults(fallbackData || []);
        }
      } catch (err) {
        console.error('Error fetching hospital suggestions:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const selectHospitalLocation = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const displayName = place.name || place.display_name.split(',')[0];
    const street = place.address?.road || place.address?.suburb || place.display_name.split(',').slice(0, 2).join(', ');
    const city = place.address?.city || place.address?.town || place.address?.county || 'Bangalore';
    const state = place.address?.state || 'Karnataka';
    const zipCode = place.address?.postcode || '560001';

    setFormData(prev => ({
      ...prev,
      hospitalName: displayName,
      address: {
        street,
        city,
        state,
        zipCode,
        country: 'India'
      },
      location: {
        type: 'Point',
        coordinates: [lon, lat]
      }
    }));

    setSearchQuery(displayName);
    setSearchResults([]);
    setErrors(prev => ({ ...prev, hospitalName: null }));
  };

  const handleMapPinClick = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Hospital Name validation
    if (!formData.hospitalName.trim()) {
      newErrors.hospitalName = 'Please enter or search for your hospital name.';
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Contact person name is required.';
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. contact@hospital.com).';
    }

    // Phone format validation
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit mobile/phone number.';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const additionalData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        hospitalName: formData.hospitalName.trim(),
        address: formData.address,
        location: formData.location
      };

      const registered = await register(
        formData.email.trim(),
        formData.password,
        'hospital',
        additionalData
      );

      if (registered) {
        setSuccess(`Hospital "${formData.hospitalName}" registered successfully!`);
        setRegistrationComplete(true);
        setTimeout(() => {
          navigate('/hospital/dashboard');
        }, 1200);
      } else {
        setErrors({ general: 'Could not register hospital. Please check the details and try again.' });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Hospital registration failed.';
      setErrors({ general: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const currentLat = formData.location.coordinates[1];
  const currentLng = formData.location.coordinates[0];

  return (
    <div className="register-page" style={{ padding: '40px 0' }}>
      <Container>
        <div className="register-container" style={{ maxWidth: '880px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '36px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
          <div className="register-header text-center mb-4">
            <div style={{ width: '60px', height: '60px', background: '#eef4ff', color: '#1359bd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FaHospital size={30} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#10233c' }}>Hospital Registration</h1>
            <p style={{ color: '#607087' }}>Register your hospital and pin your location on the map so ambulances can find and route to you.</p>
          </div>

          {errors.general && (
            <Alert variant="danger" className="mb-4" dismissible onClose={() => setErrors(prev => ({ ...prev, general: null }))}>
              <strong>Registration Error:</strong> {errors.general}
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4">
              <FaCheckCircle className="me-2" />
              {success}
            </Alert>
          )}

          <Form onSubmit={handleSubmit} noValidate>
            {/* Step 1: Hospital Name & Map Search */}
            <Card className="mb-4 border-0" style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
              <h5 style={{ fontWeight: 700, color: '#10233c', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaMapMarkerAlt style={{ color: '#dc2626' }} /> Step 1: Search & Pin Hospital on Map
              </h5>
              
              <Form.Group className="mb-3 position-relative">
                <Form.Label style={{ fontWeight: 600 }}>Type Hospital Name (Auto-locates on Map)</Form.Label>
                <div style={{ position: 'relative' }}>
                  <Form.Control
                    type="text"
                    placeholder="e.g. Manipal Hospital, Victoria Hospital, Apollo Hospital..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    isInvalid={!!errors.hospitalName}
                    style={{ paddingRight: '40px', fontSize: '1.05rem', height: '48px' }}
                    required
                  />
                  <div style={{ position: 'absolute', right: '14px', top: '14px', color: '#94a3b8' }}>
                    {isSearching ? <Spinner animation="border" size="sm" /> : <FaSearch />}
                  </div>
                </div>
                {errors.hospitalName && (
                  <div className="text-danger small mt-1" style={{ fontWeight: 500 }}>
                    {errors.hospitalName}
                  </div>
                )}

                {/* Autocomplete Suggestions Dropdown */}
                {searchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1050, background: '#fff', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', marginTop: '4px', overflow: 'hidden' }}>
                    {searchResults.map((place, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectHospitalLocation(place)}
                        style={{ padding: '12px 16px', borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                      >
                        <span style={{ fontSize: '18px' }}>🏥</span>
                        <div style={{ overflow: 'hidden' }}>
                          <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.95rem' }}>
                            {place.name || place.display_name.split(',')[0]}
                          </strong>
                          <small style={{ color: '#64748b', fontSize: '0.8rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {place.display_name}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Form.Group>

              {/* Map Preview */}
              <div style={{ height: '280px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
                <MapContainer
                  center={[currentLat, currentLng]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[currentLat, currentLng]} icon={hospitalPinIcon}>
                    <Popup>
                      <strong>{formData.hospitalName || 'Selected Hospital'}</strong>
                      <br />
                      Lat: {currentLat.toFixed(5)}, Lng: {currentLng.toFixed(5)}
                    </Popup>
                  </Marker>
                  <MapUpdater center={[currentLat, currentLng]} />
                  <MapClickHandler onLocationSelect={handleMapPinClick} />
                </MapContainer>
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(15,23,42,0.85)', color: '#fff', padding: '5px 12px', borderRadius: '20px', fontSize: '0.78rem', zIndex: 1000, pointerEvents: 'none' }}>
                  📍 Click anywhere on map to reposition hospital pin ({currentLat.toFixed(4)}, {currentLng.toFixed(4)})
                </div>
              </div>
            </Card>

            {/* Step 2: Account & Contact Details */}
            <Card className="mb-4 border-0" style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
              <h5 style={{ fontWeight: 700, color: '#10233c', marginBottom: '14px' }}>
                Step 2: Account & Contact Details
              </h5>

              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600 }}>Contact Person Name</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FaUser /></span>
                      <Form.Control
                        type="text"
                        name="name"
                        placeholder="e.g. Dr. Rajesh Kumar / Admin"
                        value={formData.name}
                        onChange={handleChange}
                        isInvalid={!!errors.name}
                        required
                      />
                    </div>
                    {errors.name && <div className="text-danger small mt-1">{errors.name}</div>}
                  </Form.Group>
                </Col>

                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600 }}>Emergency Contact Phone (10 digits)</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FaPhone /></span>
                      <Form.Control
                        type="tel"
                        name="phone"
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={handleChange}
                        isInvalid={!!errors.phone}
                        required
                      />
                    </div>
                    {errors.phone && <div className="text-danger small mt-1">{errors.phone}</div>}
                  </Form.Group>
                </Col>

                <Col md={12} className="mb-3">
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600 }}>Hospital Email Address (for Login)</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FaEnvelope /></span>
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="e.g. admin@cityhospital.com"
                        value={formData.email}
                        onChange={handleChange}
                        isInvalid={!!errors.email}
                        required
                      />
                    </div>
                    {errors.email && <div className="text-danger small mt-1">{errors.email}</div>}
                  </Form.Group>
                </Col>

                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600 }}>Password (min 6 characters)</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FaLock /></span>
                      <Form.Control
                        type="password"
                        name="password"
                        placeholder="Enter secure password"
                        value={formData.password}
                        onChange={handleChange}
                        isInvalid={!!errors.password}
                        required
                      />
                    </div>
                    {errors.password && <div className="text-danger small mt-1">{errors.password}</div>}
                  </Form.Group>
                </Col>

                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600 }}>Confirm Password</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FaLock /></span>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        isInvalid={!!errors.confirmPassword}
                        required
                      />
                    </div>
                    {errors.confirmPassword && <div className="text-danger small mt-1">{errors.confirmPassword}</div>}
                  </Form.Group>
                </Col>
              </Row>
            </Card>

            <Button
              type="submit"
              className="w-100 py-3"
              disabled={isLoading || registrationComplete}
              style={{ background: '#1359bd', border: 'none', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 700 }}
            >
              {isLoading ? (
                <>
                  <Loader small /> <span className="ms-2">Registering Hospital…</span>
                </>
              ) : registrationComplete ? (
                <>
                  <FaCheckCircle className="me-2" /> Hospital Registered!
                </>
              ) : (
                'Register Hospital & Open Dashboard'
              )}
            </Button>

            <div className="text-center mt-3" style={{ color: '#607087' }}>
              Already registered? <Link to="/hospital/login" style={{ color: '#1359bd', fontWeight: 600 }}>Login to your hospital account</Link>
            </div>
          </Form>
        </div>
      </Container>
    </div>
  );
};

export default HospitalRegister;
