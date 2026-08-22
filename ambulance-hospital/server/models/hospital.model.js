const mongoose = require('mongoose');
const User = require('./user.model');

// Hospital schema extending User schema
const hospitalSchema = new mongoose.Schema({
  hospitalName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  traumaLevel: {
    type: String,
    default: 'Level 1 Trauma'
  },
  specialties: {
    type: [String],
    default: ['Trauma & Emergency', 'Cardiology', 'ICU Care']
  },
  beds: {
    emergency: { type: Number, default: 12 },
    icu: { type: Number, default: 6 },
    total: { type: Number, default: 60 }
  },
  accepting: {
    type: Boolean,
    default: true
  },
  address: {
    street: { type: String, trim: true, default: '' },
    city:   { type: String, trim: true, default: '' },
    state:  { type: String, trim: true, default: '' },
    zipCode:{ type: String, trim: true, default: '' },
    country:{ type: String, trim: true, default: 'India' }
  }
});

// Create Hospital model as a discriminator of User
const Hospital = User.discriminator('hospital', hospitalSchema);

module.exports = Hospital;
