const express = require('express');
const router = express.Router();
const Hospital = require('../models/hospital.model');
const Emergency = require('../models/emergency.model');

/**
 * POST /api/bridge/incoming-patient
 * Called by Port 5000 dispatch server when an ambulance selects a destination hospital.
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

    if (hospitalName) {
      // Find hospital by name or hospitalName
      targetHospital = await Hospital.findOne({
        $or: [
          { name: new RegExp('^' + hospitalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
          { hospitalName: new RegExp('^' + hospitalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
        ]
      });
    }

    // If still not found, get any hospital to attach to (for demo purposes)
    if (!targetHospital) {
      targetHospital = await Hospital.findOne();
    }

    let createdEmergency = null;
    try {
      createdEmergency = await Emergency.create({
        hospital: targetHospital?._id || undefined,
        emergencyType: '108 Ambulance Arrival',
        severity: 'High',
        status: 'Requested',
        notes: `Ambulance ${data.ambulanceName || '108'} en route with emergency patient. ETA: ${data.etaMinutes || 5} min (${data.distanceKm || '2.5'} km).`,
        driverName: data.driverName || 'On-duty Driver',
        driverPhone: data.driverPhone || '080-108-0000',
        vehicleNumber: data.ambulanceName || '108 Unit',
        location: {
          type: 'Point',
          coordinates: [data.accident?.lng || 77.5946, data.accident?.lat || 12.9716]
        },
        patient: {
          name: 'Emergency Patient',
          condition: 'Trauma / Emergency',
          gender: 'Unknown'
        }
      });
      console.log(`[Bridge] Successfully saved Emergency document: ${createdEmergency._id} for hospital ${targetHospital?.name || 'General'}`);
    } catch (err) {
      console.warn('[Bridge] Error creating Emergency document:', err.message);
    }


    const payload = {
      ...data,
      emergencyId: createdEmergency?._id,
      emergency: createdEmergency || data,
      hospitalId: targetHospital?._id
    };

    // Emit to connected hospital clients
    if (global.io) {
      global.io.emit('hospital:incoming-patient', payload);
      global.io.emit('hospital:emergency-notification', {
        type: 'NEW_EMERGENCY',
        emergency: createdEmergency || payload,
        hospitalId: targetHospital?._id
      });
      global.io.emit('hospital:ambulance-request', payload);
      global.io.to('hospitals').emit('new_emergency', {
        ...payload,
        type: 'incoming_ambulance',
        message: `Ambulance ${data.ambulanceName} is en route — ETA ${data.etaMinutes} minutes`
      });
      if (targetHospital) {
        global.io.to(`user:${targetHospital._id}`).emit('hospital:incoming-patient', payload);
        global.io.to(`user:${targetHospital._id}`).emit('hospital:emergency-notification', {
          type: 'NEW_EMERGENCY',
          emergency: createdEmergency || payload,
          hospitalId: targetHospital._id
        });
      }
      console.log(`[Bridge] Forwarded incoming patient alert to hospital: ${hospitalName} (ID: ${targetHospital?._id})`);
    }

    return res.json({ ok: true, emergencyId: createdEmergency?._id });
  } catch (err) {
    console.error('[Bridge] Error processing incoming patient:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
