const express = require('express');
const router = express.Router();
const { register, login, verifyToken } = require('../controllers/auth.controller');

// Authentication routes
router.post('/register/hospital', register.hospital);
router.post('/register/ambulance', register.ambulance);
router.post('/login/hospital', login.hospital);
router.post('/login/ambulance', login.ambulance);
router.get('/verify', verifyToken);

module.exports = router;
