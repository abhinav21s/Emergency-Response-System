import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { socket } from '../socket';

export default function Driver() {
  const [ambulances, setAmbulances] = useState([]); const [selected, setSelected] = useState(''); const [call, setCall] = useState(null); const [accepted, setAccepted] = useState(false);
  useEffect(() => { api('/ambulances').then(setAmbulances); }, []);
  useEffect(() => {
    const receive = (result) => {
      setCall(result);
      setAccepted(false);
      setAmbulances((items) => items.map((item) => item._id === result.ambulance._id ? result.ambulance : item));
    };
    const reset = (items) => { setAmbulances(items); setCall(null); setAccepted(false); };
    const acceptedCall = ({ ambulance: updated }) => {
      setAmbulances((items) => items.map((item) => item._id === updated._id ? updated : item));
      if (updated._id === selected) setAccepted(true);
    };
    socket.on('driver:incoming-call', receive);
    socket.on('ambulances:reset', reset);
    socket.on('dispatch:accepted', acceptedCall);
    return () => { socket.off('driver:incoming-call', receive); socket.off('ambulances:reset', reset); socket.off('dispatch:accepted', acceptedCall); };
  }, [selected]);
  const join = (id) => {
    setSelected(id);
    const selectedAmbulance = ambulances.find((item) => item._id === id);
    const pendingCall = selectedAmbulance?.activeCall;
    setCall(pendingCall && !pendingCall.accepted ? { ambulance: selectedAmbulance, ...pendingCall } : null);
    setAccepted(Boolean(pendingCall?.accepted));
    if (id) socket.emit('driver:join', id);
  };
  const ambulance = ambulances.find((a) => a._id === selected);
  return <main className="driver"><Link to="/">← Dashboard</Link><p className="eyebrow">AMBULANCE TABLET SIMULATOR</p><h1>Driver station</h1><p>Select the ambulance represented by this browser tab. Only its assigned calls will appear here.</p><label>Ambulance<select value={selected} onChange={(e) => join(e.target.value)}><option value="">Choose an ambulance</option>{ambulances.map((a) => <option key={a._id} value={a._id}>{a.name} — {a.vehicleNumber}</option>)}</select></label>{ambulance && <div className="vehicle-card">Signed in as <b>{ambulance.driverName}</b><br />{ambulance.name} · <b>{ambulance.status}</b>{!call && ambulance.status === 'available' && <><hr />Listening for calls. Keep this tab open, then report an accident from the dispatch map. This alert will appear only if this ambulance is chosen as the nearest available vehicle.</>}{!call && ambulance.status === 'dispatched' && <><hr />This ambulance is already dispatched. Use Reset demo from the map before running another call.</>}</div>}{call && <section className="incoming"><p>INCOMING 108 CALL</p><h2>Emergency dispatch</h2><div>Accident: {call.accident.lat.toFixed(5)}, {call.accident.lng.toFixed(5)}</div><div>{call.distanceKm} km away · estimated {call.etaMinutes} min</div>{accepted ? <strong className="accepted">✓ Acceptance sent to dispatch</strong> : <button className="button primary" onClick={() => { socket.emit('driver:accepted', { ambulanceId: selected, ambulanceName: ambulance?.name }); setAccepted(true); }}>Accept call</button>}</section>}</main>;
}
