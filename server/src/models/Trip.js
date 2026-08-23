import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({ lat: Number, lng: Number }, { _id: false });
const routeSchema = new mongoose.Schema({
  distanceMeters: Number,
  durationSeconds: Number,
  trafficDelaySeconds: Number,
  geometry: [pointSchema],
}, { _id: false });

const hospitalSchema = new mongoose.Schema({
  hospitalId: String,
  name: String,
  location: pointSchema,
}, { _id: false });

const hospitalAttemptSchema = new mongoose.Schema({
  hospitalId: String,
  hospitalName: String,
  score: Number,
  outcome: {
    type: String,
    enum: ['pending', 'confirmed', 'declined', 'timeout', 'overridden'],
    default: 'pending',
  },
  requestId: String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const vitalsSchema = new mongoose.Schema({
  bloodPressure: { type: String, default: '120/80' },
  heartRate: { type: Number, default: 78 },
  respiratoryRate: { type: Number, default: 16 },
  spo2: { type: Number, default: 98 },
}, { _id: false });

const clinicalIntakeSchema = new mongoose.Schema({
  patientName: { type: String, default: 'Emergency Patient' },
  patientAge: { type: Number, default: 35 },
  chiefComplaint: { type: String, default: 'Trauma / Road Accident' },
  vitals: { type: vitalsSchema, default: () => ({}) },
  treatments: { type: String, default: 'Oxygen administered, IV line established, cervical collar placed' },
  etaMinutes: Number,
  submittedAt: { type: Date, default: Date.now },
}, { _id: false });

const tripSchema = new mongoose.Schema({
  accident: { type: pointSchema, required: true },
  ambulance: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', required: true },
  status: {
    type: String,
    enum: ['dispatched', 'accepted', 'en_route_to_accident', 'at_accident', 'hospital_selected', 'en_route_to_hospital', 'completed'],
    default: 'dispatched',
  },
  hospitalStatus: {
    type: String,
    enum: ['none', 'pending', 'confirmed', 'declined', 'timeout', 'overridden'],
    default: 'none',
  },
  hospitalAttempts: [hospitalAttemptSchema],
  attemptCount: { type: Number, default: 0 },
  clinicalIntake: clinicalIntakeSchema,
  leg1Route: routeSchema,
  leg2Route: routeSchema,
  hospital: hospitalSchema,
  statusHistory: [{ status: String, timestamp: { type: Date, default: Date.now } }],
}, { timestamps: true, versionKey: false });

tripSchema.pre('save', function trackStatus(next) {
  if (this.isNew || this.isModified('status')) {
    this.statusHistory.push({ status: this.status });
  }
  next();
});

export default mongoose.model('Trip', tripSchema);
