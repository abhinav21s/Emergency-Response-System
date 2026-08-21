import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { API_CONFIG } from '../utils/axiosConfig';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    let socketInstance = null;

    // Only connect to socket if user is logged in
    if (user) {
      // Connect to socket server with auth token
      // Connect to the server on port 5001 as required by the project
      const socketUrl = 'http://localhost:5001';
      socketInstance = io(socketUrl, {
        auth: {
          token: localStorage.getItem('token')
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling']
      });

      // Set socket instance
      setSocket(socketInstance);

      // Socket event listeners
      socketInstance.on('connect', () => {
        console.log('Connected to socket server');
        setConnected(true);
        
        // Authenticate with the socket server
        socketInstance.emit('authenticate', {
          _id: user._id,
          role: user.role
        });
        
        console.log(`Socket authenticated as ${user.role} with ID ${user._id}`);
      });

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from socket server');
        setConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
      });

      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Clean up on unmount
      return () => {
        if (socketInstance) {
          socketInstance.disconnect();
        }
      };
    }

    // If user logs out, disconnect socket
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        setSocket(null);
        setConnected(false);
      }
    };
  }, [user]);

  // Function to emit events
  const emitEvent = (event, data) => {
    if (socket && connected) {
      console.log(`Emitting event: ${event}`, data);
      socket.emit(event, data);
    } else {
      console.error('Socket not connected. Event not sent:', event);
    }
  };

  // Function to listen for events
  const onEvent = (event, callback) => {
    if (socket) {
      console.log(`Listening for event: ${event}`);
      socket.on(event, (data) => {
        console.log(`Received event: ${event}`, data);
        callback(data);
      });
      
      // Return cleanup function
      return () => {
        console.log(`Removing listener for event: ${event}`);
        socket.off(event, callback);
      };
    }
    
    // Return empty cleanup function if no socket
    return () => {};
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        emitEvent,
        onEvent
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
