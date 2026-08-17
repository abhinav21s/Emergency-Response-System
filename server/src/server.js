import 'dotenv/config';
import http from 'http';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import Ambulance from './models/Ambulance.js';
import { findNearestAmbulance } from './utils/distance.js';
import { seedAmbulances } from './seed.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] } });
const port = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const getStats = async () => {
  const [total, publicCount, privateCount, available, dispatched] = await Promise.all([
    Ambulance.countDocuments(), Ambulance.countDocuments({ type: 'public' }), Ambulance.countDocuments({ type: 'private' }),
    Ambulance.countDocuments({ status: 'available' }), Ambulance.countDocuments({ status: 'dispatched' })
  ]);
  return { total, public: publicCount, private: privateCount, available, dispatched };
};
const validLocation = ({ lat, lng }) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/ambulances', async (_req, res, next) => { try { res.json(await Ambulance.find().sort({ name: 1 })); } catch (error) { next(error); } });
app.get('/api/stats', async (_req, res, next) => { try { res.json(await getStats()); } catch (error) { next(error); } });
app.post('/api/ambulances', async (req, res, next) => {
  try {
    const { name, type, driverName, vehicleNumber, lat, lng } = req.body;
    if (!name || !driverName || !vehicleNumber || !['public', 'private'].includes(type) || !validLocation({ lat, lng })) return res.status(400).json({ message: 'Please provide all fields and a valid map location.' });
    const ambulance = await Ambulance.create({ name, type, driverName, vehicleNumber, lat, lng });
    io.emit('ambulance:added', ambulance);
    io.emit('stats:updated', await getStats());
    res.status(201).json(ambulance);
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
    const activeCall = { accident, distanceKm: Number(nearest.distanceKm.toFixed(2)), etaMinutes, accepted: false, dispatchedAt: new Date() };
    const ambulance = await Ambulance.findByIdAndUpdate(nearest.ambulance._id, { status: 'dispatched', activeCall }, { new: true });
    const result = { available: true, accident, ambulance, distanceKm: activeCall.distanceKm, etaMinutes };
    io.emit('dispatch:created', result);
    io.to(`ambulance:${ambulance._id}`).emit('driver:incoming-call', result);
    io.emit('stats:updated', await getStats());
    res.json(result);
  } catch (error) { next(error); }
});
app.post('/api/reset', async (_req, res, next) => {
  try {
    await Ambulance.updateMany({}, { status: 'available', $unset: { activeCall: 1 } });
    io.emit('demo:reset');
    io.emit('ambulances:reset', await Ambulance.find().sort({ name: 1 }));
    io.emit('stats:updated', await getStats());
    res.json({ message: 'Demo reset. Every ambulance is available again.' });
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
    if (ambulance) io.emit('dispatch:accepted', { ...payload, ambulance });
  });
});
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.code === 11000 ? 409 : 500).json({ message: error.code === 11000 ? 'Ambulance name already exists.' : 'Server error. Please try again.' });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ambulance_demo')
  .then(async () => { await seedAmbulances(); server.listen(port, () => console.log(`API ready at http://localhost:${port}`)); })
  .catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
