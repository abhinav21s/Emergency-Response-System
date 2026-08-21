# Justice Emergency Response System

A comprehensive emergency response system designed to connect ambulances with hospitals in real-time.

## Project Overview

Justice facilitates quick and efficient emergency medical services by providing ambulance drivers with up-to-date information about nearby hospitals, including doctor availability and specializations.

## Key Features

### Hospital Dashboard
- Hospital Registration & Login: Secure authentication system for hospitals
- Doctor Management: Add, update, and manage doctor profiles
- Real-time Availability Tracking: Toggle doctor availability status
- Notification System: Receive and manage ambulance requests
- Data Persistence: All hospital and doctor data persists across sessions

### Ambulance Application
- Ambulance Registration & Login: Secure authentication for ambulance drivers
- Hospital Selection: View nearby hospitals with real-time doctor availability
- Interactive Map: Visual representation of hospitals with availability indicators
- Route Navigation: Get directions to selected hospitals
- Real-time Updates: Receive instant updates when hospital/doctor status changes

### Server & Communication
- Socket.io Integration: Real-time bidirectional communication
- MongoDB Database: Persistent storage of all system data
- RESTful API: Comprehensive API for all system operations
- Geolocation Services: Location-based hospital discovery

## Technology Stack

### Frontend
- React.js for both Hospital and Ambulance applications
- React Router for navigation
- React Bootstrap for UI components
- Leaflet for interactive maps
- Socket.io client for real-time communication

### Backend
- Node.js with Express
- MongoDB with Mongoose for data persistence
- Socket.io for real-time updates
- JWT for authentication
- Google Maps API for route calculation

## Project Structure

### Client
```
client/
├── public/          # Static files
├── src/
│   ├── components/  # Reusable components
│   │   ├── common/  # Shared components (Loader, ProtectedRoute)
│   │   └── layout/  # Layout components (Header, Footer)
│   ├── context/     # React Context providers
│   │   ├── AuthContext.js
│   │   └── SocketContext.js
│   ├── pages/       # Application pages
│   │   ├── ambulance/  # Ambulance-specific pages
│   │   ├── hospital/   # Hospital-specific pages
│   │   ├── Home.js
│   │   ├── Login.js
│   │   ├── Register.js
│   │   └── NotFound.js
│   ├── services/    # API and service functions
│   ├── styles/      # CSS styles
│   │   └── main.css # Consolidated styles
│   ├── utils/       # Utility functions
│   ├── App.js       # Main application component
│   └── index.js     # Entry point
└── package.json     # Dependencies and scripts
```

### Server
```
server/
├── config/         # Configuration files
│   └── db.js       # Database connection
├── controllers/    # Route controllers
├── middleware/     # Express middleware
├── models/         # Mongoose models
├── routes/         # API routes
├── services/       # Business logic services
│   └── socket.js   # Socket.io service
├── utils/          # Utility functions
│   ├── errorHandler.js
│   └── tokenUtils.js
├── .env            # Environment variables (not in repo)
├── .env.example    # Example environment variables
├── server.js       # Entry point
└── package.json    # Dependencies and scripts
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn package manager

### Installation
1. Clone the repository
2. Install server dependencies:
   ```
   cd server
   npm install
   ```
3. Install client dependencies:
   ```
   cd ../client
   npm install
   ```
4. Configure environment variables (see .env.example files)
5. Start the development servers:
   ```
   # Start backend server
   cd server
   npm run dev
   
   # Start frontend client
   cd ../client
   npm start
   ```

## Complete Project Structure
```
justice-emergency-response/
├── client/                 # Frontend React application
│   ├── public/             # Static files
│   └── src/                # React source code
│       ├── components/     # Reusable components
│       ├── pages/          # Page components
│       ├── context/        # React context providers
│       ├── services/       # API services
│       └── utils/          # Utility functions
├── server/                 # Backend Node.js application
│   ├── config/             # Configuration files
│   ├── controllers/        # Request handlers
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
├── testsprite_tests/       # Comprehensive test suite
└── README.md               # Project documentation
```

## Testing
The project includes a comprehensive test suite in the `testsprite_tests/` directory covering:
- User registration and authentication
- Role-based access control
- Hospital and ambulance functionality
- Real-time communication
- Emergency request workflows

## License
MIT
