/**
 * Socket.io service for real-time communication
 * Handles connections, events, and rooms for real-time updates
 * between hospitals and ambulances
 */

// Store active connections
const activeConnections = new Map();

/**
 * Initialize Socket.io with the HTTP server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.io instance
 */
const initializeSocket = (server) => {
  const io = require('socket.io')(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log(`New socket connection: ${socket.id}`);

    // Handle user authentication
    socket.on('authenticate', (userData) => {
      if (userData && userData._id) {
        // Store user data with socket id
        activeConnections.set(userData._id, {
          socketId: socket.id,
          userId: userData._id,
          role: userData.role
        });
        
        // Join room based on role
        socket.join(`${userData.role}s`);
        
        // Join personal room
        socket.join(`user:${userData._id}`);
        
        console.log(`User authenticated: ${userData._id} (${userData.role})`);
      }
    });

    // Handle emergency request
    socket.on('emergency_request', (data) => {
      // Broadcast to all hospitals
      io.to('hospitals').emit('new_emergency', data);
      console.log(`Emergency request from ${data.ambulanceId} broadcasted to hospitals`);
    });
    
    // Handle hospital status change
    socket.on('hospital_status_change', (data) => {
      // Broadcast to all ambulances
      io.to('ambulances').emit('hospital_status_change', data);
      console.log(`Hospital ${data.hospitalId} status change (accepting: ${data.isAcceptingEmergencies}) broadcasted to ambulances`);
    });

    // Handle emergency response
    socket.on('emergency_response', (data) => {
      // Send to specific ambulance
      if (data.ambulanceId) {
        io.to(`user:${data.ambulanceId}`).emit('emergency_update', data);
        console.log(`Emergency response sent to ambulance: ${data.ambulanceId}`);
      }
    });
    
    // Handle emergency completion (for trip counter updates)
    socket.on('emergency:completed', (data) => {
      console.log('Emergency completed event received:', data);
      
      // Send to specific ambulance to update trip counter
      if (data.ambulanceId) {
        io.to(`user:${data.ambulanceId}`).emit('trip:completed', data);
        console.log(`Trip completion notification sent to ambulance: ${data.ambulanceId}`);
      }
    });
    
    // Handle doctor availability updates
    socket.on('hospital:doctor-availability', (data) => {
      console.log('Doctor availability update:', data);
      // Broadcast to all connected clients in the hospital room
      if (data.hospitalId) {
        io.to(`user:${data.hospitalId}`).emit('doctor:availability-changed', data);
        console.log(`Doctor availability update sent to hospital: ${data.hospitalId}`);
      }
    });
    
    // Handle doctor added event
    socket.on('hospital:doctor-added', (data) => {
      console.log('Doctor added:', data);
      if (data.hospitalId) {
        io.to(`user:${data.hospitalId}`).emit('doctor:added', data);
        console.log(`Doctor added notification sent to hospital: ${data.hospitalId}`);
      }
    });
    
    // Handle doctor deleted event
    socket.on('hospital:doctor-deleted', (data) => {
      console.log('Doctor deleted:', data);
      if (data.hospitalId) {
        io.to(`user:${data.hospitalId}`).emit('doctor:deleted', data);
        console.log(`Doctor deleted notification sent to hospital: ${data.hospitalId}`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Remove from active connections
      for (const [userId, connection] of activeConnections.entries()) {
        if (connection.socketId === socket.id) {
          activeConnections.delete(userId);
          console.log(`User disconnected: ${userId}`);
          break;
        }
      }
    });
  });

  return io;
};

/**
 * Get active connection by user ID
 * @param {string} userId - User ID
 * @returns {Object|null} Connection object or null
 */
const getActiveConnection = (userId) => {
  return activeConnections.get(userId) || null;
};

/**
 * Get all active connections
 * @returns {Map} Map of active connections
 */
const getAllActiveConnections = () => {
  return activeConnections;
};

module.exports = {
  initializeSocket,
  getActiveConnection,
  getAllActiveConnections
};
