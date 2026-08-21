import 'dotenv/config';
import http from 'http';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import Ambulance from './models/Ambulance.js';
import Trip from './models/Trip.js';
import Hospital from './models/Hospital.js';
import { findNearestAmbulance } from './utils/distance.js';
import { seedAmbulances } from './seed.js';
import { seedHospitals } from './seedHospitals.js';

const app = express();
const server = http.createServer(app);
const clientOrigins = ['http://localhost:5173', 'http://localhost:3000'];
const io = new Server(server, { cors: { origin: clientOrigins, methods: ['GET', 'POST', 'PATCH'] } });
const port = process.env.PORT || 5000;

app.use(cors({ origin: clientOrigins }));
app.use(express.json());

const getStats = async () => {
  const [total, publicCount, privateCount, available, dispatched] = await Promise.all([
    Ambulance.countDocuments(), Ambulance.countDocuments({ type: 'public' }), Ambulance.countDocuments({ type: 'private' }),
    Ambulance.countDocuments({ status: 'available' }), Ambulance.countDocuments({ status: 'dispatched' })
  ]);
  return { total, public: publicCount, private: privateCount, available, dispatched };
};
const validLocation = ({ lat, lng }) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
const publicAmbulance = (ambulance) => { const item = ambulance.toObject ? ambulance.toObject() : { ...ambulance }; delete item.loginCode; delete item.loginId; return item; };
function generateSimulatedRoutes(origin, destination) {
  // Haversine base distance
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((origin.lat * Math.PI) / 180) * Math.cos((destination.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const directDistMeters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const variations = [
    { factor: 1.15, speedKmh: 38, trafficDelay: 60,  curve: 0 },
    { factor: 1.28, speedKmh: 34, trafficDelay: 180, curve: 0.003 },
    { factor: 1.42, speedKmh: 30, trafficDelay: 360, curve: -0.003 }
  ];

  return variations.map((v, idx) => {
    const dist = Math.round(directDistMeters * v.factor);
    const duration = Math.round((dist / (v.speedKmh * 1000 / 3600)) + v.trafficDelay);
    const steps = 15;
    const geometry = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const arc = Math.sin(t * Math.PI) * v.curve;
      geometry.push({
        lat: origin.lat + (destination.lat - origin.lat) * t + arc,
        lng: origin.lng + (destination.lng - origin.lng) * t + (idx === 1 ? arc : -arc)
      });
    }
    return {
      distanceMeters: dist,
      durationSeconds: duration,
      trafficDelaySeconds: v.trafficDelay,
      geometry
    };
  });
}

const routesFromTomTom = async (origin, destination) => {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (apiKey) {
    try {
      const coords = `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}`;
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${coords}/json?key=${encodeURIComponent(apiKey)}&maxAlternatives=2&traffic=true&routeRepresentation=polyline&travelMode=car`;
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const parsed = data.routes.slice(0, 3).map((route) => ({
            distanceMeters: route.summary.lengthInMeters,
            durationSeconds: route.summary.travelTimeInSeconds,
            trafficDelaySeconds: route.summary.trafficDelayInSeconds || 0,
            geometry: route.legs.flatMap((leg) => leg.points.map((point) => ({ lat: point.latitude, lng: point.longitude })))
          }));

          // If TomTom only returned 1 or 2 routes, complement to 3
          if (parsed.length < 3) {
            const fallback = generateSimulatedRoutes(origin, destination);
            while (parsed.length < 3) {
              parsed.push(fallback[parsed.length]);
            }
          }
          return parsed;
        }
      }
    } catch (err) {
      console.warn('TomTom API request failed, falling back to simulated routes:', err.message);
    }
  }
  return generateSimulatedRoutes(origin, destination);
};

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/hospitals', async (req, res, next) => {
  try {
    const { lat, lng, specialty, acceptingOnly } = req.query;
    const filter = {};
    if (acceptingOnly === 'true') {
      filter.accepting = true;
    }
    if (specialty && specialty !== 'all') {
      filter.specialties = { $regex: new RegExp(specialty, 'i') };
    }
    const hospitals = await Hospital.find(filter);
    if (lat && lng) {
      const accLat = parseFloat(lat);
      const accLng = parseFloat(lng);
      const withDist = hospitals.map((h) => {
        const dLat = ((h.lat - accLat) * Math.PI) / 180;
        const dLng = ((h.lng - accLng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((accLat * Math.PI) / 180) * Math.cos((h.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
        const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return { ...h.toObject(), distanceKm: Number(distanceKm.toFixed(2)) };
      });
      withDist.sort((a, b) => a.distanceKm - b.distanceKm);
      return res.json(withDist);
    }
    res.json(hospitals.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (error) { next(error); }
});

app.post('/api/hospitals', async (req, res, next) => {
  try {
    const { name, lat, lng, phone, traumaLevel, specialties, beds, doctorsOnDuty } = req.body;
    if (!name || !validLocation({ lat, lng })) {
      return res.status(400).json({ message: 'Hospital name and valid map coordinates are required.' });
    }
    const hospital = await Hospital.create({
      name,
      lat,
      lng,
      phone: phone || '',
      accepting: true,
      traumaLevel: traumaLevel || 'Level 1 Trauma',
      specialties: Array.isArray(specialties) ? specialties : ['Trauma & Emergency', 'General Surgery', 'ICU Care'],
      beds: beds || { emergency: 10, icu: 4, total: 50 },
      doctorsOnDuty: doctorsOnDuty || 8,
      doctorsAvailable: doctorsOnDuty || 8,
      bedsAvailable: (beds?.emergency || 10) + (beds?.icu || 4)
    });
    io.emit('hospital:added', hospital);
    res.status(201).json(hospital);
  } catch (error) { next(error); }
});

app.patch('/api/hospitals/:id', async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found.' });
    const { accepting, beds, doctorsOnDuty, specialties, traumaLevel } = req.body;
    if (typeof accepting === 'boolean') hospital.accepting = accepting;
    if (beds) {
      hospital.beds = { ...hospital.beds.toObject(), ...beds };
      hospital.bedsAvailable = (hospital.beds.emergency || 0) + (hospital.beds.icu || 0);
    }
    if (typeof doctorsOnDuty === 'number') {
      hospital.doctorsOnDuty = doctorsOnDuty;
      hospital.doctorsAvailable = doctorsOnDuty;
    }
    if (Array.isArray(specialties)) hospital.specialties = specialties;
    if (traumaLevel) hospital.traumaLevel = traumaLevel;
    await hospital.save();
    io.emit('hospital:updated', hospital);
    res.json(hospital);
  } catch (error) { next(error); }
});
app.get('/api/ambulances', async (_req, res, next) => { try { res.json((await Ambulance.find().sort({ name: 1 })).map(publicAmbulance)); } catch (error) { next(error); } });
app.get('/api/stats', async (_req, res, next) => { try { res.json(await getStats()); } catch (error) { next(error); } });
app.post('/api/ambulances', async (req, res, next) => {
  try {
    const { name, type, driverName, vehicleNumber, lat, lng } = req.body;
    if (!name || !driverName || !vehicleNumber || !['public', 'private'].includes(type) || !validLocation({ lat, lng })) return res.status(400).json({ message: 'Please provide all fields and a valid map location.' });
    const loginId = `AMB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const loginCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const ambulance = await Ambulance.create({ name, type, driverName, vehicleNumber, lat, lng, loginId, loginCode });
    io.emit('ambulance:added', publicAmbulance(ambulance));
    io.emit('stats:updated', await getStats());
    res.status(201).json({ ambulance: publicAmbulance(ambulance), credentials: { loginId, loginCode } });
  } catch (error) { next(error); }
});
app.post('/api/call', async (req, res, next) => {
  try {
    const accident = req.body;
    if (!validLocation(accident)) return res.status(400).json({ message: 'A valid accident location is required.' });
    const available = await Ambulance.find({ status: 'available' });
    const nearest = findNearestAmbulance(available, accident);
    if (!nearest) {
      const result = { available: false, accident, message: 'No ambulances are currently available. Please try again shortly.' };
      io.emit('dispatch:no-availability', result);
      return res.status(409).json(result);
    }
    const etaMinutes = Math.max(1, Math.ceil((nearest.distanceKm / 35) * 60));
    const trip = await Trip.create({ accident, ambulance: nearest.ambulance._id });
    const activeCall = { accident, distanceKm: Number(nearest.distanceKm.toFixed(2)), etaMinutes, accepted: false, dispatchedAt: new Date(), tripId: trip._id };
    const ambulance = await Ambulance.findByIdAndUpdate(nearest.ambulance._id, { status: 'dispatched', activeCall }, { new: true });
    const result = { available: true, accident, ambulance: publicAmbulance(ambulance), tripId: trip._id, distanceKm: activeCall.distanceKm, etaMinutes };
    io.emit('dispatch:created', result);
    io.to(`ambulance:${ambulance._id}`).emit('driver:incoming-call', result);
    io.emit('stats:updated', await getStats());
    res.json(result);
  } catch (error) { next(error); }
});
app.post('/api/reset', async (_req, res, next) => {
  try {
    await Ambulance.updateMany({}, { status: 'available', $unset: { activeCall: 1 } });
    await Trip.deleteMany({ status: { $ne: 'completed' } });
    io.emit('demo:reset');
    io.emit('ambulances:reset', (await Ambulance.find().sort({ name: 1 })).map(publicAmbulance));
    io.emit('stats:updated', await getStats());
    res.json({ message: 'Demo reset. Every ambulance is available again.' });
  } catch (error) { next(error); }
});

app.post('/api/driver/login', async (req, res, next) => {
  try {
    const ambulance = await Ambulance.findOne({ loginId: req.body.loginId, loginCode: req.body.loginCode }).select('+loginCode');
    if (!ambulance) return res.status(401).json({ message: 'Invalid ambulance ID or login code.' });
    res.json(publicAmbulance(ambulance));
  } catch (error) { next(error); }
});
app.get('/api/trips/:id', async (req, res, next) => { try { const trip = await Trip.findById(req.params.id); if (!trip) return res.status(404).json({ message: 'Trip not found.' }); res.json(trip); } catch (error) { next(error); } });
app.post('/api/routes', async (req, res, next) => { try { const { origin, destination } = req.body; if (!validLocation(origin) || !validLocation(destination)) return res.status(400).json({ message: 'Valid route origin and destination are required.' }); res.json({ routes: await routesFromTomTom(origin, destination) }); } catch (error) { next(error); } });
app.patch('/api/trips/:id', async (req, res, next) => {
  try {
    const updates = {}; const { status, leg, route, hospital } = req.body;
    if (status) updates.status = status;
    if (route && (leg === 1 || leg === 2)) { updates[`leg${leg}Route`] = route; updates.status = leg === 1 ? 'en_route_to_accident' : 'en_route_to_hospital'; }
    if (hospital) { updates.hospital = hospital; updates.status = 'hospital_selected'; }
    const trip = await Trip.findById(req.params.id); if (!trip) return res.status(404).json({ message: 'Trip not found.' });
    Object.assign(trip, updates); await trip.save(); io.emit('trip:updated', trip); res.json(trip);
  } catch (error) { next(error); }
});

io.on('connection', (socket) => {
  socket.on('driver:join', (ambulanceId) => {
    if (socket.data.driverRoom) socket.leave(socket.data.driverRoom);
    if (mongoose.isValidObjectId(ambulanceId)) {
      socket.data.driverRoom = `ambulance:${ambulanceId}`;
      socket.join(socket.data.driverRoom);
    }
  });
  socket.on('driver:accepted', async (payload) => {
    if (!mongoose.isValidObjectId(payload.ambulanceId)) return;
    const ambulance = await Ambulance.findOneAndUpdate(
      { _id: payload.ambulanceId, 'activeCall.accepted': false },
      { $set: { 'activeCall.accepted': true } },
      { new: true }
    );
    if (ambulance) {
      const trip = ambulance.activeCall?.tripId ? await Trip.findById(ambulance.activeCall.tripId) : null;
      if (trip && trip.status === 'dispatched') { trip.status = 'accepted'; await trip.save(); io.emit('trip:updated', trip); }
      io.emit('dispatch:accepted', { ...payload, ambulance: publicAmbulance(ambulance), trip });
    }
  });
});
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.code === 11000 ? 'Ambulance name already exists.' : error.message || 'Server error. Please try again.' });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ambulance_demo')
  .then(async () => {
    await seedAmbulances();
    await seedHospitals();
    server.listen(port, () => console.log(`API ready at http://localhost:${port}`));
  })
  .catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
