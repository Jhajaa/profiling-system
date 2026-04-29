import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Header from '../components/Header'
import Modal from '../components/Modal'
import '../../../css/home.css'
import {
  Plus, Trash2, Megaphone, Users, GraduationCap,
  BookOpen, CalendarDays, Send, Activity
} from 'lucide-react'


const MetricCard = ({ label, value, variant, icon: Icon, sub, onClick }) => (
  <div className={`home-metric ${variant}`} onClick={onClick} style={{ cursor: 'pointer' }}>
    <div className="home-metric-ring" />
    <div className="home-metric-icon"><Icon size={14} /></div>
    <div className="home-metric-lbl">{label}</div>
    <div className="home-metric-val">{value}</div>
    <div className="home-metric-sub">{sub}</div>
  </div>
)

export default function Home() {
  const navigate = useNavigate()
  const {
    students, faculty, curricula, events, announcements,
    addAnnouncement, deleteAnnouncement, isAdmin
  } = useApp()

  const [time, setTime] = useState(new Date())
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState({ title: '', body: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.body.trim()) e.body = 'Content is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleAdd = () => {
    if (!validate()) return
    addAnnouncement({ ...form, date: new Date().toISOString().slice(0, 10) })
    setForm({ title: '', body: '' })
    setAddModal(false)
  }

  const upcomingEvents = events.filter(e => new Date(e.dateTime) >= new Date())

  const metrics = [
    { label: 'Total Students',  value: students.length,       variant: 'mc-light', icon: Users,         sub: 'Enrolled this term', to: '/students' },
    { label: 'Active Faculty',  value: faculty.length,        variant: 'mc-dark',  icon: GraduationCap, sub: 'Teaching staff',     to: '/faculty' },
    { label: 'Courses',         value: curricula.length,      variant: 'mc-light', icon: BookOpen,      sub: 'Active curricula',   to: '/instructional/curriculum' },
    { label: 'Upcoming Events', value: upcomingEvents.length, variant: 'mc-amber', icon: CalendarDays,  sub: 'Scheduled ahead',    to: '/events' },
  ]

  return (
    <div className="home-root">
      <Header title="Home" />
      <div style={{ padding: '20px 24px' }}>

        {/* Metrics */}
        <div className="home-metrics-label">Key Metrics</div>
        <div className="home-metrics-grid">
          {metrics.map((m, i) => <MetricCard key={i} {...m} onClick={() => navigate(m.to)} />)}
        </div>

        {/* Main grid */}
        <div className="home-grid">

          {/* Announcements */}
          <div className="hcard">
            <div className="hcard-head">
              <div className="hcard-head-left">
                <div className="hcard-icon"><Send size={13} /></div>
                <span className="hcard-title">Announcements</span>
              </div>
              {isAdmin && (
                <button className="hadd-btn" onClick={() => setAddModal(true)}>
                  <Plus size={12} /> Add
                </button>
              )}
            </div>
            <div className="ann-list">
              {announcements.length === 0 ? (
                <div className="home-empty">
                  <Megaphone size={30} strokeWidth={1.5} />
                  <span>No announcements yet</span>
                </div>
              ) : (
                [...announcements].reverse().map(a => (
                  <div key={a.id} className="ann-item">
                    <div className="ann-item-body">
                      <div className="ann-dot" />
                      <div>
                        <div className="ann-title">{a.title}</div>
                        <div className="ann-body">{a.body}</div>
                        <div className="ann-date">{a.date}</div>
                      </div>
                    </div>
                    {isAdmin && (
                      <button className="ann-del" onClick={() => deleteAnnouncement(a.id)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="home-right">

            {/* Clock */}
            <div className="home-clock">
              <div className="home-clock-date">
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div className="home-clock-time">
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="hcard">
              <div className="hcard-head">
                <div className="hcard-head-left">
                  <div className="hcard-icon"><Activity size={13} /></div>
                  <span className="hcard-title">Recent Activity</span>
                </div>
              </div>
              <div className="panel-body">
                {students.slice(-3).reverse().map((s, i) => (
                  <div key={`recent-student-${s.studentNumber || s.id || i}`} className="act-row">
                    <span className="act-name">{s.firstName} {s.lastName} enrolled</span>
                    <span className="act-date">{s.dateRegistered}</span>
                  </div>
                ))}
                {events.slice(-2).map((e, i) => (
                  <div key={`recent-event-${e.id || i}`} className="act-row">
                    <span className="act-name">Event: {e.name}</span>
                    <span className="act-date">{new Date(e.dateTime).toLocaleDateString()}</span>
                  </div>
                ))}
                {students.length === 0 && events.length === 0 && (
                  <p className="home-no-data">No recent activity</p>
                )}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="hcard">
              <div className="hcard-head">
                <div className="hcard-head-left">
                  <div className="hcard-icon"><CalendarDays size={13} /></div>
                  <span className="hcard-title">Upcoming Events</span>
                </div>
              </div>
              <div className="panel-body">
                {upcomingEvents.length === 0 ? (
                  <p className="home-no-data">No upcoming events</p>
                ) : (
                  upcomingEvents.slice(0, 3).map(e => (
                    <div key={e.id} className="evt-row">
                      <div className="evt-name">{e.name}</div>
                      <div className="evt-meta">
                        {new Date(e.dateTime).toLocaleDateString()} · {e.venue}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Add announcement modal */}
      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Add Announcement"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setAddModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd}>Post Announcement</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Title *</label>
            <input
              className={`form-input ${errors.title ? 'error' : ''}`}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title"
            />
            {errors.title && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.title}</span>}
          </div>
          <div className="form-group">
            <label>Content *</label>
            <textarea
              className={`form-input ${errors.body ? 'error' : ''}`}
              rows={4}
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Announcement content..."
              style={{ resize: 'vertical' }}
            />
            {errors.body && <span style={{ color: '#e74c3c', fontSize: 12 }}>{errors.body}</span>}
          </div>
        </div>
      </Modal>
    </div>
  )
}