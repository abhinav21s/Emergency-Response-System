import Ambulance from './models/Ambulance.js';

const SCATTERED_LOCATIONS = [
  { area: 'Majestic / City Centre',    lat: 12.9767, lng: 77.5713 },
  { area: 'Koramangala 5th Block',     lat: 12.9352, lng: 77.6245 },
  { area: 'Indiranagar 100ft Road',    lat: 12.9719, lng: 77.6412 },
  { area: 'Jayanagar 4th Block',       lat: 12.9308, lng: 77.5838 },
  { area: 'Malleshwaram 8th Cross',    lat: 13.0031, lng: 77.5643 },
  { area: 'Hebbal Flyover Junction',   lat: 13.0358, lng: 77.5970 },
  { area: 'Whitefield ITPL',           lat: 12.9860, lng: 77.7380 },
  { area: 'Electronic City Phase 1',   lat: 12.8452, lng: 77.6602 },
  { area: 'HSR Layout Sector 2',       lat: 12.9121, lng: 77.6446 },
  { area: 'Rajajinagar 1st Block',     lat: 12.9915, lng: 77.5526 },
  { area: 'Banashankari Stage 2',      lat: 12.9255, lng: 77.5468 },
  { area: 'Marathahalli Bridge',       lat: 12.9591, lng: 77.6974 },
  { area: 'BTM Layout 2nd Stage',      lat: 12.9166, lng: 77.6101 },
  { area: 'Domlur Intermediate Ring',  lat: 12.9609, lng: 77.6387 },
  { area: 'Yeshwanthpur Metro Station',lat: 13.0285, lng: 77.5408 },
  { area: 'Yelahanka Satellite Town',  lat: 13.1007, lng: 77.5963 },
  { area: 'Vijayanagar Club Road',     lat: 12.9719, lng: 77.5362 },
  { area: 'KR Puram Outer Ring Road',  lat: 13.0075, lng: 77.6959 }
];

const names = [
  '108 Alpha', '108 Bravo', '108 Charlie', '108 Delta',
  '108 Echo', '108 Foxtrot', '108 Golf', '108 Hotel',
  '108 India', '108 Juliet', '108 Kilo',
  'Care Rapid 1', 'Care Rapid 2', 'MediRide 3',
  'LifeLine 4', 'Swift Aid 5', 'RescueNow 6', 'Pulse Ambulance 7'
];

export async function seedAmbulances(forceReseed = false) {
  const count = await Ambulance.countDocuments();
  if (count < names.length || forceReseed) {
    const ambulances = names.map((name, index) => {
      const loc = SCATTERED_LOCATIONS[index % SCATTERED_LOCATIONS.length];
      const jitterLat = (Math.random() - 0.5) * 0.006;
      const jitterLng = (Math.random() - 0.5) * 0.006;
      return {
        name,
        type: index < 11 ? 'public' : 'private',
        status: 'available',
        lat: Number((loc.lat + jitterLat).toFixed(5)),
        lng: Number((loc.lng + jitterLng).toFixed(5)),
        driverName: `Driver ${index + 1}`,
        vehicleNumber: `KA-01-EM-${String(index + 1).padStart(2, '0')}`
      };
    });

    for (const amb of ambulances) {
      await Ambulance.findOneAndUpdate(
        { name: amb.name },
        { $set: amb },
        { upsert: true, new: true }
      );
    }
    console.log(`Synced ${ambulances.length} ambulances across realistic scattered Bangalore neighborhoods.`);
  }
}

