import React, { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import { User, ChevronRight, Calendar, Clock, BookOpen } from 'lucide-react'

export default function FacultyProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, faculty, updateFaculty, isAdmin } = useApp()

  const member = React.useMemo(() => {
    let baseRecord = null
    if (id) {
      baseRecord = faculty.find(f => f.id === Number(id))
    } else if (user && user.role === 'faculty') {
      const norm = (user.userNumber || '').trim().replace('#', '')
      baseRecord = (faculty || []).find(f => {
        const fNum = (String(f.facultyNumber || '') || String(f.dynamic_data?.['Faculty Number'] || '')).trim().replace('#', '')
        return fNum === norm
      })
    }

    if (!baseRecord) return null

    // Automatic Synchronization Logic: 
    // If the selected record is a skeleton/empty, pull details from any complete record sharing the same Faculty Number.
    const fNum = baseRecord.facultyNumber || baseRecord.dynamic_data?.['Faculty Number']
    if (fNum && (!baseRecord.lastName || baseRecord.lastName === '—')) {
      const completePeer = (faculty || []).find(f => 
        f.id !== baseRecord.id && 
        (f.facultyNumber === fNum || f.dynamic_data?.['Faculty Number'] === fNum) &&
        (f.lastName && f.lastName !== '—')
      )
      
      if (completePeer) {
        // Return a merged object to ensure the view is populated, using the current record's persistent ID
        return { ...completePeer, id: baseRecord.id }
      }
    }

    return baseRecord
  }, [id, faculty, user])

  const isOwnProfile = !id && user?.role === 'faculty'
  const [editModal, setEditModal] = useState(false)
  const [scheduleModal, setScheduleModal] = useState(false)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})

  const { schedules } = useApp()
  const facultySchedules = useMemo(() => {
    const facultyId = member?.id
    return (schedules || []).filter(s => String(s.facultyId ?? s.faculty_id) === String(facultyId))
  }, [schedules, member])

  if (!member) return (
    <div><Header title={id ? "Faculty Information" : "My Profile"} subtitle={id ? "Manage faculty profiles" : "Manage your personal records"} />
      <div style={{ padding: 24 }}><p>{id ? "Faculty member not found." : "Your faculty profile was not found."}</p><Link to={id ? "/faculty" : "/dashboard"} style={{ color: 'var(--orange)' }}>← Back</Link></div>
    </div>
  )

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const openEdit = () => { setForm({ ...member }); setEditModal(true); setErrors({}) }

  const validate = () => {
    const e = {}
    if (!form.firstName?.trim()) e.firstName = 'Required'
    if (!form.lastName?.trim()) e.lastName = 'Required'
    if (!form.emailAddress?.trim()) e.emailAddress = 'Required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return
    updateFaculty(member.id, form)
    setEditModal(false)
  }

  const Row = ({ cols }) => (
    <div className="profile-row" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
      {cols.map(([label, value], i) => (
        <div key={i} className="profile-field">
          <span className="label">{label}</span>
          <span className="value">{value || '—'}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <Header title={id ? "Faculty Information" : "My Profile"} subtitle={id ? "Manage faculty profiles and medical records" : "View and manage your professional details"} />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="breadcrumb">
            {id ? (
              <><Link to="/faculty">Faculty List</Link><ChevronRight size={12} /></>
            ) : (
              <><Link to="/dashboard">Home</Link><ChevronRight size={12} /></>
            )}
            <span>{id ? "Faculty Profile" : "My Profile"}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {facultySchedules.length > 0 && <button className="btn btn-outline" onClick={() => setScheduleModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={16} />See Faculty Schedule</button>}
            {(isAdmin || isOwnProfile) && <button className="btn btn-primary" onClick={openEdit}>Update Profile</button>}
          </div>
        </div>

        <div className="card animate-in">
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, borderBottom: '1px solid #e0d8d0' }}>
            <div style={{ width: 72, height: 72, borderRadius: 8, background: '#f0ede9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e0d8d0', flexShrink: 0 }}>
              <User size={32} color="#ccc" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{member.firstName} {member.middleName} {member.lastName}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  ['Faculty Number', member.facultyNumber], 
                  ['Date of Birth', member.dateOfBirth], 
                  ['Gender', member.gender],
                  ['Specialization', member.specialization], 
                  ['Civil Status', member.civilStatus], 
                  ['Position', member.position],
                  ['Highest Degree', member.highestDegree],
                  ['Status', member.status === 'F' ? 'Full-time' : member.status]
                ].map(([l, v], i) => (
                  <div key={i} style={{ fontSize: 12 }}>
                    <span style={{ color: '#888' }}>{l}: </span>
                    <span style={{ fontWeight: 600 }}>{v || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="section-header">Contact Information</div>
          <Row cols={[['Home Address', member.homeAddress]]} />
          <Row cols={[['Contact Number', member.contactNumber], ['Alt. Contact', member.altContactNumber]]} />
          <Row cols={[['Email Address', member.emailAddress]]} />

          <div className="section-header">Highest Academic Achievement</div>
          <Row cols={[['Highest Degree', member.highestDegree], ['Year Completed', member.yearCompleted]]} />

          {/* ── Assigned Teaching Schedule ── */}
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={14} style={{ color: 'var(--orange)' }} /> Teaching Schedule
          </div>
          {facultySchedules.length === 0 ? (
            <div style={{ padding: '12px 24px', color: '#888', fontSize: 13 }}>No teaching schedules assigned yet.</div>
          ) : (
            <div style={{ padding: '12px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {facultySchedules.map((schedule, idx) => (
                <div key={idx} style={{
                  padding: '10px 14px',
                  border: '1px solid #e0d8d0',
                  borderRadius: 8,
                  background: '#faf8f5',
                  borderLeft: `4px solid ${schedule.color || 'var(--orange)'}`,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{schedule.subject}</div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
                    {schedule.program} {schedule.yearLevel} — Sec. {schedule.section}
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
                    <strong>Room:</strong> {schedule.room}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {schedule.day} {schedule.startTime} – {schedule.endTime}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={scheduleModal} onClose={() => setScheduleModal(false)} title={`Teaching Schedule - ${member.firstName} ${member.lastName}`}
        style={{ maxWidth: '900px', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ padding: '16px' }}>
          {facultySchedules.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '32px 0' }}>No teaching schedules assigned.</p>
          ) : (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#333' }}>Assigned Sections</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                  {facultySchedules.map((schedule, idx) => (
                    <div key={idx} style={{
                      padding: '12px',
                      border: '1px solid #e0d8d0',
                      borderRadius: 6,
                      background: '#f9f7f4'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <BookOpen size={14} color='#c95614' />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{schedule.subject}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                        <div><strong>Section:</strong> {schedule.program} {schedule.yearLevel} - {schedule.section}</div>
                        <div><strong>Room:</strong> {schedule.room}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
                        <Clock size={12} />
                        <span>{schedule.day} {schedule.startTime} - {schedule.endTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '20px', padding: '12px', background: '#f0f0f0', borderRadius: 6, fontSize: 12, color: '#666' }}>
                <strong>Total Classes:</strong> {facultySchedules.length}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Faculty Profile"
        footer={<>
          <button className="btn btn-outline" onClick={() => setEditModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
          
          <div className="sp-modal-section-banner">BASIC INFORMATION</div>
          
          <div className="form-group">
            <label>Faculty Number *</label>
            <input className="form-input" value={form.facultyNumber || ''} onChange={e => f('facultyNumber', e.target.value)} />
            {errors.facultyNumber && <span className="error-text">{errors.facultyNumber}</span>}
          </div>
          
          <div className="form-group">
            <label>Last Name *</label>
            <input className="form-input" value={form.lastName || ''} onChange={e => f('lastName', e.target.value)} />
            {errors.lastName && <span className="error-text">{errors.lastName}</span>}
          </div>

          <div className="form-group">
            <label>First Name *</label>
            <input className="form-input" value={form.firstName || ''} onChange={e => f('firstName', e.target.value)} />
            {errors.firstName && <span className="error-text">{errors.firstName}</span>}
          </div>

          <div className="form-group">
            <label>Middle Name</label>
            <input className="form-input" value={form.middleName || ''} onChange={e => f('middleName', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Position</label>
            <select className="form-input" value={form.position || ''} onChange={e => f('position', e.target.value)}>
              <option value="">Select Position</option>
              <option>Instructor</option>
              <option>Assistant Professor</option>
              <option>Associate Professor</option>
              <option>Professor</option>
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select className="form-input" value={form.status || ''} onChange={e => f('status', e.target.value)}>
              <option value="">Select Status</option>
              <option value="F">F</option>
              <option value="P">P</option>
            </select>
          </div>

          <div className="form-group">
            <label>Gender</label>
            <select className="form-input" value={form.gender || ''} onChange={e => f('gender', e.target.value)}>
              <option value="">Select Gender</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <input className="form-input" type="date" value={form.dateOfBirth || ''} onChange={e => f('dateOfBirth', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Specialization</label>
            <input className="form-input" value={form.specialization || ''} onChange={e => f('specialization', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Highest Degree</label>
            <input className="form-input" value={form.highestDegree || ''} onChange={e => f('highestDegree', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Year Completed</label>
            <input className="form-input" value={form.yearCompleted || ''} onChange={e => f('yearCompleted', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Civil Status</label>
            <select className="form-input" value={form.civilStatus || ''} onChange={e => f('civilStatus', e.target.value)}>
              <option value="">Select Status</option>
              <option>Single</option>
              <option>Married</option>
              <option>Widowed</option>
              <option>Separated</option>
            </select>
          </div>

          <div className="sp-modal-section-banner">CONTACT INFORMATION</div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Home Address</label>
            <input className="form-input" value={form.homeAddress || ''} onChange={e => f('homeAddress', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Contact Number *</label>
            <input className="form-input" value={form.contactNumber || ''} onChange={e => f('contactNumber', e.target.value)} />
            {errors.contactNumber && <span className="error-text">{errors.contactNumber}</span>}
          </div>

          <div className="form-group">
            <label>Alt. Contact</label>
            <input className="form-input" value={form.altContactNumber || ''} onChange={e => f('altContactNumber', e.target.value)} />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Email Address *</label>
            <input className="form-input" value={form.emailAddress || ''} onChange={e => f('emailAddress', e.target.value)} />
            {errors.emailAddress && <span className="error-text">{errors.emailAddress}</span>}
          </div>

        </div>
      </Modal>
    </div>
  )
}
