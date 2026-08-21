import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import MapPicker from '../components/MapPicker';

export default function AddAmbulance() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', type: 'public', driverName: '', vehicleNumber: '' });
  const [point, setPoint] = useState(null);
  const [pick, setPick] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const useMyLocation = () => {
    if (!navigator.geolocation) return setPick(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setPoint([coords.latitude, coords.longitude]); setPick(false); },
      () => setPick(true),
      { timeout: 7000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!point) return setError('Use your location or click the map to set an ambulance location.');
    setSaving(true);
    setError('');
    try {
      await api('/ambulances', {
        method: 'POST',
        body: JSON.stringify({ ...form, lat: point[0], lng: point[1] }),
      });
      // Bug 5 fix: navigate straight to map — no credentials screen shown
      navigate('/map');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page">
      <header><Link to="/">← Dashboard</Link></header>
      <div className="form-layout">
        <form className="form-card" onSubmit={submit}>
          <p className="eyebrow">EXPAND THE NETWORK</p>
          <h1>Add ambulance</h1>
          <label>Name / ID<input required name="name" value={form.name} onChange={set} placeholder="e.g. 108 India 19" /></label>
          <label>Fleet type
            <select name="type" value={form.type} onChange={set}>
              <option value="public">Public (108)</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label>Driver name<input required name="driverName" value={form.driverName} onChange={set} /></label>
          <label>Vehicle number<input required name="vehicleNumber" value={form.vehicleNumber} onChange={set} placeholder="KA-01-AB-1234" /></label>
          <button type="button" className="button secondary" onClick={useMyLocation}>Use my current location</button>
          <button type="button" className="button secondary" onClick={() => setPick(true)}>Click map to place it</button>
          {point && <p className="location-ok">Location set: {point[0].toFixed(5)}, {point[1].toFixed(5)}</p>}
          {error && <p className="error">{error}</p>}
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save ambulance'}
          </button>
        </form>
        <MapPicker
          pick={pick}
          onPick={({ lat, lng }) => { setPoint([lat, lng]); setPick(false); }}
          accident={point ? { lat: point[0], lng: point[1] } : null}
        />
      </div>
    </main>
  );
}
