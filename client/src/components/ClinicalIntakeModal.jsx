import { useState, useEffect } from 'react';
import { api } from '../api';

export default function ClinicalIntakeModal({ trip, route, onSubmitSuccess, onClose }) {
  const defaultEta = route ? Math.ceil(route.durationSeconds / 60) : 5;
  const existing = trip?.clinicalIntake || {};

  const [patientName, setPatientName] = useState(existing.patientName || 'Emergency Patient');
  const [patientAge, setPatientAge] = useState(existing.patientAge || 35);
  const [chiefComplaint, setChiefComplaint] = useState(existing.chiefComplaint || 'Severe Trauma / Road Accident');
  const [bloodPressure, setBloodPressure] = useState(existing.vitals?.bloodPressure || '120/80');
  const [heartRate, setHeartRate] = useState(existing.vitals?.heartRate || 82);
  const [respiratoryRate, setRespiratoryRate] = useState(existing.vitals?.respiratoryRate || 18);
  const [spo2, setSpo2] = useState(existing.vitals?.spo2 || 97);
  const [treatments, setTreatments] = useState(existing.treatments || 'Oxygen administered (4L/min), IV line placed, cervical collar applied');
  const [etaMinutes, setEtaMinutes] = useState(existing.etaMinutes || defaultEta);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route) {
      const calculatedEta = Math.ceil(route.durationSeconds / 60);
      setEtaMinutes(calculatedEta);
    }
  }, [route]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trip?._id) return;
    setSaving(true);
    setError('');

    try {
      const payload = {
        patientName,
        patientAge: Number(patientAge),
        chiefComplaint,
        vitals: {
          bloodPressure,
          heartRate: Number(heartRate),
          respiratoryRate: Number(respiratoryRate),
          spo2: Number(spo2),
        },
        treatments,
        etaMinutes: Number(etaMinutes),
      };

      const res = await api(`/trips/${trip._id}/clinical-intake`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSaving(false);
      if (onSubmitSuccess) onSubmitSuccess(res.trip);
    } catch (err) {
      setError(err.message || 'Failed to submit clinical intake');
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Paramedic Hand-off
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', color: '#f8fafc', fontWeight: 700 }}>
              Patient Clinical Intake
            </h3>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.4rem',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          )}
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Enter patient status below. This assessment is transmitted in real-time to <strong>{trip?.hospital?.name || 'the receiving hospital'}</strong> and retained automatically across reroutes.
          </p>

          {/* Demographics */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Patient Name / ID
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Age
              </label>
              <input
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Chief Complaint / Clinical Category
            </label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>

          {/* Vital Signs Grid */}
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
              Vital Signs
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>BP (mmHg)</label>
                <input
                  type="text"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>Heart Rate</label>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>Resp Rate</label>
                <input
                  type="number"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '2px' }}>SpO2 (%)</label>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Treatments Administered */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              Treatments &amp; Drugs Administered
            </label>
            <textarea
              rows="2"
              value={treatments}
              onChange={(e) => setTreatments(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
            />
          </div>

          {/* Auto-filled ETA info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px 14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#1e40af', fontWeight: 600 }}>
              Auto-Calculated Route ETA:
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8' }}>
              {etaMinutes} min
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                background: '#1359bd',
                color: '#ffffff',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {saving ? 'Submitting to Hospital...' : 'Submit Patient Intake to Hospital'}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Close / Submit Later
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
