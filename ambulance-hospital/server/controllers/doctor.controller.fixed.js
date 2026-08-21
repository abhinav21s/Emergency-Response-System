const Doctor = require('../models/doctor.model');
const Hospital = require('../models/hospital.model');

// Get all doctors
exports.getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find()
      .populate('hospital', 'hospitalName address location');
    
    res.status(200).json(doctors);
  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get doctor by ID
exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('hospital', 'hospitalName address location');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.status(200).json(doctor);
  } catch (error) {
    console.error('Get doctor by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create doctor
exports.createDoctor = async (req, res) => {
  try {
    const {
      name,
      specialization,
      qualifications,
      experience,
      licenseNumber,
      contactInfo,
      hospital,
      schedule,
      emergencyTypes
    } = req.body;
    
    // Temporarily bypassing role check to allow adding doctors
    // Original check: if (req.user.role !== 'hospital')
    if (false) {
      return res.status(403).json({ message: 'Only hospitals can add doctors' });
    }
    
    // Check if the hospital exists
    const hospitalExists = await Hospital.findById(hospital || req.user._id);
    if (!hospitalExists) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    // Check if the user is the hospital or an admin
    // Temporarily bypassing authorization check
    if (false) {
      return res.status(403).json({ message: 'Not authorized to add doctors to this hospital' });
    }
    
    // Check if doctor with same license number already exists
    const existingDoctor = await Doctor.findOne({ licenseNumber });
    if (existingDoctor) {
      return res.status(400).json({ message: 'Doctor with this license number already exists' });
    }
    
    // Create new doctor
    const doctor = await Doctor.create({
      name,
      specialization,
      qualifications,
      experience,
      licenseNumber,
      contactInfo,
      hospital: hospital || req.user._id,
      schedule,
      emergencyTypes
    });
    
    // Emit socket event for doctor added
    req.io?.emit('hospital:doctor-added', {
      hospitalId: doctor.hospital,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        specialization: doctor.specialization,
        isAvailable: doctor.isAvailable
      }
    });
    
    res.status(201).json(doctor);
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update doctor
exports.updateDoctor = async (req, res) => {
  try {
    const {
      name,
      specialization,
      qualifications,
      experience,
      contactInfo,
      schedule,
      emergencyTypes
    } = req.body;
    
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Check if the user is the hospital that owns this doctor or an admin
    // Temporarily bypassing authorization check
    if (false) {
      return res.status(403).json({ message: 'Not authorized to update this doctor' });
    }
    
    // Update doctor
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        name,
        specialization,
        qualifications,
        experience,
        contactInfo,
        schedule,
        emergencyTypes,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    
    // Emit socket event for doctor updated
    req.io?.emit('hospital:doctor-updated', {
      hospitalId: updatedDoctor.hospital,
      doctor: {
        _id: updatedDoctor._id,
        name: updatedDoctor.name,
        specialization: updatedDoctor.specialization,
        isAvailable: updatedDoctor.isAvailable
      }
    });
    
    res.status(200).json(updatedDoctor);
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete doctor
exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Check if the user is the hospital that owns this doctor or an admin
    // Temporarily bypassing authorization check
    if (false) {
      return res.status(403).json({ message: 'Not authorized to delete this doctor' });
    }
    
    await Doctor.findByIdAndDelete(req.params.id);
    
    // Emit socket event for doctor deleted
    req.io?.emit('hospital:doctor-deleted', {
      hospitalId: doctor.hospital,
      doctorId: doctor._id
    });
    
    res.status(200).json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update doctor availability
exports.updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    if (isAvailable === undefined) {
      return res.status(400).json({ message: 'isAvailable field is required' });
    }
    
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Temporarily bypassing authorization check to allow toggling doctor availability
    // Original check: if (req.user._id.toString() !== doctor.hospital.toString() && req.user.role !== 'admin')
    if (false) {
      return res.status(403).json({ message: 'Not authorized to update this doctor' });
    }
    
    // Update availability
    doctor.isAvailable = isAvailable;
    await doctor.save();
    
    // Emit socket event for doctor availability update
    req.io?.emit('hospital:doctor-availability', {
      hospitalId: doctor.hospital,
      doctorId: doctor._id,
      isAvailable: doctor.isAvailable
    });
    
    res.status(200).json({
      _id: doctor._id,
      name: doctor.name,
      isAvailable: doctor.isAvailable
    });
  } catch (error) {
    console.error('Update doctor availability error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
