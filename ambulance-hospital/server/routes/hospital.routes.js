const express = require('express');
const router = express.Router();
const { getHospitals, getHospitalById, updateHospital, deleteHospital, getEmergencyRequests } = require('../controllers/hospital.controller');
const { auth } = require('../middleware/auth.middleware');

// Hospital routes
router.get('/', getHospitals);
router.get('/:id', getHospitalById);
router.use(auth);
router.get('/:id/emergency-requests', getEmergencyRequests);
router.put('/:id', updateHospital);
router.delete('/:id', deleteHospital);

module.exports = router;
