import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { ConfirmDialog } from '../components/Modal'
import { ChevronRight, Upload, FileText, Sheet, FileCheck, Plus } from 'lucide-react'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { events, updateEvent, deleteEvent, isAdmin } = useApp()
  const event = events.find(e => e.id === Number(id))
  const [editModal, setEditModal] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})

  if (!event) return (
    <div>
      <Header title="Events" subtitle="Manage curricular and extracurricular activities" />
      <div style={{ padding: 24, background: 'var(--bg)', minHeight: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="breadcrumb">
            <Link to="/events" style={{ color: 'var(--text-muted)' }}>Events</Link>
            <ChevronRight size={12} color="var(--text-muted)" />
            <span style={{ color: 'var(--text)' }}>{event.name}</span>
          </div>
        </div>

        <div className="card animate-in" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
          {/* Event header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>{event.name}</h2>
                <span style={{ background: statusColors[event.status] || 'var(--text-muted)', color: '#fff', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{event.status}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{event.category} · {event.mode}</div>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-dark" onClick={openEdit}>Update Event</button>
                <button className="btn btn-danger" onClick={() => setConfirm(true)}>Delete Event</button>
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', borderBottom: '1px solid var(--border)' }}>
            {/* Left: description + details */}
            <div style={{ padding: '20px 24px', borderRight: '1px solid var(--border)' }}>
              <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, color: 'var(--text)' }}>Event Description</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', marginBottom: 20 }}>{event.description}</p>

              <table style={{ fontSize: 13 }}>
                <tbody>
                  {detailRows.map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ padding: '8px 0', color: 'var(--text-muted)', width: 200, fontWeight: 600, borderBottom: '1px solid var(--bg)' }}>{label}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, borderBottom: '1px solid var(--bg)', color: 'var(--text)' }}>{value || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right: objectives + attachments */}
            <div style={{ padding: '20px 20px' }}>
              <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, color: 'var(--text)' }}>Objectives</h3>
              <ul style={{ paddingLeft: 18, marginBottom: 24 }}>
                {(event.objectives || []).map((obj, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5 }}>{obj}</li>
                ))}
                {(!event.objectives || !event.objectives.length) && <li style={{ fontSize: 13, color: 'var(--text-muted)' }}>No objectives listed</li>}
              </ul>

              <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 12, color: 'var(--text)' }}>Attachments:</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Upload Poster', icon: Upload, color: 'var(--orange)' },
                  { label: 'Program Flow (PDF)', icon: FileText, color: 'var(--orange)' },
                  { label: 'Attendance Sheet', icon: Sheet, color: 'var(--orange)' },
                  { label: 'After Event Report', icon: FileCheck, color: 'var(--orange)' },
                ].map(({ label, icon: Icon, color }) => (
                  <button key={label} className="btn btn-primary" style={{ background: color, justifyContent: 'flex-start', gap: 8, padding: '9px 14px' }}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isAdmin && (
        <Modal open={editModal} onClose={() => setEditModal(false)} title="Update Event"
          footer={<>
            <button className="btn btn-outline" onClick={() => setEditModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
          </>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Event Name *</label>
                <input className="form-input" value={form.name || ''} onChange={e => f('name', e.target.value)} />
                {errors.name && <span style={{ color: '#e74c3c', fontSize: 11 }}>{errors.name}</span>}
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Department *</label>
                <input className="form-input" value={form.department || ''} onChange={e => f('department', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Start Date & Time *</label>
                <input className="form-input" type="datetime-local" value={form.dateTime || ''} onChange={e => f('dateTime', e.target.value)} />
                {errors.dateTime && <span style={{ color: '#e74c3c', fontSize: 11 }}>{errors.dateTime}</span>}
              </div>
              <div className="form-group">
                <label>End Date & Time</label>
                <input className="form-input" type="datetime-local" value={form.endTime || ''} onChange={e => f('endTime', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Venue *</label>
                <input className="form-input" value={form.venue || ''} onChange={e => f('venue', e.target.value)} />
                {errors.venue && <span style={{ color: '#e74c3c', fontSize: 11 }}>{errors.venue}</span>}
              </div>
              <div className="form-group">
                <label>Participants</label>
                <input className="form-input" type="number" min="1" value={form.participants || ''} onChange={e => f('participants', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-input" value={form.status || 'Upcoming'} onChange={e => f('status', e.target.value)}>
                  {['Upcoming','Ongoing','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Mode</label>
                <select className="form-input" value={form.mode || 'Face-to-Face'} onChange={e => f('mode', e.target.value)}>
                  {['Face-to-Face','Online','Hybrid'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-input" rows={3} value={form.description || ''} onChange={e => f('description', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 13 }}>Objectives</label>
                <button className="btn btn-outline btn-sm" onClick={() => f('objectives', [...(form.objectives || []), ''])}><Plus size={12} /></button>
              </div>
              {(form.objectives || []).map((obj, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input className="form-input" value={obj} onChange={e => updateObj(i, e.target.value)} style={{ flex: 1 }} />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={handleDelete}
        title="Delete Event" message={`Delete "${event.name}"? This cannot be undone.`} />
    </div>
  )
}
