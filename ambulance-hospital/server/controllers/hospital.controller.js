const mongoose = require('mongoose');
const Hospital = require('../models/hospital.model');
const Doctor = require('../models/doctor.model');
const Emergency = require('../models/emergency.model');

// Helper to sync hospital updates to Port 5000 dispatch engine
const syncToDispatchEngine = async (hospital) => {
  try {
    const targetName = hospital.hospitalName || hospital.name;
    const url = `http://localhost:5000/api/hospitals/by-name/${encodeURIComponent(targetName)}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: hospital.location?.coordinates?.[1] || 12.9716,
        lng: hospital.location?.coordinates?.[0] || 77.5946,
        phone: hospital.phone || '',
        accepting: hospital.accepting,
        beds: hospital.beds,
        traumaLevel: hospital.traumaLevel,
        specialties: hospital.specialties
      })
    });
    console.log(`[Cross-Sync] Synced hospital "${targetName}" capacity to Port 5000 dispatch network.`);
  } catch (err) {
    console.warn('[Cross-Sync] Notice: Could not sync to Port 5000:', err.message);
  }
};

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

// Update hospital & capacity
exports.updateHospital = async (req, res) => {
  try {
    const {
      name,
      phone,
      hospitalName,
      address,
      location,
      beds,
      accepting,
      traumaLevel,
      specialties
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

    const updates = {
      name: name || hospital.name,
      phone: phone !== undefined ? phone : hospital.phone,
      hospitalName: hospitalName || hospital.hospitalName,
      address: address || hospital.address,
      location: location || hospital.location,
      updatedAt: Date.now()
    };

    if (beds) {
      updates.beds = {
        emergency: beds.emergency !== undefined ? beds.emergency : (hospital.beds?.emergency || 12),
        icu: beds.icu !== undefined ? beds.icu : (hospital.beds?.icu || 6),
        total: beds.total !== undefined ? beds.total : (hospital.beds?.total || 60)
      };
    }

    if (typeof accepting === 'boolean') {
      updates.accepting = accepting;
    }

    if (traumaLevel) {
      updates.traumaLevel = traumaLevel;
    }

    if (Array.isArray(specialties)) {
      updates.specialties = specialties;
    }

    // Update hospital fields
    const updatedHospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).select('-password');
    
    // Sync to Port 5000 dispatch engine
    syncToDispatchEngine(updatedHospital);

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
    
    // Find all emergencies for this hospital (or all emergencies for demo)
    let emergencies = await Emergency.find({ hospital: hospitalId })
      .populate('ambulance', '-password')
      .sort('-createdAt');
    
    if (emergencies.length === 0) {
      // Fallback: fetch recent emergencies so the user can always see/manage them
      emergencies = await Emergency.find()
        .populate('ambulance', '-password')
        .sort('-createdAt')
        .limit(20);
    }
    
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
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this hospital' });
    }
    
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    await Doctor.deleteMany({ hospital: hospital._id });
    await Hospital.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    console.error('Delete hospital error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
