const express = require('express');
const router = express.Router();
const Hospital = require('../models/hospital.model');
const Emergency = require('../models/emergency.model');

// Cache to prevent duplicate emergency processing
const processedRequests = new Set();

/**
 * Helper to find hospital by flexible name matching
 */
async function findHospitalByFlexibleName(rawName) {
  if (!rawName) return null;
  const cleanName = rawName.trim();

  // 1. Exact regex match
  let found = await Hospital.findOne({
    $or: [
      { name: new RegExp('^' + cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
      { hospitalName: new RegExp('^' + cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
    ],
  });
  if (found) return found;

  // 2. Keyword matching (Fortis, Martha, Manipal, Apollo, Victoria, NIMHANS, Bowring, etc.)
  const keywords = ['Fortis', 'Martha', 'Manipal', 'Apollo', 'Victoria', 'NIMHANS', 'Bowring', 'Jayadeva', 'Aster', 'Sakra', 'Narayana', 'Sparsh', 'Santosh'];
  for (const kw of keywords) {
    if (new RegExp(kw, 'i').test(cleanName)) {
      found = await Hospital.findOne({
        $or: [
          { name: new RegExp(kw, 'i') },
          { hospitalName: new RegExp(kw, 'i') },
        ],
      });
      if (found) return found;
    }
  }

  return null;
}

/**
 * POST /api/bridge/incoming-patient
 * Called by Port 5000 dispatch server when an ambulance selects a destination hospital or reroutes.
 * Persists an Emergency document in MongoDB on Port 5001 and emits events to connected hospital dashboards.
 */
router.post('/incoming-patient', async (req, res) => {
  try {
    const data = req.body;

    if (!data || !data.hospital) {
      return res.status(400).json({ message: 'Invalid payload: hospital field required.' });
    }

    const hospitalName = data.hospital.name || '';
    let targetHospital = null;
    if (data.hospital.id && mongoose.Types.ObjectId.isValid(data.hospital.id)) {
      targetHospital = await Hospital.findById(data.hospital.id);
    }
    if (!targetHospital && hospitalName) {
      targetHospital = await findHospitalByFlexibleName(hospitalName);
    }

    const requestId = data.requestId || `${data.tripId}_${targetHospital?._id || 'h'}_${data.attemptCount || 1}`;

    // Deduplicate by requestId to eliminate duplicate popups
    if (processedRequests.has(requestId)) {
      return res.json({ ok: true, duplicate: true, requestId });
    }
    processedRequests.add(requestId);
    setTimeout(() => processedRequests.delete(requestId), 300000); // 5 min expiry

    const intake = data.clinicalIntake || {};
    const vitalsStr = intake.vitals
      ? `BP: ${intake.vitals.bloodPressure || '120/80'}, HR: ${intake.vitals.heartRate || 78} bpm, SpO2: ${intake.vitals.spo2 || 98}%`
      : 'Vitals stable';

    let createdEmergency = null;
    try {
      createdEmergency = await Emergency.create({
        tripId: data.tripId || '',
        hospital: targetHospital?._id || undefined,
        emergencyType: intake.chiefComplaint || '108 Emergency Inbound',
        severity: 'High',
        status: 'Requested',
        notes: `Ambulance ${data.ambulanceName || '108'} en route to ${hospitalName}. ETA: ${data.etaMinutes || 5} min (${data.distanceKm || '2.5'} km). ${vitalsStr}. ${intake.treatments ? 'Treatments: ' + intake.treatments : ''}`,
        driverName: data.driverName || 'On-duty Driver',
        driverPhone: data.driverPhone || '080-108-0000',
        vehicleNumber: data.ambulanceName || '108 Unit',
        location: {
          type: 'Point',
          coordinates: [data.accident?.lng || 77.5946, data.accident?.lat || 12.9716],
        },
        patient: {
          name: intake.patientName || 'Emergency Patient',
          condition: intake.chiefComplaint || 'Trauma / Road Accident',
          gender: 'Unknown',
          age: intake.patientAge || 35,
        },
      });
    } catch (err) {
      console.warn('[Bridge] Error creating Emergency document:', err.message);
    }

    const payload = {
      ...data,
      tripId: data.tripId,
      requestId,
      emergencyId: createdEmergency?._id,
      emergency: createdEmergency || data,
      hospitalId: targetHospital?._id,
      targetHospitalName: targetHospital?.hospitalName || hospitalName,
      clinicalIntake: intake,
    };

    // Consolidated emit with target hospital ID
    if (global.io) {
      global.io.emit('hospital:incoming-patient', payload);
      global.io.emit('hospital:emergency-notification', {
        type: 'NEW_EMERGENCY',
        requestId,
        tripId: data.tripId,
        emergency: createdEmergency || payload,
        hospitalId: targetHospital?._id,
        targetHospitalName: targetHospital?.hospitalName || hospitalName,
        clinicalIntake: intake,
      });
    }

    return res.json({ ok: true, emergencyId: createdEmergency?._id, requestId, tripId: data.tripId });
  } catch (err) {
    console.error('[Bridge] Error processing incoming patient:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/bridge/hospital-response
 * Called by hospital client (Port 3000) when Accept or Decline is clicked.
 * Syncs back to Port 5000 dispatch server so ambulance and driver view can update/reroute immediately.
 */
router.post('/hospital-response', async (req, res) => {
  try {
    const { tripId, outcome, hospitalId, reason } = req.body;
    if (!tripId || !outcome) {
      return res.status(400).json({ message: 'tripId and outcome are required.' });
    }

    // Resolve true tripId if tripId was an Emergency _id
    let targetTripId = tripId;
    try {
      if (mongoose.Types.ObjectId.isValid(tripId)) {
        const emergency = await Emergency.findById(tripId);
        if (emergency && emergency.tripId) {
          targetTripId = emergency.tripId;
        }
      }
    } catch (_) {}

    const resolvedStatus = outcome === 'confirmed' ? 'Accepted' : 'Cancelled';

    // Update local emergency record status ONLY for this specific hospital and trip
    try {
      if (mongoose.Types.ObjectId.isValid(tripId)) {
        await Emergency.findByIdAndUpdate(tripId, { status: resolvedStatus, updatedAt: Date.now() });
      }

      if (targetTripId) {
        const query = { tripId: targetTripId };
        if (hospitalId && mongoose.Types.ObjectId.isValid(hospitalId)) {
          query.hospital = hospitalId;
        }
        await Emergency.updateMany(
          query,
          { status: resolvedStatus, updatedAt: Date.now() }
        );
      }
    } catch (updateErr) {
      console.warn('[Bridge] Emergency update error:', updateErr.message);
    }

    // Emit local status update on Port 5001 so only the target hospital updates
    if (global.io) {
      global.io.emit('hospital:emergency-status-updated', {
        emergencyId: tripId,
        tripId: targetTripId,
        hospitalId: hospitalId,
        status: resolvedStatus,
      });
    }

    // Forward to Port 5000 server
    try {
      await fetch(`http://localhost:5000/api/trips/${targetTripId}/hospital-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, hospitalId, reason, tripId: targetTripId }),
      });
    } catch (bridgeErr) {
      console.warn('[Bridge] Could not callback to Port 5000 trip response:', bridgeErr.message);
    }

    return res.json({ ok: true, tripId: targetTripId, outcome });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
