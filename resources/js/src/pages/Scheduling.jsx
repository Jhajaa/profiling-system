import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useApp, normalizeCourseCode } from '../context/AppContext'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { ConfirmDialog } from '../components/Modal'
import { Search, Filter, Plus, Pencil, Trash2, X, WandSparkles } from 'lucide-react'
import '../../../css/scheduling.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TIMES = []
for (let h = 7; h <= 20; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`)
  TIMES.push(`${String(h).padStart(2, '0')}:30`)
}

const YEAR_LEVELS = ['1st yr', '2nd yr', '3rd yr', '4th yr']
const PROGRAMS = ['BSIT', 'BSCS']
const COLORS = ['var(--orange)', 'var(--orange-dark)', 'var(--text)', 'var(--text-muted)', '#2e7d32', '#6a1b9a']
const ROW_H = 34
const BASE = 7 * 60

const emptyForm = {
  subject: '', yearLevel: '1st yr', program: 'BSIT', section: 'A', facultyId: '',
  room: '', day: 'Monday', startTime: '07:00', endTime: '09:00', color: 'var(--orange)'
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToPx(minutes) {
  return ((minutes - BASE) / 30) * ROW_H
}

const LEGACY_MAP = {
  '#E8640A': 'var(--orange)',
  '#c9631a': 'var(--orange-dark)',
  '#1a1a1a': 'var(--text)',
  '#C4530A': 'var(--orange-dark)',
  '#1A0F05': 'var(--text)',
  '#E87722': 'var(--orange)'
}

function getDisplayColor(c) {
  return LEGACY_MAP[c] || c || 'var(--orange)'
}

function addOneHour(time) {
  const [h, m] = time.split(':').map(Number)
  return `${String(Math.min(h + 1, 20)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function normalizeProgramValue(program) {
  const normalized = normalizeCourseCode(program)
  return normalized ? `BS${normalized}` : ''
}

function normalizeYearValue(yearLevel) {
  const raw = String(yearLevel || '')
  const match = raw.match(/[1-4]/)
  return match ? match[0] : ''
}

function normalizeSectionValue(section) {
  const raw = String(section || '').trim().toUpperCase()
  return raw.includes('-') ? raw.split('-').pop() : raw
}

function sameSection(a, b) {
  return normalizeProgramValue(a.program) === normalizeProgramValue(b.program) &&
    normalizeYearValue(a.yearLevel) === normalizeYearValue(b.yearLevel) &&
    normalizeSectionValue(a.section) === normalizeSectionValue(b.section)
}

function overlaps(a, b) {
  return timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
    timeToMinutes(a.endTime) > timeToMinutes(b.startTime)
}

function getScheduleConflicts(candidate, schedules, ignoreId = null) {
  return (schedules || [])
    .filter(schedule => schedule.id !== ignoreId)
    .filter(schedule => schedule.day === candidate.day && overlaps(schedule, candidate))
    .map(schedule => {
      const reasons = []
      if (sameSection(schedule, candidate)) reasons.push('section')
      if (String(schedule.room || '').trim().toLowerCase() === String(candidate.room || '').trim().toLowerCase()) reasons.push('room')
      if (candidate.facultyId && String(schedule.facultyId || '') === String(candidate.facultyId || '')) reasons.push('faculty')
      return reasons.length ? { schedule, reasons } : null
    })
    .filter(Boolean)
}

function describeConflict(conflict) {
  const { schedule, reasons } = conflict
  const labels = reasons.map(reason => {
    if (reason === 'section') return `Section ${schedule.yearLevel} ${schedule.program}-${schedule.section}`
    if (reason === 'room') return `Room ${schedule.room}`
    if (reason === 'faculty') return 'Faculty'
    return reason
  })
  return `${labels.join(', ')} conflict with ${schedule.subject} (${schedule.day} ${schedule.startTime}-${schedule.endTime})`
}

function buildRoomOptions(existingSchedules, currentRoom = '') {
  const defaults = ['Comlab 1', 'Comlab 2', 'Room 101', 'Room 102', 'Lab 1', 'Lab 2']
  const rooms = new Set(defaults)
  ;(existingSchedules || []).forEach(schedule => {
    if (schedule.room) rooms.add(String(schedule.room).trim())
  })
  if (currentRoom) rooms.add(String(currentRoom).trim())
  return Array.from(rooms).filter(Boolean).sort((a, b) => a.localeCompare(b))
}

function findAutoScheduleSlot({ form, schedules, ignoreId = null, roomOptions = [] }) {
  const duration = timeToMinutes(form.endTime) - timeToMinutes(form.startTime)
  if (duration < 30) return null

  const preferredDays = [form.day, ...DAYS.filter(day => day !== form.day)]
  const preferredRooms = form.room
    ? [form.room, ...roomOptions.filter(room => room !== form.room)]
    : roomOptions

  for (const day of preferredDays) {
    for (let i = 0; i < TIMES.length; i++) {
      const startTime = TIMES[i]
      const endMinutes = timeToMinutes(startTime) + duration
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
      if (!TIMES.includes(endTime)) continue

      for (const room of preferredRooms) {
        const candidate = { ...form, day, startTime, endTime, room }
        if (getScheduleConflicts(candidate, schedules, ignoreId).length === 0) {
          return candidate
        }
      }
    }
  }

  return null
}

export default function Scheduling() {
  const { schedules, addSchedule, updateSchedule, deleteSchedule, isAdmin, faculty, SECTIONS, PROGRAMS: APP_PROGRAMS, user, students, academicSections, syllabi } = useApp()
  const SCH_PROGRAMS = APP_PROGRAMS || PROGRAMS

  const [yearFilter, setYearFilter] = useState('All')
  const [programFilter, setProgramFilter] = useState('All')
  const [sectionFilter, setSectionFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [calWidth, setCalWidth] = useState(0)

  const calRef = useRef(null)
  const roomOptions = React.useMemo(() => buildRoomOptions(schedules, form.room), [schedules, form.room])
  const subjectOptions = useMemo(() => {
    return (syllabi || [])
      .map(s => ({
        code: (s.courseCode || s.subject || '').trim(),
        title: (s.courseTitle || s.name || '').trim(),
        program: s.program || '',
        yearLevel: s.yearLevel || ''
      }))
      .filter(opt => opt.code)
  }, [syllabi])

  const setSubjectField = (value) => {
    const normalizedValue = String(value || '').trim()
    const match = subjectOptions.find(opt => opt.code === normalizedValue || opt.title === normalizedValue)
    setForm(prev => ({
      ...prev,
      subject: normalizedValue,
      ...(match ? {
        program: match.program || prev.program,
        yearLevel: match.yearLevel || prev.yearLevel
      } : {})
    }))
  }

  // Measure calendar width for block positioning
  useEffect(() => {
    const measure = () => {
      if (calRef.current) setCalWidth(calRef.current.offsetWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.subject.trim()) e.subject = 'Subject / course code is required'
    if (!form.room.trim()) e.room = 'Room is required'
    if (form.startTime >= form.endTime) e.endTime = 'End time must be after start time'
    const dur = timeToMinutes(form.endTime) - timeToMinutes(form.startTime)
    if (dur < 30) e.endTime = 'Minimum duration is 30 minutes'
    const conflict = schedules.filter(s => s.id !== editId).find(s =>
      s.day === form.day &&
      timeToMinutes(s.startTime) < timeToMinutes(form.endTime) &&
      timeToMinutes(s.endTime) > timeToMinutes(form.startTime) &&
      (s.room === form.room || (form.facultyId && s.facultyId === Number(form.facultyId)))
    )
    if (conflict) {
      if (conflict.room === form.room) e.room = `Room conflict with ${conflict.subject} (${conflict.startTime}–${conflict.endTime})`
      else e.facultyId = `Faculty conflict with ${conflict.subject} (${conflict.startTime}–${conflict.endTime})`
    }
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validateSchedule()) return
    if (modal === 'add') addSchedule(form)
    else updateSchedule(editId, form)
    setModal(null); setErrors({})
  }

  const openAdd = (day, time) => {
    setForm({ ...emptyForm, day: day || 'Monday', startTime: time || '07:00', endTime: time ? addOneHour(time) : '09:00' })
    setModal('add'); setErrors({})
  }

  const openEdit = (s) => {
    setForm({ ...emptyForm, ...s })
    setEditId(s.id); setModal('edit'); setErrors({})
  }

  const validateSchedule = () => {
    const e = {}
    if (!form.subject.trim()) e.subject = 'Subject / course code is required'
    if (!form.room.trim()) e.room = 'Room is required'
    if (form.startTime >= form.endTime) e.endTime = 'End time must be after start time'

    const duration = timeToMinutes(form.endTime) - timeToMinutes(form.startTime)
    if (duration < 30) e.endTime = 'Minimum duration is 30 minutes'

    const conflicts = getScheduleConflicts(form, schedules, editId)
    if (conflicts.length) {
      conflicts.forEach(conflict => {
        if (conflict.reasons.includes('section') && !e.section) e.section = describeConflict(conflict)
        if (conflict.reasons.includes('room') && !e.room) e.room = describeConflict(conflict)
        if (conflict.reasons.includes('faculty') && !e.facultyId) e.facultyId = describeConflict(conflict)
      })
    }

    setErrors(e)
    return !Object.keys(e).length
  }

  const handleAutoGenerate = () => {
    const duration = timeToMinutes(form.endTime) - timeToMinutes(form.startTime)
    if (duration < 30) {
      setErrors(prev => ({ ...prev, endTime: 'Choose at least a 30-minute duration before generating.' }))
      return
    }

    const generated = findAutoScheduleSlot({
      form,
      schedules,
      ignoreId: editId,
      roomOptions
    })

    if (!generated) {
      setErrors(prev => ({ ...prev, room: 'No conflict-free slot was found for this class setup.' }))
      return
    }

    setForm(generated)
    setErrors({})
  }

  const studentRecord = React.useMemo(() => {
    if (!user || user.role !== 'student') return null
    const norm = (user.userNumber || '').trim().replace('#', '')
    return students.find(s => {
      const sNum = (s.dynamic_data?.['Student Number'] || s.studentNumber || '').trim().replace('#', '')
      return sNum === norm
    })
  }, [user, students])

  const facultyRecord = React.useMemo(() => {
    if (!user || user.role !== 'faculty') return null
    const norm = (user.userNumber || '').trim().replace('#', '')
    return faculty.find(f => {
      const fNum = (String(f.facultyNumber || '') || String(f.dynamic_data?.['Faculty Number'] || '')).trim().replace('#', '')
      return fNum === norm
    })
  }, [user, faculty])

  const availableFilterSections = React.useMemo(() => {
    if (!academicSections) return ['A', 'B', 'C', 'D']
    const letters = new Set()

    const targetProgram = programFilter !== 'All' ? normalizeCourseCode(programFilter) : null
    const y = yearFilter !== 'All' ? yearFilter.charAt(0) : null

    academicSections.forEach(s => {
      const matchProg = !targetProgram || normalizeCourseCode(s.program) === targetProgram
      const matchYear = !y || s.name.startsWith(y)
      if (matchProg && matchYear) {
        if (s.name.includes('-')) letters.add(s.name.split('-')[1])
        else letters.add(s.name)
      }
    })

    if (letters.size === 0) return ['A', 'B', 'C', 'D']
    return Array.from(letters).sort()
  }, [academicSections, programFilter, yearFilter])

  const availableFormSections = React.useMemo(() => {
    if (!academicSections) return ['A', 'B', 'C', 'D']

    const targetProgram = normalizeCourseCode(form.program)
    const y = form.yearLevel ? form.yearLevel.charAt(0) : ''

    const letters = new Set()
    academicSections.forEach(s => {
      if (normalizeCourseCode(s.program) === targetProgram && s.name.startsWith(y)) {
        if (s.name.includes('-')) letters.add(s.name.split('-')[1])
        else letters.add(s.name)
      }
    })

    if (letters.size === 0) return ['A', 'B', 'C', 'D']
    return Array.from(letters).sort()
  }, [academicSections, form.yearLevel, form.program])

  const filtered = schedules.filter(s => {
    // Role-based filtering
    if (user?.role === 'student' && studentRecord) {
      let sYear = studentRecord.dynamic_data?.['Year Level'] || '1st yr'
      if (sYear.toLowerCase().includes('1st')) sYear = '1st yr'
      if (sYear.toLowerCase().includes('2nd')) sYear = '2nd yr'
      if (sYear.toLowerCase().includes('3rd')) sYear = '3rd yr'
      if (sYear.toLowerCase().includes('4th')) sYear = '4th yr'

      let sProg = studentRecord.dynamic_data?.['Course'] || 'BSIT'
      if (sProg === 'IT') sProg = 'BSIT'
      if (sProg === 'CS') sProg = 'BSCS'
      const sSec = studentRecord.dynamic_data?.['Section'] || 'A'

      if (s.yearLevel !== sYear || s.program !== sProg || s.section !== sSec) return false
    } else if (user?.role === 'faculty' && facultyRecord) {
      if (String(s.facultyId) !== String(facultyRecord.id)) return false
    }

    if (yearFilter !== 'All' && s.yearLevel !== yearFilter) return false
    if (programFilter !== 'All' && s.program !== programFilter) return false

    // Support matching both exact letter 'A' and legacy '1BSIT-A'
    if (sectionFilter !== 'All') {
      const sLetter = s.section.includes('-') ? s.section.split('-')[1] : s.section
      if (sLetter !== sectionFilter) return false
    }
    const q = search.toLowerCase()
    if (q && !`${s.subject} ${s.room} ${s.day} ${s.section}`.toLowerCase().includes(q)) return false
    return true
  })

  const now = new Date()
  const colWidth = calWidth > 0 ? (calWidth - 72) / 6 : 0

  const ErrMsg = ({ k }) =>
    errors[k] ? <span style={{ color: '#e74c3c', fontSize: 11 }}>{errors[k]}</span> : null

  return (
    <div className="sch-root">
      <Header title="Scheduling" />
      <div className="sch-body">

        <div className="sch-card">

          {/* ── Card header ── */}
          <div className="sch-head">
            <div className="sch-head-top">
              <div>
                <div className="sch-school">College of Computing Studies</div>
                <div className="sch-month">
                  {now.toLocaleString('default', { month: 'long' }).toUpperCase()} {now.getFullYear()}
                </div>
                {yearFilter !== 'All' && programFilter !== 'All' && sectionFilter !== 'All' && (
                  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: 'var(--orange)', background: 'rgba(230, 126, 34, 0.1)', padding: '4px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Viewing Class Schedule: {yearFilter.charAt(0)}{programFilter === 'IT' ? 'BSIT' : programFilter === 'CS' ? 'BSCS' : programFilter}-{sectionFilter}
                  </div>
                )}
              </div>

              <div className="sch-controls">
                <select
                  className="sch-select"
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                >
                  <option value="All">Year Lvl ▾</option>
                  {YEAR_LEVELS.map(y => <option key={y}>{y}</option>)}
                </select>

                <select
                  className="sch-select"
                  value={programFilter}
                  onChange={e => setProgramFilter(e.target.value)}
                >
                  <option value="All">Program ▾</option>
                  {SCH_PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                  className="sch-select"
                  value={sectionFilter || 'All'}
                  onChange={e => setSectionFilter(e.target.value)}
                >
                  <option value="All">Section ▾</option>
                  {availableFilterSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="sch-search-wrap">
                  <Search size={12} className="sch-search-icon" />
                  <input
                    className="sch-search-input"
                    placeholder="Search schedules..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <button className="sch-btn-outline">
                  <Filter size={13} /> Filter
                </button>

                {isAdmin && (
                  <button className="sch-btn-dark" onClick={() => openAdd()}>
                    <Plus size={13} /> New Schedule
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Calendar ── */}
          <div className="sch-cal-wrap">
            <div className="sch-cal-inner" ref={calRef}>

              {/* Day headers */}
              <div className="sch-cal-header">
                <div className="sch-cal-header-time">Time</div>
                {DAYS.map(d => (
                  <div key={d} className="sch-cal-header-day">{d}</div>
                ))}
              </div>

              {/* Time grid + blocks */}
              <div className="sch-cal-grid">
                {TIMES.map(t => (
                  <div key={t} className="sch-cal-row">
                    <div className="sch-cal-time">{t}</div>
                    {DAYS.map(d => (
                      <div
                        key={d}
                        className="sch-cal-cell"
                        onClick={() => isAdmin && openAdd(d, t)}
                      />
                    ))}
                  </div>
                ))}

                {/* Schedule blocks */}
                {colWidth > 0 && DAYS.map((d, dayIdx) => {
                  const daySchedules = filtered.filter(s => s.day === d)
                    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

                  if (daySchedules.length === 0) return null

                  // Calculate column-based layout
                  const columns = []
                  const clusters = []
                  let currentCluster = null

                  daySchedules.forEach(s => {
                    const start = timeToMinutes(s.startTime)
                    const end = timeToMinutes(s.endTime)

                    // Group into clusters
                    if (!currentCluster || start < currentCluster.end) {
                      if (!currentCluster) {
                        currentCluster = { events: [s], end }
                        clusters.push(currentCluster)
                      } else {
                        currentCluster.events.push(s)
                        currentCluster.end = Math.max(currentCluster.end, end)
                      }
                    } else {
                      currentCluster = { events: [s], end }
                      clusters.push(currentCluster)
                    }

                    // Assign to columns
                    let colIdx = -1
                    for (let i = 0; i < columns.length; i++) {
                      if (start >= columns[i]) {
                        colIdx = i
                        columns[i] = end
                        break
                      }
                    }
                    if (colIdx === -1) {
                      colIdx = columns.length
                      columns.push(end)
                    }
                    s._colIdx = colIdx
                  })

                  // Assign maxCols to each cluster
                  clusters.forEach(cluster => {
                    const maxCols = cluster.events.reduce((max, s) => Math.max(max, s._colIdx + 1), 0)
                    cluster.events.forEach(s => s._maxCols = maxCols)
                  })

                  return daySchedules.map(s => {
                    const startMin = timeToMinutes(s.startTime)
                    const endMin = timeToMinutes(s.endTime)
                    const top = minutesToPx(startMin) + 1
                    const height = ((endMin - startMin) / 30) * ROW_H - 3
                    const blockWidth = (colWidth - 4) / (s._maxCols || 1)
                    const left = 72 + dayIdx * colWidth + 2 + (s._colIdx * blockWidth)
                    const fac = faculty.find(f => f.id === Number(s.facultyId))

                    return (
                      <div
                        key={s.id}
                        className="sch-block"
                        style={{
                          top, left,
                          width: blockWidth - 2,
                          height,
                          background: getDisplayColor(s.color),
                        }}
                        onClick={() => isAdmin ? openEdit(s) : setSelectedSlot(s)}
                      >
                        <div className="sch-block-subj">{s.yearLevel} {s.section} / {s.subject}</div>
                        <div className="sch-block-room">{s.room}</div>
                        {height > 40 && fac && (
                          <div className="sch-block-fac">{fac.lastName}</div>
                        )}
                        {height > 60 && (
                          <div className="sch-block-time">{s.startTime} – {s.endTime}</div>
                        )}
                      </div>
                    )
                  })
                })}
              </div>
            </div>
          </div>

          {/* ── Slot detail panel ── */}
          {selectedSlot && (
            <div className="sch-detail">
              <div className="sch-detail-head">
                <div className="sch-detail-title">{selectedSlot.subject}</div>
                <button
                  className="sch-detail-close"
                  onClick={() => setSelectedSlot(null)}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="sch-detail-grid">
                {[
                  ['Day', selectedSlot.day],
                  ['Time', `${selectedSlot.startTime} – ${selectedSlot.endTime}`],
                  ['Room', selectedSlot.room],
                  ['Year Level', selectedSlot.yearLevel],
                  ['Program', selectedSlot.program],
                  ['Section', selectedSlot.section],
                  ['Faculty', faculty.find(f => f.id === Number(selectedSlot.facultyId)) ? `${faculty.find(f => f.id === Number(selectedSlot.facultyId)).lastName}, ${faculty.find(f => f.id === Number(selectedSlot.facultyId)).firstName}` : 'Unassigned'],
                ].map(([label, value]) => (
                  <div key={label} className="sch-detail-item">
                    <div className="sch-detail-label">{label}</div>
                    <div className="sch-detail-value">{value}</div>
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="sch-detail-actions">
                  <button
                    className="sch-detail-edit"
                    onClick={() => { openEdit(selectedSlot); setSelectedSlot(null) }}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    className="sch-detail-delete"
                    onClick={() => { setConfirm(selectedSlot.id); setSelectedSlot(null) }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'New Schedule' : 'Edit Schedule'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-outline" onClick={handleAutoGenerate}>
              <WandSparkles size={14} style={{ marginRight: 6 }} /> Auto Generate
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              {modal === 'add' ? 'Add Schedule' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="sch-section-header">Schedule Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            <div className="form-group">
              <label>Subject / Course Code *</label>
              <input
                className="form-input"
                value={form.subject}
                onChange={e => setSubjectField(e.target.value)}
                placeholder="Select or type subject / course code"
                list="subject-list"
              />
              <datalist id="subject-list">
                {subjectOptions.map((opt, idx) => (
                  <option
                    key={`${opt.code}-${idx}`}
                    value={opt.code}
                    label={`${opt.code}${opt.title ? ` — ${opt.title}` : ''}${opt.program ? ` (${opt.program} ${opt.yearLevel})` : ''}`}
                  />
                ))}
              </datalist>
              <ErrMsg k="subject" />
            </div>

            <div className="form-group">
              <label>Room *</label>
              <input
                className="form-input"
                value={form.room}
                onChange={e => f('room', e.target.value)}
                placeholder="e.g. Comlab 1"
              />
              <ErrMsg k="room" />
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {roomOptions.slice(0, 6).map(room => (
                  <button
                    key={room}
                    type="button"
                    className="btn btn-outline"
                    style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                    onClick={() => f('room', room)}
                  >
                    {room}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Year Level</label>
              <select className="form-input" value={form.yearLevel || ''} onChange={e => f('yearLevel', e.target.value)}>
                {YEAR_LEVELS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Program</label>
              <select className="form-input" value={form.program || ''} onChange={e => f('program', e.target.value)}>
                {SCH_PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Assigned Faculty</label>
              <select className="form-input" value={form.facultyId || ''} onChange={e => f('facultyId', e.target.value)}>
                <option value="">Select Faculty...</option>
                {faculty.map(fac => (
                  <option key={fac.id} value={fac.id}>
                    {fac.lastName}, {fac.firstName} ({fac.specialization})
                  </option>
                ))}
              </select>
              <ErrMsg k="facultyId" />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Assigned Section</label>
              <select className="form-input" value={form.section || ''} onChange={e => f('section', e.target.value)}>
                {availableFormSections.map(s => {
                  const p = form.program === 'IT' ? 'BSIT' : form.program === 'CS' ? 'BSCS' : form.program
                  const y = form.yearLevel ? form.yearLevel.charAt(0) : ''
                  const fullName = `${y}${p}-${s}`
                  return <option key={s} value={s}>{fullName}</option>
                })}
              </select>
              <ErrMsg k="section" />
            </div>

            <div className="form-group">
              <label>Day</label>
              <select className="form-input" value={form.day || ''} onChange={e => f('day', e.target.value)}>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Block Color</label>
              <div className="sch-color-picker">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`sch-color-swatch${form.color === c ? ' selected' : ''}`}
                    style={{ background: getDisplayColor(c) }}
                    onClick={() => f('color', c)}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Start Time</label>
              <select className="form-input" value={form.startTime || ''} onChange={e => f('startTime', e.target.value)}>
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>End Time</label>
              <select className="form-input" value={form.endTime || ''} onChange={e => f('endTime', e.target.value)}>
                {TIMES.filter(t => t > form.startTime).map(t => <option key={t}>{t}</option>)}
              </select>
              <ErrMsg k="endTime" />
            </div>

          </div>
        </div>
      </Modal>

      {/* ── Confirm delete ── */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => deleteSchedule(confirm)}
        title="Delete Schedule"
        message="Are you sure you want to remove this schedule entry?"
      />
    </div>
  )
}
