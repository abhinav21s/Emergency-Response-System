/**
 * Mock Authentication Service
 * Provides offline authentication capabilities when the server is unavailable
 */

// Mock user database
const mockUsers = {
  hospital: [
    {
      email: 'hospital@example.com',
      password: 'password123',
      _id: 'mock-hospital-1',
      name: 'City General Hospital',
      address: '123 Main Street, City Center',
      phone: '+91 9876543210',
      specialties: ['Cardiology', 'Neurology', 'Emergency Medicine'],
      acceptingEmergencies: true,
      role: 'hospital'
    },
    {
      email: 'admin@hospital.com',
      password: 'admin123',
      _id: 'mock-hospital-2',
      name: 'Community Medical Center',
      address: '456 Park Avenue, Suburb Area',
      phone: '+91 9876543211',
      specialties: ['Orthopedics', 'Pediatrics', 'Emergency Medicine'],
      acceptingEmergencies: true,
      role: 'hospital'
    }
  ],
  ambulance: [
    {
      email: 'ambulance@example.com',
      password: 'password123',
      _id: 'mock-ambulance-1',
      name: 'City Ambulance Services',
      registrationNumber: 'KA-01-AB-1234',
      capacity: 2,
      equipmentLevel: 'Advanced',
      available: true,
      role: 'ambulance'
    },
    {
      email: 'driver@ambulance.com',
      password: 'driver123',
      _id: 'mock-ambulance-2',
      name: 'Emergency Response Unit',
      registrationNumber: 'KA-01-CD-5678',
      capacity: 3,
      equipmentLevel: 'Basic',
      available: true,
      role: 'ambulance'
    }
  ]
};

// Allow any email/password for demo purposes in development
const ALLOW_ANY_CREDENTIALS = true;

/**
 * Mock login function
 * @param {Object} credentials - User credentials
 * @param {string} role - User role (hospital or ambulance)
 * @returns {Object} Authentication response with token and user data
 */
export const mockLogin = (credentials, role) => {
  console.log('Using mock authentication service');
  
  // For development, allow any credentials
  if (ALLOW_ANY_CREDENTIALS) {
    const mockUser = {
      _id: `mock-${role}-${Date.now()}`,
      email: credentials.email,
      name: role === 'hospital' ? 'Demo Hospital' : 'Demo Ambulance',
      role: role,
      ...(role === 'hospital' ? {
        address: '123 Hospital Street',
        phone: '+91 9901217271',
        specialties: ['Emergency', 'General Care'],
        acceptingEmergencies: true
      } : {
        registrationNumber: 'KA-01-AB-1234',
        capacity: 2,
        equipmentLevel: 'Advanced',
        available: true
      })
    };
    
    return {
      success: true,
      token: `mock-token-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      user: mockUser
    };
  }
  
  // Find user in mock database
  const user = mockUsers[role].find(u => 
    u.email === credentials.email && u.password === credentials.password
  );
  
  if (user) {
    // Create a mock token
    const token = `mock-token-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    return {
      success: true,
      token,
      user: { ...user, password: undefined } // Remove password from response
    };
  }
  
  // Authentication failed
  throw new Error('Invalid credentials');
};

/**
 * Mock registration function
 * @param {Object} userData - User data for registration
 * @param {string} role - User role (hospital or ambulance)
 * @returns {Object} Authentication response with token and user data
 */
export const mockRegister = (userData, role) => {
  console.log('Using mock registration service');
  
  // Create a new mock user
  const newUser = {
    _id: `mock-${role}-${Date.now()}`,
    ...userData,
    role
  };
  
  // Add to mock database
  mockUsers[role].push(newUser);
  
  // Create a mock token
  const token = `mock-token-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  
  return {
    success: true,
    token,
    user: { ...newUser, password: undefined } // Remove password from response
  };
};

/**
 * Mock token verification
 * @param {string} token - Authentication token
 * @returns {Object} Verification result
 */
export const mockVerifyToken = (token) => {
  // Always return valid for mock tokens
  if (token && token.startsWith('mock-token-')) {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    return {
      valid: true,
      user: storedUser
    };
  }
  
  return { valid: false };
};

export default {
  mockLogin,
  mockRegister,
  mockVerifyToken
};
