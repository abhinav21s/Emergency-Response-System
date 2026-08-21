import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';
import { socket } from '../socket';
import RoutePicker from '../components/RoutePicker';
import ArrivalCountdown from '../components/ArrivalCountdown';

// ─── Simple Ambulance Selector Screen (No password or ID needed) ─────────────
function LoginScreen({ onLogin }) {
  const [ambulances, setAmbulances] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/ambulances')
      .then((data) => {
        setAmbulances(data);
        if (data.length > 0) setSelectedId(data[0]._id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (amb) => {
    localStorage.setItem('driverSession', JSON.stringify(amb));
    onLogin(amb);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amb = ambulances.find((a) => a._id === selectedId);
    if (amb) handleSelect(amb);
  };

  return (
    <main className="driver">
      <Link to="/">← Dashboard</Link>
      <p className="eyebrow">AMBULANCE DRIVER APP</p>
      <h1>Select Your Ambulance</h1>
      <p>Choose which vehicle you are operating. You will immediately start receiving live dispatch calls on this screen.</p>
      
      {loading ? (
        <div className="notice">Loading available ambulance fleet…</div>
      ) : error ? (
        <p className="error">{error}</p>
      ) : (
        <form className="form-card" onSubmit={handleSubmit}>
          <label>
            Choose Ambulance from Fleet
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{ fontSize: '1.05rem', padding: '12px' }}
            >
              {ambulances.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.type.toUpperCase()} · {a.driverName || 'Driver'} · {a.vehicleNumber || 'No plate'}) — {a.status}
                </option>
              ))}
            </select>
          </label>

          <div style={{ display: 'grid', gap: '8px', maxHeight: '240px', overflowY: 'auto', marginTop: '10px', paddingRight: '4px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#607087', textTransform: 'uppercase' }}>Or quick select:</span>
            {ambulances.map((a) => (
              <button
                key={a._id}
                type="button"
                className={`hospital-select-item ${selectedId === a._id ? 'hospital-select-item--loading' : ''}`}
                style={{ padding: '10px 14px', border: selectedId === a._id ? '2px solid #1359bd' : '1px solid #e2e8f0', background: selectedId === a._id ? '#eef4ff' : '#fff' }}
                onClick={() => handleSelect(a)}
              >
                <span style={{ fontSize: '20px' }}>🚑</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <strong>{a.name}</strong>
                  <span style={{ display: 'block', fontSize: '0.82rem', color: '#607087' }}>
                    Driver: {a.driverName} · {a.type.toUpperCase()} · {a.status}
                  </span>
                </div>
                <span style={{ color: '#1359bd', fontWeight: 700 }}>Select →</span>
              </button>
            ))}
          </div>

          <button className="button primary" style={{ marginTop: '16px', width: '100%', fontSize: '1.05rem' }}>
            Open Driver Dashboard & Wait For Calls →
          </button>
        </form>
      )}
    </main>
  );
}

// ─── Rich Hospital Selection Component with Specialties & Map ────────────────
function HospitalSelect({ trip, onChosen }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  const fetchHospitals = () => {
    const params = trip?.accident
      ? `?lat=${trip.accident.lat}&lng=${trip.accident.lng}`
      : '';
    api(`/hospitals${params}`)
      .then(setHospitals)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHospitals();

    const onHospitalUpdated = (updated) => {
      setHospitals((prev) => prev.map((h) => h._id === updated._id ? { ...h, ...updated } : h));
    };

    socket.on('hospital:updated', onHospitalUpdated);
    return () => socket.off('hospital:updated', onHospitalUpdated);
  }, []); // eslint-disable-line

  const choose = async (hospital) => {
    setSelecting(hospital._id);
    try {
      const updated = await api(`/trips/${trip._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          hospital: {
            hospitalId: hospital._id,
            name: hospital.name,
            location: { lat: hospital.lat, lng: hospital.lng },
          },
        }),
      });
      onChosen(updated);
    } catch (err) {
      setError(err.message);
      setSelecting(null);
    }
  };

  const SPECIALTY_OPTIONS = [
    { key: 'all', label: 'All Hospitals' },
    { key: 'Cardiology', label: '❤️ Cardiology' },
    { key: 'Neurology', label: '🧠 Neurology' },
    { key: 'Trauma', label: '🚨 Trauma Care' },
    { key: 'Pediatrics', label: '👶 Pediatrics' },
    { key: 'Orthopedics', label: '🦴 Orthopedics' },
    { key: 'icu', label: '🫁 ICU Available' }
  ];

  const filteredHospitals = hospitals.filter((h) => {
    if (selectedSpecialty === 'all') return true;
    if (selectedSpecialty === 'icu') return (h.beds?.icu || 0) > 0;
    return h.specialties?.some((s) => s.toLowerCase().includes(selectedSpecialty.toLowerCase()));
  });

  if (loading) return <div className="notice">Loading verified hospital network near accident scene…</div>;
  if (error) return <p className="error">{error}</p>;

  const accidentCenter = [trip.accident.lat, trip.accident.lng];

  return (
    <section className="incoming" style={{ background: '#fff', border: '2px solid #e0e8f1', borderRadius: '16px', padding: '24px' }}>
      <p style={{ color: '#2563eb', fontWeight: 800, letterSpacing: '0.08em', margin: 0 }}>HOSPITAL HANDOFF & SPECIALTY ROUTING</p>
      <h2 style={{ fontSize: '1.75rem', color: '#10233c', margin: '4px 0 8px' }}>Select Destination Hospital</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
        Accident Scene: <b>{trip.accident.lat.toFixed(4)}, {trip.accident.lng.toFixed(4)}</b> · Hospitals sorted by proximity
      </p>

      {/* Specialty Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '12px 0 6px', margin: '8px 0' }}>
        {SPECIALTY_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className="chip-filter"
            style={{
              background: selectedSpecialty === opt.key ? '#1359bd' : '#f1f5f9',
              color: selectedSpecialty === opt.key ? '#fff' : '#334155',
              border: selectedSpecialty === opt.key ? '1px solid #1359bd' : '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setSelectedSpecialty(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Hospital Mini-Map */}
      <div style={{ height: '240px', borderRadius: '12px', overflow: 'hidden', margin: '12px 0 16px', border: '1px solid #e2e8f0' }}>
        <MapContainer center={accidentCenter} zoom={13} className="map" scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="&copy; TomTom"
            url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${import.meta.env.VITE_TOMTOM_API_KEY || 'YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42'}`}
          />
          <CircleMarker center={accidentCenter} radius={10} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }}>
            <Popup>🚨 Accident Location</Popup>
          </CircleMarker>
          {filteredHospitals.map((h) => (
            <Marker
              key={h._id}
              position={[h.lat, h.lng]}
              icon={L.divIcon({
                className: '',
                html: `<div style="background:#dc2626;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">🏥</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 28]
              })}
            >
              <Popup>
                <strong>{h.name}</strong><br />
                {h.distanceKm} km away<br />
                🛏 {h.beds?.icu || 0} ICU beds free
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Hospital List Cards */}
      <div className="hospital-select-list" style={{ display: 'grid', gap: '12px' }}>
        {filteredHospitals.length === 0 && (
          <p className="error" style={{ textAlign: 'center', padding: '20px' }}>
            No hospitals match the selected specialty filter. Try selecting 'All Hospitals'.
          </p>
        )}
        {filteredHospitals.map((h) => {
          const emergencyBeds = h.beds?.emergency ?? (h.bedsAvailable || 0);
          const icuBeds = h.beds?.icu ?? 0;
          return (
            <button
              key={h._id}
              className={`hospital-card-item${selecting === h._id ? ' hospital-select-item--loading' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: '#fff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
              onClick={() => choose(h)}
              disabled={selecting !== null}
            >
              <span style={{ fontSize: '32px' }}>🏥</span>
              
              <div style={{ flex: 1, display: 'grid', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{h.name}</strong>
                  {h.distanceKm != null && (
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                      📍 {h.distanceKm} km away
                    </span>
                  )}
                  <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {h.traumaLevel || 'Level 1 Trauma'}
                  </span>
                </div>

                {/* Capacity Badges */}
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#475569', flexWrap: 'wrap' }}>
                  <span>🛏 <b>{emergencyBeds}</b> Emergency Beds</span>
                  <span>🫁 <b style={{ color: icuBeds > 0 ? '#16a34a' : '#dc2626' }}>{icuBeds}</b> ICU Beds</span>
                  <span>👨‍⚕️ <b>{h.doctorsOnDuty || h.doctorsAvailable || 0}</b> Doctors on Duty</span>
                </div>

                {/* Specialties tags */}
                {h.specialties && h.specialties.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                    {h.specialties.map((spec, i) => (
                      <span key={i} style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="button primary" style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                  {selecting === h._id ? 'Selecting…' : 'Select & Route →'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}


// ─── Main Driver component ─────────────────────────────────────────────────────
export default function Driver() {
  const [ambulance, setAmbulance] = useState(
    () => JSON.parse(localStorage.getItem('driverSession') || 'null'),
  );
  const [call, setCall] = useState(null);
  const [trip, setTrip] = useState(null);

  // When ambulance is set, join the socket room and listen for events
  useEffect(() => {
    if (!ambulance) return;

    socket.emit('driver:join', ambulance._id);

    // Restore in-progress call from activeCall embedded in the ambulance doc
    if (ambulance.activeCall && !ambulance.activeCall.accepted) {
      setCall({ ...ambulance.activeCall, ambulance });
    }

    const onIncomingCall = (dispatch) => {
      setCall(dispatch);
      setAmbulance(dispatch.ambulance);
    };

    const onTripUpdated = (updated) => {
      // Only apply updates for our own ambulance
      if (String(updated.ambulance) === String(ambulance._id)) {
        setTrip(updated);
      }
    };

    socket.on('driver:incoming-call', onIncomingCall);
    socket.on('trip:updated', onTripUpdated);

    return () => {
      socket.off('driver:incoming-call', onIncomingCall);
      socket.off('trip:updated', onTripUpdated);
    };
  }, [ambulance?._id]); // eslint-disable-line

  const signOut = () => {
    localStorage.removeItem('driverSession');
    setAmbulance(null);
    setCall(null);
    setTrip(null);
  };

  // Accept the call — emits socket event AND patches trip so both systems hear it
  const accept = async () => {
    const tripId = call?.tripId || call?.ambulance?.activeCall?.tripId;
    socket.emit('driver:accepted', { ambulanceId: ambulance._id, ambulanceName: ambulance.name });
    const loaded = await api(`/trips/${tripId}`);
    setTrip({ ...loaded, status: 'accepted' });
  };

  // Arrive at a location — patches trip status
  const arrive = async (status) => {
    const updated = await api(`/trips/${trip._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setTrip(updated);
  };

  // ─── Not logged in ───────────────────────────────────────────────────────────
  if (!ambulance) {
    return <LoginScreen onLogin={setAmbulance} />;
  }

  // Derive a working "active trip" from whichever source has data
  const activeTrip =
    trip ||
    (call
      ? {
          _id: call.tripId || call?.ambulance?.activeCall?.tripId,
          status: 'dispatched',
          accident: call.accident,
        }
      : null);

  const status = activeTrip?.status || 'waiting';

  // ─── Logged in ──────────────────────────────────────────────────────────────
  return (
    <main className="driver">
      <Link to="/">← Dashboard</Link>
      <p className="eyebrow">AMBULANCE DRIVER APP</p>
      <h1>{ambulance.name}</h1>

      {/* Always-visible identity card */}
      <div className="vehicle-card">
        Signed in as <b>{ambulance.driverName}</b>
        <br />
        Vehicle: <b>{ambulance.vehicleNumber}</b>
        <br />
        Status:{' '}
        <b className={status === 'waiting' ? '' : 'accepted'}>
          {status === 'waiting' ? 'Waiting for dispatch' : status.replace(/_/g, ' ')}
        </b>
        <button className="text-button" onClick={signOut} style={{ marginLeft: 'auto' }}>
          Sign out
        </button>
      </div>

      {/* ── WAITING ──────────────────────────────────────────────────────────── */}
      {status === 'waiting' && (
        <div className="notice">
          Waiting for a dispatch. This screen updates the instant this ambulance is assigned to an
          emergency.
        </div>
      )}

      {/* ── INCOMING CALL ────────────────────────────────────────────────────── */}
      {status === 'dispatched' && call && (
        <section className="incoming">
          <p>INCOMING 108 CALL</p>
          <h2>Emergency dispatch</h2>
          <div>
            Accident location:{' '}
            <b>
              {call.accident.lat.toFixed(5)}, {call.accident.lng.toFixed(5)}
            </b>
          </div>
          {call.distanceKm && (
            <div>
              {call.distanceKm} km away · estimated <b>{call.etaMinutes} min</b>
            </div>
          )}
          <button className="button primary" onClick={accept}>
            Accept call
          </button>
        </section>
      )}

      {/* ── LEG 1: ROUTE PICKER (ambulance → accident) ───────────────────────── */}
      {status === 'accepted' && (
        <section className="incoming">
          <p>LEG 1 — ROUTE SELECTION</p>
          <h2>Route to accident</h2>
          <RoutePicker
            origin={{ lat: ambulance.lat, lng: ambulance.lng }}
            destination={activeTrip.accident}
            leg={1}
            trip={activeTrip}
            labels={{
              origin: `Your position (${ambulance.lat.toFixed(4)}, ${ambulance.lng.toFixed(4)})`,
              destination: `Accident (${activeTrip.accident.lat.toFixed(4)}, ${activeTrip.accident.lng.toFixed(4)})`,
            }}
            onChosen={setTrip}
          />
        </section>
      )}

      {/* ── LEG 1: COUNTDOWN (en route to accident) ──────────────────────────── */}
      {status === 'en_route_to_accident' && activeTrip.leg1Route && (
        <section className="incoming">
          <p>EN ROUTE TO ACCIDENT</p>
          <h2>Heading to the scene</h2>
          <ArrivalCountdown
            route={activeTrip.leg1Route}
            nextStatus="at_accident"
            onArrived={arrive}
            buttonLabel="I've Arrived at Accident"
          />
        </section>
      )}

      {/* ── AT ACCIDENT: HOSPITAL SELECTION ─────────────────────────────────── */}
      {status === 'at_accident' && (
        <HospitalSelect trip={activeTrip} onChosen={setTrip} />
      )}

      {/* ── HOSPITAL SELECTED: LEG 2 ROUTE PICKER (accident → hospital) ──────── */}
      {status === 'hospital_selected' && activeTrip.hospital && (
        <section className="incoming">
          <p>LEG 2 — ROUTE SELECTION</p>
          <h2>Route to hospital</h2>
          <RoutePicker
            origin={activeTrip.accident}
            destination={activeTrip.hospital.location}
            leg={2}
            trip={activeTrip}
            labels={{
              origin: `Accident (${activeTrip.accident.lat.toFixed(4)}, ${activeTrip.accident.lng.toFixed(4)})`,
              destination: activeTrip.hospital.name,
            }}
            onChosen={setTrip}
          />
        </section>
      )}

      {/* ── LEG 2: COUNTDOWN (en route to hospital) ──────────────────────────── */}
      {status === 'en_route_to_hospital' && activeTrip.leg2Route && (
        <section className="incoming">
          <p>EN ROUTE TO HOSPITAL</p>
          <h2>Transporting patient to {activeTrip.hospital?.name}</h2>
          <ArrivalCountdown
            route={activeTrip.leg2Route}
            nextStatus="completed"
            onArrived={arrive}
            buttonLabel="Arrived at Hospital"
          />
        </section>
      )}

      {/* ── COMPLETED ────────────────────────────────────────────────────────── */}
      {status === 'completed' && (
        <section className="incoming" style={{ borderColor: '#28774a', background: '#f0fdf4' }}>
          <p style={{ color: '#28774a' }}>TRIP COMPLETED</p>
          <h2>Patient handed off ✓</h2>
          <p style={{ color: '#516174' }}>
            Delivered to <b>{activeTrip.hospital?.name || 'hospital'}</b>. The dispatcher has been
            notified. You can sign out or wait for the next dispatch.
          </p>
        </section>
      )}
    </main>
  );
}
