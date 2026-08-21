const Hospital = require('../models/hospital.model');
const Ambulance = require('../models/ambulance.model');
const Doctor = require('../models/doctor.model');
const Emergency = require('../models/emergency.model');

// Get system statistics
exports.getStats = async (req, res) => {
  try {
    console.log('Stats endpoint called');
    
    // Use try/catch for each collection to prevent one failure from breaking everything
    let hospitalCount = 0;
    let ambulanceCount = 0;
    let doctorCount = 0;
    let emergencyCount = 0;
    
    try {
      hospitalCount = await Hospital.countDocuments();
      console.log('Hospital count:', hospitalCount);
    } catch (err) {
      console.error('Error counting hospitals:', err);
    }
    
    try {
      ambulanceCount = await Ambulance.countDocuments();
      console.log('Ambulance count:', ambulanceCount);
    } catch (err) {
      console.error('Error counting ambulances:', err);
    }
    
    try {
      doctorCount = await Doctor.countDocuments();
      console.log('Doctor count:', doctorCount);
    } catch (err) {
      console.error('Error counting doctors:', err);
    }
    
    try {
      emergencyCount = await Emergency.countDocuments();
      console.log('Emergency count:', emergencyCount);
    } catch (err) {
      console.error('Error counting emergencies:', err);
    }

    // Return all stats
    console.log('Returning stats data');
    res.json({
      hospitalCount,
      ambulanceCount,
      doctorCount,
      emergencyCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error while fetching statistics', error: error.message });
  }
};
