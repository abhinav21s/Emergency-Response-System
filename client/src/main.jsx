import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Driver from './pages/Driver';
import AddAmbulance from './pages/AddAmbulance';
import HospitalPortal from './pages/HospitalPortal';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/driver" element={<Driver />} />
        <Route path="/add-ambulance" element={<AddAmbulance />} />
        <Route path="/hospital-portal" element={<HospitalPortal />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

