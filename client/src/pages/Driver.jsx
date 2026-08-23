import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';
import { socket } from '../socket';
import RoutePicker from '../components/RoutePicker';
import ArrivalCountdown from '../components/ArrivalCountdown';
import ClinicalIntakeModal from '../components/ClinicalIntakeModal';

const tomTomKey = import.meta.env.VITE_TOMTOM_API_KEY || 'YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42';
const HOSPITAL_TIMEOUT_SECONDS = 15; // 15s countdown for demo mode

// ─── Global Incoming Dispatch Banner ──────────────────────────────────────────
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
              boxShadow: '0 4px 14px rgba(220,38,38,0.2)',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#991b1b', letterSpacing: '0.04em' }}>
                EMERGENCY DISPATCH &mdash; {callItem.ambulance?.name || callItem.ambulanceName || '108 Ambulance Unit'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#7f1d1d', marginTop: '2px' }}>
                Accident: {callItem.accident?.lat?.toFixed(4)}, {callItem.accident?.lng?.toFixed(4)}
                {callItem.distanceKm ? ` • ${callItem.distanceKm} km (ETA ${callItem.etaMinutes} min)` : ''}
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
                cursor: 'pointer',
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
      gap: '12px',
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
            transition: 'all 0.15s',
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
              fontWeight: 600,
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
              transition: 'all 0.15s',
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
              justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: '0.85rem' }}>108</span>
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

// ─── Dynamic Hospital Selection Screen (Composite Score-Driven) ────────────────
function HospitalSelect({ trip, onChosen }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');

  const fetchRankedHospitals = useCallback(async () => {
    try {
      setLoading(true);
      const origin = trip?.accident || { lat: 12.9716, lng: 77.5946 };
      const excludeParam = (trip?.hospitalAttempts || [])
        .map((a) => a.hospitalId)
        .filter(Boolean)
        .join(',');
      
      const res = await api(
        `/hospitals?lat=${origin.lat}&lng=${origin.lng}&specialty=${selectedSpecialty}&excludeIds=${excludeParam}`
      );
      setHospitals(res);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [trip, selectedSpecialty]);

  useEffect(() => {
    fetchRankedHospitals();

    const onHospitalUpdated = (updated) => {
      setHospitals((prev) => prev.map((h) => (h._id === updated._id ? { ...h, ...updated } : h)));
    };
    socket.on('hospital:updated', onHospitalUpdated);
    return () => socket.off('hospital:updated', onHospitalUpdated);
  }, [fetchRankedHospitals]);

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
            compositeScore: hospital.compositeScore,
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
    { key: 'icu', label: 'ICU Available' },
  ];

  const accidentCenter = [trip.accident.lat, trip.accident.lng];

  return (
    <section className="incoming" style={{ background: '#fff', border: '2px solid #e0e8f1', borderRadius: '16px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <p style={{ color: '#1359bd', fontWeight: 800, letterSpacing: '0.08em', margin: 0, fontSize: '0.78rem' }}>
            INTELLIGENT HOSPITAL MATCHING — COMPOSITE DECISION ENGINE
          </p>
          <h2 style={{ fontSize: '1.5rem', color: '#10233c', margin: '4px 0 6px' }}>Select Destination Hospital</h2>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>
          Ranked by Travel Time, Beds &amp; Specialty
        </div>
      </div>

      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 10px' }}>
        Accident location: <b>{trip.accident.lat.toFixed(4)}, {trip.accident.lng.toFixed(4)}</b> &bull; Immediate departure upon selection
      </p>

      {/* Specialty Filter Buttons */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px 0 10px', margin: '4px 0 10px' }}>
        {SPECIALTY_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSelectedSpecialty(opt.key)}
            style={{
              background: selectedSpecialty === opt.key ? '#1359bd' : '#f1f5f9',
              color: selectedSpecialty === opt.key ? '#fff' : '#334155',
              border: selectedSpecialty === opt.key ? '1px solid #1359bd' : '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '5px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Map visualization */}
      <div style={{ height: '200px', borderRadius: '12px', overflow: 'hidden', margin: '8px 0 16px', border: '1px solid #e2e8f0' }}>
        <MapContainer center={accidentCenter} zoom={13} className="map" scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution="&copy; TomTom"
            url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomTomKey}`}
          />
          <CircleMarker center={accidentCenter} radius={10} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }}>
            <Popup>Accident Location</Popup>
          </CircleMarker>
          {hospitals.map((h, i) => (
            <Marker
              key={h._id}
              position={[h.lat, h.lng]}
              icon={L.divIcon({
                className: '',
                html: `<div style="background:${i === 0 ? '#16a34a' : '#1359bd'};color:white;border-radius:4px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">H${i + 1}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 28],
              })}
            >
              <Popup>
                <strong>{h.name}</strong><br />
                Rank #{i + 1} &bull; {h.distanceKm} km &bull; ICU Beds: {h.beds?.icu || 0}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {loading && <div className="notice">Evaluating hospital network capacity and travel times...</div>}
      {error && <p className="error">{error}</p>}

      {/* Hospital Ranked Cards */}
      <div style={{ display: 'grid', gap: '10px' }}>
        {hospitals.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>No suitable hospitals found for this filter.</p>
        )}
        {hospitals.map((h, index) => {
          const isTopChoice = index === 0;
          const emergencyBeds = h.beds?.emergency ?? (h.bedsAvailable || 0);
          const icuBeds = h.beds?.icu ?? 0;

          return (
            <button
              key={h._id}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: isTopChoice ? '#f8fafd' : '#fff',
                border: isTopChoice ? '2px solid #1359bd' : '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                opacity: selecting && selecting !== h._id ? 0.5 : 1,
                boxShadow: isTopChoice ? '0 4px 12px rgba(19, 89, 189, 0.08)' : 'none',
              }}
              onClick={() => choose(h)}
              disabled={selecting !== null}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  background: isTopChoice ? '#1359bd' : '#64748b',
                  color: 'white',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
                  flexShrink: 0,
                }}
              >
                #{index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>{h.name}</strong>
                  {isTopChoice && (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.03em' }}>
                      RECOMMENDED CHOICE
                    </span>
                  )}
                  {h.distanceKm != null && (
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 7px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {h.distanceKm} km
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: '#0f766e', fontWeight: 600, marginBottom: '4px' }}>
                  {h.recommendationReason || 'Optimal proximity and bed availability'}
                </div>

                <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', color: '#475569', flexWrap: 'wrap' }}>
                  <span>Emergency Beds: <b>{emergencyBeds}</b></span>
                  <span>ICU Beds: <b style={{ color: icuBeds > 0 ? '#16a34a' : '#dc2626' }}>{icuBeds}</b></span>
                  <span>ETA: <b>~{h.etaMinutes || 5} min</b></span>
                </div>
              </div>
              <span
                style={{
                  color: '#fff',
                  background: isTopChoice ? '#1359bd' : '#334155',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                {selecting === h._id ? 'Departing...' : isTopChoice ? 'Depart Now' : 'Select'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Parallel Hospital Confirmation Status Card with Live Timer ───────────────
function ParallelHospitalStatusCard({ trip, onOpenIntake, onTimeoutTriggered }) {
  const [secondsRemaining, setSecondsRemaining] = useState(HOSPITAL_TIMEOUT_SECONDS);
  const status = trip?.hospitalStatus || 'pending';
  const hospital = trip?.hospital;
  const timeoutTriggeredRef = useRef(false);

  useEffect(() => {
    if (status !== 'pending') return;
    setSecondsRemaining(HOSPITAL_TIMEOUT_SECONDS);
    timeoutTriggeredRef.current = false;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!timeoutTriggeredRef.current) {
            timeoutTriggeredRef.current = true;
            if (onTimeoutTriggered) onTimeoutTriggered();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hospital?.hospitalId, status]); // eslint-disable-line

  const getStatusBadge = () => {
    switch (status) {
      case 'confirmed':
        return <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.78rem' }}>ADMISSION CONFIRMED</span>;
      case 'declined':
        return <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.78rem' }}>DECLINED — REROUTING</span>;
      case 'timeout':
        return <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.78rem' }}>TIMEOUT — REROUTING</span>;
      case 'overridden':
        return <span style={{ background: '#ffedd5', color: '#c2410c', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.78rem' }}>SAFETY OVERRIDE ENGAGED</span>;
      default:
        return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '0.78rem' }}>AWAITING CONFIRMATION ({secondsRemaining}s)</span>;
    }
  };

  return (
    <div
      style={{
        background: status === 'confirmed' ? '#f0fdf4' : status === 'overridden' ? '#fff7ed' : '#ffffff',
        border: status === 'confirmed' ? '1.5px solid #86efac' : status === 'overridden' ? '1.5px solid #fdba74' : '1.5px solid #cbd5e1',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '16px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Hospital Notification Status
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {hospital?.name || 'Destination Hospital'}
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', flexWrap: 'wrap', gap: '10px' }}>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
          {status === 'confirmed' && 'Hospital emergency team is preparing resuscitation bay.'}
          {status === 'pending' && 'Ambulance is moving en route. Background response window active.'}
          {status === 'overridden' && 'Safety cap reached. Proceeding to nearest emergency facility.'}
          {(status === 'declined' || status === 'timeout') && 'Calculating optimal alternate route.'}
        </p>

        <button
          type="button"
          onClick={onOpenIntake}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            color: '#1e293b',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {trip?.clinicalIntake ? 'View / Edit Patient Intake' : '+ Record Clinical Intake'}
        </button>
      </div>

      {/* Attempt History List (if rerouted) */}
      {trip?.hospitalAttempts?.length > 1 && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
          <span style={{ fontWeight: 700, color: '#475569' }}>Routing History:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {trip.hospitalAttempts.map((att, idx) => (
              <span
                key={idx}
                style={{
                  background: att.outcome === 'confirmed' ? '#dcfce7' : att.outcome === 'pending' ? '#e0f2fe' : '#fee2e2',
                  color: att.outcome === 'confirmed' ? '#166534' : att.outcome === 'pending' ? '#0369a1' : '#991b1b',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                }}
              >
                #{idx + 1} {att.hospitalName} ({att.outcome})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
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

  // New state for clinical intake modal and live interpolation
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [interpolatedPos, setInterpolatedPos] = useState(null);
  const [rerouteNotice, setRerouteNotice] = useState('');

  const autoFollowRef = useRef(autoFollow);
  autoFollowRef.current = autoFollow;

  const syncFleetAndActiveCalls = useCallback(async () => {
    try {
      const fleet = await api('/ambulances');
      setAmbulances(fleet);
      setLoadingAmbulances(false);

      if (autoFollowRef.current) {
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
          if (ac.tripId) {
            try {
              const tripData = await api(`/trips/${ac.tripId}`);
              if (tripData) setTrip(tripData);
            } catch (_) {}
          }
        }
      } else {
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
              if (ac.tripId) {
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
      syncFleetAndActiveCalls();
    }
  };

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
        if (ac.tripId) {
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
    setShowIntakeModal(false);
    setRerouteNotice('');
    syncFleetAndActiveCalls();
    setShowVehicleSelect(true);
  };

  const tripRef = useRef(trip);
  tripRef.current = trip;

  const interpolatedPosRef = useRef(interpolatedPos);
  interpolatedPosRef.current = interpolatedPos;

  // ─── Trigger Reroute on Decline or Timeout ──────────────────────────────────
  const handleTriggerReroute = useCallback(
    async (reason = 'Hospital unavailable') => {
      const currentTrip = tripRef.current;
      if (!currentTrip?._id) return;
      const currentPos = interpolatedPosRef.current || currentTrip.accident || { lat: 12.9716, lng: 77.5946 };

      try {
        setRerouteNotice(`Rerouting from current location (${currentPos.lat.toFixed(4)}, ${currentPos.lng.toFixed(4)})...`);
        const res = await api(`/trips/${currentTrip._id}/reroute`, {
          method: 'POST',
          body: JSON.stringify({
            currentPosition: currentPos,
            requiredSpecialty: 'all',
          }),
        });

        if (res.trip) {
          setTrip(res.trip);
          tripRef.current = res.trip;
          setRerouteNotice(res.rerouteReason || `Rerouted to ${res.newHospital?.name}`);
          setTimeout(() => setRerouteNotice(''), 8000);
        }
      } catch (err) {
        setRerouteNotice(`Reroute notice: ${err.message}`);
        setTimeout(() => setRerouteNotice(''), 6000);
      }
    },
    []
  );

  // ─── Socket Event Handlers ──────────────────────────────────────────────────
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
      const currentTrip = tripRef.current;
      const isOurTrip = currentTrip && String(currentTrip._id) === String(updated._id);
      const isOurAmbulance = currentSession && String(updated.ambulance) === String(currentSession._id);

      if (isOurTrip || isOurAmbulance || autoFollowRef.current) {
        setTrip(updated);
        tripRef.current = updated;
        setShowVehicleSelect(false);
      }
    };

    const onHospitalResponse = (payload) => {
      const currentTrip = tripRef.current;
      const isMatch = !payload.tripId || (currentTrip && String(currentTrip._id) === String(payload.tripId));
      if (currentTrip && isMatch) {
        setTrip((prev) => (prev ? { ...prev, hospitalStatus: payload.outcome } : prev));
        if (tripRef.current) {
          tripRef.current = { ...tripRef.current, hospitalStatus: payload.outcome };
        }
        if (payload.outcome === 'declined' || payload.outcome === 'timeout') {
          handleTriggerReroute(payload.reason);
        }
      }
    };

    const onHospitalDeclined = (payload) => {
      const currentTrip = tripRef.current;
      const isMatch = !payload.tripId || (currentTrip && String(currentTrip._id) === String(payload.tripId));
      if (currentTrip && isMatch) {
        setTrip((prev) => (prev ? { ...prev, hospitalStatus: 'declined' } : prev));
        if (tripRef.current) {
          tripRef.current = { ...tripRef.current, hospitalStatus: 'declined' };
        }
        handleTriggerReroute(payload.reason);
      }
    };

    const onRerouted = (payload) => {
      const currentTrip = tripRef.current;
      if (currentTrip && String(currentTrip._id) === String(payload.tripId)) {
        setRerouteNotice(payload.rerouteReason || `Rerouted to ${payload.newHospital?.name}`);
        setTimeout(() => setRerouteNotice(''), 8000);
      }
    };

    const onAmbulanceUpdated = (updatedAmb) => {
      setAmbulances((prev) => prev.map((a) => (a._id === updatedAmb._id ? updatedAmb : a)));
    };

    const onDemoReset = () => {
      setCall(null);
      setTrip(null);
      setAmbulance(null);
      setShowIntakeModal(false);
      setRerouteNotice('');
      localStorage.removeItem('driverSession');
      setShowVehicleSelect(true);
      syncFleetAndActiveCalls();
    };

    socket.on('driver:incoming-call', onIncomingCall);
    socket.on('dispatch:created', onIncomingCall);
    socket.on('trip:updated', onTripUpdated);
    socket.on('trip:hospital-response', onHospitalResponse);
    socket.on('trip:hospital-declined', onHospitalDeclined);
    socket.on('trip:rerouted', onRerouted);
    socket.on('ambulance:updated', onAmbulanceUpdated);
    socket.on('demo:reset', onDemoReset);
    socket.on('ambulances:reset', onDemoReset);

    return () => {
      socket.off('driver:incoming-call', onIncomingCall);
      socket.off('dispatch:created', onIncomingCall);
      socket.off('trip:updated', onTripUpdated);
      socket.off('trip:hospital-response', onHospitalResponse);
      socket.off('trip:hospital-declined', onHospitalDeclined);
      socket.off('trip:rerouted', onRerouted);
      socket.off('ambulance:updated', onAmbulanceUpdated);
      socket.off('demo:reset', onDemoReset);
      socket.off('ambulances:reset', onDemoReset);
    };
  }, [syncFleetAndActiveCalls, trip, handleTriggerReroute]);

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

  // Hospital chosen handler: immediately loads route and opens intake modal
  const handleHospitalChosen = (updatedTrip) => {
    setTrip(updatedTrip);
    // Show clinical intake form to paramedic after selection
    setShowIntakeModal(true);
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

      {/* Reroute Alert Toast */}
      {rerouteNotice && (
        <div
          style={{
            background: '#fff7ed',
            border: '2px solid #ea580c',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '16px',
            color: '#9a3412',
            fontWeight: 700,
            fontSize: '0.92rem',
            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)',
          }}
        >
          {rerouteNotice}
        </div>
      )}

      {/* Clinical Intake Modal */}
      {showIntakeModal && trip && (
        <ClinicalIntakeModal
          trip={trip}
          route={trip.leg2Route}
          onSubmitSuccess={(updatedTrip) => {
            setTrip(updatedTrip);
            setShowIntakeModal(false);
          }}
          onClose={() => setShowIntakeModal(false)}
        />
      )}

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
                  color: status === 'waiting' ? '#64748b' : '#1359bd',
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
            <HospitalSelect trip={activeTrip} onChosen={handleHospitalChosen} />
          )}

          {/* HOSPITAL SELECTED: LEG 2 ROUTE */}
          {status === 'hospital_selected' && activeTrip.hospital && (
            <section className="incoming">
              <ParallelHospitalStatusCard
                trip={activeTrip}
                onOpenIntake={() => setShowIntakeModal(true)}
                onTimeoutTriggered={() => handleTriggerReroute('Hospital response timed out')}
              />
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
                onChosen={(t) => {
                  setTrip(t);
                  // Ensure clinical intake modal opens if not already submitted
                  if (!t.clinicalIntake) {
                    setShowIntakeModal(true);
                  }
                }}
              />
            </section>
          )}

          {/* LEG 2: EN ROUTE TO HOSPITAL */}
          {status === 'en_route_to_hospital' && activeTrip.leg2Route && (
            <section className="incoming">
              <ParallelHospitalStatusCard
                trip={activeTrip}
                onOpenIntake={() => setShowIntakeModal(true)}
                onTimeoutTriggered={() => handleTriggerReroute('Hospital response timed out')}
              />

              <p style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em' }}>EN ROUTE TO HOSPITAL</p>
              <h2>Transporting to {activeTrip.hospital?.name}</h2>

              <ArrivalCountdown
                key={`${activeTrip.hospital?.hospitalId || activeTrip.hospital?.name || 'leg2'}_${activeTrip.attemptCount || 1}`}
                route={activeTrip.leg2Route}
                nextStatus="completed"
                onPositionUpdate={(pos) => setInterpolatedPos(pos)}
                onArrived={arrive}
                buttonLabel={`Arrived at ${activeTrip.hospital?.name || 'Hospital'} — Patient Handed Off`}
              />
            </section>
          )}

          {/* COMPLETED */}
          {status === 'completed' && (
            <section className="incoming" style={{ borderColor: '#16a34a', background: '#f0fdf4' }}>
              <p style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.08em' }}>TRIP COMPLETED</p>
              <h2>Patient Handed Off</h2>
              <p style={{ color: '#516174' }}>
                Patient delivered to <b>{activeTrip.hospital?.name || trip?.hospital?.name || 'hospital'}</b>. Returning to standby.
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
