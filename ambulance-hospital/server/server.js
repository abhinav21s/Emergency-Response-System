require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const { errorHandler } = require('./utils/errorHandler');
const { initializeSocket } = require('./services/socket');
const routes = require('./routes');
const { PORT, ensurePortAvailable } = require('./utils/portManager');

// Create Express app
const app = express();
const server = http.createServer(app);

// CORS configuration - fully permissive for development
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['x-auth-token', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Add preflight OPTIONS handler for all routes
app.options('*', cors());

// Initialize Socket.io with server
const io = initializeSocket(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add io to req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api', routes);

// Global Socket.io variable to access from anywhere
global.io = io;

// Socket.io is initialized by the socket service in services/socket.js
// The service handles all socket events

// Error handler middleware
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // First ensure port 5001 is available by killing any process using it
    await ensurePortAvailable();
    
    // Connect to database
    await connectDB();
    
    // Start server on port 5001 (always use this port as required)
    // Ignore any PORT from environment variables
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (fixed port as required)`);
    });
  } catch (error) {
    console.error('Server startup error:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});
