import React, { useEffect, useState } from 'react';
import { Button, Card, Container, Form, Alert, ListGroup } from 'react-bootstrap';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';

const dispatchApi = process.env.REACT_APP_DISPATCH_API_URL || 'http://localhost:5000/api';
const tomTomKey = process.env.REACT_APP_TOMTOM_API_KEY;
const mapUrl = `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomTomKey}`;
const request = async (path, options = {}) => { const response = await fetch(`${dispatchApi}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options }); const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Request failed'); return body; };
const ambulanceIcon = L.divIcon({ className: 'dispatch-driver-icon', html: '🚑', iconSize: [32, 32] });
const point = (value) => [value.lat, value.lng];

export default function DispatchDriver() {
  const [ambulance, setAmbulance] = useState(() => JSON.parse(localStorage.getItem('dispatchDriver') || 'null'));
  const [ambulances, setAmbulances] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [call, setCall] = useState(null);
  const [trip, setTrip] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    request('/ambulances').then((data) => {
      setAmbulances(data);
      if (data.length > 0) setSelectedId(data[0]._id);
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!ambulance) return undefined;
    const socket = io('http://localhost:5000');
    socket.on('connect', () => socket.emit('driver:join', ambulance._id));
    socket.on('driver:incoming-call', (dispatch) => setCall(dispatch));
    socket.on('trip:updated', (updated) => { if (updated.ambulance === ambulance._id) setTrip(updated); });
    if (ambulance.activeCall && !ambulance.activeCall.accepted) setCall({ ...ambulance.activeCall, ambulance });
    return () => socket.disconnect();
  }, [ambulance]);

  const selectAmbulance = (amb) => {
    localStorage.setItem('dispatchDriver', JSON.stringify(amb));
    setAmbulance(amb);
  };

  const login = (event) => {
    event.preventDefault();
    const amb = ambulances.find((a) => a._id === selectedId);
    if (amb) selectAmbulance(amb);
  };

  const accept = async () => { const id = call.tripId || call.ambulance.activeCall.tripId; const result = await request(`/trips/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) }); setTrip(result); };
  const getRoutes = async (origin, destination) => { try { const result = await request('/routes', { method: 'POST', body: JSON.stringify({ origin, destination }) }); setRoutes(result.routes); } catch (e) { setError(e.message); } };
  const choose = async (route, leg) => { const result = await request(`/trips/${trip._id}`, { method: 'PATCH', body: JSON.stringify({ leg, route }) }); setTrip(result); setRoutes([]); };
  const arrive = async () => { const next = trip.status === 'en_route_to_accident' ? 'at_accident' : 'completed'; const result = await request(`/trips/${trip._id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) }); setTrip(result); if (next === 'at_accident') setHospitals(await request('/hospitals')); };
  const chooseHospital = async (hospital) => { const result = await request(`/trips/${trip._id}`, { method: 'PATCH', body: JSON.stringify({ hospital: { hospitalId: hospital._id, name: hospital.name, location: { lat: hospital.lat, lng: hospital.lng } } }) }); setTrip(result); };

  if (!ambulance) {
    return (
      <Container className="py-5">
        <Card className="p-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2>Select Ambulance for Driver View</h2>
          <p>Select your ambulance from the fleet below to monitor and accept live dispatches.</p>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={login}>
            <Form.Select
              className="mb-3"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {ambulances.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.type.toUpperCase()}) — {a.status}
                </option>
              ))}
            </Form.Select>
            <div className="d-grid gap-2 mb-3">
              {ambulances.map((a) => (
                <Button
                  key={a._id}
                  variant={selectedId === a._id ? 'primary' : 'outline-secondary'}
                  className="text-start"
                  onClick={() => selectAmbulance(a)}
                >
                  🚑 <b>{a.name}</b> <small className="float-end">{a.type.toUpperCase()} · {a.status}</small>
                </Button>
              ))}
            </div>
            <Button type="submit" variant="primary" className="w-100">
              Open Driver View & Wait for Calls →
            </Button>
          </Form>
        </Card>
      </Container>
    );
  }
  const active = trip || (call ? { _id: call.tripId || call.ambulance.activeCall.tripId, status: 'dispatched', accident: call.accident } : null); const route = active?.status === 'en_route_to_accident' ? active.leg1Route : active?.leg2Route;
  return <Container className="py-4"><h2>🚑 {ambulance.name}</h2><p>Live driver trip status: <b>{active?.status || 'waiting for call'}</b></p>{error && <Alert variant="danger">{error}</Alert>}{!active && <Alert variant="info">Waiting for a dispatcher allocation.</Alert>}{call && !trip && <Card className="p-3 border-danger"><h3>Incoming emergency allocation</h3><p>Accident: {call.accident.lat.toFixed(5)}, {call.accident.lng.toFixed(5)}</p><Button onClick={accept}>Accept ride</Button></Card>}{active?.status === 'accepted' && <Button onClick={() => getRoutes({ lat: ambulance.lat, lng: ambulance.lng }, active.accident)}>Show TomTom alternate routes to accident</Button>}{routes.length > 0 && <ListGroup className="my-3">{routes.map((r, i) => <ListGroup.Item key={i}><b>Route {i + 1}</b> · {(r.distanceMeters / 1000).toFixed(1)} km · {Math.ceil(r.durationSeconds / 60)} min · traffic delay {Math.ceil(r.trafficDelaySeconds / 60)} min <Button size="sm" className="float-end" onClick={() => choose(r, active.status === 'hospital_selected' ? 2 : 1)}>Choose</Button></ListGroup.Item>)}</ListGroup>}{route && <MapContainer center={point(active.accident)} zoom={13} style={{ height: 420, marginTop: 20 }}><TileLayer attribution="TomTom" url={mapUrl} /><Marker position={point(ambulance)} icon={ambulanceIcon} /><Polyline positions={route.geometry.map(point)} pathOptions={{ color: '#1677ff', weight: 5 }} /></MapContainer>}{active?.status === 'en_route_to_accident' && <Button className="mt-3" variant="success" onClick={arrive}>I've Arrived at Accident</Button>}{active?.status === 'at_accident' && <Card className="mt-3 p-3"><h3>Select hospital</h3>{hospitals.map((h) => <Button key={h._id} className="m-1" variant="outline-primary" onClick={() => chooseHospital(h)}>{h.name}</Button>)}</Card>}{active?.status === 'hospital_selected' && <Button className="mt-3" onClick={() => getRoutes(active.accident, active.hospital.location)}>Show TomTom alternate routes to hospital</Button>}{active?.status === 'en_route_to_hospital' && <Button className="mt-3" variant="success" onClick={arrive}>Arrived at Hospital</Button>}{active?.status === 'completed' && <Alert className="mt-3" variant="success">Trip completed.</Alert>}</Container>;
}
