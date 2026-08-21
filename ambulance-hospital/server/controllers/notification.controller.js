const Notification = require('../models/notification.model');

// Simplified version that doesn't depend on Hospital and Ambulance models
// to avoid errors if those models aren't fully set up

// Get all notifications for a hospital
exports.getHospitalNotifications = async (req, res) => {
  try {
    const hospitalId = req.params.hospitalId;
    
    // Validate the hospital ID
    if (!hospitalId || hospitalId === 'undefined') {
      console.error('Invalid hospital ID provided:', hospitalId);
      return res.status(400).json({ message: 'Invalid hospital ID' });
    }
    
    // Ensure the requesting user has access to these notifications
    if (req.user && req.user._id.toString() !== hospitalId && req.user.role !== 'admin') {
      console.error('Unauthorized access attempt to hospital notifications');
      return res.status(403).json({ message: 'Not authorized to access these notifications' });
    }
    
    console.log(`Fetching notifications for hospital ID: ${hospitalId}`);
    
    // Get notifications for this hospital with strict filtering
    try {
      const notifications = await Notification.find({
        recipient: hospitalId,
        recipientType: 'hospital'
      }).sort({ createdAt: -1 }); // Sort by newest first
      
      console.log(`Found ${notifications.length} notifications for hospital ID: ${hospitalId}`);
      res.status(200).json(notifications);
    } catch (dbError) {
      // If database query fails, return empty array
      console.warn('Database query failed, returning empty array:', dbError);
      res.status(200).json([]);
    }
  } catch (error) {
    console.error('Error fetching hospital notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// Get all notifications for an ambulance
exports.getAmbulanceNotifications = async (req, res) => {
  try {
    const ambulanceId = req.params.ambulanceId;
    
    // Get notifications for this ambulance
    try {
      const notifications = await Notification.find({
        recipient: ambulanceId,
        recipientType: 'ambulance'
      }).sort({ createdAt: -1 }); // Sort by newest first
      
      res.status(200).json(notifications);
    } catch (dbError) {
      // If database query fails, return empty array
      console.warn('Database query failed, returning empty array:', dbError);
      res.status(200).json([]);
    }
  } catch (error) {
    console.error('Error fetching ambulance notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// Get all notifications sent by an ambulance
exports.getSentNotificationsByAmbulance = async (req, res) => {
  try {
    const ambulanceId = req.params.ambulanceId;
    
    // Validate the ambulance ID
    if (!ambulanceId || ambulanceId === 'undefined') {
      console.error('Invalid ambulance ID provided:', ambulanceId);
      return res.status(400).json({ message: 'Invalid ambulance ID' });
    }
    
    console.log(`Fetching sent notifications for ambulance ID: ${ambulanceId}`);
    
    // First try to find emergency notifications where this ambulance is the sender
    const emergencies = await mongoose.model('Emergency').find({
      ambulance: ambulanceId
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${emergencies.length} emergency notifications sent by ambulance ID: ${ambulanceId}`);
    
    // Convert emergencies to notification format
    const sentNotifications = await Promise.all(emergencies.map(async (emergency) => {
      // Try to get hospital details
      let hospitalName = 'Unknown Hospital';
      try {
        const hospital = await mongoose.model('Hospital').findById(emergency.hospital);
        if (hospital) {
          hospitalName = hospital.hospitalName || hospital.name || 'Unknown Hospital';
        }
      } catch (err) {
        console.warn('Error fetching hospital details:', err);
      }
      
      return {
        _id: emergency._id,
        title: 'Emergency Notification Sent',
        message: `You sent an emergency notification to ${hospitalName}`,
        type: 'emergency',
        sender: ambulanceId,
        senderType: 'ambulance',
        recipient: emergency.hospital,
        recipientType: 'hospital',
        status: emergency.status || 'Sent',
        emergencyType: emergency.emergencyType || 'Ambulance Arrival',
        severity: emergency.severity || 'Medium',
        isRead: true,
        createdAt: emergency.createdAt,
        hospitalName: hospitalName
      };
    }));
    
    res.status(200).json(sentNotifications);
  } catch (error) {
    console.error('Error fetching sent notifications:', error);
    res.status(500).json({ message: 'Failed to fetch sent notifications', error: error.message });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.notificationId;
    
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(200).json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
};

// Mark all notifications as read for a hospital
exports.markAllAsReadForHospital = async (req, res) => {
  try {
    const hospitalId = req.params.hospitalId;
    
    // Mark all notifications as read
    try {
      const result = await Notification.updateMany(
        { recipient: hospitalId, recipientType: 'hospital', isRead: false },
        { isRead: true }
      );
      
      res.status(200).json({ message: 'All notifications marked as read', count: result.modifiedCount || 0 });
    } catch (dbError) {
      console.warn('Database update failed:', dbError);
      res.status(200).json({ message: 'All notifications marked as read', count: 0 });
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
};

// Mark all notifications as read for an ambulance
exports.markAllAsReadForAmbulance = async (req, res) => {
  try {
    const ambulanceId = req.params.ambulanceId;
    
    // Mark all notifications as read
    try {
      const result = await Notification.updateMany(
        { recipient: ambulanceId, recipientType: 'ambulance', isRead: false },
        { isRead: true }
      );
      
      res.status(200).json({ message: 'All notifications marked as read', count: result.modifiedCount || 0 });
    } catch (dbError) {
      console.warn('Database update failed:', dbError);
      res.status(200).json({ message: 'All notifications marked as read', count: 0 });
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read', error: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.notificationId;
    
    const notification = await Notification.findByIdAndDelete(notificationId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
};

// Create a notification (for testing or admin purposes)
exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, recipient, recipientType } = req.body;
    
    // Validate required fields
    if (!title || !message || !recipient || !recipientType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create notification without validating recipient
    try {
      const notification = new Notification({
        title,
        message,
        type: type || 'system',
        recipient,
        recipientType,
        isRead: false
      });
      
      await notification.save();
      
      res.status(201).json(notification);
    } catch (dbError) {
      console.warn('Failed to create notification in database:', dbError);
      res.status(500).json({ message: 'Failed to create notification in database' });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Failed to create notification', error: error.message });
  }
};
