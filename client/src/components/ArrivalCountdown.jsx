import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';

const tomTomKey = import.meta.env.VITE_TOMTOM_API_KEY;
const DEMO_DURATION_MS = 10_000; // 10 seconds for entire route regardless of real ETA

// Animated marker icon
const movingIcon = L.divIcon({
  className: '',
  html: `<span style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 6px #0008)">🚑</span>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/**
 * Interpolate a position along a polyline given a progress fraction 0–1.
 * We pick the segment covering that fraction of the total point count.
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
 *   route       — chosen route object {geometry, durationSeconds, distanceMeters, …}
 *   nextStatus  — 'at_accident' | 'completed'
 *   onArrived   (nextStatus) => void   — called once, whichever fires first
 *   buttonLabel — string for the manual arrival button
 */
export default function ArrivalCountdown({ route, nextStatus, onArrived, buttonLabel = "I've Arrived" }) {
  const [progress, setProgress] = useState(0); // 0–1
  const [markerPos, setMarkerPos] = useState(() => {
    const first = route?.geometry?.[0];
    return first ? [first.lat, first.lng] : null;
  });
  const [mapCenter] = useState(() => {
    // center of geometry
    const g = route?.geometry;
    if (!g || !g.length) return [12.9716, 77.5946];
    const midIndex = Math.floor(g.length / 2);
    return [g[midIndex].lat, g[midIndex].lng];
  });

  const arrivedRef = useRef(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!route?.geometry) return;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const frac = Math.min(elapsed / DEMO_DURATION_MS, 1);
      setProgress(frac);

      const pos = interpolateAlongRoute(route.geometry, frac);
      if (pos) setMarkerPos([pos.lat, pos.lng]);

      if (frac < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Animation completed — fire arrival if not already triggered manually
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          onArrived(nextStatus);
        }
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [route]); // eslint-disable-line

  const handleManualArrive = () => {
    if (arrivedRef.current) return; // already triggered
    arrivedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    onArrived(nextStatus);
  };

  const pct = Math.round(progress * 100);
  const secsLeft = Math.ceil((1 - progress) * (DEMO_DURATION_MS / 1000));

  return (
    <div className="arrival-countdown">
      {/* Map with animated ambulance */}
      {markerPos && route?.geometry && (
        <div className="countdown-map-wrap">
          <MapContainer center={mapCenter} zoom={13} className="map" scrollWheelZoom={false}>
            <TileLayer
              attribution="&copy; TomTom"
              url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomTomKey}`}
            />
            <Polyline
              positions={route.geometry.map((p) => [p.lat, p.lng])}
              pathOptions={{ color: '#1677ff', weight: 5, opacity: 0.7 }}
            />
            <MovingMarker pos={markerPos} icon={movingIcon} />
          </MapContainer>
        </div>
      )}

      {/* Progress bar */}
      <div className="countdown-bar-wrap">
        <div className="countdown-bar" style={{ width: `${pct}%` }} />
      </div>
      <p className="countdown-label">
        {pct < 100
          ? `En route… ${secsLeft}s remaining (demo speed)`
          : 'Arrived!'}
      </p>

      {/* Always-visible manual arrival button */}
      <button className="button primary arrive-btn" onClick={handleManualArrive}>
        {buttonLabel}
      </button>
    </div>
  );
}

/**
 * MovingMarker — updates its position without remounting the MapContainer.
 * react-leaflet Marker re-renders when `position` prop changes.
 */
function MovingMarker({ pos, icon }) {
  return <Marker position={pos} icon={icon} />;
}
