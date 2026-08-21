const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Get all notifications for a hospital
router.get('/hospital/:hospitalId', authMiddleware.auth, notificationController.getHospitalNotifications);

// Get all notifications for an ambulance
router.get('/ambulance/:ambulanceId', authMiddleware.auth, notificationController.getAmbulanceNotifications);

// Get all notifications sent by an ambulance
router.get('/ambulance/:ambulanceId/sent', authMiddleware.auth, notificationController.getSentNotificationsByAmbulance);

// Mark a notification as read
router.put('/:notificationId/read', authMiddleware.auth, notificationController.markAsRead);

// Mark all notifications as read for a hospital
router.put('/hospital/:hospitalId/read-all', authMiddleware.auth, notificationController.markAllAsReadForHospital);

// Mark all notifications as read for an ambulance
router.put('/ambulance/:ambulanceId/read-all', authMiddleware.auth, notificationController.markAllAsReadForAmbulance);

// Delete a notification
router.delete('/:notificationId', authMiddleware.auth, notificationController.deleteNotification);

// Create a notification (for testing or admin purposes)
router.post('/', authMiddleware.auth, notificationController.createNotification);

module.exports = router;
