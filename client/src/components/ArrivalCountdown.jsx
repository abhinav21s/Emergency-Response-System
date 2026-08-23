import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';

const tomTomKey = import.meta.env.VITE_TOMTOM_API_KEY || 'YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42';
const DEMO_DURATION_MS = 15_000; // 15 seconds for route animation

// Clean medical icon marker
const movingIcon = L.divIcon({
  className: '',
  html: `
    <div style="background: #dc2626; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.4); border: 2.5px solid white;">
      AMB
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/**
 * Interpolate a position along a polyline given a progress fraction 0–1.
 */
function interpolateAlongRoute(geometry, fraction) {
  if (!geometry || geometry.length < 2) return null;
  const totalSegments = geometry.length - 1;
  const rawIndex = fraction * totalSegments;
  const segIndex = Math.min(Math.floor(rawIndex), totalSegments - 1);
  const t = rawIndex - segIndex;
  const a = geometry[segIndex];
  const b = geometry[segIndex + 1];
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

/**
 * ArrivalCountdown
 * Props:
 *   route            — chosen route object {geometry, durationSeconds, distanceMeters, …}
 *   nextStatus       — 'at_accident' | 'completed'
 *   onArrived        (nextStatus) => void   — called once upon arrival
 *   onPositionUpdate ({ lat, lng }) => void — called continuously as marker animates
 *   buttonLabel      — string for the manual arrival button
 */
export default function ArrivalCountdown({
  route,
  nextStatus,
  onArrived,
  onPositionUpdate,
  buttonLabel = "Arrived at Destination",
}) {
  const [progress, setProgress] = useState(0); // 0–1
  const [markerPos, setMarkerPos] = useState(() => {
    const first = route?.geometry?.[0];
    return first ? [first.lat, first.lng] : null;
  });

  const arrivedRef = useRef(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  const currentCoordRef = useRef(null);

  useEffect(() => {
    if (!route?.geometry || route.geometry.length < 2) return;

    arrivedRef.current = false;
    startRef.current = null;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const frac = Math.min(elapsed / DEMO_DURATION_MS, 1);
      setProgress(frac);

      const pos = interpolateAlongRoute(route.geometry, frac);
      if (pos) {
        setMarkerPos([pos.lat, pos.lng]);
        currentCoordRef.current = pos;
        if (onPositionUpdate) {
          onPositionUpdate(pos);
        }
      }

      if (frac < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          onArrived(nextStatus);
        }
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [route]); // eslint-disable-line

  const handleManualArrive = () => {
    if (arrivedRef.current) return;
    arrivedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    onArrived(nextStatus);
  };

  const pct = Math.round(progress * 100);
  const secsLeft = Math.ceil((1 - progress) * (DEMO_DURATION_MS / 1000));

  // Map center from current route geometry
  const midIndex = route?.geometry ? Math.floor(route.geometry.length / 2) : 0;
  const centerLat = route?.geometry?.[midIndex]?.lat || 12.9716;
  const centerLng = route?.geometry?.[midIndex]?.lng || 77.5946;

  return (
    <div className="arrival-countdown">
      {/* Live Navigation Map */}
      {markerPos && route?.geometry && (
        <div className="countdown-map-wrap" style={{ height: '240px', borderRadius: '12px', overflow: 'hidden', margin: '12px 0 16px', border: '1px solid #cbd5e1' }}>
          <MapContainer center={[centerLat, centerLng]} zoom={13} className="map" scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution="&copy; TomTom"
              url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomTomKey}`}
            />
            <Polyline
              positions={route.geometry.map((p) => [p.lat, p.lng])}
              pathOptions={{ color: '#1359bd', weight: 6, opacity: 0.8 }}
            />
            <Marker position={markerPos} icon={movingIcon} />
          </MapContainer>
        </div>
      )}

      {/* Progress bar */}
      <div className="countdown-bar-wrap" style={{ background: '#e2e8f0', borderRadius: '8px', height: '10px', overflow: 'hidden', margin: '10px 0' }}>
        <div className="countdown-bar" style={{ width: `${pct}%`, background: '#1359bd', height: '100%', transition: 'width 0.1s linear' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <p className="countdown-label" style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>
          {pct < 100 ? `En route — ${secsLeft}s remaining (${pct}% completed)` : 'Arrived at Destination'}
        </p>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          ETA: {Math.max(1, Math.round(route.durationSeconds / 60))} min
        </span>
      </div>

      {/* Manual arrival button */}
      <button
        type="button"
        className="button primary arrive-btn"
        onClick={handleManualArrive}
        style={{ width: '100%', padding: '12px 18px', fontSize: '0.95rem', fontWeight: 700 }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
