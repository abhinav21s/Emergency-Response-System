import { useEffect } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

export const BENGALURU = [12.9716, 77.5946];

const icon = (ambulance, isAllocated) => {
  const color = ambulance.status === 'available' ? (ambulance.type === 'public' ? '#1d4ed8' : '#6d28d9') : '#475569';
  const tag = ambulance.type === 'public' ? '108 PUBLIC' : 'PRIVATE';
  return L.divIcon({
    className: `ambulance-icon${isAllocated ? ' allocated-marker' : ''}`,
    html: `<div class="ambulance-pill" style="background:${color};">
      <span class="amb-symbol">🚑</span>
      <span class="amb-tag">${tag}</span>
    </div>`,
    iconSize: [96, 32],
    iconAnchor: [48, 16],
  });
};

const hospitalIcon = (h) => {
  const isAccepting = h.accepting !== false;
  const icuBeds = h.beds?.icu ?? 0;
  return L.divIcon({
    className: 'hospital-icon-pin',
    html: `<span style="background:${isAccepting ? '#dc2626' : '#64748b'};color:#fff;border:2px solid #fff;border-radius:16px;padding:2px 7px;display:flex;align-items:center;gap:4px;font-size:10px;font-weight:800;box-shadow:0 2px 8px #0004;white-space:nowrap;">
      <b style="font-size:13px;line-height:1">🏥</b>
      <span style="font-size:9px;letter-spacing:0.02em;">${icuBeds} ICU</span>
    </span>`,
    iconSize: [68, 26],
    iconAnchor: [34, 13]
  });
};

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

const tomTomKey = import.meta.env.VITE_TOMTOM_API_KEY || 'YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42';

export default function MapPicker({ ambulances = [], hospitals = [], showHospitals = true, pick, onPick, accident, selected }) {
  useEffect(() => { delete L.Icon.Default.prototype._getIconUrl; }, []);
  return (
    <div className="map-wrap">
      <MapContainer center={BENGALURU} zoom={12} className="map" scrollWheelZoom>
        <TileLayer
          attribution="&copy; TomTom"
          url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomTomKey}`}
        />
        
        {/* Ambulance Markers */}
        {ambulances.map((a) => (
          <Marker key={a._id} position={[a.lat, a.lng]} icon={icon(a, selected?.ambulance?._id === a._id)}>
            <Popup>
              <strong>{a.name}</strong><br />
              {a.type.toUpperCase()} fleet · {a.status}<br />
              Driver: {a.driverName} ({a.vehicleNumber || 'KA'})
            </Popup>
          </Marker>
        ))}

        {/* Hospital Markers */}
        {showHospitals && hospitals.map((h) => (
          <Marker key={h._id} position={[h.lat, h.lng]} icon={hospitalIcon(h)}>
            <Popup>
              <div style={{ maxWidth: '220px' }}>
                <strong style={{ fontSize: '1.05rem', color: '#10233c', display: 'block', marginBottom: '4px' }}>
                  🏥 {h.name}
                </strong>
                <span style={{ display: 'inline-block', background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                  {h.traumaLevel || 'Level 1 Trauma'}
                </span>
                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.4', marginBottom: '6px' }}>
                  <b>🛏 Beds:</b> {h.beds?.emergency || 0} Emergency · {h.beds?.icu || 0} ICU<br />
                  <b>👨‍⚕️ Doctors:</b> {h.doctorsOnDuty || h.doctorsAvailable || 0} on duty<br />
                  {h.phone && <span><b>📞</b> {h.phone}</span>}
                </div>
                {h.specialties && h.specialties.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                    {h.specialties.slice(0, 4).map((spec, i) => (
                      <span key={i} style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {pick && <ClickToPlace onPick={onPick} />}
        {accident && (
          <CircleMarker center={[accident.lat, accident.lng]} radius={11} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }}>
            <Popup>🚨 Accident Scene Location</Popup>
          </CircleMarker>
        )}
        {selected && (
          <>
            <CircleMarker center={[selected.ambulance.lat, selected.ambulance.lng]} radius={20} pathOptions={{ color: '#f59e0b', weight: 4, fillOpacity: 0 }} />
            <PolylineBridge from={accident} to={selected.ambulance} />
          </>
        )}
      </MapContainer>
      {pick && <div className="map-hint">Click anywhere on the map to place the accident scene</div>}
    </div>
  );
}
function PolylineBridge({ from, to }) { return from ? <Polyline positions={[[from.lat, from.lng], [to.lat, to.lng]]} pathOptions={{ color: '#ef4444', dashArray: '8 8', weight: 4 }} /> : null; }

