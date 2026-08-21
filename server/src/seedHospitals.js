import Hospital from './models/Hospital.js';

export const MAJOR_HOSPITALS = [
  {
    name: 'Victoria Hospital (Trauma Care Centre)',
    lat: 12.9608,
    lng: 77.5736,
    phone: '080-2670-1150',
    accepting: true,
    traumaLevel: 'Level 1 Major Trauma',
    specialties: ['Trauma & Emergency', 'Burns & Plastic', 'Orthopedics', 'General Surgery', 'ICU Care'],
    beds: { emergency: 18, icu: 8, total: 120 },
    doctorsOnDuty: 14,
    doctorsAvailable: 14,
    bedsAvailable: 26
  },
  {
    name: 'NIMHANS (Neuro Emergency Centre)',
    lat: 12.9366,
    lng: 77.5963,
    phone: '080-2699-5000',
    accepting: true,
    traumaLevel: 'Level 1 Neuro Trauma',
    specialties: ['Neurology', 'Neurosurgery', 'Trauma & Emergency', 'Psychiatry', 'ICU Care'],
    beds: { emergency: 12, icu: 6, total: 80 },
    doctorsOnDuty: 10,
    doctorsAvailable: 10,
    bedsAvailable: 18
  },
  {
    name: 'Manipal Hospital - Old Airport Road',
    lat: 12.9580,
    lng: 77.6496,
    phone: '080-2502-4444',
    accepting: true,
    traumaLevel: 'Level 1 Multi-Specialty',
    specialties: ['Cardiology', 'Trauma & Emergency', 'Neurology', 'Orthopedics', 'Pediatrics', 'ICU Care'],
    beds: { emergency: 15, icu: 9, total: 95 },
    doctorsOnDuty: 16,
    doctorsAvailable: 16,
    bedsAvailable: 24
  },
  {
    name: 'Apollo Hospital - Bannerghatta Road',
    lat: 12.8946,
    lng: 77.5982,
    phone: '080-2630-4050',
    accepting: true,
    traumaLevel: 'Level 1 Multi-Specialty',
    specialties: ['Cardiology', 'Cardiac Surgery', 'Trauma & Emergency', 'ICU Care', 'Oncology'],
    beds: { emergency: 14, icu: 7, total: 85 },
    doctorsOnDuty: 12,
    doctorsAvailable: 12,
    bedsAvailable: 21
  },
  {
    name: 'Fortis Hospital - Cunningham Road',
    lat: 12.9882,
    lng: 77.5960,
    phone: '080-4199-4444',
    accepting: true,
    traumaLevel: 'Level 1 Cardiac & Critical',
    specialties: ['Cardiology', 'ICU Care', 'Vascular Surgery', 'Trauma & Emergency'],
    beds: { emergency: 10, icu: 5, total: 60 },
    doctorsOnDuty: 9,
    doctorsAvailable: 9,
    bedsAvailable: 15
  },
  {
    name: "St. John's Medical College Hospital",
    lat: 12.9322,
    lng: 77.6186,
    phone: '080-2206-5000',
    accepting: true,
    traumaLevel: 'Level 1 Major Trauma',
    specialties: ['Trauma & Emergency', 'Pediatrics', 'Orthopedics', 'General Surgery', 'ICU Care'],
    beds: { emergency: 20, icu: 10, total: 140 },
    doctorsOnDuty: 18,
    doctorsAvailable: 18,
    bedsAvailable: 30
  },
  {
    name: 'Sri Jayadeva Institute of Cardiovascular Sciences',
    lat: 12.9238,
    lng: 77.5995,
    phone: '080-2297-7400',
    accepting: true,
    traumaLevel: 'Level 1 Cardiac Emergency',
    specialties: ['Cardiology', 'Cardiac Surgery', 'ICU Care', 'Vascular Surgery'],
    beds: { emergency: 16, icu: 12, total: 110 },
    doctorsOnDuty: 15,
    doctorsAvailable: 15,
    bedsAvailable: 28
  },
  {
    name: 'Bowring & Lady Curzon Hospital',
    lat: 12.9818,
    lng: 77.6044,
    phone: '080-2559-1325',
    accepting: true,
    traumaLevel: 'Level 2 Trauma & General',
    specialties: ['Trauma & Emergency', 'General Surgery', 'Orthopedics', 'Pediatrics'],
    beds: { emergency: 12, icu: 4, total: 75 },
    doctorsOnDuty: 8,
    doctorsAvailable: 8,
    bedsAvailable: 16
  },
  {
    name: 'Aster CMI Hospital - Hebbal',
    lat: 13.0560,
    lng: 77.5925,
    phone: '080-4342-0100',
    accepting: true,
    traumaLevel: 'Level 1 Multi-Specialty',
    specialties: ['Trauma & Emergency', 'Neurology', 'Pediatrics', 'Cardiology', 'ICU Care'],
    beds: { emergency: 14, icu: 8, total: 90 },
    doctorsOnDuty: 13,
    doctorsAvailable: 13,
    bedsAvailable: 22
  },
  {
    name: 'Sakra World Hospital - Marathahalli ORR',
    lat: 12.9328,
    lng: 77.6845,
    phone: '080-4969-4969',
    accepting: true,
    traumaLevel: 'Level 1 Emergency & Ortho',
    specialties: ['Orthopedics', 'Neurology', 'Trauma & Emergency', 'ICU Care', 'Cardiology'],
    beds: { emergency: 11, icu: 6, total: 70 },
    doctorsOnDuty: 11,
    doctorsAvailable: 11,
    bedsAvailable: 17
  },
  {
    name: 'Narayana Health City - Hosur Road',
    lat: 12.8225,
    lng: 77.6912,
    phone: '080-7122-2222',
    accepting: true,
    traumaLevel: 'Level 1 Cardiac & Critical',
    specialties: ['Cardiology', 'Cardiac Surgery', 'Trauma & Emergency', 'Neurology', 'ICU Care'],
    beds: { emergency: 22, icu: 14, total: 160 },
    doctorsOnDuty: 20,
    doctorsAvailable: 20,
    bedsAvailable: 36
  },
  {
    name: "St. Martha's Hospital - Nrupathunga Road",
    lat: 12.9734,
    lng: 77.5898,
    phone: '080-4012-8200',
    accepting: true,
    traumaLevel: 'Level 2 Emergency Care',
    specialties: ['Trauma & Emergency', 'General Surgery', 'Pediatrics', 'Orthopedics'],
    beds: { emergency: 9, icu: 3, total: 55 },
    doctorsOnDuty: 7,
    doctorsAvailable: 7,
    bedsAvailable: 12
  }
];

export async function seedHospitals() {
  const count = await Hospital.countDocuments();
  if (count < MAJOR_HOSPITALS.length) {
    // Upsert each major hospital so existing data gains rich specialties & capacities
    for (const data of MAJOR_HOSPITALS) {
      await Hospital.findOneAndUpdate(
        { name: data.name },
        { $set: data },
        { upsert: true, new: true }
      );
    }
    console.log(`Seeded / Synced ${MAJOR_HOSPITALS.length} major hospitals with full specialty & capacity profiles.`);
  }
}
