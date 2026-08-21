const mongoose = require('mongoose');
const Hospital = require('../models/hospital.model');
const Doctor = require('../models/doctor.model');
const Emergency = require('../models/emergency.model'); // Added Emergency model

// Get all hospitals
exports.getHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find().select('-password');
    res.status(200).json(hospitals);
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get hospital by ID
exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).select('-password');
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    // Get doctors associated with this hospital
    const doctors = await Doctor.find({ hospital: hospital._id });
    
    res.status(200).json({
      hospital,
      doctors
    });
  } catch (error) {
    console.error('Get hospital by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update hospital
exports.updateHospital = async (req, res) => {
  try {
    const {
      name,
      phone,
      hospitalName,
      address,
      location
    } = req.body;
    
    // Check if the user is the hospital or an admin
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this hospital' });
    }

    // Find hospital by id
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Update hospital fields
    const updatedHospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      {
        name: name || hospital.name,
        phone: phone || hospital.phone,
        hospitalName: hospitalName || hospital.hospitalName,
        address: address || hospital.address,
        location: location || hospital.location,
        updatedAt: Date.now()
      },
      { new: true }
    ).select('-password');
    
    res.status(200).json(updatedHospital);
  } catch (error) {
    console.error('Update hospital error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get emergency requests for a hospital
exports.getEmergencyRequests = async (req, res) => {
  try {
    const hospitalId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
      return res.status(400).json({ message: 'Invalid hospital ID' });
    }
    
    console.log('Fetching emergency requests for hospital:', hospitalId);
    
    // Find all emergencies for this hospital
    const emergencies = await Emergency.find({ hospital: hospitalId })
      .populate('ambulance', '-password')
      .sort('-createdAt');
    
    console.log(`Found ${emergencies.length} emergency requests`);
    
    res.status(200).json(emergencies);
  } catch (error) {
    console.error('Get hospital emergency requests error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Delete hospital
exports.deleteHospital = async (req, res) => {
  try {
    // Check if the user is the hospital or an admin
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this hospital' });
    }
    
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    // Delete all doctors associated with this hospital
    await Doctor.deleteMany({ hospital: hospital._id });
    
    // Delete the hospital
    await Hospital.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
