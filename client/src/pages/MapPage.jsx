import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { socket } from '../socket';
import MapPicker from '../components/MapPicker';

export default function MapPage() {
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showAmbulances, setShowAmbulances] = useState(true);
  const [pick, setPick] = useState(false);
  const [accident, setAccident] = useState(null);
  const [dispatch, setDispatch] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api('/ambulances').then(setAmbulances);
    api('/hospitals').then(setHospitals);

    const addAmbulance = (a) => setAmbulances((items) => [...items, a].sort((x, y) => x.name.localeCompare(y.name)));
    const addHospital = (h) => setHospitals((items) => [...items, h].sort((x, y) => x.name.localeCompare(y.name)));
    const updateHospital = (updated) => setHospitals((items) => items.map((h) => h._id === updated._id ? updated : h));
    const created = (result) => {
      setDispatch(result);
      setAccident(result.accident);
      setAmbulances((items) => items.map((a) => a._id === result.ambulance._id ? result.ambulance : a));
      setPick(false);
    };
    const reset = (items) => {
      setAmbulances(items);
      setDispatch(null);
      setAccident(null);
      setMessage('Demo reset — all ambulances and dispatch states restored.');
    };
    const noAvailability = (result) => {
      setAccident(result.accident);
      setDispatch(null);
      setMessage(result.message);
    };
    const accepted = (result) => setMessage(`🚨 ${result.ambulanceName || 'Driver'} accepted the emergency dispatch.`);

    socket.on('ambulance:added', addAmbulance);
    socket.on('hospital:added', addHospital);
    socket.on('hospital:updated', updateHospital);
    socket.on('dispatch:created', created);
    socket.on('ambulances:reset', reset);
    socket.on('dispatch:no-availability', noAvailability);
    socket.on('dispatch:accepted', accepted);

    return () => {
      socket.off('ambulance:added', addAmbulance);
      socket.off('hospital:added', addHospital);
      socket.off('hospital:updated', updateHospital);
      socket.off('dispatch:created', created);
      socket.off('ambulances:reset', reset);
      socket.off('dispatch:no-availability', noAvailability);
      socket.off('dispatch:accepted', accepted);
    };
  }, []);

  const locate = () => {
    setMessage('Requesting device location… If unavailable, click anywhere on the map.');
    setPick(false);
    if (!navigator.geolocation) return setPick(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => send({ lat: coords.latitude, lng: coords.longitude }),
      () => {
        setMessage('Location permission unavailable. Click on the map to set accident spot.');
        setPick(true);
      },
      { timeout: 7000 }
    );
  };

  const send = async (point) => {
    setAccident(point);
    setMessage('Calculating nearest available ambulance across public & private fleets…');
    try {
      const result = await api('/call', { method: 'POST', body: JSON.stringify(point) });
      setDispatch(result);
      setMessage('');
      setPick(false);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const reset = async () => {
    await api('/reset', { method: 'POST' });
  };

  const totalIcu = hospitals.reduce((sum, h) => sum + (h.beds?.icu || 0), 0);
  const totalEmergency = hospitals.reduce((sum, h) => sum + (h.beds?.emergency || 0), 0);

  return (
    <main className="page">
      <header>
        <Link to="/">← Dashboard</Link>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <Link to="/hospital-portal">🏥 Hospital Portal</Link>
          <Link to="/add-ambulance">➕ Add Ambulance</Link>
          <Link to="/driver" className="button primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            Open Driver View →
          </Link>
        </div>
      </header>

      <section className="map-layout">
        <div className="map-panel">
          <MapPicker
            ambulances={showAmbulances ? ambulances : []}
            hospitals={hospitals}
            showHospitals={showHospitals}
            pick={pick}
            onPick={send}
            accident={accident}
            selected={dispatch}
          />
        </div>

        <aside className="dispatch-panel">
          <p className="eyebrow">COMMAND & CONTROL</p>
          <h2>108 Dispatch</h2>
          
          <div style={{ display: 'grid', gap: '6px', margin: '10px 0 16px', fontSize: '0.9rem', color: '#334155' }}>
            <div>🚑 <b>{ambulances.filter((a) => a.status === 'available').length}</b> of {ambulances.length} ambulances available</div>
            <div>🏥 <b>{hospitals.length}</b> registered hospitals on network</div>
            <div>🛏 <b>{totalEmergency}</b> emergency & <b>{totalIcu}</b> ICU beds active</div>
          </div>

          {/* Map Layer Filters */}
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Map Layers
            </span>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showAmbulances} onChange={(e) => setShowAmbulances(e.target.checked)} />
                🚑 Fleet
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showHospitals} onChange={(e) => setShowHospitals(e.target.checked)} />
                🏥 Hospitals
              </label>
            </div>
          </div>

          <button className="button danger" onClick={locate}>
            🚨 Report Accident / Call 108
          </button>
          
          <button className="button secondary" onClick={() => { setPick(true); setMessage('Click anywhere on map to drop accident pin.'); }}>
            📍 Drop Pin on Map
          </button>
          
          <button className="text-button" onClick={reset}>
            ↺ Reset Demo State
          </button>

          {message && <div className="notice">{message}</div>}

          {dispatch && (
            <div className="dispatch-result">
              <strong>🚑 {dispatch.ambulance.name} Dispatched</strong>
              <span>{dispatch.ambulance.type.toUpperCase()} fleet · {dispatch.distanceKm} km away</span>
              <span>Estimated Arrival: <b>{dispatch.etaMinutes} min</b></span>
              <span>Driver on duty: <b>{dispatch.ambulance.driverName}</b></span>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

