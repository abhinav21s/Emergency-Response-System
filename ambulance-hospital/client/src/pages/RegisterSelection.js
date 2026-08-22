import React from 'react';
import { Navigate } from 'react-router-dom';

// RegisterSelection is no longer used — redirect straight to hospital registration
const RegisterSelection = () => {
  return <Navigate to="/hospital/register" replace />;
};

export default RegisterSelection;
