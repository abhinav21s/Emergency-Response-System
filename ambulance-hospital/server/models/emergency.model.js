const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  ambulance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Added top-level gender field for emergency notifications
  gender: {
    type: String,
    trim: true
  },
  // Added top-level patientType field for emergency notifications
  patientType: {
    type: String,
    trim: true
  },
  // Driver name field for emergency notifications
  driverName: {
    type: String,
    trim: true
  },
  // Vehicle number field for emergency notifications
  vehicleNumber: {
    type: String,
    trim: true
  },
  // Phone number field for emergency notifications
  phoneNumber: {
    type: String,
    trim: true
  },
  patient: {
    name: {
      type: String,
      trim: true
    },
    age: {
      type: Number
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other']
    },
    condition: {
      type: String,
      trim: true,
      default: 'Unknown'
    },
    vitalSigns: {
      bloodPressure: String,
      heartRate: Number,
      respiratoryRate: Number,
      temperature: Number,
      oxygenSaturation: Number
    }
  },
  emergencyType: {
    type: String,
    required: true,
    trim: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], 
      default: [77.5946, 12.9716]
    },
    address: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['Requested', 'Accepted', 'En Route', 'Arrived', 'Completed', 'Cancelled'],
    default: 'Requested'
  },
  estimatedArrivalTime: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 15 * 60000); 
    }
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  timeline: [{
    status: {
      type: String,
      enum: ['Requested', 'Accepted', 'En Route', 'Arrived', 'Completed', 'Cancelled'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
emergencySchema.index({ location: '2dsphere' });

// Update the updatedAt timestamp before update
emergencySchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Add status to timeline when status changes
emergencySchema.pre('save', function(next) {
  const emergency = this;
  
  if (!emergency.patient) {
    emergency.patient = {
      condition: 'Unknown'
    };
  }
  
  if (emergency.isNew) {
    emergency.timeline.push({
      status: emergency.status,
      timestamp: new Date(),
      notes: 'Emergency request created'
    });
  } else if (emergency.isModified('status')) {
    emergency.timeline.push({
      status: emergency.status,
      timestamp: new Date()
    });
  }
  
  next();
});

const Emergency = mongoose.model('Emergency', emergencySchema);

module.exports = Emergency;
