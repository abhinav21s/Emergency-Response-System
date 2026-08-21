import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  lat:  { type: Number, required: true },
  lng:  { type: Number, required: true },
  phone: { type: String, default: '' },
  accepting: { type: Boolean, default: true },
  traumaLevel: { type: String, default: 'Level 1 Trauma' },
  specialties: [{ type: String, trim: true }],
  beds: {
    emergency: { type: Number, default: 10 },
    icu: { type: Number, default: 4 },
    total: { type: Number, default: 50 }
  },
  doctorsOnDuty: { type: Number, default: 8 },
  doctorsAvailable: { type: Number, default: 8 },
  bedsAvailable: { type: Number, default: 14 },
}, { timestamps: true });

export default mongoose.model('Hospital', hospitalSchema);

