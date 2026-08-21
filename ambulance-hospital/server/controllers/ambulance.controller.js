const mongoose = require('mongoose');
const Ambulance = require('../models/ambulance.model');
const Hospital = require('../models/hospital.model');
const Emergency = require('../models/emergency.model');
const Doctor = require('../models/doctor.model'); 

// Get all ambulances
exports.getAmbulances = async (req, res) => {
  try {
    const ambulances = await Ambulance.find().select('-password');
    res.status(200).json(ambulances);
  } catch (error) {
    console.error('Get ambulances error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get ambulance by ID
exports.getAmbulanceById = async (req, res) => {
  try {
    const ambulance = await Ambulance.findById(req.params.id).select('-password');
    
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }
    
    // Get current emergency if exists
    let currentEmergency = null;
    if (ambulance.currentEmergency) {
      currentEmergency = await Emergency.findById(ambulance.currentEmergency)
        .populate('hospital', '-password');
    }
    
    res.status(200).json({
      ambulance,
      currentEmergency
    });
  } catch (error) {
    console.error('Get ambulance by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update ambulance
exports.updateAmbulance = async (req, res) => {
  try {
    const {
      name,
      phone,
      driverName,
      vehicleNumber,
      organization,
      location
    } = req.body;
    
    // Check if the user is the ambulance or an admin
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this ambulance' });
    }
    
    const ambulance = await Ambulance.findById(req.params.id);
    
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }
    
    // Update ambulance fields
    const updatedAmbulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      {
        name: name || ambulance.name,
        phone: phone || ambulance.phone,
        driverName: driverName || ambulance.driverName,
        vehicleNumber: vehicleNumber || ambulance.vehicleNumber,
        organization: organization || ambulance.organization,
        location: location || ambulance.location,
        updatedAt: Date.now()
      },
      { new: true }
    ).select('-password');
    
    // Emit socket event for ambulance location update
    if (location) {
      req.io?.emit('ambulance:location', {
        ambulanceId: updatedAmbulance._id,
        location: updatedAmbulance.location
      });
    }
    
    res.status(200).json(updatedAmbulance);
  } catch (error) {
    console.error('Update ambulance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete ambulance
exports.deleteAmbulance = async (req, res) => {
  try {
    // Check if the user is the ambulance or an admin
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this ambulance' });
    }
    
    const ambulance = await Ambulance.findById(req.params.id);
    
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }
    
    // Check if ambulance has active emergency
    if (ambulance.currentEmergency) {
      return res.status(400).json({ 
        message: 'Cannot delete ambulance with active emergency' 
      });
    }
    
    // Delete the ambulance
    await Ambulance.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Ambulance deleted successfully' });
  } catch (error) {
    console.error('Delete ambulance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get driver trip statistics for an ambulance
exports.getDriverTripStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ambulance ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ambulance ID' });
    }
    
    // Find the ambulance
    const ambulance = await Ambulance.findById(id).select('-password');
    
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }
    
    // Get all completed emergencies for this ambulance
    const completedTrips = await Emergency.find({
      ambulance: id,
      status: 'Completed'
    }).sort('-createdAt');
    
    // Count total completed trips
    const totalTrips = completedTrips.length;
    
    // Calculate statistics by driver name
    const driverStats = {};
    
    // Process each trip to gather driver statistics
    completedTrips.forEach(trip => {
      const driverName = trip.driverName || ambulance.driverName || 'Unknown Driver';
      
      if (!driverStats[driverName]) {
        driverStats[driverName] = {
          driverName,
          totalTrips: 0,
          completedTrips: []
        };
      }
      
      driverStats[driverName].totalTrips += 1;
      driverStats[driverName].completedTrips.push({
        id: trip._id,
        date: trip.createdAt,
        hospital: trip.hospital,
        emergencyType: trip.emergencyType,
        severity: trip.severity
      });
    });
    
    // Convert to array for easier frontend processing
    const driversArray = Object.values(driverStats);
    
    res.status(200).json({
      ambulanceId: id,
      totalTrips,
      drivers: driversArray
    });
  } catch (error) {
    console.error('Get driver trip stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get nearby hospitals
exports.getNearbyHospitals = async (req, res) => {
  try {
    console.log('Finding hospitals near ambulance:', req.params.id);
    
    // Find ambulance with valid ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ambulance ID format' });
    }
    
    const ambulance = await Ambulance.findById(req.params.id);
    
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }
    
    // For testing and development, return all hospitals if no ambulance location
    if (!ambulance.location || !ambulance.location.coordinates) {
      console.log('Ambulance has no location - returning all hospitals');
      
      // Just get all hospitals without spatial filtering
      const allHospitals = await Hospital.find({ role: 'hospital' }).limit(10);
      
      // Get doctors for each hospital
      const hospitalsWithDoctors = await Promise.all(
        allHospitals.map(async (hospital) => {
          const doctors = await Doctor.find({ hospital: hospital._id });
          return {
            ...hospital.toObject(),
            doctors,
            distance: 5.0 // Default distance for demonstration
          };
        })
      );
      
      return res.status(200).json(hospitalsWithDoctors);
    }
    
    // Get query parameters with defaults
    const maxDistance = parseInt(req.query.maxDistance) || 10000; // Default 10km
    const emergencyType = req.query.emergencyType;
    const acceptingOnly = req.query.acceptingOnly === 'true';
    
    console.log('Search params:', { maxDistance, emergencyType, acceptingOnly });
    
    // Try to find all hospitals
    const allHospitals = await Hospital.find({ role: 'hospital' }).limit(10);
    console.log(`Found ${allHospitals.length} total hospitals`);
    
    // Debug: Log detailed information about each hospital's location
    allHospitals.forEach((hospital, index) => {
      console.log(`Hospital ${index + 1} (${hospital.hospitalName || hospital._id}):`, {
        hasLocation: !!hospital.location,
        locationType: hospital.location ? hospital.location.type : null,
        coordinates: hospital.location ? hospital.location.coordinates : null,
        validCoordinates: hospital.location && 
                         Array.isArray(hospital.location.coordinates) && 
                         hospital.location.coordinates.length >= 2 &&
                         !isNaN(hospital.location.coordinates[0]) && 
                         !isNaN(hospital.location.coordinates[1])
      });
    });
    
    if (allHospitals.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get doctors for each hospital
    const hospitalsWithDoctors = await Promise.all(
      allHospitals.map(async (hospital) => {
        const doctors = await Doctor.find({ hospital: hospital._id });
        
        // Ensure hospital has proper location data structure
        let hospitalLocation = hospital.location;
        let distance = 0;
        
        // Check if location exists and has valid coordinates
        if (!hospitalLocation || 
            !hospitalLocation.coordinates || 
            !Array.isArray(hospitalLocation.coordinates) || 
            hospitalLocation.coordinates.length < 2 ||
            isNaN(hospitalLocation.coordinates[0]) || 
            isNaN(hospitalLocation.coordinates[1])) {
          
          console.log(`Hospital ${hospital.hospitalName || hospital._id} has invalid location data, creating default`);
          
          // Create default location near ambulance or use fixed coordinates
          if (ambulance.location && ambulance.location.coordinates) {
            const offsetX = (Math.random() - 0.5) * 0.02;
            const offsetY = (Math.random() - 0.5) * 0.02;
            hospitalLocation = {
              type: 'Point',
              coordinates: [
                ambulance.location.coordinates[0] + offsetX,
                ambulance.location.coordinates[1] + offsetY
              ]
            };
          } else {
            // Default to Bangalore coordinates
            hospitalLocation = {
              type: 'Point',
              coordinates: [77.5946, 12.9716]
            };
          }
          
          // Calculate a random distance for hospitals with generated locations
          distance = Math.random() * 10;
        } else {
          // Calculate distance if both hospital and ambulance have valid locations
          if (ambulance.location && ambulance.location.coordinates) {
            const [hospitalLong, hospitalLat] = hospitalLocation.coordinates;
            const [ambulanceLong, ambulanceLat] = ambulance.location.coordinates;
            
            // Simple distance calculation
            const latDiff = hospitalLat - ambulanceLat;
            const longDiff = hospitalLong - ambulanceLong;
            distance = Math.sqrt(latDiff * latDiff + longDiff * longDiff) * 111; // Rough km conversion
          }
        }
        
        // Create a complete hospital object with all required data
        return {
          ...hospital.toObject(),
          doctors,
          distance: parseFloat(distance.toFixed(1)),
          location: hospitalLocation,
          originalLocationValid: !!hospital.location && 
                               !!hospital.location.coordinates && 
                               Array.isArray(hospital.location.coordinates) && 
                               hospital.location.coordinates.length >= 2
        };
      })
    );
    
    // Filter results if needed
    let results = hospitalsWithDoctors;
    
    if (acceptingOnly) {
      results = results.filter(h => h.isAcceptingEmergencies);
    }
    
    if (emergencyType) {
      results = results.filter(h => h.emergencyTypes?.includes(emergencyType));
    }
    
    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);
    
    console.log(`Returning ${results.length} hospitals`);
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Get nearby hospitals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
