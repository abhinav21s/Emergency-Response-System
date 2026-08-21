# Justice Emergency Response System - Product Specification Document

**Version:** 1.0  
**Date:** 2024  
**Status:** Production Ready

---

## 1. Executive Summary

### 1.1 Product Overview
Justice is a comprehensive real-time emergency medical services platform that connects ambulances with hospitals, enabling efficient coordination during critical emergency situations. The system facilitates seamless communication between ambulance drivers and healthcare facilities, providing real-time hospital availability information, doctor status, and emergency request management.

### 1.2 Problem Statement
Emergency medical services face significant challenges in coordinating between ambulances and hospitals:
- Lack of real-time visibility into hospital and doctor availability
- Inefficient communication channels between ambulances and hospitals
- Limited access to hospital capacity and specialization information
- Manual processes leading to delays in emergency response coordination

### 1.3 Solution
Justice provides a unified platform with:
- Real-time bidirectional communication using WebSocket technology
- Interactive maps for hospital discovery and route navigation
- Real-time doctor availability tracking
- Instant emergency request notifications
- Complete emergency lifecycle management
- Geolocation-based hospital search

---

## 2. Product Objectives

### 2.1 Primary Goals
1. **Reduce Emergency Response Time**: Enable faster decision-making by providing real-time hospital information
2. **Improve Coordination**: Facilitate seamless communication between ambulances and hospitals
3. **Optimize Resource Utilization**: Help hospitals prepare in advance for incoming emergencies
4. **Enhance Patient Care**: Ensure patients reach appropriate medical facilities with required specialists

### 2.2 Success Metrics
- Average time from emergency request to hospital acceptance
- Reduction in communication delays
- System uptime and reliability
- User adoption rates (ambulances and hospitals)

---

## 3. Target Users

### 3.1 Primary Users

#### 3.1.1 Ambulance Drivers/Operators
- **Role**: Emergency medical service providers in the field
- **Needs**:
  - Find nearby hospitals with available resources
  - Send emergency requests to hospitals
  - Receive real-time updates on hospital status
  - Navigate to selected hospitals
  - Manage ongoing emergency cases

#### 3.1.2 Hospital Administrators/Staff
- **Role**: Healthcare facility coordinators
- **Needs**:
  - Receive and manage emergency requests
  - Track and manage doctor availability
  - Monitor incoming emergencies
  - Accept or manage emergency cases
  - Update hospital status in real-time

### 3.2 Secondary Users
- Hospital doctors (availability status updates)
- Emergency dispatch centers (future enhancement)
- Healthcare system administrators

---

## 4. Core Features & Functionality

### 4.1 Authentication & User Management

#### 4.1.1 User Registration
- **Ambulance Registration**:
  - Vehicle registration number
  - Driver name and license number
  - Organization details
  - Email, password, phone number
  - Geolocation (coordinates)
  - Auto-generated unique ambulance ID (format: AMB-XXXXXX)

- **Hospital Registration**:
  - Hospital name
  - Complete address (street, city, state, zip code, country)
  - Email, password, phone number
  - Geolocation (coordinates)

#### 4.1.2 Authentication
- JWT-based authentication
- Role-based access control (hospital/ambulance)
- Protected routes based on user role
- Session persistence
- Secure password hashing (bcrypt)

### 4.2 Hospital Dashboard Features

#### 4.2.1 Doctor Management
- **Add Doctors**:
  - Name, specialization, qualifications
  - Experience, license number
  - Contact information (email, phone)
  - Schedule (day-wise availability)
  - Emergency types handled

- **Doctor Availability**:
  - Real-time toggle for doctor availability status
  - Automatic updates propagated to ambulance users
  - Visual indicators for available/unavailable doctors

- **Doctor Profiles**:
  - View all registered doctors
  - Update doctor information
  - Delete doctor records

#### 4.2.2 Emergency Request Management
- **Receive Emergency Requests**:
  - Real-time notifications via Socket.io
  - Audio notification alerts
  - Emergency request dashboard
  - Detailed emergency information display

- **Emergency Information Display**:
  - Patient details (name, age, gender, condition)
  - Patient type (e.g., General, Pediatric, Cardiac)
  - Vital signs (blood pressure, heart rate, respiratory rate, temperature, oxygen saturation)
  - Ambulance information (driver name, vehicle number, phone number)
  - Emergency type and severity
  - Location and estimated arrival time
  - Notes and additional information

- **Emergency Actions**:
  - Accept emergency requests
  - Update emergency status
  - View emergency timeline
  - Cancel or complete emergencies

#### 4.2.3 Hospital Profile Management
- View and edit hospital information
- Update address and contact details
- Manage hospital location coordinates

### 4.3 Ambulance Dashboard Features

#### 4.3.1 Hospital Search & Discovery
- **Geolocation-Based Search**:
  - Find nearby hospitals based on current location
  - Distance calculation and sorting
  - Real-time hospital availability status
  - Doctor availability by specialization

- **Interactive Map**:
  - Visual representation using Leaflet maps
  - Hospital markers with availability indicators
  - Click to view hospital details
  - Route visualization

- **Hospital Details View**:
  - Hospital name and address
  - Available doctors by specialization
  - Doctor qualifications and experience
  - Contact information
  - Real-time availability status

#### 4.3.2 Emergency Request Creation
- **Create Emergency Request**:
  - Select target hospital
  - Enter patient information:
    - Name, age, gender
    - Patient type
    - Medical condition
    - Vital signs (optional)
  - Emergency type classification
  - Severity level (Low, Medium, High, Critical)
  - Additional notes
  - Location information (automatic or manual)

- **Emergency Request Features**:
  - Real-time status updates
  - Hospital acceptance/rejection notifications
  - Estimated arrival time tracking
  - Emergency timeline view
  - Route navigation to hospital

#### 4.3.3 Emergency Management
- **Emergency Details View**:
  - Complete emergency information
  - Status tracking (Requested → Accepted → En Route → Arrived → Completed)
  - Real-time status updates
  - Timeline of status changes
  - Hospital information

- **Emergency Status Updates**:
  - Update status as ambulance progresses
  - Mark as "En Route" when leaving
  - Mark as "Arrived" at hospital
  - Complete emergency after handoff

#### 4.3.4 Notifications
- Real-time emergency request notifications
- Hospital acceptance/rejection alerts
- Status change notifications
- System alerts and updates

#### 4.3.5 Ambulance Profile Management
- View and edit ambulance information
- Update vehicle details
- Manage driver information
- Update organization details

### 4.4 Real-Time Communication

#### 4.4.1 Socket.io Integration
- **Bi-directional Communication**:
  - Real-time emergency notifications
  - Hospital status updates
  - Doctor availability changes
  - Emergency status synchronization

- **Socket Events**:
  - `authenticate`: User authentication on connection
  - `emergency_request`: Ambulance sends emergency request
  - `hospital:emergency-notification`: Hospital receives emergency notification
  - `hospital_status_change`: Hospital availability updates
  - `new_emergency`: Broadcast new emergency to hospitals
  - `emergency_response`: Hospital responds to emergency

- **Room Management**:
  - Role-based rooms (hospitals, ambulances)
  - User-specific rooms for targeted notifications
  - Hospital-specific rooms for emergency routing

### 4.5 Geolocation Services

#### 4.5.1 Location Features
- GPS coordinate storage (GeoJSON format)
- Geospatial queries for nearby hospitals
- Distance calculation
- Address geocoding
- Route calculation (Google Maps API integration)

#### 4.5.2 Map Integration
- Interactive Leaflet maps
- Hospital markers with custom icons
- Availability status visualization
- Route visualization
- Click-to-select hospital functionality

---

## 5. Technical Architecture

### 5.1 Technology Stack

#### 5.1.1 Frontend
- **Framework**: React.js 18.2.0
- **Routing**: React Router DOM 6.10.0
- **UI Components**: React Bootstrap 2.7.2, Bootstrap 5.2.3
- **Maps**: Leaflet 1.9.3, React Leaflet 4.2.1
- **Real-time**: Socket.io Client 4.6.1
- **Animations**: Framer Motion 12.9.4
- **HTTP Client**: Axios 1.3.4
- **Notifications**: React Toastify 9.1.2
- **Icons**: React Icons 4.8.0

#### 5.1.2 Backend
- **Runtime**: Node.js
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB with Mongoose 7.0.3
- **Real-time**: Socket.io 4.6.1
- **Authentication**: JSON Web Token (JWT) 9.0.0
- **Security**: bcryptjs 2.4.3
- **Environment**: dotenv 16.0.3

#### 5.1.3 Infrastructure
- **Database**: MongoDB (local or MongoDB Atlas)
- **Server Port**: 5001 (fixed)
- **Client Port**: 3000 (configurable)
- **Communication**: RESTful API + WebSocket

### 5.2 System Architecture

```
┌─────────────────┐
│   React Client  │
│   (Port 3000)   │
└────────┬────────┘
         │
         │ HTTP/REST + WebSocket
         │
┌────────▼────────┐
│  Express Server │
│   (Port 5001)   │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│    MongoDB      │
│   Database      │
└─────────────────┘
```

### 5.3 Database Schema

#### 5.3.1 User Model (Base)
```javascript
{
  email: String (unique, required)
  password: String (hashed, minlength: 6)
  name: String (required)
  phone: String (required)
  role: Enum ['hospital', 'ambulance']
  location: {
    type: 'Point',
    coordinates: [longitude, latitude]
  }
  active: Boolean (default: true)
  createdAt: Date
  updatedAt: Date
}
```

#### 5.3.2 Hospital Model (extends User)
```javascript
{
  hospitalName: String (required)
  address: {
    street: String
    city: String
    state: String
    zipCode: String
    country: String (default: 'India')
  }
}
```

#### 5.3.3 Ambulance Model (extends User)
```javascript
{
  ambulanceId: String (unique, auto-generated: AMB-XXXXXX)
  driverName: String (required)
  driverLicense: String (required)
  vehicleNumber: String (required)
  currentEmergency: ObjectId (ref: Emergency)
  organization: {
    name: String
    address: String
    contactNumber: String
  }
}
```

#### 5.3.4 Doctor Model
```javascript
{
  name: String (required)
  specialization: String (required)
  qualifications: [{
    degree: String
    institution: String
    year: Number
  }]
  experience: Number (min: 0)
  licenseNumber: String (unique, required)
  contactInfo: {
    email: String
    phone: String
  }
  hospital: ObjectId (ref: User)
  isAvailable: Boolean (default: true)
  schedule: [{
    day: Enum ['Monday'...'Sunday']
    startTime: String
    endTime: String
  }]
  emergencyTypes: [String]
  createdAt: Date
  updatedAt: Date
}
```

#### 5.3.5 Emergency Model
```javascript
{
  ambulance: ObjectId (ref: User, required)
  hospital: ObjectId (ref: User, required)
  patient: {
    name: String
    age: Number
    gender: Enum ['Male', 'Female', 'Other']
    condition: String
    vitalSigns: {
      bloodPressure: String
      heartRate: Number
      respiratoryRate: Number
      temperature: Number
      oxygenSaturation: Number
    }
  }
  emergencyType: String (required)
  severity: Enum ['Low', 'Medium', 'High', 'Critical'] (required)
  location: {
    type: 'Point',
    coordinates: [longitude, latitude],
    address: String
  }
  status: Enum ['Requested', 'Accepted', 'En Route', 'Arrived', 'Completed', 'Cancelled']
  estimatedArrivalTime: Date
  notes: String
  gender: String (top-level for notifications)
  patientType: String (top-level for notifications)
  driverName: String
  vehicleNumber: String
  phoneNumber: String
  timeline: [{
    status: String
    timestamp: Date
    notes: String
  }]
  createdAt: Date
  updatedAt: Date
}
```

#### 5.3.6 Notification Model
```javascript
{
  user: ObjectId (ref: User)
  type: String
  title: String
  message: String
  emergency: ObjectId (ref: Emergency)
  read: Boolean (default: false)
  createdAt: Date
}
```

### 5.4 API Endpoints

#### 5.4.1 Authentication Routes (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user profile

#### 5.4.2 Hospital Routes (`/api/hospitals`)
- `GET /profile` - Get hospital profile
- `PUT /profile` - Update hospital profile
- `GET /doctors` - Get all hospital doctors
- `POST /doctors` - Add new doctor
- `PUT /doctors/:id` - Update doctor
- `DELETE /doctors/:id` - Delete doctor
- `PUT /doctors/:id/availability` - Toggle doctor availability
- `GET /emergency-requests` - Get all emergency requests
- `GET /emergency-requests/:id` - Get specific emergency
- `PUT /emergency-requests/:id/accept` - Accept emergency
- `PUT /emergency-requests/:id/status` - Update emergency status

#### 5.4.3 Ambulance Routes (`/api/ambulances`)
- `GET /profile` - Get ambulance profile
- `PUT /profile` - Update ambulance profile
- `GET /hospitals` - Get nearby hospitals (with query params: lat, lng, radius)
- `POST /emergency` - Create emergency request
- `GET /emergency/:id` - Get emergency details
- `PUT /emergency/:id/status` - Update emergency status

#### 5.4.4 Emergency Routes (`/api/emergencies`)
- `POST /` - Create emergency
- `GET /:id` - Get emergency by ID
- `PUT /:id` - Update emergency
- `PUT /:id/status` - Update emergency status
- `POST /notify-hospital` - Send emergency notification to hospital

#### 5.4.5 Doctor Routes (`/api/doctors`)
- `GET /` - Get all doctors (with hospital filter)
- `GET /:id` - Get doctor by ID
- `POST /` - Create doctor
- `PUT /:id` - Update doctor
- `DELETE /:id` - Delete doctor

#### 5.4.6 Notification Routes (`/api/notifications`)
- `GET /` - Get user notifications
- `PUT /:id/read` - Mark notification as read
- `DELETE /:id` - Delete notification

#### 5.4.7 Stats Routes (`/api/stats`)
- `GET /` - Get system statistics

---

## 6. User Workflows

### 6.1 Hospital Registration & Onboarding
1. Hospital staff navigates to registration page
2. Fills in hospital details (name, address, contact info)
3. Sets geolocation coordinates
4. Creates account with email and password
5. System creates hospital profile
6. Hospital is redirected to dashboard
7. Hospital adds doctors through Doctor Management interface

### 6.2 Ambulance Registration & Onboarding
1. Ambulance driver navigates to registration page
2. Fills in vehicle and driver information
3. Provides organization details
4. Sets current location
5. Creates account with email and password
6. System generates unique ambulance ID
7. Ambulance is redirected to dashboard

### 6.3 Emergency Request Flow
1. **Ambulance Side**:
   - Ambulance driver navigates to Hospital Search
   - System displays nearby hospitals with doctor availability
   - Driver selects appropriate hospital
   - Driver creates emergency request with patient details
   - System sends real-time notification to selected hospital

2. **Hospital Side**:
   - Hospital receives audio notification alert
   - Emergency request appears in Emergency Requests dashboard
   - Hospital staff reviews emergency details
   - Hospital accepts emergency request
   - Status update sent to ambulance in real-time

3. **Ongoing Management**:
   - Ambulance marks status as "En Route"
   - Hospital tracks ambulance arrival
   - Ambulance marks "Arrived" when reaching hospital
   - Emergency completed after patient handoff

### 6.4 Doctor Availability Management
1. Hospital admin navigates to Doctor Management
2. Views list of all registered doctors
3. Toggles doctor availability status
4. Changes propagate in real-time to ambulance dashboard
5. Ambulance users see updated availability when searching hospitals

---

## 7. Security & Authentication

### 7.1 Authentication Mechanism
- JWT-based stateless authentication
- Token stored in HTTP headers (`x-auth-token` or `Authorization: Bearer <token>`)
- Token expiration and refresh mechanism
- Password hashing using bcrypt (salt rounds: 10)

### 7.2 Authorization
- Role-based access control (RBAC)
- Protected routes based on user role
- API endpoint protection via authentication middleware
- User can only access/modify their own resources

### 7.3 Data Security
- Password hashing (bcryptjs)
- HTTPS support (production)
- Input validation and sanitization
- CORS configuration for cross-origin requests
- Environment variables for sensitive data

---

## 8. Real-Time Features

### 8.1 WebSocket Communication
- Socket.io for bidirectional real-time communication
- Automatic reconnection on connection loss
- Room-based message routing
- User-specific and role-based rooms

### 8.2 Real-Time Updates
- Emergency request notifications (instant)
- Hospital acceptance/rejection (instant)
- Doctor availability changes (instant)
- Emergency status updates (instant)
- Hospital capacity updates (future enhancement)

---

## 9. User Interface & User Experience

### 9.1 Design Principles
- **Clarity**: Clear information hierarchy and visual indicators
- **Responsiveness**: Mobile and desktop compatible
- **Accessibility**: Improved text visibility and contrast
- **Feedback**: Toast notifications for user actions
- **Loading States**: Visual indicators for async operations

### 9.2 UI Components
- Glass morphism design elements
- Animated transitions (Framer Motion)
- Interactive maps (Leaflet)
- Modal dialogs for confirmations
- Real-time notification badges
- Status indicators and badges

### 9.3 Responsive Design
- Bootstrap grid system for layout
- Mobile-first approach
- Touch-friendly interface elements
- Optimized for tablet and desktop views

---

## 10. Deployment & Infrastructure

### 10.1 Development Environment
- Node.js development server
- MongoDB local instance or Atlas
- Hot reload for frontend and backend
- Environment variable configuration

### 10.2 Production Considerations
- Docker containerization support
- Environment-specific configurations
- Database connection pooling
- Error logging and monitoring
- Performance optimization

### 10.3 Port Configuration
- Server: Port 5001 (fixed)
- Client: Port 3000 (configurable)
- Socket.io: Same port as server (5001)

---

## 11. Future Enhancements

### 11.1 Planned Features
- **Advanced Analytics**:
  - Emergency response time analytics
  - Hospital performance metrics
  - Usage statistics dashboard

- **Enhanced Notifications**:
  - Push notifications for mobile
  - SMS integration for critical alerts
  - Email notifications

- **Route Optimization**:
  - Traffic-aware routing
  - Multi-hospital route comparison
  - Estimated time calculations

- **Patient Management**:
  - Patient history tracking
  - Medical records integration
  - Treatment outcome tracking

- **Dispatch Center Integration**:
  - Centralized emergency dispatch
  - Multi-ambulance coordination
  - Emergency prioritization system

- **Advanced Search & Filters**:
  - Filter hospitals by specialization
  - Availability-based sorting
  - Distance-based recommendations

### 11.2 Scalability Considerations
- Load balancing for multiple server instances
- Database sharding for large datasets
- CDN for static assets
- Caching layer for frequently accessed data
- Message queue for async operations

---

## 12. Testing & Quality Assurance

### 12.1 Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for critical workflows
- Real-time communication testing
- Performance testing

### 12.2 Quality Metrics
- Code coverage targets
- API response time benchmarks
- Real-time message delivery latency
- System uptime requirements

---

## 13. Documentation

### 13.1 User Documentation
- Hospital user guide
- Ambulance user guide
- API documentation
- Deployment guide

### 13.2 Developer Documentation
- Code architecture documentation
- API endpoint documentation
- Database schema documentation
- Contribution guidelines

---

## 14. Support & Maintenance

### 14.1 Support Channels
- Issue tracking system
- Technical support email
- Documentation portal

### 14.2 Maintenance Activities
- Regular security updates
- Database optimization
- Performance monitoring
- Bug fixes and patches

---

## 15. Compliance & Regulations

### 15.1 Data Privacy
- User data protection
- HIPAA compliance considerations (future)
- Data retention policies

### 15.2 Regulatory Requirements
- Healthcare regulations compliance
- Emergency services standards
- Medical device regulations (if applicable)

---

## Appendix A: Glossary

- **Emergency Request**: A formal request sent by an ambulance to a hospital for patient admission
- **Emergency Status**: The current state of an emergency (Requested, Accepted, En Route, Arrived, Completed, Cancelled)
- **Geolocation**: GPS coordinates (latitude, longitude) for location-based services
- **Socket.io**: Real-time bidirectional event-based communication library
- **JWT**: JSON Web Token, a compact token format for secure authentication
- **GeoJSON**: A format for encoding geographic data structures

---

## Appendix B: API Response Examples

### Emergency Request Creation
```json
{
  "success": true,
  "emergency": {
    "_id": "507f1f77bcf86cd799439011",
    "ambulance": "507f191e810c19729de860ea",
    "hospital": "507f191e810c19729de860eb",
    "status": "Requested",
    "severity": "High",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Hospital List Response
```json
{
  "success": true,
  "hospitals": [
    {
      "_id": "507f191e810c19729de860eb",
      "hospitalName": "City General Hospital",
      "address": {...},
      "location": {
        "coordinates": [77.5946, 12.9716]
      },
      "availableDoctors": [
        {
          "name": "Dr. John Doe",
          "specialization": "Cardiology",
          "isAvailable": true
        }
      ]
    }
  ]
}
```

---

**Document Control**
- **Version History**: This is version 1.0 of the product specification
- **Last Updated**: 2024
- **Next Review**: As needed based on feature additions
