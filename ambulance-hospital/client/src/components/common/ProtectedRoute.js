import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Loader from './Loader';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (role && user.role !== role) {
    // Redirect to appropriate dashboard if user has wrong role
    if (user.role === 'hospital') {
      return <Navigate to="/hospital/dashboard" />;
    } else {
      return <Navigate to="/ambulance/dashboard" />;
    }
  }

  return children;
};

export default ProtectedRoute;
