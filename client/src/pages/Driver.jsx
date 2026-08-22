import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';
import { socket } from '../socket';
import RoutePicker from '../components/RoutePicker';
import ArrivalCountdown from '../components/ArrivalCountdown';

const tomTomKey = import.meta.env.VITE_TOMTOM_API_KEY || 'YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42';

// ─── Global Incoming Dispatch Banner ──────────────────────────────────────────
// Renders outside of any conditional — always mounted so it always receives events
function GlobalDispatchBanner({ onClaimAndAccept, currentAmbulanceId }) {
  const [activeCalls, setActiveCalls] = useState([]);

  useEffect(() => {
    const onCall = (dispatch) => {
      if (!dispatch) return;
      setActiveCalls((prev) => {
        const id = dispatch.ambulance?._id || dispatch.ambulanceId || dispatch.tripId;
        // Deduplicate by ambulance id
        const filtered = prev.filter((c) => (c.ambulance?._id || c.ambulanceId || c.tripId) !== id);
        return [dispatch, ...filtered];
      });
      // Auto-clear after 3 min
      setTimeout(() => {
        setActiveCalls((prev) => prev.filter((c) => (c.ambulance?._id || c.ambulanceId || c.tripId) !== (dispatch.ambulance?._id || dispatch.ambulanceId || dispatch.tripId)));
      }, 180000);
    };

    const onReset = () => setActiveCalls([]);

    socket.on('driver:incoming-call', onCall);
    socket.on('dispatch:created', onCall);
    socket.on('dispatch:reset', onReset);

    return () => {
      socket.off('driver:incoming-call', onCall);
      socket.off('dispatch:created', onCall);
      socket.off('dispatch:reset', onReset);
    };
  }, []);

  if (activeCalls.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
      {activeCalls.map((call, idx) => {
        const callAmbId = call.ambulance?._id || call.ambulanceId;
        const isCurrentUnit = currentAmbulanceId && callAmbId === currentAmbulanceId;
        return (
          <div
            key={idx}
            style={{
              background: '#fff1f2',
              border: '2px solid #dc2626',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              animation: 'pulseRed 2s infinite',
              boxShadow: '0 4px 14px rgba(220,38,38,0.2)'
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#991b1b', letterSpacing: '0.04em' }}>
                EMERGENCY DISPATCH &mdash; {call.ambulance?.name || call.ambulanceName || '108 Ambulance Unit'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#7f1d1d', marginTop: '2px' }}>
                Accident: {call.accident?.lat?.toFixed(4)}, {call.accident?.lng?.toFixed(4)}
                {call.distanceKm ? ` &bull; ${call.distanceKm} km (ETA ${call.etaMinutes} min)` : ''}
              </div>
            </div>
            <button
              type="button"
              style={{
                padding: '9px 18px',
                fontSize: '0.88rem',
                flexShrink: 0,
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              onClick={() => {
                onClaimAndAccept(call);
                setActiveCalls((prev) => prev.filter((_, i) => i !== idx));
              }}
            >
              {isCurrentUnit ? 'Accept Dispatch' : 'Accept as Driver for this Unit'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Header bar — shown on both selection screen and driver terminal ───────────
function DriverBar({ autoFollow, onToggleAutoFollow, ambulance, onChangeVehicle }) {
  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '12px 18px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <Link to="/" style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#1359bd', textDecoration: 'none' }}>
          &larr; Dashboard
        </Link>
        {ambulance && (
          <span style={{ fontSize: '0.85rem', color: '#475569' }}>
            Active: <strong style={{ color: '#0f172a' }}>{ambulance.name}</strong> ({ambulance.vehicleNumber || '108 Fleet'})
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Auto-Follow:</span>
        <button
          type="button"
          onClick={onToggleAutoFollow}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: autoFollow ? '1px solid #1359bd' : '1px solid #cbd5e1',
            background: autoFollow ? '#1359bd' : '#fff',
            color: autoFollow ? '#fff' : '#475569',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          {autoFollow ? 'ON — Auto-tracks dispatches' : 'OFF — Locked to vehicle'}
        </button>

        {ambulance && (
          <button
            type="button"
            onClick={onChangeVehicle}
            style={{
              padding: '5px 12px',
              fontSize: '0.8rem',
              color: '#475569',
              background: 'transparent',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Change Vehicle
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Vehicle Selection Screen ──────────────────────────────────────────────────
function VehicleSelectScreen({ onSelect, ambulances, loading, error }) {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (ambulances.length > 0 && !selectedId) {
      setSelectedId(ambulances[0]._id);
    }
  }, [ambulances, selectedId]);

  if (loading) return <div className="notice">Loading ambulance fleet...</div>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <p className="eyebrow">AMBULANCE DRIVER TERMINAL</p>
      <h1>Select Your Vehicle</h1>
      <p style={{ color: '#64748b', marginBottom: '20px' }}>
        Choose your assigned vehicle below. When Auto-Follow is <strong>ON</strong>, you do not need to select — the terminal will auto-switch to any dispatched unit.
      </p>

      <div style={{ display: 'grid', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
        {ambulances.map((a) => (
          <button
            key={a._id}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              border: selectedId === a._id ? '2px solid #1359bd' : '1.5px solid #e2e8f0',
              background: selectedId === a._id ? '#eef4ff' : '#fff',
              borderRadius: '10px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onClick={() => {
              setSelectedId(a._id);
              onSelect(a);
            }}
          >
            <div style={{
              width: '40px', height: '40px',
              background: a.type === 'public' ? '#1359bd' : '#0f766e',
              borderRadius: '8px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a' }}>{a.name}</strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {a.driverName || 'Unassigned'} &bull; {a.type?.toUpperCase()} &bull; {a.vehicleNumber || 'No plate'} &bull;{' '}
                <span style={{ color: a.status === 'available' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{a.status}</span>
              </span>
            </div>
            <span style={{ color: '#1359bd', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
              Select &rarr;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Hospital Selection with Map ──────────────────────────────────────────────
function HospitalSelect({ trip, onChosen }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  useEffect(() => {
    const params = trip?.accident ? `?lat=${trip.accident.lat}&lng=${trip.accident.lng}` : '';
    api(`/hospitals${params}`)
      .then(setHospitals)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

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
    { key: 'Cardiology', label: 'Cardiology' },
    { key: 'Neurology', label: 'Neurology' },
    { key: 'Trauma', label: 'Trauma Care' },
    { key: 'Pediatrics', label: 'Pediatrics' },
    { key: 'Orthopedics', label: 'Orthopedics' },
    { key: 'icu', label: 'ICU Available' }
  ];

  const filteredHospitals = hospitals.filter((h) => {
    if (selectedSpecialty === 'all') return true;
    if (selectedSpecialty === 'icu') return (h.beds?.icu || 0) > 0;
    return h.specialties?.some((s) => s.toLowerCase().includes(selectedSpecialty.toLowerCase()));
  });

  if (loading) return <div className="notice">Loading hospital network near accident scene...</div>;
  if (error) return <p className="error">{error}</p>;

  const accidentCenter = [trip.accident.lat, trip.accident.lng];

  return (
    <section className="incoming" style={{ background: '#fff', border: '2px solid #e0e8f1', borderRadius: '16px', padding: '24px' }}>
      <p style={{ color: '#1359bd', fontWeight: 800, letterSpacing: '0.08em', margin: 0, fontSize: '0.8rem' }}>
        HOSPITAL HANDOFF — SPECIALTY ROUTING
      </p>
      <h2 style={{ fontSize: '1.6rem', color: '#10233c', margin: '4px 0 8px' }}>Select Destination Hospital</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
        Accident scene: <b>{trip.accident.lat.toFixed(4)}, {trip.accident.lng.toFixed(4)}</b> &bull; Sorted by proximity
      </p>

      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '12px 0 6px', margin: '8px 0' }}>
        {SPECIALTY_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSelectedSpecialty(opt.key)}
            style={{
              background: selectedSpecialty === opt.key ? '#1359bd' : '#f1f5f9',
              color: selectedSpecialty === opt.key ? '#fff' : '#334155',
              border: selectedSpecialty === opt.key ? '1px solid #1359bd' : '1px solid #e2e8f0',
              borderRadius: '20px', padding: '5px 14px', fontSize: '0.82rem',
              fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ height: '220px', borderRadius: '12px', overflow: 'hidden', margin: '12px 0 16px', border: '1px solid #e2e8f0' }}>
        <MapContainer center={accidentCenter} zoom={13} className="map" scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="&copy; TomTom"
            url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomTomKey}`}
          />
          <CircleMarker center={accidentCenter} radius={10} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }}>
            <Popup>Accident Location</Popup>
          </CircleMarker>
          {filteredHospitals.map((h) => (
            <Marker
              key={h._id}
              position={[h.lat, h.lng]}
              icon={L.divIcon({
                className: '',
                html: `<div style="background:#1359bd;color:white;border-radius:4px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">H</div>`,
                iconSize: [28, 28], iconAnchor: [14, 28]
              })}
            >
              <Popup>
                <strong>{h.name}</strong><br />
                {h.distanceKm} km &bull; ICU: {h.beds?.icu || 0}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {filteredHospitals.length === 0 && (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>No hospitals match this filter.</p>
        )}
        {filteredHospitals.map((h) => {
          const emergencyBeds = h.beds?.emergency ?? (h.bedsAvailable || 0);
          const icuBeds = h.beds?.icu ?? 0;
          return (
            <button
              key={h._id}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
                padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s', opacity: selecting && selecting !== h._id ? 0.5 : 1
              }}
              onClick={() => choose(h)}
              disabled={selecting !== null}
            >
              <div style={{ width: '42px', height: '42px', background: '#1359bd', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.97rem', color: '#0f172a' }}>{h.name}</strong>
                  {h.distanceKm != null && (
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 7px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>{h.distanceKm} km</span>
                  )}
                  <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 7px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>{h.traumaLevel || 'Level 1'}</span>
                </div>
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.83rem', color: '#475569', flexWrap: 'wrap' }}>
                  <span>Emergency Beds: <b>{emergencyBeds}</b></span>
                  <span>ICU Beds: <b style={{ color: icuBeds > 0 ? '#16a34a' : '#dc2626' }}>{icuBeds}</b></span>
                  <span>Doctors: <b>{h.doctorsOnDuty || h.doctorsAvailable || 0}</b></span>
                </div>
                {h.specialties?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {h.specialties.map((spec, i) => (
                      <span key={i} style={{ background: '#f1f5f9', color: '#334155', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{spec}</span>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ color: '#1359bd', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                {selecting === h._id ? 'Routing...' : 'Select'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Main Driver Component ─────────────────────────────────────────────────────
export default function Driver() {
  const [ambulances, setAmbulances] = useState([]);
  const [ambulance, setAmbulance] = useState(
    () => JSON.parse(localStorage.getItem('driverSession') || 'null')
  );
  const [autoFollow, setAutoFollow] = useState(
    () => localStorage.getItem('driverAutoFollow') === 'true'
  );
  const [call, setCall] = useState(null);
  const [trip, setTrip] = useState(null);
  const [loadingAmbulances, setLoadingAmbulances] = useState(true);
  const [fleetError, setFleetError] = useState('');
  const [showVehicleSelect, setShowVehicleSelect] = useState(
    // Show selection screen on first load if no vehicle is saved and autoFollow is off
    () => !localStorage.getItem('driverSession') && localStorage.getItem('driverAutoFollow') !== 'true'
  );

  const autoFollowRef = useRef(autoFollow);
  autoFollowRef.current = autoFollow;

  // Load the fleet list
  useEffect(() => {
    api('/ambulances')
      .then((data) => setAmbulances(data))
      .catch((err) => setFleetError(err.message))
      .finally(() => setLoadingAmbulances(false));
  }, []);

  // On mount: if a vehicle session is saved and it is already dispatched, restore its active trip
  useEffect(() => {
    const savedSession = JSON.parse(localStorage.getItem('driverSession') || 'null');
    if (!savedSession?._id) return;
    restoreAmbulanceState(savedSession);
  }, []); // eslint-disable-line

  // Fetches latest ambulance state from server and restores call/trip
  const restoreAmbulanceState = async (amb) => {
    try {
      // Get fresh ambulance data from server
      const fresh = await api(`/ambulances/${amb._id}`);
      if (!fresh) return;
      setAmbulance(fresh);
      localStorage.setItem('driverSession', JSON.stringify(fresh));

      if (fresh.status === 'dispatched' && fresh.activeCall) {
        const ac = fresh.activeCall;
        // Reconstruct a call object matching the dispatch event shape
        const restoredCall = {
          tripId: ac.tripId,
          accident: ac.accident,
          distanceKm: ac.distanceKm,
          etaMinutes: ac.etaMinutes,
          ambulance: fresh,
          ambulanceId: fresh._id,
          ambulanceName: fresh.name
        };
        setCall(restoredCall);
        setTrip(null);
        setShowVehicleSelect(false);
        // If already accepted (past dispatch), try to load the trip
        if (ac.accepted && ac.tripId) {
          try {
            const tripData = await api(`/trips/${ac.tripId}`);
            if (tripData) setTrip(tripData);
          } catch (_) { /* trip may not exist */ }
        }
      }
    } catch (err) {
      console.warn('Could not restore ambulance state:', err.message);
    }
  };

  const toggleAutoFollow = () => {
    const next = !autoFollow;
    setAutoFollow(next);
    autoFollowRef.current = next;
    localStorage.setItem('driverAutoFollow', String(next));
    if (!next && !ambulance) {
      setShowVehicleSelect(true);
    }
    if (next) {
      setShowVehicleSelect(false);
    }
  };

  // Select an ambulance — if already dispatched, restore its active call/trip
  const selectAmbulance = async (amb, incomingCall = null) => {
    localStorage.setItem('driverSession', JSON.stringify(amb));
    setAmbulance(amb);
    setShowVehicleSelect(false);

    if (incomingCall) {
      // Came from banner click — use the provided call directly
      setCall(incomingCall);
      setTrip(null);
      return;
    }

    // Check if this ambulance is already mid-dispatch
    if (amb.status === 'dispatched' && amb.activeCall) {
      const ac = amb.activeCall;
      const restoredCall = {
        tripId: ac.tripId,
        accident: ac.accident,
        distanceKm: ac.distanceKm,
        etaMinutes: ac.etaMinutes,
        ambulance: amb,
        ambulanceId: amb._id,
        ambulanceName: amb.name
      };
      setCall(restoredCall);
      setTrip(null);
      // If already accepted, also load the trip
      if (ac.accepted && ac.tripId) {
        try {
          const tripData = await api(`/trips/${ac.tripId}`);
          if (tripData) setTrip(tripData);
        } catch (_) { /* ignore */ }
      }
      return;
    }

    // Ambulance is available — start fresh
    setCall(null);
    setTrip(null);
  };

  const changeVehicle = () => {
    setShowVehicleSelect(true);
  };

  const clearVehicle = () => {
    localStorage.removeItem('driverSession');
    setAmbulance(null);
    setCall(null);
    setTrip(null);
    // Refresh the fleet list so the freed ambulance shows as available
    api('/ambulances')
      .then((data) => setAmbulances(data))
      .catch(() => {});
    setShowVehicleSelect(true);
  };

  // Socket event listeners
  useEffect(() => {
    const onIncomingCall = (dispatch) => {
      if (!dispatch) return;
      const currentSession = JSON.parse(localStorage.getItem('driverSession') || 'null');
      const isOurUnit =
        currentSession &&
        (dispatch.ambulance?._id === currentSession._id || dispatch.ambulanceId === currentSession._id);

      if (autoFollowRef.current) {
        const incomingAmb = dispatch.ambulance || { _id: dispatch.ambulanceId, name: dispatch.ambulanceName };
        localStorage.setItem('driverSession', JSON.stringify(incomingAmb));
        setAmbulance(incomingAmb);
        setCall(dispatch);
        setTrip(null);
        setShowVehicleSelect(false);
      } else if (isOurUnit) {
        setCall(dispatch);
        setTrip(null);
        if (dispatch.ambulance) setAmbulance(dispatch.ambulance);
        setShowVehicleSelect(false);
      }
    };

    const onTripUpdated = (updated) => {
      const currentSession = JSON.parse(localStorage.getItem('driverSession') || 'null');
      if (!currentSession) return;
      if (String(updated.ambulance) === String(currentSession._id)) {
        setTrip(updated);
        setShowVehicleSelect(false);
      }
    };

    // ambulance:updated fires when an ambulance's status changes (e.g. freed after trip completes)
    const onAmbulanceUpdated = (updatedAmb) => {
      // Refresh the fleet list so the vehicle shows as available again
      setAmbulances((prev) =>
        prev.map((a) => a._id === updatedAmb._id ? updatedAmb : a)
      );
      // If this is our current vehicle and it just became available,
      // it means the trip was completed — don't wipe state here, the user
      // sees the completed screen and can end session themselves.
    };

    // dispatch:reset fires on a manual demo reset — clear everything
    const onDemoReset = () => {
      setCall(null);
      setTrip(null);
      setAmbulance(null);
      localStorage.removeItem('driverSession');
      setShowVehicleSelect(true);
    };

    socket.on('driver:incoming-call', onIncomingCall);
    socket.on('dispatch:created', onIncomingCall);
    socket.on('trip:updated', onTripUpdated);
    socket.on('ambulance:updated', onAmbulanceUpdated);
    socket.on('demo:reset', onDemoReset);
    // dispatch:reset is emitted after trip completes — don't blindly clear state
    // so the completed screen stays visible until the user clicks 'End Session'

    return () => {
      socket.off('driver:incoming-call', onIncomingCall);
      socket.off('dispatch:created', onIncomingCall);
      socket.off('trip:updated', onTripUpdated);
      socket.off('ambulance:updated', onAmbulanceUpdated);
      socket.off('demo:reset', onDemoReset);
    };
  }, []);

  // When ambulance changes, join its socket room
  useEffect(() => {
    if (!ambulance?._id) return;
    socket.emit('driver:join', ambulance._id);
    // Do NOT restore old calls from DB — user explicitly selected this vehicle fresh
  }, [ambulance?._id]); // eslint-disable-line

  const accept = async () => {
    const tripId = call?.tripId || call?.ambulance?.activeCall?.tripId;
    socket.emit('driver:accepted', { ambulanceId: ambulance._id, ambulanceName: ambulance.name });
    const loaded = await api(`/trips/${tripId}`);
    setTrip({ ...loaded, status: 'accepted' });
  };

  const arrive = async (status) => {
    const updated = await api(`/trips/${trip._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setTrip(updated);
  };

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

  return (
    <main className="driver">
      {/* Control bar — always at top */}
      <DriverBar
        autoFollow={autoFollow}
        onToggleAutoFollow={toggleAutoFollow}
        ambulance={ambulance}
        onChangeVehicle={changeVehicle}
      />

      {/* Dispatch banner — always mounted, always receives socket events */}
      <GlobalDispatchBanner
        currentAmbulanceId={ambulance?._id}
        onClaimAndAccept={(claimedCall) => {
          const amb = claimedCall.ambulance || { _id: claimedCall.ambulanceId, name: claimedCall.ambulanceName };
          selectAmbulance(amb, claimedCall);
        }}
      />

      {/* Vehicle selection screen — shown when user is picking a vehicle */}
      {showVehicleSelect ? (
        <VehicleSelectScreen
          onSelect={selectAmbulance}
          ambulances={ambulances}
          loading={loadingAmbulances}
          error={fleetError}
        />
      ) : (
        <>
          <p className="eyebrow">AMBULANCE DRIVER TERMINAL</p>
          <h1>
            {ambulance
              ? ambulance.name
              : autoFollow
              ? 'Auto-Follow Active — Awaiting Dispatch...'
              : 'No Vehicle Selected'}
          </h1>

          {/* Vehicle identity card */}
          {ambulance && (
            <div className="vehicle-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operator</div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>{ambulance.driverName || 'On-Duty Driver'}</div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>
                  Vehicle: <b>{ambulance.vehicleNumber || '108 Fleet'}</b> &bull; Fleet: <b>{ambulance.type?.toUpperCase()}</b>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: status === 'waiting' ? '#64748b' : '#1359bd'
                }}>
                  {status === 'waiting' ? 'STANDBY' : status.replace(/_/g, ' ').toUpperCase()}
                </div>
              </div>
            </div>
          )}

          {/* Standby notice */}
          {status === 'waiting' && (
            <div className="notice" style={{ marginTop: '16px' }}>
              {autoFollow ? (
                <span><strong>Auto-Follow ON</strong> — the terminal will auto-switch to any dispatched ambulance. Stand by.</span>
              ) : ambulance ? (
                <span>Standby — waiting for {ambulance.name} to be dispatched to an emergency.</span>
              ) : (
                <span>No vehicle selected. Use the toggle above to switch to Auto-Follow, or click <strong>Change Vehicle</strong>.</span>
              )}
            </div>
          )}

          {/* INCOMING CALL */}
          {status === 'dispatched' && call && (
            <section className="incoming">
              <p style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em', color: '#dc2626' }}>
                INCOMING EMERGENCY DISPATCH
              </p>
              <h2>Emergency Assigned to {ambulance?.name}</h2>
              <div>
                Accident location: <b>{call.accident?.lat?.toFixed(5)}, {call.accident?.lng?.toFixed(5)}</b>
              </div>
              {call.distanceKm && (
                <div style={{ marginTop: '6px' }}>
                  Distance: <b>{call.distanceKm} km</b> &bull; ETA: <b>{call.etaMinutes} min</b>
                </div>
              )}
              <button className="button primary" onClick={accept} style={{ marginTop: '16px' }}>
                Accept Dispatch
              </button>
            </section>
          )}

          {/* LEG 1: ROUTE TO ACCIDENT */}
          {status === 'accepted' && (
            <section className="incoming">
              <p style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em' }}>LEG 1 — ROUTE TO ACCIDENT SCENE</p>
              <h2>Select Route</h2>
              <RoutePicker
                origin={{ lat: ambulance?.lat || activeTrip.accident.lat, lng: ambulance?.lng || activeTrip.accident.lng }}
                destination={activeTrip.accident}
                leg={1}
                trip={activeTrip}
                labels={{
                  origin: `Vehicle (${(ambulance?.lat || 12.9716).toFixed(4)}, ${(ambulance?.lng || 77.5946).toFixed(4)})`,
                  destination: `Accident (${activeTrip.accident.lat.toFixed(4)}, ${activeTrip.accident.lng.toFixed(4)})`,
                }}
                onChosen={setTrip}
              />
            </section>
          )}

          {/* LEG 1: EN ROUTE */}
          {status === 'en_route_to_accident' && activeTrip.leg1Route && (
            <section className="incoming">
              <p style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em' }}>EN ROUTE TO ACCIDENT SCENE</p>
              <h2>Heading to Scene</h2>
              <ArrivalCountdown
                route={activeTrip.leg1Route}
                nextStatus="at_accident"
                onArrived={arrive}
                buttonLabel="Arrived at Accident Scene"
              />
            </section>
          )}

          {/* AT ACCIDENT: HOSPITAL SELECTION */}
          {status === 'at_accident' && (
            <HospitalSelect trip={activeTrip} onChosen={setTrip} />
          )}

          {/* HOSPITAL SELECTED: LEG 2 ROUTE */}
          {status === 'hospital_selected' && activeTrip.hospital && (
            <section className="incoming">
              <p style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em' }}>LEG 2 — ROUTE TO HOSPITAL</p>
              <h2>Route to {activeTrip.hospital.name}</h2>
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

          {/* LEG 2: EN ROUTE TO HOSPITAL */}
          {status === 'en_route_to_hospital' && activeTrip.leg2Route && (
            <section className="incoming">
              <p style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em' }}>EN ROUTE TO HOSPITAL</p>
              <h2>Transporting to {activeTrip.hospital?.name}</h2>
              <ArrivalCountdown
                route={activeTrip.leg2Route}
                nextStatus="completed"
                onArrived={arrive}
                buttonLabel="Arrived at Hospital — Patient Handed Off"
              />
            </section>
          )}

          {/* COMPLETED */}
          {status === 'completed' && (
            <section className="incoming" style={{ borderColor: '#16a34a', background: '#f0fdf4' }}>
              <p style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em' }}>TRIP COMPLETED</p>
              <h2>Patient Handed Off</h2>
              <p style={{ color: '#516174' }}>
                Patient delivered to <b>{activeTrip.hospital?.name || 'hospital'}</b>. Returning to standby.
              </p>
              <button
                className="button"
                style={{ marginTop: '12px' }}
                onClick={clearVehicle}
              >
                End Session &amp; Select New Vehicle
              </button>
            </section>
          )}
        </>
      )}
    </main>
  );
}
