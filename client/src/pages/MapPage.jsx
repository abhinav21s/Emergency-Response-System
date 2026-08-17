import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { socket } from '../socket';
import MapPicker from '../components/MapPicker';

export default function MapPage() {
  const [ambulances, setAmbulances] = useState([]); const [pick, setPick] = useState(false); const [accident, setAccident] = useState(null); const [dispatch, setDispatch] = useState(null); const [message, setMessage] = useState('');
  useEffect(() => {
    api('/ambulances').then(setAmbulances);
    const add = (a) => setAmbulances((items) => [...items, a].sort((x, y) => x.name.localeCompare(y.name)));
    const created = (result) => { setDispatch(result); setAccident(result.accident); setAmbulances((items) => items.map((a) => a._id === result.ambulance._id ? result.ambulance : a)); setPick(false); };
    const reset = (items) => { setAmbulances(items); setDispatch(null); setAccident(null); setMessage('Demo reset — all ambulances are ready.'); };
    const noAvailability = (result) => { setAccident(result.accident); setDispatch(null); setMessage(result.message); };
    const accepted = (result) => setMessage(`${result.ambulanceName || 'Driver'} accepted the dispatch.`);
    socket.on('ambulance:added', add); socket.on('dispatch:created', created); socket.on('ambulances:reset', reset); socket.on('dispatch:no-availability', noAvailability); socket.on('dispatch:accepted', accepted);
    return () => { socket.off('ambulance:added', add); socket.off('dispatch:created', created); socket.off('ambulances:reset', reset); socket.off('dispatch:no-availability', noAvailability); socket.off('dispatch:accepted', accepted); };
  }, []);
  const locate = () => {
    setMessage('Requesting your location… If it is unavailable, click the map.'); setPick(false);
    if (!navigator.geolocation) return setPick(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => send({ lat: coords.latitude, lng: coords.longitude }), () => { setMessage('Location permission unavailable. Click the map to place the accident.'); setPick(true); }, { timeout: 7000 });
  };
  const send = async (point) => { setAccident(point); setMessage('Finding the nearest available ambulance…'); try { const result = await api('/call', { method: 'POST', body: JSON.stringify(point) }); setDispatch(result); setMessage(''); setPick(false); } catch (error) { setMessage(error.message); } };
  const reset = async () => { await api('/reset', { method: 'POST' }); };
  return <main className="page"><header><Link to="/">← Dashboard</Link><div><Link to="/add-ambulance">Add ambulance</Link><Link to="/driver">Driver view</Link></div></header><section className="map-layout"><div className="map-panel"><MapPicker ambulances={ambulances} pick={pick} onPick={send} accident={accident} selected={dispatch} /></div><aside className="dispatch-panel"><p className="eyebrow">LIVE COMMAND</p><h2>108 dispatch</h2><p>{ambulances.filter((a) => a.status === 'available').length} ambulances currently available</p><button className="button danger" onClick={locate}>Report accident / Call 108</button><button className="button secondary" onClick={() => { setPick(true); setMessage('Click the map to place the accident.'); }}>Place on map instead</button><button className="text-button" onClick={reset}>Reset demo</button>{message && <div className="notice">{message}</div>}{dispatch && <div className="dispatch-result"><strong>{dispatch.ambulance.name} dispatched</strong><span>{dispatch.ambulance.type} fleet · {dispatch.distanceKm} km away</span><span>Estimated arrival: {dispatch.etaMinutes} min <small>(straight-line estimate at 35 km/h)</small></span><span>Driver: {dispatch.ambulance.driverName}</span></div>}</aside></section></main>;
}
