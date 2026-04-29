import React, { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { Calendar, Clock, User } from 'lucide-react'
import Header from '../../components/Header'
import '../../../../css/StudentPortal.css' 

export default function FacultySchedule() {
  const { user, schedules, faculty } = useApp()

  const myFacultyRecord = useMemo(() => {
    if (!user || user.role !== 'faculty') return null
    const norm = (user.userNumber || '').trim().replace('#', '')
    return (faculty || []).find(f => {
      const fNum = (String(f.facultyNumber || '') || String(f.dynamic_data?.['Faculty Number'] || '')).trim().replace('#', '')
      return fNum === norm
    })
  }, [faculty, user])

  const mySchedule = useMemo(() => {
    if (!myFacultyRecord) return []
    return (schedules || []).filter(s => String(s.facultyId ?? s.faculty_id) === String(myFacultyRecord.id))
  }, [schedules, myFacultyRecord])

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const TIME_SLOTS = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ]

  const getTimeIndex = (timeStr) => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return (h * 2 + (m >= 30 ? 1 : 0)) - 14
  }

  const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Header title="My Teaching Schedule & Classes" subtitle="Manage your academic schedule and classroom activities" />
      
      <div style={{ padding: '24px' }}>
        <div className="card animate-in" style={{ padding: '32px' }}>
        <div className="sp-schedule-top-header">
          <div className="sp-schedule-brand">
            <h1>College of Computing Studies</h1>
            <span>{monthYear}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calendar size={18} color="var(--orange)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>
              Faculty Assignment: {myFacultyRecord?.name || user?.name}
            </span>
          </div>
        </div>

        <div className="sp-schedule-container animate-in">
          <div className="sp-schedule-grid">
            <div className="sp-schedule-header" style={{ background: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>TIME</div>
            {DAYS.map(day => <div key={day} className="sp-schedule-header">{day}</div>)}
            {TIME_SLOTS.map((time) => (
              <React.Fragment key={time}>
                <div className="sp-schedule-time-cell">{time}</div>
                {DAYS.map(day => <div key={`${day}-${time}`} className="sp-schedule-slot" />)}
              </React.Fragment>
            ))}

            {mySchedule.map(s => {
              const colIdx = DAYS.indexOf(s.day) + 2
              const rowStart = getTimeIndex(s.startTime) + 2
              const rowEnd = getTimeIndex(s.endTime) + 2

              return (
                <div 
                  key={s.id} 
                  className="sp-schedule-block"
                  style={{ gridColumn: colIdx, gridRow: `${rowStart} / ${rowEnd}`, background: s.color || 'var(--orange)', borderLeft: '4px solid rgba(0,0,0,0.1)' }}
                >
                  <div className="sp-schedule-block-subject">{s.program} {s.yearLevel} - Sec {s.section}</div>
                  <div className="sp-schedule-block-meta" style={{ fontWeight: 800 }}>{s.subject}</div>
                  <div className="sp-schedule-block-meta">{s.room}</div>
                  <div className="sp-schedule-block-meta" style={{ marginTop: 'auto', fontWeight: 700 }}>{s.startTime} – {s.endTime}</div>
                </div>
              )
            })}
          </div>
        </div>

        {mySchedule.length === 0 && (
          <div className="sp-empty-full" style={{ padding: '40px 0' }}>
            <Calendar size={40} />
            <p>No teaching assignments found for your account.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
