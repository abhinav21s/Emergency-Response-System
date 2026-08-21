const mongoose = require('mongoose');
const Emergency = require('../models/emergency.model');
const Hospital = require('../models/hospital.model');
const Ambulance = require('../models/ambulance.model');

// Create emergency
exports.createEmergency = async (req, res) => {
  try {
    console.log('Creating emergency with data:', req.body);
    
    const {
      hospital,
      emergencyType,
      severity,
      location,
      status,
      notes
    } = req.body;

    // Validate minimal required fields
    if (!hospital) {
      return res.status(400).json({ message: 'Hospital ID is required' });
    }

    // Get ambulance ID (from token or use a default for testing)
    let ambulanceId = req.user?._id;
    
    // For testing without auth
    if (!ambulanceId) {
      // Try to find any ambulance
      const anyAmbulance = await Ambulance.findOne();
      if (anyAmbulance) {
        ambulanceId = anyAmbulance._id;
        console.log('Using test ambulance ID:', ambulanceId);
      } else {
        ambulanceId = mongoose.Types.ObjectId();
        console.log('Created temporary ambulance ID:', ambulanceId);
      }
    }

    // Create emergency data with defaults for missing fields
    const emergencyData = {
      hospital,
      ambulance: ambulanceId,
      emergencyType: emergencyType || 'Ambulance Arrival',
      severity: severity || 'Medium',
      status: status || 'Requested',
      notes: notes || 'Emergency notification',
      patient: {
        condition: 'Unknown' // Provide the required field
      }
    };

    // Add location if provided
    if (location) {
      emergencyData.location = location;
    }

    console.log('Creating emergency with processed data:', emergencyData);
    
    // Create emergency
    const emergency = await Emergency.create(emergencyData);
    
    console.log('Emergency created successfully with ID:', emergency._id);

    // Try to emit socket events
    try {
      if (global.io) {
        global.io.emit('hospital:emergency-notification', {
          type: 'NEW_EMERGENCY',
          emergency: emergency,
          hospitalId: hospital
        });
        
        console.log('Emitted global notification event');
        
        // Also try to emit to specific hospital room
        global.io.to(`hospital_${hospital}`).emit('hospital:emergency-notification', {
          type: 'NEW_EMERGENCY',
          emergency: emergency,
          hospitalId: hospital
        });
        
        console.log('Emitted to hospital room:', `hospital_${hospital}`);
      } else {
        console.log('Socket.io not available globally');
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    // Return success
    res.status(201).json(emergency);
  } catch (error) {
    console.error('Create emergency error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Get emergencies with filtering support
exports.getEmergencies = async (req, res) => {
  try {
    console.log('Getting emergencies with query params:', req.query);
    
    // Build filter based on query parameters
    const filter = {};
    
    // Filter by ambulance if provided
    if (req.query.ambulance) {
      filter.ambulance = req.query.ambulance;
      console.log('Filtering by ambulance:', req.query.ambulance);
    }
    
    // Filter by hospital if provided
    if (req.query.hospital) {
      filter.hospital = req.query.hospital;
    }
    
    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    console.log('Using filter:', filter);
    
    // Get emergencies with filter
    const emergencies = await Emergency.find(filter)
      .sort('-createdAt')
      .limit(50);
    
    console.log(`Found ${emergencies.length} emergencies matching the filter`);
    
    // Populate hospital name if needed
    const populatedEmergencies = await Promise.all(emergencies.map(async (emergency) => {
      const emergencyObj = emergency.toObject();
      
      // Add hospital name if not already present
      if (emergency.hospital && !emergencyObj.hospitalName) {
        try {
          const hospital = await Hospital.findById(emergency.hospital);
          if (hospital) {
            emergencyObj.hospitalName = hospital.name;
          }
        } catch (err) {
          console.error('Error fetching hospital name:', err);
        }
      }
      
      return emergencyObj;
    }));

    res.status(200).json(populatedEmergencies);
  } catch (error) {
    console.error('Get emergencies error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Update emergency
exports.updateEmergency = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid emergency ID' });
    }

    const emergency = await Emergency.findById(id);
    if (!emergency) {
      return res.status(404).json({ message: 'Emergency not found' });
    }

    // Update the emergency
    const updatedEmergency = await Emergency.findByIdAndUpdate(
      id,
      { status, notes },
      { new: true }
    );

    // Try to emit socket event
    try {
      if (global.io) {
        global.io.emit('emergency:update', {
          type: 'EMERGENCY_UPDATE',
          emergency: updatedEmergency
        });
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    res.status(200).json(updatedEmergency);
  } catch (error) {
    console.error('Update emergency error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Get emergency by ID
exports.getEmergencyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid emergency ID' });
    }
    
    const emergency = await Emergency.findById(id);

    if (!emergency) {
      return res.status(404).json({ message: 'Emergency not found' });
    }

    res.status(200).json(emergency);
  } catch (error) {
    console.error('Get emergency by ID error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Send emergency notification to hospital
exports.notifyHospital = async (req, res) => {
  try {
    console.log('Sending emergency notification with data:', req.body);
    
    const { ambulanceId, hospitalId, gender, patientType, message } = req.body;
    console.log('Gender received:', gender);
    console.log('Patient Type received:', patientType);
    console.log('Message received:', message);

    // Validate required fields
    if (!hospitalId) {
      return res.status(400).json({ message: 'Hospital ID is required' });
    }

    if (!ambulanceId) {
      return res.status(400).json({ message: 'Ambulance ID is required' });
    }

    // Verify hospital exists
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Verify ambulance exists
    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) {
      return res.status(404).json({ message: 'Ambulance not found' });
    }

    // Log the ambulance details for debugging
    console.log('Ambulance details:', {
      id: ambulance._id,
      name: ambulance.name,
      vehicleNumber: ambulance.vehicleNumber,
      driverName: ambulance.driverName,
      contactNumber: ambulance.organization?.contactNumber || 'Not available'
    });
    
    // Create emergency notification with ambulance details
    const emergency = await Emergency.create({
      hospital: hospitalId,
      ambulance: ambulanceId,
      ambulanceName: ambulance.name || 'Ambulance',
      vehicleNumber: ambulance.vehicleNumber || 'Unknown',
      driverName: ambulance.driverName || 'Unknown Driver',
      phoneNumber: ambulance.organization?.contactNumber || 'Not Available',
      emergencyType: 'Ambulance Arrival',
      severity: 'Medium',
      status: 'Requested',
      notes: message || 'Emergency notification from ambulance',
      gender: gender || 'Unknown',
      patientType: patientType || 'General Emergency',
      patient: {
        condition: 'Unknown',
        gender: gender || 'Unknown'
      }
    });

    console.log('Emergency notification created with ID:', emergency._id);
    console.log('Ambulance ID:', ambulanceId);
    console.log('Ambulance Name:', ambulance.name || ambulance.vehicleNumber || 'Ambulance');

    // Create a notification object with full ambulance details
    const notificationData = {
      type: 'NEW_EMERGENCY',
      emergency: emergency,
      hospitalId: hospitalId,
      ambulance: {
        _id: ambulance._id,
        name: ambulance.name || ambulance.vehicleNumber || 'Ambulance',
        vehicleNumber: ambulance.vehicleNumber || 'Unknown',
        phone: ambulance.phone || 'Unknown'
      }
    };

    // Emit socket event
    try {
      if (global.io) {
        global.io.emit('hospital:emergency-notification', notificationData);
        
        // Also emit to specific hospital room
        global.io.to(`hospital_${hospitalId}`).emit('hospital:emergency-notification', notificationData);
        
        console.log('Emitted emergency notification to hospital:', hospitalId);
      }
    } catch (socketError) {
      console.error('Error emitting socket event:', socketError);
    }

    res.status(201).json({
      success: true,
      message: 'Emergency notification sent successfully',
      emergency
    });
  } catch (error) {
    console.error('Send emergency notification error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
