import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaAmbulance, FaHospital, FaUserMd, FaMapMarkerAlt, FaClock, FaBell, FaRoute, FaChartLine, FaHeartbeat, FaMedkit, FaArrowRight, FaPhone, FaEnvelope, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { statsAPI, serverStatus } from '../services/api';

const Home = () => {
  const [apiError, setApiError] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(true);
  const [stats, setStats] = useState({
    hospitals: 0,
    ambulances: 0,
    doctors: 0,
    livesSaved: 0
  });
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // Animation controls for scroll animations
  const controls = useAnimation();
  const [ref, inView] = useInView({
    threshold: 0.2,
    triggerOnce: true
  });

  // Start animations when section comes into view
  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  // Function to fetch statistics with error handling
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Always assume server is connected since we've removed offline mode
      setConnectionStatus(true);
      
      const response = await statsAPI.getStats();
      if (response.data) {
        setStats({
          hospitals: response.data.hospitalCount || 0,
          ambulances: response.data.ambulanceCount || 0,
          doctors: response.data.doctorCount || 0,
          livesSaved: response.data.emergencyCount || 0
        });
        setApiError(false);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
      setApiError(true);
    }
  }, []);
  
  // Function to retry connection
  const handleRetryConnection = async () => {
    setRetryCount(prev => prev + 1);
    await fetchStats();
  };

  // Fetch real-time statistics on component mount
  useEffect(() => {
    fetchStats();
    
    // Set up interval to refresh stats every 30 seconds
    const statsRefreshInterval = setInterval(fetchStats, 30000);
    
    // Clean up intervals on component unmount
    return () => {
      clearInterval(statsRefreshInterval);
    };
  }, [fetchStats]);

  // Handle API errors
  useEffect(() => {
    // Add error handling for API calls
    const handleApiError = () => {
      setApiError(true);
    };

    // Check if API is available
    const checkApiConnection = async () => {
      try {
        // Attempt to connect to API
        const response = await fetch('http://localhost:5001/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setApiError(false);
        } else {
          handleApiError();
        }
      } catch (error) {
        // Silently handle network errors
        handleApiError();
      }
    };

    checkApiConnection();
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        type: 'spring', 
        stiffness: 100, 
        damping: 10 
      }
    }
  };

  const featureVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  };
  
  const statVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 100,
        duration: 0.8
      }
    }
  };

  // Background floating icons - restored with enhanced visual effects
  const floatingIcons = [
    { icon: <FaAmbulance />, top: '15%', left: '10%', size: 24, duration: 20 },
    { icon: <FaHospital />, top: '25%', left: '20%', size: 32, duration: 25 },
    { icon: <FaUserMd />, top: '10%', left: '30%', size: 28, duration: 18 },
    { icon: <FaMapMarkerAlt />, top: '20%', left: '40%', size: 26, duration: 22 },
    { icon: <FaClock />, top: '15%', left: '50%', size: 30, duration: 24 },
    { icon: <FaBell />, top: '25%', left: '60%', size: 22, duration: 19 },
    { icon: <FaRoute />, top: '10%', left: '70%', size: 28, duration: 23 },
    { icon: <FaChartLine />, top: '20%', left: '80%', size: 26, duration: 21 },
    { icon: <FaHeartbeat />, top: '15%', left: '90%', size: 30, duration: 26 },
    { icon: <FaMedkit />, top: '25%', left: '5%', size: 24, duration: 20 },
  ];

  return (
    <div className="designlab-fade-in">
      {/* Floating background icons */}
      {floatingIcons.map((item, index) => (
        <motion.div 
          key={index}
          style={{ 
            position: 'absolute',
            top: item.top, 
            left: item.left,
            fontSize: `${item.size}px`,
            color: 'rgba(59, 130, 246, 0.1)',
            zIndex: 0
          }}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0.1, 0.3, 0.1],
            y: [0, -15, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            delay: index * 0.3,
            duration: 4, 
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        >
          {item.icon}
        </motion.div>
      ))}

      {/* Hero Section */}
      <section className="designlab-hero">
        <Container>
          <motion.div 
            className="designlab-slide-up"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Row className="align-items-center">
              <Col lg={7}>
                <motion.h1 
                  className="designlab-hero-title"
                  variants={itemVariants}
                >
                  Emergency Response System
                </motion.h1>
                
                <motion.p 
                  className="designlab-hero-subtitle"
                  variants={itemVariants}
                >
                  Connecting ambulances with hospitals in real-time to provide faster and more efficient emergency medical services.
                </motion.p>
                
                <motion.div variants={itemVariants} className="d-flex gap-3 mt-4">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button as={Link} to="/register" className="designlab-button designlab-button-primary">
                      Get Started <FaArrowRight className="ms-2" />
                    </Button>
                  </motion.div>
                </motion.div>
              </Col>
              
              <Col lg={5}>
                <motion.div 
                  className="position-relative"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="position-relative" style={{ 
                      height: '400px', 
                      width: '100%', 
                      overflow: 'visible', 
                      borderRadius: '30px', 
                      backgroundColor: '#000a1f',
                      position: 'relative' 
                    }}>
                    {/* Neon border effect - main border */}
                    <div style={{
                      position: 'absolute',
                      top: '-2px',
                      left: '-2px',
                      right: '-2px',
                      bottom: '-2px',
                      borderRadius: '30px',
                      background: 'transparent',
                      border: '2px solid transparent',
                      backgroundImage: 'linear-gradient(90deg, #ff00cc, #3399ff)',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'content-box, border-box',
                      boxShadow: '0 0 20px #ff00cc, 0 0 20px #3399ff',
                      zIndex: 2
                    }}>
                      {/* Inner dark background to create the hollow effect */}
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        right: '2px',
                        bottom: '2px',
                        borderRadius: '28px',
                        background: '#000a1f',
                        zIndex: 3
                      }}></div>
                    </div>
                    
                    {/* Animated glow effect */}
                    <motion.div
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        left: '-2px',
                        right: '-2px',
                        bottom: '-2px',
                        borderRadius: '30px',
                        border: '2px solid transparent',
                        opacity: 0.7,
                        zIndex: 1
                      }}
                      animate={{
                        boxShadow: [
                          '0 0 5px #ff00cc, 0 0 10px #ff00cc, 0 0 15px #ff00cc, 0 0 5px #3399ff, 0 0 10px #3399ff, 0 0 15px #3399ff',
                          '0 0 10px #ff00cc, 0 0 20px #ff00cc, 0 0 30px #ff00cc, 0 0 10px #3399ff, 0 0 20px #3399ff, 0 0 30px #3399ff',
                          '0 0 5px #ff00cc, 0 0 10px #ff00cc, 0 0 15px #ff00cc, 0 0 5px #3399ff, 0 0 10px #3399ff, 0 0 15px #3399ff'
                        ],
                        opacity: [0.5, 0.8, 0.5]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut'
                      }}
                    />
                    
                    {/* Outer glow effect */}
                    <div style={{
                      position: 'absolute',
                      top: '-25px',
                      left: '-25px',
                      right: '-25px',
                      bottom: '-25px',
                      borderRadius: '45px',
                      background: 'transparent',
                      zIndex: 0,
                      overflow: 'hidden'
                    }}>
                      <motion.div
                        style={{
                          position: 'absolute',
                          top: '0',
                          left: '0',
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(90deg, rgba(255, 0, 204, 0.15) 0%, rgba(51, 153, 255, 0.15) 100%)',
                          filter: 'blur(30px)',
                          opacity: 0.7,
                          zIndex: 0
                        }}
                        animate={{
                          opacity: [0.5, 0.8, 0.5],
                          filter: ['blur(25px)', 'blur(35px)', 'blur(25px)']
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          repeatType: 'reverse',
                          ease: 'easeInOut'
                        }}
                      />
                    </div>

                    <motion.div 
                      style={{ 
                        position: 'absolute', 
                        top: '30%', 
                        left: '10%', 
                        transform: 'translate(-50%, -50%)', 
                        fontSize: '6.5rem', 
                        fontWeight: 900, 
                        letterSpacing: '-0.05em',
                        width: '75%',
                        textAlign: 'center',
                        padding: '0px',
                        background: 'linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(79, 141, 255, 0.9))',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        zIndex: 3
                      }}
                      animate={{
                        textShadow: [
                          '0 0 5px rgba(79, 141, 255, 0.3), 0 0 10px rgba(79, 141, 255, 0.2), 0 0 15px rgba(79, 141, 255, 0.1), 0 0 20px rgba(79, 141, 255, 0.1)',
                          '0 0 10px rgba(79, 141, 255, 0.6), 0 0 20px rgba(79, 141, 255, 0.4), 0 0 30px rgba(79, 141, 255, 0.2), 0 0 40px rgba(79, 141, 255, 0.1)',
                          '0 0 5px rgba(79, 141, 255, 0.3), 0 0 10px rgba(79, 141, 255, 0.2), 0 0 15px rgba(79, 141, 255, 0.1), 0 0 20px rgba(79, 141, 255, 0.1)'
                        ],
                        scale: [1, 1.02, 1]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut'
                      }}
                    >JUSTICE</motion.div>
                    <motion.div 
                      style={{
                        position: 'absolute',
                        bottom: '20px',
                        right: '20px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        color: 'rgba(255, 255, 255, 1)',
                        textShadow: '0 0 10px rgba(79, 141, 255, 0.5)',
                        zIndex: 3
                      }}
                      animate={{
                        textShadow: [
                          '0 0 2px rgba(79, 141, 255, 0.3), 0 0 4px rgba(79, 141, 255, 0.2)',
                          '0 0 4px rgba(79, 141, 255, 0.5), 0 0 8px rgba(79, 141, 255, 0.3)',
                          '0 0 2px rgba(79, 141, 255, 0.3), 0 0 4px rgba(79, 141, 255, 0.2)'
                        ],
                        opacity: [0.7, 0.9, 0.7]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                        delay: 1
                      }}
                    >EMERGENCY RESPONSE SYSTEM</motion.div>
                  </div>
                </motion.div>
              </Col>
            </Row>
          </motion.div>
        </Container>
      </section>

      {/* How It Works Section */}
      <section className="designlab-section">
        <Container>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            <h2 className="text-center mb-4" style={{ color: '#ffffff', textShadow: '0 2px 10px rgba(79, 141, 255, 0.8), 0 0 30px rgba(79, 141, 255, 0.4)', fontSize: '2.5rem', fontWeight: '800' }}>How It Works</h2>
            <p className="text-center mb-5" style={{ color: '#ffffff', textShadow: '0 1px 5px rgba(0, 0, 0, 0.7)', fontSize: '1.25rem', fontWeight: '500' }}>Our system streamlines the emergency response process</p>

            <Row className="mt-5">
              <Col md={3}>
                <motion.div 
                  className="designlab-feature-card"
                  variants={itemVariants}
                  whileHover={{ y: -10 }}
                  style={{ background: 'linear-gradient(135deg, #4158D0, #C850C0)' }}
                >
                  <div className="designlab-feature-icon" style={{ color: '#ffeb3b' }}>
                    <FaHospital />
                  </div>
                  <h3 className="designlab-feature-title" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)', fontSize: '1.3rem' }}>Hospital Registration</h3>
                  <p className="designlab-feature-description" style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)', fontSize: '1rem', fontWeight: '500' }}>
                    Hospitals register their facilities, doctors, and specialties.
                  </p>
                </motion.div>
              </Col>
              
              <Col md={3}>
                <motion.div 
                  className="designlab-feature-card"
                  variants={itemVariants}
                  whileHover={{ y: -10 }}
                  style={{ background: 'linear-gradient(135deg, #43cea2, #185a9d)' }}
                >
                  <div className="designlab-feature-icon" style={{ color: '#ffcc80' }}>
                    <FaAmbulance />
                  </div>
                  <h3 className="designlab-feature-title" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)', fontSize: '1.3rem' }}>Ambulance Registration</h3>
                  <p className="designlab-feature-description" style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)', fontSize: '1rem', fontWeight: '500' }}>
                    Ambulances register their vehicles and maintain their current status.
                  </p>
                </motion.div>
              </Col>
              
              <Col md={3}>
                <motion.div 
                  className="designlab-feature-card"
                  variants={itemVariants}
                  whileHover={{ y: -10 }}
                  style={{ background: 'linear-gradient(135deg, #ff5f6d, #ffc371)' }}
                >
                  <div className="designlab-feature-icon" style={{ color: '#81d4fa' }}>
                    <FaRoute />
                  </div>
                  <h3 className="designlab-feature-title" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)', fontSize: '1.3rem' }}>Emergency Request</h3>
                  <p className="designlab-feature-description" style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)', fontSize: '1rem', fontWeight: '500' }}>
                    Ambulances search for nearby hospitals and send emergency requests.
                  </p>
                </motion.div>
              </Col>
              
              <Col md={3}>
                <motion.div 
                  className="designlab-feature-card"
                  variants={itemVariants}
                  whileHover={{ y: -10 }}
                  style={{ background: 'linear-gradient(135deg, #654ea3, #eaafc8)' }}
                >
                  <div className="designlab-feature-icon" style={{ color: '#b2ff59' }}>
                    <FaBell />
                  </div>
                  <h3 className="designlab-feature-title" style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)', fontSize: '1.3rem' }}>Hospital Response</h3>
                  <p className="designlab-feature-description" style={{ color: '#ffffff', textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)', fontSize: '1rem', fontWeight: '500' }}>
                    Hospitals receive pre-arrival notifications and prepares for the arrival of the patient.
                  </p>
                </motion.div>
              </Col>
            </Row>
          </motion.div>
        </Container>
      </section>

      {/* Connection Status Alert - Removed */}
      {/* Stats Section */}
      <section className="designlab-section" style={{ background: 'var(--designlab-card)' }}>
        <Container>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            <h2 className="text-center mb-4" style={{ color: '#ffffff', textShadow: '0 2px 10px rgba(79, 141, 255, 0.8), 0 0 30px rgba(79, 141, 255, 0.4)', fontSize: '2.5rem', fontWeight: '800' }}>Making a Difference</h2>
            <p className="text-center mb-5" style={{ color: '#ffffff', textShadow: '0 1px 5px rgba(0, 0, 0, 0.7)', fontSize: '1.25rem', fontWeight: '500' }}>Our platform is helping save lives every day</p>

            <Row className="mt-5">
              <Col md={3}>
                <motion.div 
                  className="designlab-stat-card"
                  variants={statVariants}
                  whileHover={{ y: -10 }}
                >
                  <div className="designlab-stat-value">
                    {loading ? (
                      <span style={{ fontSize: '0.8em' }}>Loading...</span>
                    ) : (
                      `${stats.hospitals.toLocaleString()}+`
                    )}
                  </div>
                  <div className="designlab-stat-label">Hospitals</div>
                </motion.div>
              </Col>
              
              <Col md={3}>
                <motion.div 
                  className="designlab-stat-card"
                  variants={statVariants}
                  whileHover={{ y: -10 }}
                >
                  <div className="designlab-stat-value">
                    {loading ? (
                      <span style={{ fontSize: '0.8em' }}>Loading...</span>
                    ) : (
                      `${stats.ambulances.toLocaleString()}+`
                    )}
                  </div>
                  <div className="designlab-stat-label">Ambulances</div>
                </motion.div>
              </Col>
              
              <Col md={3}>
                <motion.div 
                  className="designlab-stat-card"
                  variants={statVariants}
                  whileHover={{ y: -10 }}
                >
                  <div className="designlab-stat-value">
                    {loading ? (
                      <span style={{ fontSize: '0.8em' }}>Loading...</span>
                    ) : (
                      `${stats.doctors.toLocaleString()}+`
                    )}
                  </div>
                  <div className="designlab-stat-label">Doctors</div>
                </motion.div>
              </Col>
              
              <Col md={3}>
                <motion.div 
                  className="designlab-stat-card"
                  variants={statVariants}
                  whileHover={{ y: -10 }}
                >
                  <div className="designlab-stat-value">
                    {loading ? (
                      <span style={{ fontSize: '0.8em' }}>Loading...</span>
                    ) : (
                      `${stats.livesSaved.toLocaleString()}+`
                    )}
                  </div>
                  <div className="designlab-stat-label">Lives Saved</div>
                </motion.div>
              </Col>
            </Row>
          </motion.div>
        </Container>
      </section>

      {/* Contact Section */}
      <section className="designlab-section">
        <Container>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
          >
            <Row className="align-items-center">
              <Col lg={6}>
                <motion.div variants={itemVariants}>
                  <h2 className="designlab-section-title text-start">Get in Touch</h2>
                  <p className="mb-5">
                    Have questions about our emergency response system? Contact us today and our team will be happy to assist you.
                  </p>
                  
                  <div className="d-flex flex-column gap-4">
                    <motion.div 
                      className="designlab-card d-flex align-items-center gap-3"
                      variants={itemVariants}
                      whileHover={{ x: 5 }}
                    >
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: 'var(--designlab-radius-md)', 
                        background: 'var(--designlab-gradient-blue)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'white' 
                      }}>
                        <FaPhone />
                      </div>
                      <div>
                        <h4 style={{ marginBottom: '0.25rem', color: '#ffffff', fontWeight: '700', textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)', fontSize: '1.2rem' }}>Call Us</h4>
                        <p style={{ marginBottom: '0', color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>+91 9901217271</p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="designlab-card d-flex align-items-center gap-3"
                      variants={itemVariants}
                      whileHover={{ x: 5 }}
                    >
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: 'var(--designlab-radius-md)', 
                        background: 'var(--designlab-gradient-blue)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'white' 
                      }}>
                        <FaEnvelope />
                      </div>
                      <div>
                        <h4 style={{ marginBottom: '0.25rem', color: '#ffffff', fontWeight: '700', textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)', fontSize: '1.2rem' }}>Email Us</h4>
                        <p style={{ marginBottom: '0', color: '#ffffff', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)', fontWeight: '500' }}>mauryaaditya00@gmail.com</p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </Col>
              
              <Col lg={6}>
                <motion.div 
                  className="designlab-card-accent designlab-card"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  style={{ padding: 'var(--designlab-space-xl)' }}
                >
                  <h2 className="designlab-card-title">Ready to Join the Network?</h2>
                  <p className="designlab-card-subtitle">
                    Be part of our growing emergency response network and help save lives.
                  </p>
                  <div className="mt-4">
                    <p className="designlab-card-subtitle">
                      To join our network, please use the Hospital or Ambulance tabs in the navigation bar above.
                    </p>
                  </div>
                </motion.div>
              </Col>
            </Row>
          </motion.div>
        </Container>
      </section>
    </div>
  );
};

export default Home;
