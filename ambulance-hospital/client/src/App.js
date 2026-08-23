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

// Pages — Hospital Only
import Home from './pages/Home';
import Login from './pages/Login';
import HospitalDashboard from './pages/hospital/Dashboard';
import HospitalProfile from './pages/hospital/Profile';
import HospitalRegister from './pages/hospital/Register';
import HospitalLogin from './pages/hospital/Login';
import DoctorManagement from './pages/hospital/DoctorManagement';
import EmergencyRequests from './pages/hospital/EmergencyRequests';
import NotFound from './pages/NotFound';

import './styles/designlab-framer.css';
import './styles/improved-visibility.css';
import './styles/dashboard-enhancements.css';
import './styles/emergency-text-visibility.css';
import './styles/toast-styles.css';
import './styles/emergency-alert-modal.css';
import './styles/hospital-selection.css';

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <SocketProvider>
        {!user && <Header />}
        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />

            {/* Unified Hospital Login Route */}
            <Route
              path="/login"
              element={user ? <Navigate to="/hospital/dashboard" /> : <HospitalLogin />}
            />
            <Route
              path="/hospital/login"
              element={user ? <Navigate to="/hospital/dashboard" /> : <HospitalLogin />}
            />

            {/* Registration — hospital only. Any other register path redirects here */}
            <Route
              path="/register"
              element={user ? <Navigate to="/hospital/dashboard" /> : <Navigate to="/hospital/register" />}
            />
            <Route
              path="/hospital/register"
              element={user ? <Navigate to="/hospital/dashboard" /> : <HospitalRegister />}
            />

            {/* Hospital Protected Routes */}
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

            {/* Redirect old ambulance routes to home */}
            <Route path="/ambulance/*" element={<Navigate to="/" />} />

            {/* 404 */}
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
