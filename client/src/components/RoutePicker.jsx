import { useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';

const tomTomKey = import.meta.env.VITE_TOMTOM_API_KEY;

// Small divIcon for origin (ambulance or accident)
const originIcon = L.divIcon({
  className: '',
  html: `<span style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px #0007)">🚑</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Small divIcon for destination (accident or hospital)
const destIcon = L.divIcon({
  className: '',
  html: `<span style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px #0007)">📍</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 28],
});

const ROUTE_COLORS = ['#1677ff', '#f59e0b', '#10b981'];

function formatRoute(route) {
  const km = (route.distanceMeters / 1000).toFixed(1);
  const min = Math.ceil(route.durationSeconds / 60);
  const traffic = Math.ceil(route.trafficDelaySeconds / 60);
  return { km, min, traffic };
}

function center(origin, destination) {
  return [(origin.lat + destination.lat) / 2, (origin.lng + destination.lng) / 2];
}

/**
 * RoutePicker
 * Props:
 *   origin      {lat, lng}   — where the journey starts
 *   destination {lat, lng}   — where the journey ends
 *   leg         1 | 2        — which leg of the trip this is
 *   trip        Trip doc     — used for PATCH call
 *   onChosen    (updatedTrip) => void
 *   labels      { origin: string, destination: string }  — optional display labels
 */
export default function RoutePicker({ origin, destination, leg, trip, onChosen, labels = {} }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chosen, setChosen] = useState(null); // index of selected route

  const fetchRoutes = () => {
    setLoading(true);
    setError('');
    api('/routes', {
      method: 'POST',
      body: JSON.stringify({ origin, destination }),
    })
      .then((data) => setRoutes(data.routes))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoutes();
  }, []); // eslint-disable-line

  const choose = async (route, index) => {
    if (chosen !== null) return; // already chosen
    setChosen(index);
    try {
      const updated = await api(`/trips/${trip._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ leg, route }),
      });
      onChosen(updated);
    } catch (err) {
      setError(err.message);
      setChosen(null);
    }
  };

  if (loading) {
    return (
      <div className="route-picker-loading">
        <div className="spinner" />
        <p>Fetching TomTom traffic-aware routes…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="route-picker-loading">
        <p className="error" style={{ marginBottom: 12 }}>
          ⚠ Could not load routes: {error}
        </p>
        <button className="button secondary" style={{ width: '100%' }} onClick={fetchRoutes}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="route-picker">
      {/* Map preview */}
      <div className="route-picker-map">
        <MapContainer center={center(origin, destination)} zoom={13} className="map" scrollWheelZoom={false}>
          <TileLayer
            attribution="&copy; TomTom"
            url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomTomKey}`}
          />
          <Marker position={[origin.lat, origin.lng]} icon={originIcon} />
          <Marker position={[destination.lat, destination.lng]} icon={destIcon} />
          {routes.map((route, i) => (
            <Polyline
              key={i}
              positions={route.geometry.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: ROUTE_COLORS[i] || '#888',
                weight: chosen === i ? 6 : (chosen === null ? 4 : 2),
                opacity: chosen === null ? 1 : (chosen === i ? 1 : 0.3),
                dashArray: chosen !== null && chosen !== i ? '6 6' : undefined,
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Journey info */}
      <div className="route-picker-meta">
        <span className="route-from">
          <strong>From</strong> {labels.origin || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`}
        </span>
        <span className="route-arrow">→</span>
        <span className="route-to">
          <strong>To</strong> {labels.destination || `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`}
        </span>
      </div>

      {/* Route cards */}
      <p className="route-picker-hint">
        {chosen !== null ? 'Route confirmed — proceeding…' : 'Select your preferred route:'}
      </p>
      <div className="route-cards">
        {routes.map((route, i) => {
          const { km, min, traffic } = formatRoute(route);
          const isChosen = chosen === i;
          const isDimmed = chosen !== null && !isChosen;
          return (
            <button
              key={i}
              className={`route-card${isChosen ? ' route-card--chosen' : ''}${isDimmed ? ' route-card--dimmed' : ''}`}
              onClick={() => choose(route, i)}
              disabled={chosen !== null}
              style={{ '--route-color': ROUTE_COLORS[i] || '#888' }}
            >
              <span className="route-card-dot" style={{ backgroundColor: ROUTE_COLORS[i] || '#888' }} />
              <div className="route-card-body">
                <strong className="route-card-label">Route {i + 1}</strong>
                <span className="route-card-km">{km} km</span>
                <span className="route-card-min">{min} min</span>
                {traffic > 0 && (
                  <span className="route-card-traffic">+{traffic} min traffic</span>
                )}
              </div>
              {isChosen && <span className="route-card-check">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
