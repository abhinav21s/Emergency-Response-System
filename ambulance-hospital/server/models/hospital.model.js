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
