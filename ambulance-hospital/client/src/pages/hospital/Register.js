import React, { useState, useContext, useRef } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { FaHospital, FaEnvelope, FaLock, FaUser, FaPhone, FaMapMarkerAlt, FaCheckCircle, FaSearch, FaBed } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import 'leaflet/dist/leaflet.css';
import '../../styles/register.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
});

const hospitalPinIcon = L.divIcon({
  className: '',
  html: `<div style="background:#1359bd;color:white;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid white;">H</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

function MapUpdater({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

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
    traumaLevel: 'Level 1 Multi-Specialty',
    emergencyBeds: 14,
    icuBeds: 6,
    doctorsOnDuty: 8,
    specialties: 'Trauma & Emergency, Cardiology, ICU Care, General Surgery',
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
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);

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

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const tomtomKey = process.env.REACT_APP_TOMTOM_API_KEY || 'YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42';
        const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${tomtomKey}&lat=12.9716&lon=77.5946&radius=50000&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          const mapped = data.results.map(r => ({
            name: r.poi?.name || r.address?.freeformAddress || query,
            display_name: r.address?.freeformAddress || r.poi?.name || query,
            lat: r.position?.lat,
            lng: r.position?.lon,
            address: {
              street: r.address?.streetName || r.address?.freeformAddress || '',
              city: r.address?.municipality || 'Bangalore',
              state: r.address?.countrySubdivision || 'Karnataka',
              zipCode: r.address?.postalCode || '560001',
              country: 'India'
            }
          }));
          setSearchResults(mapped);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const selectHospitalLocation = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lng);
    
    setFormData(prev => ({
      ...prev,
      hospitalName: place.name || prev.hospitalName,
      address: {
        ...prev.address,
        ...place.address
      },
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }));
    
    setSearchQuery(place.name || place.display_name.split(',')[0]);
    setSearchResults([]);
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
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.hospitalName.trim()) {
      newErrors.hospitalName = 'Hospital name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email address is invalid.';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Contact person name is required.';
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Emergency phone number is required.';
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit phone number.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
    }

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

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const additionalData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        hospitalName: formData.hospitalName.trim(),
        address: formData.address,
        location: formData.location,
        traumaLevel: formData.traumaLevel,
        beds: {
          emergency: parseInt(formData.emergencyBeds, 10) || 14,
          icu: parseInt(formData.icuBeds, 10) || 6,
          total: (parseInt(formData.emergencyBeds, 10) || 14) + (parseInt(formData.icuBeds, 10) || 6) + 40
        },
        doctorsOnDuty: parseInt(formData.doctorsOnDuty, 10) || 8,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean)
      };

      const registered = await register(
        formData.email.trim(),
        formData.password,
        'hospital',
        additionalData
      );

      if (registered) {
        setSuccess(`Hospital "${formData.hospitalName}" registered successfully!`);
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
    <div className="register-page" style={{ padding: '40px 0', background: '#f8fafc', minHeight: '100vh' }}>
      <Container>
        <div className="register-container" style={{ maxWidth: '920px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '36px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          
          <div className="text-center mb-4">
            <div style={{ width: '56px', height: '56px', background: '#eef4ff', color: '#1359bd', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <FaHospital size={28} />
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Hospital Registration</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Register your hospital facility and coordinate bed availability with the 108 emergency network.
            </p>
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
            <Card className="mb-4 border-0" style={{ background: '#f8fafc', borderRadius: '12px', padding: '22px', border: '1px solid #e2e8f0' }}>
              <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaMapMarkerAlt style={{ color: '#1359bd' }} /> Step 1: Hospital Name & Map Coordinates
              </h5>
              
              <Form.Group className="mb-3 position-relative">
                <Form.Label style={{ fontWeight: 600, color: '#334155' }}>Hospital Name (Type to Auto-Locate on Map)</Form.Label>
                <div style={{ position: 'relative' }}>
                  <Form.Control
                    type="text"
                    placeholder="e.g. Manipal Hospital, Victoria Hospital, Apollo Hospital..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    isInvalid={!!errors.hospitalName}
                    style={{ paddingRight: '40px', fontSize: '1rem', height: '46px', borderRadius: '8px' }}
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

                {/* Autocomplete Suggestions */}
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
                        <span style={{ fontWeight: 700, color: '#1359bd' }}>H</span>
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
                    attribution="&copy; TomTom"
                    url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${process.env.REACT_APP_TOMTOM_API_KEY || 'YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42'}`}
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
                  Click map to reposition pin &mdash; ({currentLat.toFixed(4)}, {currentLng.toFixed(4)})
                </div>
              </div>
            </Card>

            {/* Step 2: Bed Capacity & Medical Capabilities */}
            <Card className="mb-4 border-0" style={{ background: '#f8fafc', borderRadius: '12px', padding: '22px', border: '1px solid #e2e8f0' }}>
              <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaBed style={{ color: '#1359bd' }} /> Step 2: Bed Capacity & Medical Capabilities
              </h5>

              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600, color: '#334155' }}>Emergency Beds Available</Form.Label>
                    <Form.Control
                      type="number"
                      name="emergencyBeds"
                      value={formData.emergencyBeds}
                      onChange={handleChange}
                      style={{ height: '44px', borderRadius: '8px' }}
                      min="0"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600, color: '#334155' }}>ICU Beds Available</Form.Label>
                    <Form.Control
                      type="number"
                      name="icuBeds"
                      value={formData.icuBeds}
                      onChange={handleChange}
                      style={{ height: '44px', borderRadius: '8px' }}
                      min="0"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600, color: '#334155' }}>On-Duty Doctors</Form.Label>
                    <Form.Control
                      type="number"
                      name="doctorsOnDuty"
                      value={formData.doctorsOnDuty}
                      onChange={handleChange}
                      style={{ height: '44px', borderRadius: '8px' }}
                      min="1"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600, color: '#334155' }}>Trauma Care Level</Form.Label>
                    <Form.Select
                      name="traumaLevel"
                      value={formData.traumaLevel}
                      onChange={handleChange}
                      style={{ height: '44px', borderRadius: '8px' }}
                    >
                      <option>Level 1 Major Trauma</option>
                      <option>Level 1 Multi-Specialty</option>
                      <option>Level 1 Cardiac Emergency</option>
                      <option>Level 1 Neuro Trauma</option>
                      <option>Level 2 Emergency Care</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600, color: '#334155' }}>Active Specialties (Comma separated)</Form.Label>
                    <Form.Control
                      type="text"
                      name="specialties"
                      placeholder="Cardiology, Trauma Care, ICU Care"
                      value={formData.specialties}
                      onChange={handleChange}
                      style={{ height: '44px', borderRadius: '8px' }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card>

            {/* Step 3: Account & Authentication */}
            <Card className="mb-4 border-0" style={{ background: '#f8fafc', borderRadius: '12px', padding: '22px', border: '1px solid #e2e8f0' }}>
              <h5 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
                Step 3: Account & Login Credentials
              </h5>

              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600, color: '#334155' }}>Contact Administrator Name</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FaUser /></span>
                      <Form.Control
                        type="text"
                        name="name"
                        placeholder="e.g. Dr. Rajesh Kumar / Admin"
                        value={formData.name}
                        onChange={handleChange}
                        isInvalid={!!errors.name}
                        style={{ height: '44px' }}
                        required
                      />
                    </div>
                    {errors.name && <div className="text-danger small mt-1">{errors.name}</div>}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600, color: '#334155' }}>Emergency Desk Phone (10 Digits)</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FaPhone /></span>
                      <Form.Control
                        type="tel"
                        name="phone"
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={handleChange}
                        isInvalid={!!errors.phone}
                        style={{ height: '44px' }}
                        required
                      />
                    </div>
                    {errors.phone && <div className="text-danger small mt-1">{errors.phone}</div>}
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600, color: '#334155' }}>Hospital Portal Login Email</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FaEnvelope /></span>
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="e.g. emergency@hospital.com"
                        value={formData.email}
                        onChange={handleChange}
                        isInvalid={!!errors.email}
                        style={{ height: '44px' }}
                        required
                      />
                    </div>
                    {errors.email && <div className="text-danger small mt-1">{errors.email}</div>}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600, color: '#334155' }}>Password</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FaLock /></span>
                      <Form.Control
                        type="password"
                        name="password"
                        placeholder="Enter secure password"
                        value={formData.password}
                        onChange={handleChange}
                        isInvalid={!!errors.password}
                        style={{ height: '44px' }}
                        required
                      />
                    </div>
                    {errors.password && <div className="text-danger small mt-1">{errors.password}</div>}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group>
                    <Form.Label style={{ fontWeight: 600, color: '#334155' }}>Confirm Password</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-white"><FaLock /></span>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        isInvalid={!!errors.confirmPassword}
                        style={{ height: '44px' }}
                        required
                      />
                    </div>
                    {errors.confirmPassword && <div className="text-danger small mt-1">{errors.confirmPassword}</div>}
                  </Form.Group>
                </Col>
              </Row>
            </Card>

            <Button
              variant="primary"
              type="submit"
              size="lg"
              className="w-100 py-3"
              disabled={isLoading}
              style={{ fontWeight: 700, borderRadius: '10px', fontSize: '1.05rem', background: '#1359bd', border: 'none' }}
            >
              {isLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Registering Facility & Syncing Network...
                </>
              ) : (
                'Register Hospital & Connect to 108 Network'
              )}
            </Button>

            <div className="text-center mt-3 text-muted small">
              Already have an account? <Link to="/hospital/login" style={{ color: '#1359bd', fontWeight: 600 }}>Sign in to Hospital Portal</Link>
            </div>
          </Form>

        </div>
      </Container>
    </div>
  );
};

export default HospitalRegister;
