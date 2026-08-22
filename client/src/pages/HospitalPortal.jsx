import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';
import { socket } from '../socket';

const tomTomKey = import.meta.env.VITE_TOMTOM_API_KEY || 'YiM8ZHJlnpK4TezEC0VhMMKhd7FqnJ42';

// ─── Map Helper Components ───────────────────────────────────────────────────
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const newHospitalIcon = L.divIcon({
  className: '',
  html: `<div style="background:#1359bd;color:white;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid white;">H</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

// ─── Main Hospital Portal Component ──────────────────────────────────────────
export default function HospitalPortal() {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [newHospitalForm, setNewHospitalForm] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    lat: 12.9716,
    lng: 77.5946,
    phone: '',
    traumaLevel: 'Level 1 Trauma',
    specialties: 'Trauma & Emergency, Cardiology, ICU Care',
    emergencyBeds: 12,
    icuBeds: 6,
    doctorsOnDuty: 10
  });

  const fetchHospitals = () => {
    api('/hospitals')
      .then((data) => {
        setHospitals(data);
        if (data.length > 0 && !selectedHospital) {
          setSelectedHospital(data[0]);
        } else if (selectedHospital) {
          const fresh = data.find((h) => h._id === selectedHospital._id);
          if (fresh) setSelectedHospital(fresh);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const [incomingAlerts, setIncomingAlerts] = useState([]);

  useEffect(() => {
    fetchHospitals();

    const onHospitalUpdated = (updated) => {
      setHospitals((prev) => prev.map((h) => h._id === updated._id ? { ...h, ...updated } : h));
      setSelectedHospital((prev) => prev?._id === updated._id ? { ...prev, ...updated } : prev);
    };

    const onHospitalAdded = (added) => {
      setHospitals((prev) => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)));
    };

    const onIncomingPatient = (alert) => {
      setIncomingAlerts((prev) => [alert, ...prev]);
    };

    socket.on('hospital:updated', onHospitalUpdated);
    socket.on('hospital:added', onHospitalAdded);
    socket.on('hospital:incoming-patient', onIncomingPatient);

    return () => {
      socket.off('hospital:updated', onHospitalUpdated);
      socket.off('hospital:added', onHospitalAdded);
      socket.off('hospital:incoming-patient', onIncomingPatient);
    };
  }, []); // eslint-disable-line

  const updateSelected = async (updates) => {
    if (!selectedHospital) return;
    setSaving(true);
    try {
      const result = await api(`/hospitals/${selectedHospital._id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      setSelectedHospital(result);
      setNotice(`Updated ${result.name} capacity in real-time.`);
      setTimeout(() => setNotice(''), 3000);
    } catch (err) {
      setNotice(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Autocomplete search via TomTom Search API
  const handleSearchHospital = async (query) => {
    setFormData((prev) => ({ ...prev, name: query }));
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${tomTomKey}&lat=12.9716&lon=77.5946&radius=50000&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results) {
        const mapped = data.results.map((r) => ({
          name: r.poi?.name || r.address?.freeformAddress || query,
          display_name: r.address?.freeformAddress || r.poi?.name || query,
          lat: r.position?.lat,
          lng: r.position?.lon
        }));
        setSearchResults(mapped);
      }
    } catch (err) {
      console.warn('TomTom search error:', err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const selectHospitalLocation = (place) => {
    setFormData((prev) => ({
      ...prev,
      name: place.name || prev.name,
      lat: place.lat || prev.lat,
      lng: place.lng || prev.lng
    }));
    setSearchResults([]);
  };

  const handleMapPin = (lat, lng) => {
    setFormData((prev) => ({ ...prev, lat, lng }));
  };

  const handleRegisterHospital = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
        phone: formData.phone,
        traumaLevel: formData.traumaLevel,
        specialties: formData.specialties.split(',').map((s) => s.trim()).filter(Boolean),
        beds: {
          emergency: parseInt(formData.emergencyBeds, 10),
          icu: parseInt(formData.icuBeds, 10),
          total: parseInt(formData.emergencyBeds, 10) + parseInt(formData.icuBeds, 10) + 30
        },
        doctorsOnDuty: parseInt(formData.doctorsOnDuty, 10)
      };
      const created = await api('/hospitals', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setSelectedHospital(created);
      setNewHospitalForm(false);
      setNotice(`Registered "${created.name}" to the live hospital network.`);
      setTimeout(() => setNotice(''), 3500);
    } catch (err) {
      setNotice(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page" style={{ maxWidth: '1180px', margin: '0 auto' }}>
      <header>
        <Link to="/">Back to Dashboard</Link>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <Link to="/map">Command Map</Link>
          <Link to="/driver">Driver View</Link>
          <a
            href="http://localhost:3000/hospital/login"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#1359bd',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem'
            }}
          >
            Port 3000 Hospital Portal
          </a>
        </div>
      </header>

      <div style={{ margin: '10px 0 24px' }}>
        <p className="eyebrow">HOSPITAL NETWORK MANAGEMENT</p>
        <h1 style={{ fontSize: '2rem', color: '#10233c', margin: '4px 0' }}>Live Hospital Capacity Portal</h1>
        <p style={{ color: '#64748b' }}>
          Update bed availability, on-duty specialist rosters, and emergency diversion status in real-time. Changes broadcast immediately to all 108 ambulance drivers.
        </p>
      </div>

      {/* Live Incoming Ambulance Alerts */}
      {incomingAlerts.length > 0 && (
        <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
          {incomingAlerts.map((alert, idx) => (
            <div
              key={idx}
              style={{
                background: '#fff1f2',
                border: '2px solid #e11d48',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 14px rgba(225,29,72,0.15)',
                animation: 'pulse 2s infinite'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', background: '#dc2626', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                  <strong style={{ fontSize: '1rem', color: '#9f1239', display: 'block' }}>
                    INCOMING EMERGENCY PATIENT — {alert.ambulanceName}
                  </strong>
                  <span style={{ color: '#be123c', fontSize: '0.88rem', display: 'block' }}>
                    Destination: <b>{alert.hospital?.name}</b> &mdash; Driver: {alert.driverName} &mdash; ETA: <b>{alert.etaMinutes} min</b> ({alert.distanceKm} km)
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="button danger"
                style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0 }}
                onClick={() => setIncomingAlerts((prev) => prev.filter((_, i) => i !== idx))}
              >
                Acknowledge &mdash; Prepare ER Team
              </button>
            </div>
          ))}
        </div>
      )}

      {notice && (
        <div className="notice" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', marginBottom: '16px' }}>
          {notice}
        </div>
      )}

      {loading ? (
        <div className="notice">Loading registered hospital network...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>

          {/* Left Column: Hospital Directory List */}
          <aside style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Hospitals ({hospitals.length})</strong>
              <button
                type="button"
                className="button secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                onClick={() => setNewHospitalForm(!newHospitalForm)}
              >
                {newHospitalForm ? 'Close Form' : '+ Add New Hospital'}
              </button>
            </div>

            <div style={{ display: 'grid', gap: '8px', maxHeight: '580px', overflowY: 'auto' }}>
              {hospitals.map((h) => {
                const isSelected = selectedHospital?._id === h._id;
                return (
                  <button
                    key={h._id}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #1359bd' : '1px solid #f1f5f9',
                      background: isSelected ? '#eef4ff' : '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onClick={() => {
                      setSelectedHospital(h);
                      setNewHospitalForm(false);
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', background: isSelected ? '#1359bd' : '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSelected ? 'white' : '#64748b'} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.name}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        ICU: {h.beds?.icu || 0} &mdash; Doctors: {h.doctorsOnDuty || h.doctorsAvailable || 0} &mdash; {h.accepting ? 'Accepting' : 'On Diversion'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Column: Manage Selected Hospital or Register New Form */}
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '28px' }}>
            {newHospitalForm ? (
              /* Add New Hospital Form with Search & Interactive TomTom Map */
              <form onSubmit={handleRegisterHospital} style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.4rem', color: '#10233c', margin: 0 }}>Register New Hospital</h2>
                  <button
                    type="button"
                    className="button secondary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => setNewHospitalForm(false)}
                  >
                    Cancel
                  </button>
                </div>

                {/* Search / Autocomplete Field */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'grid', gap: '6px', fontWeight: 600 }}>
                    Hospital Name (Type to auto-locate on map)
                    <input
                      required
                      placeholder="e.g. Apollo Hospital, Manipal Hospital, Fortis..."
                      value={formData.name}
                      onChange={(e) => handleSearchHospital(e.target.value)}
                      style={{ fontSize: '1rem', padding: '10px 12px' }}
                    />
                  </label>

                  {isSearching && (
                    <span style={{ position: 'absolute', right: '12px', top: '38px', fontSize: '0.8rem', color: '#64748b' }}>
                      Searching...
                    </span>
                  )}

                  {/* Autocomplete Dropdown */}
                  {searchResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#fff',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      border: '1px solid #e2e8f0',
                      zIndex: 1000,
                      marginTop: '4px',
                      overflow: 'hidden'
                    }}>
                      {searchResults.map((place, idx) => (
                        <div
                          key={idx}
                          onClick={() => selectHospitalLocation(place)}
                          style={{
                            padding: '10px 14px',
                            borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                        >
                          <span style={{ fontWeight: 700, color: '#1359bd' }}>H</span>
                          <div>
                            <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>
                              {place.name || place.display_name.split(',')[0]}
                            </strong>
                            <small style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {place.display_name}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interactive TomTom Map Picker */}
                <div style={{ height: '260px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
                  <MapContainer center={[formData.lat, formData.lng]} zoom={13} className="map" scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      attribution="&copy; TomTom"
                      url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${tomTomKey}`}
                    />
                    <Marker position={[formData.lat, formData.lng]} icon={newHospitalIcon}>
                      <Popup>
                        <strong>{formData.name || 'New Hospital'}</strong><br />
                        {formData.lat}, {formData.lng}
                      </Popup>
                    </Marker>
                    <MapUpdater center={[formData.lat, formData.lng]} />
                    <MapClickHandler onLocationSelect={handleMapPin} />
                  </MapContainer>
                  <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(15,23,42,0.85)', color: '#fff', padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', zIndex: 1000, pointerEvents: 'none' }}>
                    Click map to reposition pin &mdash; ({formData.lat.toFixed(4)}, {formData.lng.toFixed(4)})
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    Latitude
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    Longitude
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    Emergency Desk Phone
                    <input
                      placeholder="080-4000-1234"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    Trauma Level
                    <select
                      value={formData.traumaLevel}
                      onChange={(e) => setFormData({ ...formData, traumaLevel: e.target.value })}
                    >
                      <option>Level 1 Major Trauma</option>
                      <option>Level 1 Multi-Specialty</option>
                      <option>Level 1 Cardiac Emergency</option>
                      <option>Level 1 Neuro Trauma</option>
                      <option>Level 2 Emergency Care</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    Emergency Beds
                    <input
                      type="number"
                      value={formData.emergencyBeds}
                      onChange={(e) => setFormData({ ...formData, emergencyBeds: e.target.value })}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    ICU Beds
                    <input
                      type="number"
                      value={formData.icuBeds}
                      onChange={(e) => setFormData({ ...formData, icuBeds: e.target.value })}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    Doctors On Duty
                    <input
                      type="number"
                      value={formData.doctorsOnDuty}
                      onChange={(e) => setFormData({ ...formData, doctorsOnDuty: e.target.value })}
                    />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '6px' }}>
                  Specialties on Duty (comma separated)
                  <input
                    placeholder="Cardiology, Neurology, Trauma & Emergency, Orthopedics"
                    value={formData.specialties}
                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  />
                </label>

                <button className="button primary" disabled={saving} style={{ padding: '12px', fontSize: '1rem', marginTop: '8px' }}>
                  {saving ? 'Registering...' : 'Save & Broadcast Hospital'}
                </button>
              </form>
            ) : selectedHospital ? (
              /* Manage Live Capacity */
              <div style={{ display: 'grid', gap: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '1.6rem', color: '#0f172a', margin: '0 0 6px' }}>
                      {selectedHospital.name}
                    </h2>
                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                      {selectedHospital.traumaLevel || 'Level 1 Trauma'}
                    </span>
                    <span style={{ marginLeft: '10px', color: '#64748b', fontSize: '0.85rem' }}>
                      {selectedHospital.lat.toFixed(4)}, {selectedHospital.lng.toFixed(4)}
                    </span>
                  </div>

                  {/* Accepting Emergencies Toggle Button */}
                  <button
                    type="button"
                    className={`button ${selectedHospital.accepting ? 'primary' : 'danger'}`}
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                    onClick={() => updateSelected({ accepting: !selectedHospital.accepting })}
                    disabled={saving}
                  >
                    {selectedHospital.accepting ? 'Accepting Emergencies' : 'On Diversion (Full)'}
                  </button>
                </div>

                {/* Capacity Adjustment Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>

                  {/* Emergency Beds */}
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Emergency Beds Free
                    </span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#10233c', display: 'block', marginBottom: '10px' }}>
                      {selectedHospital.beds?.emergency ?? 0}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="button secondary"
                        style={{ padding: '4px 12px', fontSize: '1rem', minWidth: '36px' }}
                        disabled={saving || (selectedHospital.beds?.emergency || 0) <= 0}
                        onClick={() => updateSelected({ beds: { emergency: Math.max(0, (selectedHospital.beds?.emergency || 0) - 1) } })}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="button primary"
                        style={{ padding: '4px 12px', fontSize: '1rem', minWidth: '36px' }}
                        disabled={saving}
                        onClick={() => updateSelected({ beds: { emergency: (selectedHospital.beds?.emergency || 0) + 1 } })}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* ICU Beds */}
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      ICU Beds Free
                    </span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: (selectedHospital.beds?.icu || 0) > 0 ? '#16a34a' : '#dc2626', display: 'block', marginBottom: '10px' }}>
                      {selectedHospital.beds?.icu ?? 0}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="button secondary"
                        style={{ padding: '4px 12px', fontSize: '1rem', minWidth: '36px' }}
                        disabled={saving || (selectedHospital.beds?.icu || 0) <= 0}
                        onClick={() => updateSelected({ beds: { icu: Math.max(0, (selectedHospital.beds?.icu || 0) - 1) } })}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="button primary"
                        style={{ padding: '4px 12px', fontSize: '1rem', minWidth: '36px' }}
                        disabled={saving}
                        onClick={() => updateSelected({ beds: { icu: (selectedHospital.beds?.icu || 0) + 1 } })}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Doctors On Duty */}
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      On-Duty Doctors
                    </span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#10233c', display: 'block', marginBottom: '10px' }}>
                      {selectedHospital.doctorsOnDuty || selectedHospital.doctorsAvailable || 0}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="button secondary"
                        style={{ padding: '4px 12px', fontSize: '1rem', minWidth: '36px' }}
                        disabled={saving || (selectedHospital.doctorsOnDuty || 0) <= 0}
                        onClick={() => updateSelected({ doctorsOnDuty: Math.max(0, (selectedHospital.doctorsOnDuty || 0) - 1) })}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        className="button primary"
                        style={{ padding: '4px 12px', fontSize: '1rem', minWidth: '36px' }}
                        disabled={saving}
                        onClick={() => updateSelected({ doctorsOnDuty: (selectedHospital.doctorsOnDuty || 0) + 1 })}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Specialties */}
                <div>
                  <strong style={{ fontSize: '0.95rem', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                    Active Specialties on Current Shift
                  </strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {['Trauma & Emergency', 'Cardiology', 'Cardiac Surgery', 'Neurology', 'Neurosurgery', 'Orthopedics', 'Pediatrics', 'ICU Care', 'Burns & Plastic'].map((spec) => {
                      const isActive = selectedHospital.specialties?.includes(spec);
                      return (
                        <button
                          key={spec}
                          type="button"
                          style={{
                            background: isActive ? '#1359bd' : '#f8fafc',
                            color: isActive ? '#fff' : '#64748b',
                            border: isActive ? '1px solid #1359bd' : '1px solid #e2e8f0',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            const current = selectedHospital.specialties || [];
                            const updated = isActive
                              ? current.filter((s) => s !== spec)
                              : [...current, spec];
                            updateSelected({ specialties: updated });
                          }}
                          disabled={saving}
                        >
                          {isActive ? '✓ ' : '+ '}{spec}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Select a hospital from the left directory to view and manage its live capacity.
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
