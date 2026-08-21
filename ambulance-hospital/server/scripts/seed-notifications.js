const mongoose = require('mongoose');
const Notification = require('../models/notification.model');
const Hospital = require('../models/hospital.model');
const Ambulance = require('../models/ambulance.model');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = 'mongodb+srv://ccraze36:Server2010%23@justicecluster.imoz2pr.mongodb.net/';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  seedNotifications();
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});

const seedNotifications = async () => {
  try {
    // Clear existing notifications
    await Notification.deleteMany({});
    console.log('Cleared existing notifications');

    // Get a hospital and ambulance for testing
    const hospital = await Hospital.findOne();
    const ambulance = await Ambulance.findOne();

    if (!hospital || !ambulance) {
      console.error('No hospital or ambulance found. Please seed those first.');
      process.exit(1);
    }

    // Create sample notifications for hospital
    const hospitalNotifications = [
      {
        title: 'New Emergency Request',
        message: 'Ambulance ID #' + ambulance._id + ' has requested emergency assistance for a cardiac patient.',
        type: 'emergency',
        recipient: hospital._id,
        recipientType: 'hospital',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
      },
      {
        title: 'Doctor Availability Update',
        message: 'Dr. Smith has changed their availability to Available.',
        type: 'system',
        recipient: hospital._id,
        recipientType: 'hospital',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
      },
      {
        title: 'System Maintenance',
        message: 'The system will undergo maintenance on Sunday at 2:00 AM. Expect brief downtime.',
        type: 'system',
        recipient: hospital._id,
        recipientType: 'hospital',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
      },
      {
        title: 'Ambulance Arrival',
        message: 'Ambulance ID #' + ambulance._id + ' has arrived at your hospital.',
        type: 'emergency',
        recipient: hospital._id,
        recipientType: 'hospital',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 10) // 10 minutes ago
      }
    ];

    // Create sample notifications for ambulance
    const ambulanceNotifications = [
      {
        title: 'Emergency Accepted',
        message: 'Hospital ' + hospital.name + ' has accepted your emergency request.',
        type: 'emergency',
        recipient: ambulance._id,
        recipientType: 'ambulance',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 25) // 25 minutes ago
      },
      {
        title: 'Route Updated',
        message: 'Your route to ' + hospital.name + ' has been updated due to traffic.',
        type: 'system',
        recipient: ambulance._id,
        recipientType: 'ambulance',
        isRead: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 40) // 40 minutes ago
      },
      {
        title: 'System Update',
        message: 'The Justice Emergency Response System has been updated to version 2.1.',
        type: 'system',
        recipient: ambulance._id,
        recipientType: 'ambulance',
        isRead: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12) // 12 hours ago
      }
    ];

    // Insert all notifications
    await Notification.insertMany([...hospitalNotifications, ...ambulanceNotifications]);
    
    console.log(`Successfully seeded ${hospitalNotifications.length + ambulanceNotifications.length} notifications`);
    console.log(`- ${hospitalNotifications.length} for hospital`);
    console.log(`- ${ambulanceNotifications.length} for ambulance`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding notifications:', error);
    process.exit(1);
  }
};
