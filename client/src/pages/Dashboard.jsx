import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { socket } from '../socket';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api('/stats').then(setStats); socket.on('stats:updated', setStats); return () => socket.off('stats:updated', setStats); }, []);
  return <main className="landing"><p className="eyebrow">UNIFIED EMERGENCY RESPONSE</p><h1>The closest ambulance<br /><em>should always respond.</em></h1><p className="lede">A live proof-of-concept connecting public 108 and private fleets. When seconds count, ownership does not.</p>
    <section className="stats">{stats ? <>{[['Total fleet', stats.total], ['Public / 108', stats.public], ['Private fleet', stats.private], ['Ready now', stats.available]].map(([label, value]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</> : 'Loading live fleet…'}</section>
    <div className="actions">
      <Link className="button primary" to="/map">Open dispatch map →</Link>
      <Link className="button" to="/driver">Driver View (1-Click)</Link>
      <Link className="button secondary" to="/hospital-portal">🏥 Hospital Portal</Link>
      <Link className="button" to="/add-ambulance">Add ambulance</Link>
    </div>
  </main>;
}
