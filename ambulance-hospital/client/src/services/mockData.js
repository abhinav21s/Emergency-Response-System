/**
 * Mock data service for the Justice Emergency Response System
 * Used as fallback when the server is unavailable
 */

// Mock statistics data
export const mockStats = {
  hospitalCount: 500,
  ambulanceCount: 2000,
  doctorCount: 10000,
  emergencyCount: 50000
};

// Mock hospital data
export const mockHospitals = [
  {
    _id: 'mock-hospital-1',
    name: 'City General Hospital',
    address: '123 Main Street, City Center',
    phone: '+91 9876543210',
    email: 'info@citygeneral.com',
    specialties: ['Cardiology', 'Neurology', 'Emergency Medicine'],
    acceptingEmergencies: true,
    location: {
      coordinates: [77.5946, 12.9716]
    }
  },
  {
    _id: 'mock-hospital-2',
    name: 'Community Medical Center',
    address: '456 Park Avenue, Suburb Area',
    phone: '+91 9876543211',
    email: 'info@communitymed.com',
    specialties: ['Orthopedics', 'Pediatrics', 'Emergency Medicine'],
    acceptingEmergencies: true,
    location: {
      coordinates: [77.6010, 12.9766]
    }
  },
  {
    _id: 'mock-hospital-3',
    name: 'Lifeline Hospital',
    address: '789 Ring Road, Outer City',
    phone: '+91 9876543212',
    email: 'info@lifeline.com',
    specialties: ['Trauma Care', 'Surgery', 'Critical Care'],
    acceptingEmergencies: false,
    location: {
      coordinates: [77.5846, 12.9616]
    }
  }
];

// Mock doctor data
export const mockDoctors = [
  {
    _id: 'mock-doctor-1',
    name: 'Dr. Aditya Sharma',
    specialization: 'Cardiology',
    available: true,
    hospital: 'mock-hospital-1'
  },
  {
    _id: 'mock-doctor-2',
    name: 'Dr. Priya Patel',
    specialization: 'Neurology',
    available: true,
    hospital: 'mock-hospital-1'
  },
  {
    _id: 'mock-doctor-3',
    name: 'Dr. Rajesh Kumar',
    specialization: 'Orthopedics',
    available: true,
    hospital: 'mock-hospital-2'
  },
  {
    _id: 'mock-doctor-4',
    name: 'Dr. Sneha Gupta',
    specialization: 'Pediatrics',
    available: false,
    hospital: 'mock-hospital-2'
  },
  {
    _id: 'mock-doctor-5',
    name: 'Dr. Vikram Singh',
    specialization: 'Trauma Care',
    available: true,
    hospital: 'mock-hospital-3'
  }
];

// Mock emergency data
export const mockEmergencies = [
  {
    _id: 'mock-emergency-1',
    patientName: 'Rahul Verma',
    patientAge: 45,
    condition: 'Chest Pain',
    severity: 'High',
    ambulance: 'mock-ambulance-1',
    hospital: 'mock-hospital-1',
    status: 'In Progress',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    _id: 'mock-emergency-2',
    patientName: 'Ananya Desai',
    patientAge: 12,
    condition: 'Severe Allergic Reaction',
    severity: 'High',
    ambulance: 'mock-ambulance-2',
    hospital: 'mock-hospital-2',
    status: 'Completed',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

// Mock ambulance data
export const mockAmbulances = [
  {
    _id: 'mock-ambulance-1',
    registrationNumber: 'KA-01-AB-1234',
    capacity: 2,
    equipmentLevel: 'Advanced',
    available: true,
    location: {
      coordinates: [77.5900, 12.9700]
    }
  },
  {
    _id: 'mock-ambulance-2',
    registrationNumber: 'KA-01-CD-5678',
    capacity: 3,
    equipmentLevel: 'Basic',
    available: true,
    location: {
      coordinates: [77.6050, 12.9750]
    }
  }
];
