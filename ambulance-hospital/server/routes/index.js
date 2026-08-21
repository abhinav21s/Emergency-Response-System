const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const hospitalRoutes = require('./hospital.routes');
const ambulanceRoutes = require('./ambulance.routes');
const doctorRoutes = require('./doctor.routes');
const emergencyRoutes = require('./emergency.routes');
const statsRoutes = require('./stats.routes');
const notificationRoutes = require('./notification.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/ambulances', ambulanceRoutes);
router.use('/doctors', doctorRoutes);
router.use('/emergencies', emergencyRoutes);
router.use('/stats', statsRoutes);
router.use('/notifications', notificationRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Justice API is running' });
});

// Debug route for checking auth
router.get('/debug/auth', (req, res) => {
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
  res.status(200).json({ 
    hasToken: !!token,
    tokenLength: token ? token.length : 0
  });
});

module.exports = router;
