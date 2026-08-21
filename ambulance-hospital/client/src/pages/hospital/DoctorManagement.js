import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Alert, Badge } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';
import HospitalNavbar from '../../components/hospital/HospitalNavbar';
import { SocketContext } from '../../context/SocketContext';
import axios from 'axios';
import api from '../../utils/axiosConfig';
import Loader from '../../components/common/Loader';

// Import CSS for text visibility improvements
import '../../styles/doctor-management-text-visibility.css';
// Import CSS for Add Doctor modal design
import '../../styles/add-doctor-modal.css';

const DoctorManagement = () => {
  const { user } = useContext(AuthContext);
  const { emitEvent } = useContext(SocketContext);
  
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState(null);
  
  // Form state - separate initial state for reuse
  const initialFormData = {
    name: '',
    specialization: '',
    qualifications: [{ degree: '', institution: '', year: '' }],
    experience: '',
    licenseNumber: '',
    email: '',
    phone: '',
    schedule: [{ day: 'Monday', startTime: '09:00', endTime: '17:00' }],
    emergencyTypes: ''
  };
  
  const [formData, setFormData] = useState(initialFormData);

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        if (!user || !user._id) {
          console.error('User or user ID is missing');
          setLoading(false);
          return;
        }

        // Use the same endpoint as the Dashboard component
        const res = await api.get(`/hospitals/${user._id}`);
        
        // Extract doctors from the hospital data
        if (res.data && res.data.doctors && Array.isArray(res.data.doctors)) {
          console.log('Doctors found in hospital data:', res.data.doctors.length);
          setDoctors(res.data.doctors);
        } else if (Array.isArray(res.data)) {
          console.log('Response is an array:', res.data.length);
          setDoctors(res.data);
        } else {
          console.warn('No doctors found in response:', res.data);
          setDoctors([]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setError('Failed to load doctors');
        setLoading(false);
      }
    };
    
    fetchDoctors();
  }, [user]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle qualification changes
  const handleQualificationChange = (index, field, value) => {
    const updatedQualifications = [...formData.qualifications];
    updatedQualifications[index][field] = value;
    
    setFormData({
      ...formData,
      qualifications: updatedQualifications
    });
  };

  // Add qualification field
  const addQualification = () => {
    setFormData({
      ...formData,
      qualifications: [
        ...formData.qualifications,
        { degree: '', institution: '', year: '' }
      ]
    });
  };

  // Remove qualification field
  const removeQualification = (index) => {
    const updatedQualifications = [...formData.qualifications];
    updatedQualifications.splice(index, 1);
    
    setFormData({
      ...formData,
      qualifications: updatedQualifications
    });
  };

  // Handle schedule changes
  const handleScheduleChange = (index, field, value) => {
    const updatedSchedule = [...formData.schedule];
    updatedSchedule[index][field] = value;
    
    setFormData({
      ...formData,
      schedule: updatedSchedule
    });
  };

  // Add schedule field
  const addSchedule = () => {
    setFormData({
      ...formData,
      schedule: [
        ...formData.schedule,
        { day: 'Monday', startTime: '09:00', endTime: '17:00' }
      ]
    });
  };

  // Remove schedule field
  const removeSchedule = (index) => {
    const updatedSchedule = [...formData.schedule];
    updatedSchedule.splice(index, 1);
    
    setFormData({
      ...formData,
      schedule: updatedSchedule
    });
  };

  // Open add modal
  const openAddModal = () => {
    // Clear any previous errors/success messages
    setError('');
    setSuccess('');
    
    // Clear current doctor
    setCurrentDoctor(null);
    
    // Reset form data to initial state
    setFormData({ ...initialFormData });
    
    setShowAddModal(true);
  };

  // Close add modal
  const closeAddModal = () => {
    setShowAddModal(false);
    // Reset form data when closing
    setFormData({ ...initialFormData });
    setCurrentDoctor(null);
  };
  
  // Close edit modal
  const closeEditModal = () => {
    setShowEditModal(false);
    // Reset form data when closing
    setFormData({ ...initialFormData });
    setCurrentDoctor(null);
    setError('');
    setSuccess('');
  };

  // Handle add doctor
  const handleAddDoctor = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Format emergency types
      const emergencyTypesArray = formData.emergencyTypes
        .split(',')
        .map(type => type.trim())
        .filter(type => type);
      
      // Validate qualifications - ensure they have all required fields
      const validQualifications = formData.qualifications.filter(qual => 
        qual.degree && qual.degree.trim() !== '' && 
        qual.institution && qual.institution.trim() !== '' && 
        qual.year && !isNaN(qual.year)
      );
      
      // If no valid qualifications, add at least one default one
      if (validQualifications.length === 0) {
        validQualifications.push({
          degree: 'MBBS', // Default degree if none provided
          institution: 'Medical College', // Default institution
          year: new Date().getFullYear() - parseInt(formData.experience || '0') // Estimate graduation year
        });
      }
      
      // Prepare doctor data
      const doctorData = {
        name: formData.name,
        specialization: formData.specialization,
        qualifications: validQualifications,
        experience: formData.experience,
        licenseNumber: formData.licenseNumber,
        contactInfo: {
          email: formData.email,
          phone: formData.phone
        },
        schedule: formData.schedule.map(s => ({
          ...s,
          day: s.day || 'Monday',
          startTime: s.startTime || '09:00',
          endTime: s.endTime || '17:00'
        })),
        emergencyTypes: emergencyTypesArray.length > 0 ? emergencyTypesArray : ['General'],
        isAvailable: true,
        hospital: user._id
      };
      
      console.log('Sending doctor data:', JSON.stringify(doctorData, null, 2));
      
      // Send request to API
      const res = await api.post('/doctors', doctorData);
      
      if (res.data) {
        // Add new doctor to state
        setDoctors(prev => [...prev, res.data]);
        
        // Show success message
        setSuccess('Doctor added successfully');
        
        // Close modal
        setShowAddModal(false);
        
        // Emit socket event
        if (emitEvent) {
          emitEvent('hospital:doctor-added', {
            hospitalId: user._id,
            doctor: res.data
          });
        }
      }
    } catch (error) {
      console.error('Error adding doctor:', error.response?.data || error.message || error);
      setError(error.response?.data?.message || 'Failed to add doctor. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (doctor) => {
    console.log('Opening edit modal for doctor:', doctor);
    
    // Clear any previous errors/success messages
    setError('');
    setSuccess('');
    
    // Set current doctor first
    setCurrentDoctor(doctor);
    
    // Format emergency types
    const emergencyTypesString = doctor.emergencyTypes
      ? doctor.emergencyTypes.join(', ')
      : '';
    
    // Create a fresh form data object with the doctor's data
    const editFormData = {
      name: doctor.name || '',
      specialization: doctor.specialization || '',
      qualifications: doctor.qualifications && doctor.qualifications.length > 0
        ? [...doctor.qualifications] // Create a deep copy
        : [{ degree: '', institution: '', year: '' }],
      experience: doctor.experience?.toString() || '',
      licenseNumber: doctor.licenseNumber || '',
      email: doctor.contactInfo?.email || '',
      phone: doctor.contactInfo?.phone || '',
      schedule: doctor.schedule && doctor.schedule.length > 0
        ? [...doctor.schedule] // Create a deep copy
        : [{ day: 'Monday', startTime: '09:00', endTime: '17:00' }],
      emergencyTypes: emergencyTypesString
    };
    
    console.log('Setting form data for edit:', editFormData);
    setFormData(editFormData);
    
    setShowEditModal(true);
  };

  // Handle edit doctor
  const handleEditDoctor = async (e) => {
    e.preventDefault();
    
    if (!currentDoctor) return;
    
    try {
      setLoading(true);
      
      // Format emergency types
      const emergencyTypesArray = formData.emergencyTypes
        .split(',')
        .map(type => type.trim())
        .filter(type => type);
      
      // Prepare doctor data
      const doctorData = {
        name: formData.name,
        specialization: formData.specialization,
        qualifications: formData.qualifications,
        experience: formData.experience,
        contactInfo: {
          email: formData.email,
          phone: formData.phone
        },
        schedule: formData.schedule,
        emergencyTypes: emergencyTypesArray
      };
      
      // Send request to API
      const res = await api.put(`/doctors/${currentDoctor._id}`, doctorData);
      
      if (res.data) {
        // Update doctor in state
        setDoctors(prev => 
          prev.map(doctor => 
            doctor._id === currentDoctor._id ? res.data : doctor
          )
        );
        
        // Show success message
        setSuccess('Doctor updated successfully');
        
        // Close modal
        closeEditModal();
        
        // Emit socket event
        if (emitEvent) {
          emitEvent('hospital:doctor-updated', {
            hospitalId: user._id,
            doctor: res.data
          });
        }
      }
    } catch (error) {
      console.error('Error updating doctor:', error);
      setError('Failed to update doctor');
    } finally {
      setLoading(false);
    }
  };

  // Open delete modal
  const openDeleteModal = (doctor) => {
    setCurrentDoctor(doctor);
    setShowDeleteModal(true);
  };

  // Handle delete doctor
  const handleDeleteDoctor = async () => {
    if (!currentDoctor) return;
    
    try {
      setLoading(true);
      
      // Send request to API
      await api.delete(`/doctors/${currentDoctor._id}`);
      
      // Remove doctor from state
      setDoctors(prev => 
        prev.filter(doctor => doctor._id !== currentDoctor._id)
      );
      
      // Show success message
      setSuccess('Doctor deleted successfully');
      
      // Close modal
      setShowDeleteModal(false);
      
      // Emit socket event
      if (emitEvent) {
        emitEvent('hospital:doctor-deleted', {
          hospitalId: user._id,
          doctorId: currentDoctor._id
        });
      }
    } catch (error) {
      console.error('Error deleting doctor:', error);
      setError('Failed to delete doctor');
    } finally {
      setLoading(false);
    }
  };

  // Toggle doctor availability
  const toggleAvailability = async (doctor) => {
    try {
      // Send request to API - using the correct endpoint structure
      const res = await api.patch(`/doctors/${doctor._id}/availability`, {
        isAvailable: !doctor.isAvailable
      });
      
      if (res.data) {
        // Update doctor in state
        setDoctors(prev => 
          prev.map(d => 
            d._id === doctor._id 
              ? { ...d, isAvailable: !d.isAvailable }
              : d
          )
        );
        
        // Emit socket event
        if (emitEvent) {
          emitEvent('hospital:doctor-availability', {
            hospitalId: user._id,
            doctorId: doctor._id,
            isAvailable: !doctor.isAvailable
          });
        }
      }
    } catch (error) {
      console.error('Error toggling doctor availability:', error);
      setError('Failed to update doctor availability');
    }
  };

  if (loading && doctors.length === 0) {
    return <Loader />;
  }

  return (
    <>
      <HospitalNavbar />
      <Container className="mt-4 doctor-management-container">
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <h2>Doctor Management</h2>
              <Button 
                variant="primary" 
                onClick={openAddModal}
                className="add-doctor-btn"
              >
                Add New Doctor
              </Button>
            </div>
          </Col>
        </Row>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      {!Array.isArray(doctors) || doctors.length === 0 ? (
        <Card>
          <Card.Body className="text-center p-5">
            <h4 className="mb-3">No Doctors Added Yet</h4>
            <p className="text-muted mb-4">
              Add doctors to your hospital to manage their availability and specializations.
            </p>
            <Button variant="primary" onClick={openAddModal}>
              Add Your First Doctor
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row>
          {Array.isArray(doctors) && doctors.map((doctor) => (
            <Col md={6} key={doctor._id} className="mb-4">
              <Card className="doctor-card h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">{doctor.name}</h5>
                  <Form.Check
                    type="switch"
                    id={`availability-${doctor._id}`}
                    label={doctor.isAvailable ? 'Available' : 'Unavailable'}
                    checked={doctor.isAvailable}
                    onChange={() => toggleAvailability(doctor)}
                    className="availability-toggle"
                  />
                </Card.Header>
                <Card.Body>
                  <p className="mb-2">
                    <strong>Specialization:</strong> {doctor.specialization}
                  </p>
                  <p className="mb-2">
                    <strong>Experience:</strong> {doctor.experience} years
                  </p>
                  <p className="mb-2">
                    <strong>KMC Number:</strong> {doctor.licenseNumber}
                  </p>
                  <p className="mb-2">
                    <strong>Contact:</strong> {doctor.contactInfo?.email}, {doctor.contactInfo?.phone}
                  </p>
                  <p className="mb-2">
                    <strong>Emergency Types:</strong>{' '}
                    {doctor.emergencyTypes?.map((type, index) => (
                      <Badge 
                        key={index} 
                        bg="info" 
                        className="me-1"
                      >
                        {type}
                      </Badge>
                    ))}
                  </p>
                  <div className="mt-3 d-flex gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => openEditModal(doctor)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => openDeleteModal(doctor)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
      
      {/* Add Doctor Modal */}
      <Modal show={showAddModal} onHide={closeAddModal} size="lg" className="doctor-modal">
        <Modal.Header closeButton>
          <Modal.Title>Add New Doctor</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddDoctor}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="name">
                  <Form.Label>Doctor Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter doctor name"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="specialization">
                  <Form.Label>Specialization</Form.Label>
                  <Form.Control
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="Enter specialization"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="experience">
                  <Form.Label>Experience (years)</Form.Label>
                  <Form.Control
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Enter years of experience"
                    min="0"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="licenseNumber">
                  <Form.Label>KMC Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    placeholder="Enter KMC number"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="phone">
                  <Form.Label>Phone</Form.Label>
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
            </Row>
            
            <Form.Group className="mb-3" controlId="emergencyTypes">
              <Form.Label>Emergency Types (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                name="emergencyTypes"
                value={formData.emergencyTypes}
                onChange={handleChange}
                placeholder="e.g., Cardiac, Trauma, Burn, Pediatric"
                required
              />
            </Form.Group>
            
            <div className="qualifications-section">
              <h5>Qualifications</h5>
              {formData.qualifications.map((qualification, index) => (
                <div key={index} className="mb-3 p-3 border rounded">
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3" controlId={`degree-${index}`}>
                        <Form.Label>Degree</Form.Label>
                        <Form.Control
                          type="text"
                          value={qualification.degree}
                          onChange={(e) => handleQualificationChange(index, 'degree', e.target.value)}
                          placeholder="Enter degree"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3" controlId={`institution-${index}`}>
                        <Form.Label>Institution</Form.Label>
                        <Form.Control
                          type="text"
                          value={qualification.institution}
                          onChange={(e) => handleQualificationChange(index, 'institution', e.target.value)}
                          placeholder="Enter institution"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3" controlId={`year-${index}`}>
                        <Form.Label>Year</Form.Label>
                        <Form.Control
                          type="text"
                          value={qualification.year}
                          onChange={(e) => handleQualificationChange(index, 'year', e.target.value)}
                          placeholder="Enter year"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={1} className="d-flex align-items-end mb-3">
                      {formData.qualifications.length > 1 && (
                        <Button
                          className="remove-qualification-btn"
                          size="sm"
                          onClick={() => removeQualification(index)}
                        >
                          X
                        </Button>
                      )}
                    </Col>
                  </Row>
                </div>
              ))}
              <Button
                className="add-schedule-btn"
                onClick={addQualification}
              >
                <i className="fas fa-graduation-cap"></i>
                Add Qualification
              </Button>
            </div>
            
            <h6 className="mt-4 mb-3">Schedule</h6>
            {formData.schedule.map((schedule, index) => (
              <div key={index} className="mb-3 p-3 border rounded">
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3" controlId={`day-${index}`}>
                      <Form.Label>Day</Form.Label>
                      <Form.Select
                        value={schedule.day}
                        onChange={(e) => handleScheduleChange(index, 'day', e.target.value)}
                        required
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3" controlId={`startTime-${index}`}>
                      <Form.Label>Start Time</Form.Label>
                      <Form.Control
                        type="time"
                        value={schedule.startTime}
                        onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3" controlId={`endTime-${index}`}>
                      <Form.Label>End Time</Form.Label>
                      <Form.Control
                        type="time"
                        value={schedule.endTime}
                        onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={2} className="d-flex align-items-end mb-3">
                    {formData.schedule.length > 1 && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeSchedule(index)}
                      >
                        X
                      </Button>
                    )}
                  </Col>
                </Row>
              </div>
            ))}
            <Button
              onClick={addSchedule}
              className="add-schedule-btn"
            >
              <i className="fas fa-calendar-plus"></i>
              Add Schedule
            </Button>
          </Modal.Body>
          <Modal.Footer>
            <Button className="cancel-btn" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button className="save-doctor-btn" type="submit">
              Save Doctor
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      
      {/* Edit Doctor Modal */}
      <Modal show={showEditModal} onHide={closeEditModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Doctor</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditDoctor}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="edit-name">
                  <Form.Label>Doctor Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter doctor name"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="edit-specialization">
                  <Form.Label>Specialization</Form.Label>
                  <Form.Control
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="Enter specialization"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="edit-experience">
                  <Form.Label>Experience (years)</Form.Label>
                  <Form.Control
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Enter years of experience"
                    min="0"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="edit-licenseNumber">
                  <Form.Label>License Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.licenseNumber}
                    disabled
                    readOnly
                  />
                  <Form.Text className="text-muted">
                    License number cannot be changed
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="edit-email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="edit-phone">
                  <Form.Label>Phone</Form.Label>
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
            </Row>
            
            <Form.Group className="mb-3" controlId="edit-emergencyTypes">
              <Form.Label>Emergency Types (comma-separated)</Form.Label>
              <Form.Control
                type="text"
                name="emergencyTypes"
                value={formData.emergencyTypes}
                onChange={handleChange}
                placeholder="e.g., Cardiac, Trauma, Burn, Pediatric"
                required
              />
            </Form.Group>
            
            {/* Qualifications and Schedule sections would be similar to Add Modal */}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Update Doctor
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      
      {/* Delete Doctor Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Doctor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete Dr. {currentDoctor?.name}?</p>
          <p className="text-danger">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteDoctor}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
    </>
  );
};

export default DoctorManagement;
