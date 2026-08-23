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
import { rankHospitalsByCompositeScore } from './utils/hospitalScoring.js';
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
    Ambulance.countDocuments(),
    Ambulance.countDocuments({ type: 'public' }),
    Ambulance.countDocuments({ type: 'private' }),
    Ambulance.countDocuments({ status: 'available' }),
    Ambulance.countDocuments({ status: 'dispatched' }),
  ]);
  return { total, public: publicCount, private: privateCount, available, dispatched };
};

const validLocation = ({ lat, lng }) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

const publicAmbulance = (ambulance) => {
  const item = ambulance.toObject ? ambulance.toObject() : { ...ambulance };
  delete item.loginCode;
  delete item.loginId;
  return item;
};

function generateSimulatedRoutes(origin, destination) {
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((origin.lat * Math.PI) / 180) *
      Math.cos((destination.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const directDistMeters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const variations = [
    { factor: 1.15, speedKmh: 38, trafficDelay: 60, curve: 0 },
    { factor: 1.28, speedKmh: 34, trafficDelay: 180, curve: 0.003 },
    { factor: 1.42, speedKmh: 30, trafficDelay: 360, curve: -0.003 },
  ];

  return variations.map((v, idx) => {
    const dist = Math.round(directDistMeters * v.factor);
    const duration = Math.round((dist / ((v.speedKmh * 1000) / 3600)) + v.trafficDelay);
    const steps = 15;
    const geometry = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const arc = Math.sin(t * Math.PI) * v.curve;
      geometry.push({
        lat: origin.lat + (destination.lat - origin.lat) * t + arc,
        lng: origin.lng + (destination.lng - origin.lng) * t + (idx === 1 ? arc : -arc),
      });
    }
    return {
      distanceMeters: dist,
      durationSeconds: duration,
      trafficDelaySeconds: v.trafficDelay,
      geometry,
    };
  });
}

const routeCache = new Map();

const routesFromTomTom = async (origin, destination) => {
  const cacheKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}:${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  const apiKey = process.env.TOMTOM_API_KEY;
  if (apiKey) {
    try {
      const coords = `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}`;
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${coords}/json?key=${encodeURIComponent(apiKey)}&maxAlternatives=2&traffic=true&routeRepresentation=polyline&travelMode=car`;
      const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const parsed = data.routes.slice(0, 3).map((route) => ({
            distanceMeters: route.summary.lengthInMeters,
            durationSeconds: route.summary.travelTimeInSeconds,
            trafficDelaySeconds: route.summary.trafficDelayInSeconds || 0,
            geometry: route.legs.flatMap((leg) =>
              leg.points.map((point) => ({ lat: point.latitude, lng: point.longitude }))
            ),
          }));

          if (parsed.length < 3) {
            const fallback = generateSimulatedRoutes(origin, destination);
            while (parsed.length < 3) {
              parsed.push(fallback[parsed.length]);
            }
          }
          routeCache.set(cacheKey, parsed);
          setTimeout(() => routeCache.delete(cacheKey), 600000);
          return parsed;
        }
      }
    } catch (err) {
      console.warn('TomTom routing notice (using fast fallback):', err.message);
    }
  }
  const simulated = generateSimulatedRoutes(origin, destination);
  routeCache.set(cacheKey, simulated);
  return simulated;
};

// ─── Notification Bridge Helper ──────────────────────────────────────────────
async function dispatchHospitalNotification({ trip, hospital, ambulance, requestId, isReroute = false }) {
  try {
    const incomingData = {
      requestId: requestId || `${trip._id}_${hospital.hospitalId || hospital._id}_${Date.now()}`,
      tripId: trip._id,
      hospital: hospital,
      ambulanceName: ambulance?.name || '108 Ambulance',
      driverName: ambulance?.driverName || 'On-duty Driver',
      driverPhone: '080-108-0000',
      accident: trip.accident,
      status: trip.status,
      hospitalStatus: trip.hospitalStatus || 'pending',
      attemptCount: trip.attemptCount || 1,
      isReroute: !!isReroute,
      clinicalIntake: trip.clinicalIntake || null,
      etaMinutes: trip.leg2Route ? Math.ceil(trip.leg2Route.durationSeconds / 60) : 5,
      distanceKm: trip.leg2Route ? (trip.leg2Route.distanceMeters / 1000).toFixed(1) : '2.5',
      timestamp: new Date(),
    };

    // Broadcast globally on Port 5000 socket network
    io.emit('hospital:incoming-patient', incomingData);
    io.emit('emergency:incoming', incomingData);

    // Forward to Port 5001 (Hospital Management Dashboards) via HTTP bridge
    fetch('http://localhost:5001/api/bridge/incoming-patient', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incomingData),
    }).catch((err) => console.warn('[Bridge] Forward to Port 5001 warning:', err.message));
  } catch (err) {
    console.error('Error dispatching hospital notification:', err);
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ─── GET /api/hospitals with Composite Scoring & Ranking ─────────────────────
app.get('/api/hospitals', async (req, res, next) => {
  try {
    const { lat, lng, specialty, excludeIds, acceptingOnly } = req.query;
    const filter = {};
    if (acceptingOnly === 'true') {
      filter.accepting = true;
    }

    const hospitals = await Hospital.find(filter);

    if (lat && lng) {
      const origin = { lat: parseFloat(lat), lng: parseFloat(lng) };
      const excludeArray = excludeIds
        ? excludeIds.split(',').map((id) => id.trim()).filter(Boolean)
        : [];

      // Calculate composite score: Score_h = w1*Th + w2*Dh + w3*Ah + w4*Sh
      const rankedHospitals = rankHospitalsByCompositeScore(
        hospitals,
        origin,
        specialty || 'all',
        excludeArray
      );

      return res.json(rankedHospitals);
    }

    res.json(hospitals.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (error) {
    next(error);
  }
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
      bedsAvailable: (beds?.emergency || 10) + (beds?.icu || 4),
    });
    io.emit('hospital:added', hospital);
    res.status(201).json(hospital);
  } catch (error) {
    next(error);
  }
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
  } catch (error) {
    next(error);
  }
});

app.get('/api/ambulances', async (_req, res, next) => {
  try {
    res.json((await Ambulance.find().sort({ name: 1 })).map(publicAmbulance));
  } catch (error) {
    next(error);
  }
});

app.get('/api/ambulances/:id', async (req, res, next) => {
  try {
    const amb = await Ambulance.findById(req.params.id);
    if (!amb) return res.status(404).json({ message: 'Ambulance not found.' });
    res.json(publicAmbulance(amb));
  } catch (error) {
    next(error);
  }
});

app.get('/api/stats', async (_req, res, next) => {
  try {
    res.json(await getStats());
  } catch (error) {
    next(error);
  }
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
    io.emit('driver:incoming-call', result);
    io.emit('stats:updated', await getStats());
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/reset', async (_req, res, next) => {
  try {
    await Ambulance.updateMany({}, { status: 'available', $unset: { activeCall: 1 } });
    await Trip.deleteMany({ status: { $ne: 'completed' } });
    io.emit('demo:reset');
    io.emit('ambulances:reset', (await Ambulance.find().sort({ name: 1 })).map(publicAmbulance));
    io.emit('stats:updated', await getStats());
    res.json({ message: 'Demo reset. Every ambulance is available again.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/trips/:id', async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });
    res.json(trip);
  } catch (error) {
    next(error);
  }
});

app.post('/api/routes', async (req, res, next) => {
  try {
    const { origin, destination } = req.body;
    if (!validLocation(origin) || !validLocation(destination)) {
      return res.status(400).json({ message: 'Valid route origin and destination are required.' });
    }
    res.json({ routes: await routesFromTomTom(origin, destination) });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/trips/:id ───────────────────────────────────────────────────
app.patch('/api/trips/:id', async (req, res, next) => {
  try {
    const updates = {};
    const { status, leg, route, hospital } = req.body;

    if (status) updates.status = status;
    if (route && (leg === 1 || leg === 2)) {
      updates[`leg${leg}Route`] = route;
      updates.status = leg === 1 ? 'en_route_to_accident' : 'en_route_to_hospital';
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    let shouldNotifyHospital = false;
    let newRequestId = null;

    if (hospital) {
      updates.hospital = hospital;
      updates.status = 'hospital_selected';
      updates.hospitalStatus = 'pending';
      const attemptNum = (trip.attemptCount || 0) + 1;
      updates.attemptCount = attemptNum;
      newRequestId = `${trip._id}_${hospital.hospitalId || 'h'}_att${attemptNum}`;
      
      const newAttempt = {
        hospitalId: hospital.hospitalId,
        hospitalName: hospital.name,
        score: hospital.compositeScore || 0.5,
        outcome: 'pending',
        requestId: newRequestId,
        timestamp: new Date(),
      };
      updates.hospitalAttempts = [...(trip.hospitalAttempts || []), newAttempt];
      shouldNotifyHospital = true;
    }

    Object.assign(trip, updates);
    await trip.save();

    io.emit('trip:updated', trip);

    // Send hospital notification on hospital selection (only once per attempt, with unique requestId)
    if (shouldNotifyHospital && trip.hospital) {
      const amb = await Ambulance.findById(trip.ambulance);
      dispatchHospitalNotification({
        trip,
        hospital: trip.hospital,
        ambulance: amb,
        requestId: newRequestId,
      });
    }

    res.json(trip);

    // When trip completes, free the ambulance
    if (updates.status === 'completed') {
      const freedAmbulance = await Ambulance.findByIdAndUpdate(
        trip.ambulance,
        { status: 'available', $unset: { activeCall: 1 } },
        { new: true }
      );
      if (freedAmbulance) {
        io.emit('ambulance:updated', publicAmbulance(freedAmbulance));
        io.emit('dispatch:reset');
        io.emit('stats:updated', await getStats());
      }
    }
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/trips/:id/clinical-intake ─────────────────────────────────────
app.post('/api/trips/:id/clinical-intake', async (req, res, next) => {
  try {
    const { patientName, patientAge, chiefComplaint, vitals, treatments, etaMinutes } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    trip.clinicalIntake = {
      patientName: patientName || 'Emergency Patient',
      patientAge: Number(patientAge) || 35,
      chiefComplaint: chiefComplaint || 'Trauma / Emergency',
      vitals: vitals || { bloodPressure: '120/80', heartRate: 78, respiratoryRate: 16, spo2: 98 },
      treatments: treatments || 'Oxygen administered, IV line established',
      etaMinutes: Number(etaMinutes) || (trip.leg2Route ? Math.ceil(trip.leg2Route.durationSeconds / 60) : 5),
      submittedAt: new Date(),
    };

    await trip.save();
    io.emit('trip:updated', trip);
    io.emit('trip:clinical-intake-submitted', { tripId: trip._id, clinicalIntake: trip.clinicalIntake });

    res.json({ ok: true, trip });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/trips/:id/hospital-response & /api/hospital-response ────────
const handleHospitalResponseEndpoint = async (req, res, next) => {
  try {
    const { outcome, hospitalId, reason, tripId: bodyTripId } = req.body;
    const targetId = req.params.id || bodyTripId;

    let trip = null;
    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      trip = await Trip.findById(targetId);
    }
    if (!trip) {
      // Fallback 1: Find any active trip en route to hospital or with hospital selected
      trip = await Trip.findOne({
        status: { $in: ['hospital_selected', 'en_route_to_hospital', 'at_accident'] },
      }).sort({ updatedAt: -1 });
    }
    if (!trip) {
      // Fallback 2: Most recent trip
      trip = await Trip.findOne().sort({ createdAt: -1 });
    }

    if (!trip) return res.status(404).json({ message: 'No active trip found.' });

    trip.hospitalStatus = outcome;

    // Update the matching attempt in hospitalAttempts
    if (trip.hospitalAttempts && trip.hospitalAttempts.length > 0) {
      const lastIndex = trip.hospitalAttempts.length - 1;
      trip.hospitalAttempts[lastIndex].outcome = outcome;
    }

    await trip.save();

    io.emit('trip:updated', trip);
    io.emit('trip:hospital-response', {
      tripId: trip._id,
      outcome,
      hospitalId,
      hospitalName: trip.hospital?.name,
      reason: reason || (outcome === 'timeout' ? 'Hospital response timed out' : outcome === 'confirmed' ? 'Admission accepted' : 'Hospital declined admission'),
      attemptCount: trip.attemptCount,
    });

    if (outcome === 'declined' || outcome === 'timeout') {
      io.emit('trip:hospital-declined', {
        tripId: trip._id,
        declinedHospital: trip.hospital,
        attemptCount: trip.attemptCount,
        reason: reason || outcome,
      });
    }

    res.json({ ok: true, trip });
  } catch (error) {
    next(error);
  }
};

app.post('/api/trips/:id/hospital-response', handleHospitalResponseEndpoint);
app.post('/api/hospital-response', handleHospitalResponseEndpoint);

// ─── POST /api/trips/:id/reroute (Live Dynamic Rerouting) ────────────────────
app.post('/api/trips/:id/reroute', async (req, res, next) => {
  try {
    const { currentPosition, requiredSpecialty } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    if (!validLocation(currentPosition)) {
      return res.status(400).json({ message: 'Valid current interpolated ambulance coordinates are required.' });
    }

    const previousHospitalName = trip.hospital?.name || 'Hospital';
    const attemptedIds = (trip.hospitalAttempts || []).map((a) => String(a.hospitalId)).filter(Boolean);
    if (trip.hospital?.hospitalId && !attemptedIds.includes(String(trip.hospital.hospitalId))) {
      attemptedIds.push(String(trip.hospital.hospitalId));
    }

    // Fetch all active hospitals
    const allHospitals = await Hospital.find({ accepting: true });
    
    // Attempt count increment
    const attemptCount = (trip.attemptCount || 0) + 1;

    // Rank candidates excluding all previously attempted / declined hospitals
    const ranked = rankHospitalsByCompositeScore(
      allHospitals,
      currentPosition,
      requiredSpecialty || 'all',
      attemptedIds
    );

    // Safety-valve Cap: if attempts > 3 or candidates exhausted, auto-commit override
    const isOverride = attemptCount > 3 || ranked.length === 0;

    let nextHospital = null;
    let nextScore = 0.5;
    let rerouteReason = '';

    if (ranked.length > 0) {
      nextHospital = ranked[0];
      nextScore = nextHospital.compositeScore || 0.5;
      trip.hospitalStatus = isOverride ? 'overridden' : 'pending';
      rerouteReason = isOverride
        ? `Safety Cap Engaged: Auto-committed to ${nextHospital.name} (Confirmation bypassed)`
        : `${previousHospitalName} declined — Rerouted to ${nextHospital.name} (${nextHospital.recommendationReason || 'Optimal alternate choice'})`;
    } else {
      // Candidates exhausted: pick best overall hospital
      const rankedAll = rankHospitalsByCompositeScore(allHospitals, currentPosition, 'all', []);
      nextHospital = rankedAll[0] || allHospitals[0];
      nextScore = nextHospital.compositeScore || 0.1;
      trip.hospitalStatus = 'overridden';
      rerouteReason = `All candidate hospitals exhausted — Auto-committed to ${nextHospital.name} (Confirmation bypassed)`;
    }

    // Calculate Leg 2 route from currentPosition to new hospital
    const newDest = { lat: nextHospital.lat, lng: nextHospital.lng };
    const routes = await routesFromTomTom(currentPosition, newDest);
    const primaryRoute = routes[0] || generateSimulatedRoutes(currentPosition, newDest)[0];

    // Update trip document
    trip.hospital = {
      hospitalId: nextHospital._id.toString(),
      name: nextHospital.name,
      location: newDest,
    };
    trip.leg2Route = primaryRoute;
    trip.status = 'en_route_to_hospital';
    trip.attemptCount = attemptCount;

    const newRequestId = `${trip._id}_${nextHospital._id}_att${attemptCount}`;
    const newAttempt = {
      hospitalId: nextHospital._id.toString(),
      hospitalName: nextHospital.name,
      score: nextScore,
      outcome: isOverride ? 'overridden' : 'pending',
      requestId: newRequestId,
      timestamp: new Date(),
    };
    trip.hospitalAttempts = [...(trip.hospitalAttempts || []), newAttempt];

    // Update ETA on stored clinical intake
    if (trip.clinicalIntake) {
      trip.clinicalIntake.etaMinutes = Math.ceil(primaryRoute.durationSeconds / 60);
    }

    await trip.save();

    // Notify the newly assigned hospital
    const amb = await Ambulance.findById(trip.ambulance);
    dispatchHospitalNotification({
      trip,
      hospital: trip.hospital,
      ambulance: amb,
      requestId: newRequestId,
      isReroute: true,
    });

    io.emit('trip:updated', trip);
    io.emit('trip:rerouted', {
      tripId: trip._id,
      previousHospitalName,
      newHospital: trip.hospital,
      route: primaryRoute,
      hospitalStatus: trip.hospitalStatus,
      rerouteReason,
      attemptCount,
    });

    res.json({
      ok: true,
      trip,
      newHospital: trip.hospital,
      route: primaryRoute,
      rerouteReason,
    });
  } catch (error) {
    next(error);
  }
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
      if (trip && trip.status === 'dispatched') {
        trip.status = 'accepted';
        await trip.save();
        io.emit('trip:updated', trip);
      }
      io.emit('dispatch:accepted', { ...payload, ambulance: publicAmbulance(ambulance), trip });
    }
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || (error.code === 11000 ? 409 : 500)).json({
    message: error.code === 11000 ? 'Ambulance name already exists.' : error.message || 'Server error. Please try again.',
  });
});

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ambulance_demo')
  .then(async () => {
    await seedAmbulances(true);
    await seedHospitals();
    server.listen(port, () => console.log(`API ready at http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
