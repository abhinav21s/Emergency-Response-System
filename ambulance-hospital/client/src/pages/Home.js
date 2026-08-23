import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaAmbulance, FaHospital, FaUserMd, FaHeartbeat, FaArrowRight, FaShieldAlt, FaPhoneAlt, FaRoute, FaCheckCircle } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { statsAPI } from '../services/api';

const Home = () => {
  const [stats, setStats] = useState({
    hospitals: 7,
    ambulances: 12,
    doctors: 24,
    livesSaved: 48,
  });

  const fetchStats = useCallback(async () => {
    try {
      const response = await statsAPI.getStats();
      if (response && response.data) {
        setStats({
          hospitals: response.data.hospitalCount || 7,
          ambulances: response.data.ambulanceCount || 12,
          doctors: response.data.doctorCount || 24,
          livesSaved: response.data.emergencyCount || 48,
        });
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div style={{ background: '#e9edf2', minHeight: '100vh', color: '#0f2942', paddingBottom: '60px' }}>
      
      {/* Hero Section */}
      <section style={{ padding: '60px 0 50px' }}>
        <Container>
          <Row className="align-items-center g-5">
            <Col lg={7}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#dbeafe', color: '#1e40af', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 800, marginBottom: '18px' }}>
                <FaShieldAlt /> 108 Public-Private Emergency Medical Network
              </div>
              <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.03em', color: '#0f2942', marginBottom: '20px' }}>
                Coordinated Emergency Response & Live Hospital Dispatch
              </h1>
              <p style={{ fontSize: '1.15rem', lineHeight: 1.65, color: '#334e68', maxWidth: '620px', marginBottom: '32px', fontWeight: 500 }}>
                Seamless real-time synchronization between in-transit 108 ambulances and hospital emergency departments to accelerate admission readiness and triage.
              </p>
              <div className="d-flex flex-wrap gap-3">
                <Button
                  as={Link}
                  to="/hospital/login"
                  style={{
                    background: '#1e56a0',
                    borderColor: '#163172',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    borderRadius: '10px',
                    padding: '12px 28px',
                    boxShadow: '0 4px 14px rgba(30, 86, 160, 0.25)',
                  }}
                >
                  Hospital Login <FaArrowRight className="ms-2" />
                </Button>
                <Button
                  as={Link}
                  to="/hospital/register"
                  style={{
                    background: '#0f766e',
                    borderColor: '#0d655e',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    borderRadius: '10px',
                    padding: '12px 26px',
                    boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)',
                  }}
                >
                  Register Facility
                </Button>
                <Button
                  as="a"
                  href="http://localhost:5173/map"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline-primary"
                  style={{
                    borderRadius: '10px',
                    padding: '12px 22px',
                    fontWeight: 700,
                    borderColor: '#1e56a0',
                    color: '#1e56a0',
                    background: '#ffffff',
                  }}
                >
                  Live 108 Command Map
                </Button>
              </div>
            </Col>

            <Col lg={5}>
              <Card style={{ background: '#f5f8fc', border: '2px solid #cbd5e1', borderRadius: '18px', padding: '24px', boxShadow: '0 8px 24px rgba(15, 41, 66, 0.08)' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0 fw-bold" style={{ color: '#0f2942' }}>
                    Live Response Network
                  </h5>
                  <span className="badge bg-success" style={{ padding: '6px 12px', borderRadius: '12px' }}>
                    Active 24/7
                  </span>
                </div>
                <hr style={{ borderColor: '#cbd5e1', margin: '12px 0 18px' }} />

                <Row className="g-3">
                  <Col sm={6}>
                    <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <FaHospital style={{ color: '#1e56a0', fontSize: '1.5rem', marginBottom: '8px' }} />
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f2942' }}>{stats.hospitals}</div>
                      <div style={{ color: '#334e68', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Hospitals Online</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <FaAmbulance style={{ color: '#0f766e', fontSize: '1.5rem', marginBottom: '8px' }} />
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f2942' }}>{stats.ambulances}</div>
                      <div style={{ color: '#334e68', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Fleet Units</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <FaUserMd style={{ color: '#1e56a0', fontSize: '1.5rem', marginBottom: '8px' }} />
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f2942' }}>{stats.doctors}</div>
                      <div style={{ color: '#334e68', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Doctors On Duty</div>
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                      <FaHeartbeat style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '8px' }} />
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f2942' }}>{stats.livesSaved}</div>
                      <div style={{ color: '#334e68', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Transits Managed</div>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Workflow Section */}
      <section style={{ padding: '40px 0' }}>
        <Container>
          <div className="text-center mb-5">
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f2942', letterSpacing: '-0.02em' }}>
              How The Emergency Dispatch Pipeline Operates
            </h2>
            <p style={{ color: '#334e68', fontSize: '1.05rem', fontWeight: 600, maxWidth: '650px', margin: '8px auto 0' }}>
              Automated scoring, pre-arrival clinical intake, and intelligent rerouting.
            </p>
          </div>

          <Row className="g-4">
            <Col md={3} sm={6}>
              <Card style={{ background: '#f5f8fc', border: '1.5px solid #cbd5e1', borderRadius: '14px', height: '100%', padding: '22px' }}>
                <div style={{ background: '#dbeafe', color: '#1e40af', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: '16px' }}>
                  <FaHospital />
                </div>
                <h5 style={{ color: '#0f2942', fontWeight: 800, fontSize: '1.15rem' }}>1. Capacity Registration</h5>
                <p style={{ color: '#334e68', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  Hospital teams publish real-time emergency and ICU bed counts, trauma capability, and accepting status.
                </p>
              </Card>
            </Col>

            <Col md={3} sm={6}>
              <Card style={{ background: '#f5f8fc', border: '1.5px solid #cbd5e1', borderRadius: '14px', height: '100%', padding: '22px' }}>
                <div style={{ background: '#ccfbf1', color: '#0f766e', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: '16px' }}>
                  <FaRoute />
                </div>
                <h5 style={{ color: '#0f2942', fontWeight: 800, fontSize: '1.15rem' }}>2. Composite Scoring</h5>
                <p style={{ color: '#334e68', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  Dispatcher engine ranks destination hospitals dynamically based on live traffic ETA, distance, bed availability, and specialty fit.
                </p>
              </Card>
            </Col>

            <Col md={3} sm={6}>
              <Card style={{ background: '#f5f8fc', border: '1.5px solid #cbd5e1', borderRadius: '14px', height: '100%', padding: '22px' }}>
                <div style={{ background: '#fee2e2', color: '#dc2626', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: '16px' }}>
                  <FaAmbulance />
                </div>
                <h5 style={{ color: '#0f2942', fontWeight: 800, fontSize: '1.15rem' }}>3. Clinical Intake</h5>
                <p style={{ color: '#334e68', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  Paramedics transmit patient vitals (BP, Heart Rate, SpO2) and chief complaints directly to the destination trauma team en route.
                </p>
              </Card>
            </Col>

            <Col md={3} sm={6}>
              <Card style={{ background: '#f5f8fc', border: '1.5px solid #cbd5e1', borderRadius: '14px', height: '100%', padding: '22px' }}>
                <div style={{ background: '#dcfce7', color: '#16a34a', width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: '16px' }}>
                  <FaCheckCircle />
                </div>
                <h5 style={{ color: '#0f2942', fontWeight: 800, fontSize: '1.15rem' }}>4. Parallel Confirmation</h5>
                <p style={{ color: '#334e68', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  Hospital team accepts or declines admission with immediate background rerouting if diversion is necessary.
                </p>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Home;
