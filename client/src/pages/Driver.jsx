import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';
import { socket } from '../socket';
import RoutePicker from '../components/RoutePicker';
import ArrivalCountdown from '../components/ArrivalCountdown';

const tomTomKey = import.meta.env.VITE_TOMTOM_API_KEY || 'YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42';

// ─── Global Incoming Dispatch Banner ──────────────────────────────────────────
// Always mounted — checks active calls on mount AND listens to socket broadcasts
function GlobalDispatchBanner({ onClaimAndAccept, currentAmbulanceId }) {
  const [activeCalls, setActiveCalls] = useState([]);

  const syncActiveCallsFromFleet = useCallback(async () => {
    try {
      const fleet = await api('/ambulances');
      if (Array.isArray(fleet)) {
        const dispatched = fleet
          .filter((a) => a.status === 'dispatched' && a.activeCall && !a.activeCall.accepted)
          .map((a) => ({
            tripId: a.activeCall.tripId,
            accident: a.activeCall.accident,
            distanceKm: a.activeCall.distanceKm,
            etaMinutes: a.activeCall.etaMinutes,
            ambulance: a,
            ambulanceId: a._id,
            ambulanceName: a.name,
          }));
        setActiveCalls(dispatched);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    // Initial fetch of any currently active dispatches
    syncActiveCallsFromFleet();

    const onCall = (dispatch) => {
      if (!dispatch) return;
      setActiveCalls((prev) => {
        const id = dispatch.ambulance?._id || dispatch.ambulanceId || dispatch.tripId;
        const filtered = prev.filter((c) => (c.ambulance?._id || c.ambulanceId || c.tripId) !== id);
        return [dispatch, ...filtered];
      });
    };

    const onAmbulanceUpdated = (amb) => {
      if (amb.status === 'available' || !amb.activeCall) {
        setActiveCalls((prev) => prev.filter((c) => (c.ambulance?._id || c.ambulanceId) !== amb._id));
      } else if (amb.status === 'dispatched' && amb.activeCall && !amb.activeCall.accepted) {
        onCall({
          tripId: amb.activeCall.tripId,
          accident: amb.activeCall.accident,
          distanceKm: amb.activeCall.distanceKm,
          etaMinutes: amb.activeCall.etaMinutes,
          ambulance: amb,
          ambulanceId: amb._id,
          ambulanceName: amb.name,
        });
      }
    };

    const onTripUpdated = (trip) => {
      if (trip.status === 'completed' || trip.status === 'accepted') {
        setActiveCalls((prev) =>
          prev.filter(
            (c) =>
              c.tripId !== trip._id &&
              (c.ambulance?._id || c.ambulanceId) !== (trip.ambulance?._id || trip.ambulance)
          )
        );
      }
    };

    const onReset = () => setActiveCalls([]);

    socket.on('driver:incoming-call', onCall);
    socket.on('dispatch:created', onCall);
    socket.on('ambulance:updated', onAmbulanceUpdated);
    socket.on('trip:updated', onTripUpdated);
    socket.on('demo:reset', onReset);
    socket.on('ambulances:reset', onReset);

    return () => {
      socket.off('driver:incoming-call', onCall);
      socket.off('dispatch:created', onCall);
      socket.off('ambulance:updated', onAmbulanceUpdated);
      socket.off('trip:updated', onTripUpdated);
      socket.off('demo:reset', onReset);
      socket.off('ambulances:reset', onReset);
    };
  }, [syncActiveCallsFromFleet]);

  if (activeCalls.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
      {activeCalls.map((callItem, idx) => {
        const callAmbId = callItem.ambulance?._id || callItem.ambulanceId;
        const isCurrentUnit = currentAmbulanceId && callAmbId === currentAmbulanceId;
        return (
          <div
            key={callItem.tripId || callAmbId || idx}
            style={{
              background: '#fff1f2',
              border: '2px solid #dc2626',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 4px 14px rgba(220,38,38,0.2)'
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#991b1b', letterSpacing: '0.04em' }}>
                EMERGENCY DISPATCH &mdash; {callItem.ambulance?.name || callItem.ambulanceName || '108 Ambulance Unit'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#7f1d1d', marginTop: '2px' }}>
                Accident: {callItem.accident?.lat?.toFixed(4)}, {callItem.accident?.lng?.toFixed(4)}
                {callItem.distanceKm ? ` &bull; ${callItem.distanceKm} km (ETA ${callItem.etaMinutes} min)` : ''}
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
                onClaimAndAccept(callItem);
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

// ─── Header bar ───────────────────────────────────────────────────────────────
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
        Choose your assigned vehicle below. When Auto-Follow is <strong>ON</strong>, the terminal will auto-switch to any dispatched unit.
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
                <span style={{ color: a.status === 'available' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                  {a.status}
                </span>
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
      setHospitals((prev) => prev.map((h) => (h._id === updated._id ? { ...h, ...updated } : h)));
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
    () => !localStorage.getItem('driverSession') && localStorage.getItem('driverAutoFollow') !== 'true'
  );

  const autoFollowRef = useRef(autoFollow);
  autoFollowRef.current = autoFollow;

  // Restore or find latest active dispatch if in AutoFollow mode or for saved ambulance
  const syncFleetAndActiveCalls = useCallback(async () => {
    try {
      const fleet = await api('/ambulances');
      setAmbulances(fleet);
      setLoadingAmbulances(false);

      if (autoFollowRef.current) {
        // If in Auto-Follow mode: find ANY ambulance with an active dispatch
        const activeDispatched = fleet.find((a) => a.status === 'dispatched' && a.activeCall);
        if (activeDispatched) {
          const ac = activeDispatched.activeCall;
          setAmbulance(activeDispatched);
          localStorage.setItem('driverSession', JSON.stringify(activeDispatched));
          setCall({
            tripId: ac.tripId,
            accident: ac.accident,
            distanceKm: ac.distanceKm,
            etaMinutes: ac.etaMinutes,
            ambulance: activeDispatched,
            ambulanceId: activeDispatched._id,
            ambulanceName: activeDispatched.name,
          });
          setShowVehicleSelect(false);
          if (ac.accepted && ac.tripId) {
            try {
              const tripData = await api(`/trips/${ac.tripId}`);
              if (tripData) setTrip(tripData);
            } catch (_) {}
          }
        }
      } else {
        // Locked to vehicle mode: check saved ambulance
        const savedSession = JSON.parse(localStorage.getItem('driverSession') || 'null');
        if (savedSession?._id) {
          const currentFresh = fleet.find((a) => a._id === savedSession._id);
          if (currentFresh) {
            setAmbulance(currentFresh);
            localStorage.setItem('driverSession', JSON.stringify(currentFresh));
            if (currentFresh.status === 'dispatched' && currentFresh.activeCall) {
              const ac = currentFresh.activeCall;
              setCall({
                tripId: ac.tripId,
                accident: ac.accident,
                distanceKm: ac.distanceKm,
                etaMinutes: ac.etaMinutes,
                ambulance: currentFresh,
                ambulanceId: currentFresh._id,
                ambulanceName: currentFresh.name,
              });
              setShowVehicleSelect(false);
              if (ac.accepted && ac.tripId) {
                try {
                  const tripData = await api(`/trips/${ac.tripId}`);
                  if (tripData) setTrip(tripData);
                } catch (_) {}
              }
            }
          }
        }
      }
    } catch (err) {
      setFleetError(err.message);
      setLoadingAmbulances(false);
    }
  }, []);

  useEffect(() => {
    syncFleetAndActiveCalls();
  }, [syncFleetAndActiveCalls]);

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
      // Immediately sync with any active dispatch
      syncFleetAndActiveCalls();
    }
  };

  // Select an ambulance — fetch fresh status from server and load active trip if dispatched
  const selectAmbulance = async (amb, incomingCall = null) => {
    try {
      const fresh = await api(`/ambulances/${amb._id}`).catch(() => amb);
      const selected = fresh || amb;
      localStorage.setItem('driverSession', JSON.stringify(selected));
      setAmbulance(selected);
      setShowVehicleSelect(false);

      if (incomingCall) {
        setCall(incomingCall);
        setTrip(null);
        return;
      }

      if (selected.status === 'dispatched' && selected.activeCall) {
        const ac = selected.activeCall;
        const restoredCall = {
          tripId: ac.tripId,
          accident: ac.accident,
          distanceKm: ac.distanceKm,
          etaMinutes: ac.etaMinutes,
          ambulance: selected,
          ambulanceId: selected._id,
          ambulanceName: selected.name,
        };
        setCall(restoredCall);
        setTrip(null);
        if (ac.accepted && ac.tripId) {
          try {
            const tripData = await api(`/trips/${ac.tripId}`);
            if (tripData) setTrip(tripData);
          } catch (_) {}
        }
        return;
      }

      setCall(null);
      setTrip(null);
    } catch (_) {
      setAmbulance(amb);
      setShowVehicleSelect(false);
    }
  };

  const changeVehicle = () => {
    setShowVehicleSelect(true);
  };

  const clearVehicle = () => {
    localStorage.removeItem('driverSession');
    setAmbulance(null);
    setCall(null);
    setTrip(null);
    syncFleetAndActiveCalls();
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

    const onAmbulanceUpdated = (updatedAmb) => {
      setAmbulances((prev) => prev.map((a) => (a._id === updatedAmb._id ? updatedAmb : a)));
    };

    const onDemoReset = () => {
      setCall(null);
      setTrip(null);
      setAmbulance(null);
      localStorage.removeItem('driverSession');
      setShowVehicleSelect(true);
      syncFleetAndActiveCalls();
    };

    socket.on('driver:incoming-call', onIncomingCall);
    socket.on('dispatch:created', onIncomingCall);
    socket.on('trip:updated', onTripUpdated);
    socket.on('ambulance:updated', onAmbulanceUpdated);
    socket.on('demo:reset', onDemoReset);
    socket.on('ambulances:reset', onDemoReset);

    return () => {
      socket.off('driver:incoming-call', onIncomingCall);
      socket.off('dispatch:created', onIncomingCall);
      socket.off('trip:updated', onTripUpdated);
      socket.off('ambulance:updated', onAmbulanceUpdated);
      socket.off('demo:reset', onDemoReset);
      socket.off('ambulances:reset', onDemoReset);
    };
  }, [syncFleetAndActiveCalls]);

  // When ambulance changes, join its socket room
  useEffect(() => {
    if (!ambulance?._id) return;
    socket.emit('driver:join', ambulance._id);
  }, [ambulance?._id]);

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
      {/* Control bar */}
      <DriverBar
        autoFollow={autoFollow}
        onToggleAutoFollow={toggleAutoFollow}
        ambulance={ambulance}
        onChangeVehicle={changeVehicle}
      />

      {/* Global Dispatch Banner */}
      <GlobalDispatchBanner
        currentAmbulanceId={ambulance?._id}
        onClaimAndAccept={(claimedCall) => {
          const amb = claimedCall.ambulance || { _id: claimedCall.ambulanceId, name: claimedCall.ambulanceName };
          selectAmbulance(amb, claimedCall);
        }}
      />

      {/* Vehicle selection screen */}
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
