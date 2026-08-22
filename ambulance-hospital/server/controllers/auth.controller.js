const jwt = require('jsonwebtoken');
const Hospital = require('../models/hospital.model');
const Ambulance = require('../models/ambulance.model');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'justice_secret_key', {
    expiresIn: '30d'
  });
};

// Register controllers
exports.register = {
  // Hospital registration
  hospital: async (req, res) => {
    try {
      const {
        email,
        password,
        name,
        phone,
        hospitalName,
        address,
        location,
        beds,
        traumaLevel,
        specialties,
        doctorsOnDuty
      } = req.body;

      // Check if hospital already exists
      const existingHospital = await Hospital.findOne({ email });
      if (existingHospital) {
        return res.status(400).json({ message: 'Hospital already exists with this email' });
      }

      const initialBeds = beds || { emergency: 14, icu: 6, total: 60 };
      const initialTrauma = traumaLevel || 'Level 1 Multi-Specialty';
      const initialSpecialties = Array.isArray(specialties)
        ? specialties
        : ['Trauma & Emergency', 'General Surgery', 'ICU Care', 'Cardiology'];

      // Create new hospital
      const hospital = await Hospital.create({
        email,
        password,
        name,
        phone,
        role: 'hospital',
        hospitalName,
        address,
        location,
        beds: initialBeds,
        traumaLevel: initialTrauma,
        specialties: initialSpecialties,
        accepting: true
      });

      // Generate token
      const token = generateToken(hospital._id);

      // Cross-sync to Port 5000 dispatch network
      try {
        const dispatchLat = location?.coordinates?.[1] || 12.9716;
        const dispatchLng = location?.coordinates?.[0] || 77.5946;
        await fetch('http://localhost:5000/api/hospitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: hospitalName || name,
            lat: dispatchLat,
            lng: dispatchLng,
            phone: phone || '',
            traumaLevel: initialTrauma,
            specialties: initialSpecialties,
            beds: initialBeds,
            doctorsOnDuty: doctorsOnDuty || 8
          })
        });
      } catch (syncErr) {
        console.warn('Cross-service sync notice:', syncErr.message);
      }


      res.status(201).json({
        _id: hospital._id,
        email: hospital.email,
        name: hospital.name,
        hospitalName: hospital.hospitalName,
        role: hospital.role,
        token
      });
    } catch (error) {
      console.error('Hospital registration error:', error);
      // Extract Mongoose validation errors and return specific messages
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((e) => e.message);
        return res.status(400).json({ message: messages.join('. ') });
      }
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'email';
        return res.status(400).json({ message: `A hospital already exists with this ${field}.` });
      }
      res.status(500).json({ message: error.message || 'Server error during registration.' });
    }
  },

  // Ambulance registration
  ambulance: async (req, res) => {
    try {
      const {
        email,
        password,
        name,
        phone,
        ambulanceId,
        driverName,
        driverLicense,
        vehicleNumber,
        organization,
        location
      } = req.body;

      // Check if ambulance already exists with the same email
      const existingAmbulanceByEmail = await Ambulance.findOne({ email });
      
      if (existingAmbulanceByEmail) {
        return res.status(400).json({ 
          message: 'An ambulance account already exists with this email' 
        });
      }
      
      // Only check for duplicate ambulanceId if one was provided
      if (ambulanceId) {
        const existingAmbulanceById = await Ambulance.findOne({ ambulanceId });
        
        if (existingAmbulanceById) {
          return res.status(400).json({ 
            message: 'An ambulance already exists with this ambulance ID' 
          });
        }
      }

      // Ensure valid location coordinates default to Bangalore if not provided or empty
      const ambulanceLocation = location && location.coordinates && location.coordinates.length === 2 && !isNaN(location.coordinates[0]) && !isNaN(location.coordinates[1])
        ? location
        : { type: 'Point', coordinates: [77.5946, 12.9716] };

      // Create new ambulance
      const ambulance = await Ambulance.create({
        email,
        password,
        name: name || driverName,
        phone,
        role: 'ambulance',
        ambulanceId,
        driverName,
        driverLicense,
        vehicleNumber,
        organization,
        location: ambulanceLocation
      });

      // Generate token
      const token = generateToken(ambulance._id);

      res.status(201).json({
        _id: ambulance._id,
        email: ambulance.email,
        name: ambulance.name,
        ambulanceId: ambulance.ambulanceId,
        role: ambulance.role,
        token
      });
    } catch (error) {
      console.error('Ambulance registration error:', error);
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((e) => e.message);
        return res.status(400).json({ message: messages.join('. ') });
      }
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'email';
        return res.status(400).json({ message: `An ambulance account already exists with this ${field}.` });
      }
      res.status(500).json({ message: error.message || 'Server error during ambulance registration.' });
    }
  }
};

// Login controllers
exports.login = {
  // Hospital login
  hospital: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if hospital exists
      const hospital = await Hospital.findOne({ email });
      if (!hospital) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check if password is correct
      const isMatch = await hospital.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate token
      const token = generateToken(hospital._id);

      res.status(200).json({
        _id: hospital._id,
        email: hospital.email,
        name: hospital.name,
        hospitalName: hospital.hospitalName,
        role: hospital.role,
        token
      });
    } catch (error) {
      console.error('Hospital login error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Ambulance login
  ambulance: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if ambulance exists
      const ambulance = await Ambulance.findOne({ email });
      if (!ambulance) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check if password is correct
      const isMatch = await ambulance.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate token
      const token = generateToken(ambulance._id);

      res.status(200).json({
        _id: ambulance._id,
        email: ambulance.email,
        name: ambulance.name,
        ambulanceId: ambulance.ambulanceId,
        role: ambulance.role,
        token
      });
    } catch (error) {
      console.error('Ambulance login error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};

// Verify token
exports.verifyToken = async (req, res) => {
  try {
    // Check multiple possible token locations
    let token = req.header('x-auth-token');
    
    // Try Authorization header if x-auth-token is not present
    if (!token && req.header('Authorization')) {
      token = req.header('Authorization').replace('Bearer ', '');
    }
    
    if (!token) {
      console.log('Token verification failed: No token provided');
      return res.status(401).json({ valid: false, message: 'No token provided' });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'justice_secret_key');
    
    if (!decoded || !decoded.id) {
      console.log('Token verification failed: Invalid token payload');
      return res.status(401).json({ valid: false, message: 'Invalid token payload' });
    }
    
    // Check both Hospital and Ambulance models
    let user = await Hospital.findById(decoded.id);
    let role = 'hospital';
    
    if (!user) {
      user = await Ambulance.findById(decoded.id);
      role = 'ambulance';
    }
    
    if (!user) {
      console.log('Token verification failed: User not found for ID', decoded.id);
      return res.status(401).json({ valid: false, message: 'User not found' });
    }
    
    // Return user data with token
    res.status(200).json({ 
      valid: true, 
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: role,
        ...(role === 'hospital' ? { hospitalName: user.hospitalName } : { ambulanceId: user.ambulanceId })
      },
      token: token // Return the token back to ensure client has the latest
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false, message: 'Invalid token: ' + error.message });
  }
};
