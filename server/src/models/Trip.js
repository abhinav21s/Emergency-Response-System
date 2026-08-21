import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({ lat: Number, lng: Number }, { _id: false });
const routeSchema = new mongoose.Schema({ distanceMeters: Number, durationSeconds: Number, trafficDelaySeconds: Number, geometry: [pointSchema] }, { _id: false });
const hospitalSchema = new mongoose.Schema({ hospitalId: String, name: String, location: pointSchema }, { _id: false });

const tripSchema = new mongoose.Schema({
  accident: { type: pointSchema, required: true },
  ambulance: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', required: true },
  status: { type: String, enum: ['dispatched', 'accepted', 'en_route_to_accident', 'at_accident', 'hospital_selected', 'en_route_to_hospital', 'completed'], default: 'dispatched' },
  leg1Route: routeSchema,
  leg2Route: routeSchema,
  hospital: hospitalSchema,
  statusHistory: [{ status: String, timestamp: { type: Date, default: Date.now } }]
}, { timestamps: true });

tripSchema.pre('save', function trackStatus(next) {
  if (this.isNew || this.isModified('status')) this.statusHistory.push({ status: this.status });
  next();
});

export default mongoose.model('Trip', tripSchema);
