const express = require('express');
const router = express.Router();
const { getAmbulances, getAmbulanceById, updateAmbulance, deleteAmbulance, getDriverTripStats } = require('../controllers/ambulance.controller');
const { auth } = require('../middleware/auth.middleware');

// Ambulance routes
router.get('/', getAmbulances);
router.get('/:id', getAmbulanceById);
router.put('/:id', auth, updateAmbulance);
router.delete('/:id', auth, deleteAmbulance);

// Nearby hospitals route
router.get('/:id/nearby-hospitals', auth, require('../controllers/ambulance.controller').getNearbyHospitals);

// Driver trip statistics route
router.get('/:id/driver-trips', auth, getDriverTripStats);

module.exports = router;
