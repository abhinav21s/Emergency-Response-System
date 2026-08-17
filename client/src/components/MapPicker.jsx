import { useEffect } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

export const BENGALURU = [12.9716, 77.5946];
const icon = (ambulance, isAllocated) => {
  const color = ambulance.status === 'available' ? (ambulance.type === 'public' ? '#0b6cf0' : '#7c3aed') : '#64748b';
  const tag = ambulance.type === 'public' ? 'PUBLIC 108' : 'PRIVATE';
  return L.divIcon({
    className: `ambulance-icon${isAllocated ? ' allocated-marker' : ''}`,
    html: `<span style="background:${color}"><b>🚑</b><em>${tag}</em></span>`,
    iconSize: [72, 45],
    iconAnchor: [36, 23]
  });
};
function ClickToPlace({ onPick }) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}
export default function MapPicker({ ambulances = [], pick, onPick, accident, selected }) {
  useEffect(() => { delete L.Icon.Default.prototype._getIconUrl; }, []);
  return <div className="map-wrap"><MapContainer center={BENGALURU} zoom={12} className="map" scrollWheelZoom>
    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {ambulances.map((a) => <Marker key={a._id} position={[a.lat, a.lng]} icon={icon(a, selected?.ambulance?._id === a._id)}>
      <Popup><strong>{a.name}</strong><br />{a.type} · {a.status}<br />Driver: {a.driverName}</Popup>
    </Marker>)}
    {pick && <ClickToPlace onPick={onPick} />}
    {accident && <CircleMarker center={[accident.lat, accident.lng]} radius={11} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1 }}><Popup>Accident location</Popup></CircleMarker>}
    {selected && <>
      <CircleMarker center={[selected.ambulance.lat, selected.ambulance.lng]} radius={20} pathOptions={{ color: '#f59e0b', weight: 4, fillOpacity: 0 }} />
      <PolylineBridge from={accident} to={selected.ambulance} />
    </>}
  </MapContainer>{pick && <div className="map-hint">Click anywhere on the map to place the location</div>}</div>;
}
function PolylineBridge({ from, to }) { return from ? <Polyline positions={[[from.lat, from.lng], [to.lat, to.lng]]} pathOptions={{ color: '#ef4444', dashArray: '8 8', weight: 4 }} /> : null; }
