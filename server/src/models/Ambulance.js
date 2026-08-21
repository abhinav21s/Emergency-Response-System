import mongoose from 'mongoose';

const ambulanceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  type: { type: String, enum: ['public', 'private'], required: true },
  status: { type: String, enum: ['available', 'dispatched'], default: 'available' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  driverName: { type: String, required: true, trim: true },
  vehicleNumber: { type: String, required: true, trim: true },
  loginId: { type: String, unique: true, sparse: true },
  loginCode: { type: String, select: false },
  activeCall: {
    accident: { lat: Number, lng: Number },
    distanceKm: Number,
    etaMinutes: Number,
    accepted: { type: Boolean, default: false },
    dispatchedAt: Date,
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' }
  }
}, { timestamps: true });

export default mongoose.model('Ambulance', ambulanceSchema);
