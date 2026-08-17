import Ambulance from './models/Ambulance.js';

const CITY = { lat: 12.9716, lng: 77.5946 };
const names = ['108 Alpha', '108 Bravo', '108 Charlie', '108 Delta', '108 Echo', '108 Foxtrot', '108 Golf', '108 Hotel', 'Care Rapid 1', 'Care Rapid 2', 'MediRide 3', 'LifeLine 4', 'Swift Aid 5', 'RescueNow 6', 'CityMed 7', 'QuickCare 8', 'Hope Transit 9', 'Pulse Ambulance 10'];

function seededRandom(index) {
  return ((index * 9301 + 49297) % 233280) / 233280;
}

export async function seedAmbulances() {
  if (await Ambulance.countDocuments()) return;
  const ambulances = names.map((name, index) => {
    const angle = seededRandom(index) * Math.PI * 2;
    const radius = 0.025 + seededRandom(index + 41) * 0.09;
    return {
      name,
      type: index < 11 ? 'public' : 'private',
      status: 'available',
      lat: CITY.lat + Math.cos(angle) * radius,
      lng: CITY.lng + Math.sin(angle) * radius,
      driverName: `Driver ${index + 1}`,
      vehicleNumber: `KA-01-EM-${String(index + 1).padStart(2, '0')}`
    };
  });
  await Ambulance.insertMany(ambulances);
  console.log(`Seeded ${ambulances.length} ambulances.`);
}
