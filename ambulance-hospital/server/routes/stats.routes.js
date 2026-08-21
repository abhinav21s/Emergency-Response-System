const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

// @route   GET api/stats
// @desc    Get system statistics
// @access  Public
router.get('/', statsController.getStats);

// @route   GET api/stats/health
// @desc    Health check for stats endpoint
// @access  Public
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Stats endpoint is available' });
});

module.exports = router;
