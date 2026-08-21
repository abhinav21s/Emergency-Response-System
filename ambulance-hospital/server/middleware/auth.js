const jwt = require('jsonwebtoken');

// Protect routes - verify JWT token
const protect = (req, res, next) => {
    try {
        // Get token from different possible headers
        let token = req.header('x-auth-token');
        
        // Check Authorization header if x-auth-token is not present
        if (!token && req.headers.authorization) {
            // Format: Bearer <token>
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        // Check if no token
        if (!token) {
            console.log('Authentication failed: No token provided');
            return res.status(401).json({ msg: 'No token, authorization denied' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'justice_secret_key');
        if (!decoded || !decoded.id) {
            console.log('Authentication failed: Invalid token payload');
            return res.status(401).json({ msg: 'Token payload is invalid' });
        }

        // Add user from payload
        req.user = { _id: decoded.id };
        next();
    } catch (err) {
        console.log('Authentication failed:', err.message);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Authorize roles
const authorize = (...roles) => {
    return async (req, res, next) => {
        const Hospital = require('../models/hospital.model');
        const Ambulance = require('../models/ambulance.model');

        try {
            // Find user in either Hospital or Ambulance collection
            let user = await Hospital.findById(req.user._id);
            if (!user) {
                user = await Ambulance.findById(req.user._id);
            }

            if (!user) {
                return res.status(404).json({ msg: 'User not found' });
            }

            // Check if user role is authorized
            if (!roles.includes(user.role)) {
                return res.status(403).json({
                    msg: `User role ${user.role} is not authorized to access this route`
                });
            }

            // Add complete user object to request
            req.user = user;
            next();
        } catch (error) {
            console.error('Authorization error:', error);
            res.status(500).json({ msg: 'Server error' });
        }
    };
};

module.exports = {
    protect,
    authorize
};
