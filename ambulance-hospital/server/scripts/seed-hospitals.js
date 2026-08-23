require('dotenv').config();
const mongoose = require('mongoose');
const Hospital = require('../models/hospital.model');

const DEMO_HOSPITALS = [
  {
    email: 'fortis@hospital.com',
    password: 'Password@123',
    name: 'Dr. Ramesh Kumar',
    hospitalName: 'Fortis Hospital - Cunningham Road',
    phone: '080-4199-4444',
    location: { type: 'Point', coordinates: [77.5960, 12.9882] },
    traumaLevel: 'Level 1 Cardiac & Critical',
    specialties: ['Cardiology', 'ICU Care', 'Vascular Surgery', 'Trauma & Emergency'],
    beds: { emergency: 10, icu: 5, total: 60 },
    accepting: true,
  },
  {
    email: 'stmarthas@hospital.com',
    password: 'Password@123',
    name: 'Sister Mary Joseph',
    hospitalName: "St. Martha's Hospital - Nrupathunga Road",
    phone: '080-4012-8200',
    location: { type: 'Point', coordinates: [77.5898, 12.9734] },
    traumaLevel: 'Level 2 Emergency Care',
    specialties: ['Trauma & Emergency', 'General Surgery', 'Pediatrics', 'Orthopedics'],
    beds: { emergency: 9, icu: 3, total: 55 },
    accepting: true,
  },
  {
    email: 'bengaluru@hospital.com',
    password: 'Password@123',
    name: 'Dr. Suresh Babu',
    hospitalName: 'Bowring & Lady Curzon Hospital (Bengaluru)',
    phone: '080-2559-1325',
    location: { type: 'Point', coordinates: [77.6044, 12.9818] },
    traumaLevel: 'Level 2 Trauma & General',
    specialties: ['Trauma & Emergency', 'General Surgery', 'Orthopedics', 'Pediatrics'],
    beds: { emergency: 12, icu: 4, total: 75 },
    accepting: true,
  },
  {
    email: 'manipal@hospital.com',
    password: 'Password@123',
    name: 'Dr. Rajesh Rao',
    hospitalName: 'Manipal Hospital - Old Airport Road',
    phone: '080-2502-4444',
    location: { type: 'Point', coordinates: [77.6496, 12.9580] },
    traumaLevel: 'Level 1 Multi-Specialty',
    specialties: ['Cardiology', 'Trauma & Emergency', 'Neurology', 'Orthopedics', 'Pediatrics', 'ICU Care'],
    beds: { emergency: 15, icu: 9, total: 95 },
    accepting: true,
  },
  {
    email: 'apollo@hospital.com',
    password: 'Password@123',
    name: 'Dr. Priya Sharma',
    hospitalName: 'Apollo Hospital - Bannerghatta Road',
    phone: '080-2630-4050',
    location: { type: 'Point', coordinates: [77.5982, 12.8946] },
    traumaLevel: 'Level 1 Multi-Specialty',
    specialties: ['Cardiology', 'Cardiac Surgery', 'Trauma & Emergency', 'ICU Care', 'Oncology'],
    beds: { emergency: 14, icu: 7, total: 85 },
    accepting: true,
  },
  {
    email: 'victoria@hospital.com',
    password: 'Password@123',
    name: 'Dr. Venkatesh M',
    hospitalName: 'Victoria Hospital (Trauma Care Centre)',
    phone: '080-2670-1150',
    location: { type: 'Point', coordinates: [77.5736, 12.9608] },
    traumaLevel: 'Level 1 Major Trauma',
    specialties: ['Trauma & Emergency', 'Burns & Plastic', 'Orthopedics', 'General Surgery', 'ICU Care'],
    beds: { emergency: 18, icu: 8, total: 120 },
    accepting: true,
  },
  {
    email: 'nimhans@hospital.com',
    password: 'Password@123',
    name: 'Dr. Shobha K',
    hospitalName: 'NIMHANS (Neuro Emergency Centre)',
    phone: '080-2699-5000',
    location: { type: 'Point', coordinates: [77.5963, 12.9366] },
    traumaLevel: 'Level 1 Neuro Trauma',
    specialties: ['Neurology', 'Neurosurgery', 'Trauma & Emergency', 'Psychiatry', 'ICU Care'],
    beds: { emergency: 12, icu: 6, total: 80 },
    accepting: true,
  },
];

async function seed() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas...');

  for (const h of DEMO_HOSPITALS) {
    const existing = await Hospital.findOne({ email: h.email });
    if (!existing) {
      await Hospital.create(h);
      console.log(`Created hospital user: ${h.email} (${h.hospitalName})`);
    } else {
      // Update password and details
      existing.password = h.password;
      existing.hospitalName = h.hospitalName;
      existing.name = h.name;
      existing.phone = h.phone;
      existing.location = h.location;
      existing.traumaLevel = h.traumaLevel;
      existing.specialties = h.specialties;
      existing.beds = h.beds;
      existing.accepting = h.accepting;
      await existing.save();
      console.log(`Updated hospital user: ${h.email} (${h.hospitalName})`);
    }
  }

  console.log('\n--- ALL HOSPITAL DEMO ACCOUNTS READY ---');
  console.log('Password for all accounts is: Password@123\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
