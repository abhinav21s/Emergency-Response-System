import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/register.css';

const RegisterSelection = () => {
  const navigate = useNavigate();
  
  const handleHospitalRegister = () => {
    navigate('/hospital/register');
  };
  
  const handleAmbulanceRegister = () => {
    navigate('/ambulance/register');
  };
  
  return (
    <div className="selection-page">
      <div className="selection-container">
        <h1>Register with Justice Emergency</h1>
        <p>Select the type of account you want to register</p>
        
        <div className="options-container">
          <div className="option-card hospital-card">
            <span className="option-icon">🏥</span>
            <h3 className="option-title">Hospital</h3>
            <p className="option-description">Register your hospital to manage doctors and receive emergency requests from ambulances.</p>
            <button className="btn-hospital" onClick={handleHospitalRegister}>Register as Hospital</button>
          </div>
          
          <div className="option-card ambulance-card">
            <span className="option-icon">🚑</span>
            <h3 className="option-title">Ambulance</h3>
            <p className="option-description">Register your ambulance to quickly find available hospitals and doctors during emergencies.</p>
            <button className="btn-ambulance" onClick={handleAmbulanceRegister}>Register as Ambulance</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterSelection;
