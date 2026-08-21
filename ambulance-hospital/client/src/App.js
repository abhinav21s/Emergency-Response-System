import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import Loader from './components/common/Loader';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import RegisterSelection from './pages/RegisterSelection';
import HospitalDashboard from './pages/hospital/Dashboard';
import HospitalProfile from './pages/hospital/Profile';
import HospitalRegister from './pages/hospital/Register';
import HospitalLogin from './pages/hospital/Login';
import DoctorManagement from './pages/hospital/DoctorManagement';
import EmergencyRequests from './pages/hospital/EmergencyRequests';
import AmbulanceDashboard from './pages/ambulance/Dashboard';
import AmbulanceProfile from './pages/ambulance/Profile';
import AmbulanceLogin from './pages/ambulance/Login';
import HospitalSearch from './pages/ambulance/HospitalSearch';
import EmergencyDetails from './pages/ambulance/EmergencyDetails';
import AmbulanceNotifications from './pages/ambulance/Notifications';
import DispatchDriver from './pages/ambulance/DispatchDriver';
import DispatchRegister from './pages/ambulance/DispatchRegister';
import NotFound from './pages/NotFound';

import './styles/designlab-framer.css'; // Import DesignLab Framer style
import './styles/improved-visibility.css'; // Import improved text visibility styles
import './styles/dashboard-enhancements.css'; // Import dashboard-specific enhancements
import './styles/emergency-text-visibility.css'; // Import emergency text visibility enhancements
import './styles/ambulance-text-visibility.css'; // Import ambulance text visibility enhancements
import './styles/toast-styles.css'; // Import custom toast styles
import './styles/emergency-alert-modal.css'; // Import emergency alert modal styles
import './styles/hospital-selection.css'; // Import hospital selection styles

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <SocketProvider>
        {/* Only show header when user is not authenticated */}
        {!user && <Header />}
        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route 
              path="/login" 
              element={user ? (
                user.role === 'hospital' ? (
                  <Navigate to="/hospital/dashboard" />
                ) : (
                  <Navigate to="/ambulance/dashboard" />
                )
              ) : (
                <Login />
              )} 
            />
            <Route 
              path="/hospital/login" 
              element={user ? (
                <Navigate to="/hospital/dashboard" />
              ) : (
                <HospitalLogin />
              )} 
            />
            <Route 
              path="/ambulance/login" 
              element={user ? (
                <Navigate to="/ambulance/dashboard" />
              ) : (
                <AmbulanceLogin />
              )} 
            />
            <Route path="/ambulance/dispatch" element={<DispatchDriver />} />
            <Route 
              path="/register" 
              element={user ? (
                user.role === 'hospital' ? (
                  <Navigate to="/hospital/dashboard" />
                ) : (
                  <Navigate to="/ambulance/dashboard" />
                )
              ) : (
                <RegisterSelection />
              )} 
            />
            <Route 
              path="/hospital/register" 
              element={user ? (
                <Navigate to="/hospital/dashboard" />
              ) : (
                <HospitalRegister />
              )} 
            />
            <Route 
              path="/ambulance/register" 
              element={user ? (
                <Navigate to="/ambulance/dashboard" />
              ) : (
                <DispatchRegister />
              )} 
            />

            {/* Hospital Routes */}
            <Route 
              path="/hospital/dashboard" 
              element={
                <ProtectedRoute role="hospital">
                  <HospitalDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/profile" 
              element={
                <ProtectedRoute role="hospital">
                  <HospitalProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/doctor-management" 
              element={
                <ProtectedRoute role="hospital">
                  <DoctorManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/emergency-requests" 
              element={
                <ProtectedRoute role="hospital">
                  <EmergencyRequests />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/hospital/emergency-requests/:id" 
              element={
                <ProtectedRoute role="hospital">
                  <EmergencyRequests />
                </ProtectedRoute>
              } 
            />
            {/* Hospital notifications route removed */}

            {/* Ambulance Routes */}
            <Route 
              path="/ambulance/dashboard" 
              element={
                <ProtectedRoute role="ambulance">
                  <AmbulanceDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ambulance/profile" 
              element={
                <ProtectedRoute role="ambulance">
                  <AmbulanceProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ambulance/hospitals" 
              element={
                <ProtectedRoute role="ambulance">
                  <HospitalSearch />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ambulance/emergency/:id" 
              element={
                <ProtectedRoute role="ambulance">
                  <EmergencyDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ambulance/notifications" 
              element={
                <ProtectedRoute role="ambulance">
                  <AmbulanceNotifications />
                </ProtectedRoute>
              } 
            />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <ToastContainer 
          position="bottom-right"
          autoClose={1500}
          hideProgressBar={true}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover={false}
          limit={3}
          theme="dark"
          toastClassName="glass-toast"
        />
      </SocketProvider>
    </>
  );
}

export default App;
