const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth.middleware');
const emergencyController = require('../controllers/emergency.controller');

// Emergency routes - open for testing
// All routes require authentication
// router.use(auth);

// Create new emergency (ambulance only)
router.post('/', emergencyController.createEmergency);

// Send emergency notification to hospital
router.post('/notify', emergencyController.notifyHospital);

// Get all emergencies (filtered by user role)
router.get('/', emergencyController.getEmergencies);

// Get emergency by ID
router.get('/:id', emergencyController.getEmergencyById);

// Update emergency status
router.put('/:id', emergencyController.updateEmergency);

module.exports = router;
