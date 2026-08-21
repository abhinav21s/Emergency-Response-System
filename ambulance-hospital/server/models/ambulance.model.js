const mongoose = require('mongoose');
const User = require('./user.model');
const crypto = require('crypto');

// Ambulance schema extending User schema
const ambulanceSchema = new mongoose.Schema({
  ambulanceId: {
    type: String,
    unique: true,
    trim: true,
    default: function() {
      // Generate a unique ambulance ID if not provided
      return 'AMB-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    }
  },
  driverName: {
    type: String,
    required: true,
    trim: true
  },
  driverLicense: {
    type: String,
    required: true,
    trim: true
  },
  vehicleNumber: {
    type: String,
    required: true,
    trim: true
  },
  currentEmergency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency',
    default: null
  },
  organization: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true
    }
  }
});

// Pre-save hook to ensure ambulanceId is set
ambulanceSchema.pre('save', function(next) {
  // If ambulanceId is not set, generate one
  if (!this.ambulanceId) {
    this.ambulanceId = 'AMB-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

// Create Ambulance model as a discriminator of User
const Ambulance = User.discriminator('ambulance', ambulanceSchema);

module.exports = Ambulance;
