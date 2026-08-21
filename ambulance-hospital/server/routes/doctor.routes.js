const express = require('express');
const router = express.Router();
const { getDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor, updateAvailability } = require('../controllers/doctor.controller');
const { auth } = require('../middleware/auth.middleware');

// Doctor routes
router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.post('/', auth, createDoctor);
router.put('/:id', auth, updateDoctor);
router.delete('/:id', auth, deleteDoctor);

// Doctor availability route
router.patch('/:id/availability', auth, updateAvailability);

module.exports = router;
