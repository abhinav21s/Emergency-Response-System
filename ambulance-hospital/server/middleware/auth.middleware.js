const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Authentication middleware
exports.auth = async (req, res, next) => {
  try {
    // Get token from header - accept both x-auth-token and Authorization header
    let token = req.header('x-auth-token');
    
    // If not found, try Authorization header
    if (!token) {
      token = req.header('Authorization')?.replace('Bearer ', '');
    }
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user with the id from token
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Token is invalid, user not found' });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is invalid or expired' });
  }
};

// Role-based authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role ${req.user.role} is not authorized to access this resource` 
      });
    }
    next();
  };
};
