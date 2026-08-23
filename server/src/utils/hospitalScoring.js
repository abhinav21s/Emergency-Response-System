// ─── Dynamic Hospital Composite Scoring Engine ──────────────────────────────
// Formula: Score_h = w1 * T_h + w2 * D_h + w3 * A_h + w4 * S_h
//
// Where:
//   T_h = Normalized Travel Time Factor (0.0 to 1.0, lower = faster)
//   D_h = Normalized Distance Factor (0.0 to 1.0, lower = closer)
//   A_h = Normalized Resource Availability Penalty (0.0 to 1.0, lower = more beds available)
//   S_h = Normalized Specialty Suitability Penalty (0.0 to 1.0, lower = better match)
//   w1–w4 = Configurable weights (sum = 1.0)

export const DEFAULT_WEIGHTS = {
  w1_travelTime: 0.40,
  w2_distance: 0.25,
  w3_availability: 0.20,
  w4_suitability: 0.15,
};

/**
 * Calculates straight-line distance in km between two coordinate points
 */
export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Scores and ranks candidate hospitals based on the 4-factor composite formula.
 *
 * @param {Array} hospitals - List of hospital documents from DB
 * @param {Object} origin - { lat, lng } current ambulance/accident position
 * @param {String} requiredSpecialty - patient specialty required (or 'all'/'trauma')
 * @param {Array} excludeHospitalIds - list of hospital IDs already tried / declined
 * @param {Object} customWeights - optional overrides for w1–w4
 * @returns {Array} ranked list of hospitals with composite score and explainable breakdown
 */
export function rankHospitalsByCompositeScore(
  hospitals,
  origin,
  requiredSpecialty = 'all',
  excludeHospitalIds = [],
  customWeights = DEFAULT_WEIGHTS
) {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  // Filter out excluded / already attempted hospitals
  const candidates = hospitals.filter(
    (h) => !excludeHospitalIds.includes(String(h._id)) && h.accepting !== false
  );

  if (candidates.length === 0) return [];

  // Compute raw metrics for each candidate
  const evaluated = candidates.map((h) => {
    const distKm = haversineDistanceKm(origin.lat, origin.lng, h.lat, h.lng);
    // Estimated travel time in minutes based on urban average 35 km/h + baseline delay
    const estTimeMin = Math.max(2, Math.round((distKm / 35) * 60 + 2));

    const totalBeds = h.beds?.total || 50;
    const emergencyBeds = h.beds?.emergency ?? (h.bedsAvailable || 0);
    const icuBeds = h.beds?.icu ?? 0;
    const totalAvailBeds = emergencyBeds + icuBeds;

    // Check specialty match
    const specialties = (h.specialties || []).map((s) => s.toLowerCase());
    const req = (requiredSpecialty || 'all').toLowerCase();
    let isSpecialtyMatch = true;
    if (req !== 'all' && req !== '') {
      if (req === 'icu') {
        isSpecialtyMatch = icuBeds > 0;
      } else {
        isSpecialtyMatch = specialties.some((s) => s.includes(req));
      }
    }

    return {
      hospital: h,
      rawDistanceKm: distKm,
      rawTravelTimeMin: estTimeMin,
      rawTotalAvailBeds: totalAvailBeds,
      rawTotalBeds: totalBeds,
      rawEmergencyBeds: emergencyBeds,
      rawIcuBeds: icuBeds,
      isSpecialtyMatch,
    };
  });

  // Calculate dynamic bounds for min-max normalization
  const maxDistance = Math.max(...evaluated.map((e) => e.rawDistanceKm), 10);
  const minDistance = Math.min(...evaluated.map((e) => e.rawDistanceKm), 0.5);
  const maxTime = Math.max(...evaluated.map((e) => e.rawTravelTimeMin), 25);
  const minTime = Math.min(...evaluated.map((e) => e.rawTravelTimeMin), 2);

  // Normalize and apply formula: Score_h = w1*Th + w2*Dh + w3*Ah + w4*Sh
  const scored = evaluated.map((item) => {
    // Th: 0 = minimum time, 1 = max time (lower is better)
    const Th = maxTime > minTime
      ? (item.rawTravelTimeMin - minTime) / (maxTime - minTime)
      : 0.1;

    // Dh: 0 = closest, 1 = farthest (lower is better)
    const Dh = maxDistance > minDistance
      ? (item.rawDistanceKm - minDistance) / (maxDistance - minDistance)
      : 0.1;

    // Ah: Bed availability penalty (0 = full capacity available, 1 = zero beds available)
    const bedOccupancy = Math.max(0, 1 - item.rawTotalAvailBeds / Math.max(item.rawTotalBeds, 10));
    const Ah = Math.min(1, Math.max(0, bedOccupancy));

    // Sh: Specialty suitability penalty (0 = matched, 0.5 = all/general, 1.0 = mismatch)
    let Sh = 0.0;
    if (requiredSpecialty && requiredSpecialty !== 'all') {
      Sh = item.isSpecialtyMatch ? 0.0 : 1.0;
    } else {
      Sh = 0.2; // neutral baseline
    }

    const compositeScore = Number(
      (
        weights.w1_travelTime * Th +
        weights.w2_distance * Dh +
        weights.w3_availability * Ah +
        weights.w4_suitability * Sh
      ).toFixed(4)
    );

    // Explainable rationale tag
    let recommendationReason = 'Optimal proximity & capacity';
    if (item.isSpecialtyMatch && reqMatchesSpecialty(requiredSpecialty)) {
      recommendationReason = `Specialist Match (${requiredSpecialty}) • ${item.rawTravelTimeMin} min ETA`;
    } else if (item.rawEmergencyBeds > 5) {
      recommendationReason = `High Bed Capacity (${item.rawEmergencyBeds} emergency beds) • ${item.rawDistanceKm.toFixed(1)} km`;
    } else {
      recommendationReason = `Shortest travel time (${item.rawTravelTimeMin} min)`;
    }

    const hospitalObj = item.hospital.toObject ? item.hospital.toObject() : item.hospital;

    return {
      ...hospitalObj,
      distanceKm: Number(item.rawDistanceKm.toFixed(2)),
      etaMinutes: item.rawTravelTimeMin,
      compositeScore,
      recommendationReason,
      factors: {
        travelTimeFactor: Number(Th.toFixed(2)),
        distanceFactor: Number(Dh.toFixed(2)),
        availabilityFactor: Number(Ah.toFixed(2)),
        suitabilityFactor: Number(Sh.toFixed(2)),
      },
    };
  });

  // Sort ascending: lowest composite score = best recommendation
  scored.sort((a, b) => a.compositeScore - b.compositeScore);

  return scored;
}

function reqMatchesSpecialty(specialty) {
  return specialty && specialty !== 'all' && specialty !== '';
}
