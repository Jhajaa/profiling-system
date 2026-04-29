import React, { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import '../../../../css/lesson.css'
import {
  ChevronRight,
  Upload,
  Pencil,
  Paperclip,
  FileText,
  X,
  Link as LinkIcon,
  RefreshCw,
  Search,
  ChevronDown
} from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const GRADING_TEMPLATES = [
  { label: 'Standard (Prelim 30 / Midterm 30 / Finals 40)', prelim: 30, midterm: 30, finals: 40 },
  { label: 'Even Split (33 / 33 / 34)',                      prelim: 33, midterm: 33, finals: 34 },
  { label: 'Finals-Heavy (20 / 30 / 50)',                    prelim: 20, midterm: 30, finals: 50 },
  { label: 'Custom',                                          prelim: '',  midterm: '',  finals: ''  },
]

/** Parse "Days: Mon & Wed | Time: 9:00 AM – 11:30 AM | Room: Lab 2" → { days, startTime, endTime, room } */
function parseSchedule(str) {
  if (!str) return { days: [], startTime: '', endTime: '', room: '' }
  const daysMatch  = str.match(/Days?:\s*([^|]+)/i)
  const timeMatch  = str.match(/Time:\s*([^|]+)/i)
  const roomMatch  = str.match(/Room:\s*([^|]+)/i)

  let days = []
  if (daysMatch) {
    const raw = daysMatch[1].trim()
    days = DAYS.filter(d => raw.toLowerCase().includes(d.toLowerCase()))
  }

  let startTime = '', endTime = ''
  if (timeMatch) {
    const timePart = timeMatch[1].trim()
    const parts = timePart.split(/[-–]/).map(s => s.trim())
    if (parts.length >= 2) { startTime = parts[0]; endTime = parts[1] }
    else startTime = timePart
  }

  const room = roomMatch ? roomMatch[1].trim() : ''
  return { days, startTime, endTime, room }
}

/** Rebuild schedule string from structured fields */
function buildSchedule({ days, startTime, endTime, room }) {
  const parts = []
  if (days.length)  parts.push(`Days: ${days.join(' & ')}`)
  if (startTime)    parts.push(`Time: ${startTime}${endTime ? ` - ${endTime}` : ''}`)
  if (room)         parts.push(`Room: ${room}`)
  return parts.join(' | ')
}

/** Parse "Prelim 30% | Midterm 30% | Finals 40%" → { prelim, midterm, finals } */
function parseGrading(str) {
  if (!str) return { prelim: 30, midterm: 30, finals: 40 }
  const get = (key) => {
    const m = str.match(new RegExp(key + '\\s*(\\d+)', 'i'))
    return m ? Number(m[1]) : ''
  }
  return { prelim: get('Prelim'), midterm: get('Midterm'), finals: get('Finals') }
}

/** Rebuild grading string */
function buildGrading({ prelim, midterm, finals }) {
  const parts = []
  if (prelim  !== '') parts.push(`Prelim ${prelim}%`)
  if (midterm !== '') parts.push(`Midterm ${midterm}%`)
  if (finals  !== '') parts.push(`Finals ${finals}%`)
  return parts.join(' | ')
}

export default function Lesson() {
  const { id } = useParams()
  const {
    syllabi,
    updateSyllabus,
    uploadLessonFile,
    updateLessonFile,
    deleteLessonFile,
    isAdmin,
    faculty,
    students
  } = useApp()

  const syllabus = useMemo(
    () => (syllabi || []).find(s => s.id === Number(id)),
    [syllabi, id]
  )

  /** Students enrolled in this syllabus — matched by program + yearLevel via dynamic_data */
  const enrolledStudents = useMemo(() => {
    if (!syllabus) return []
    const normProg = (p) => String(p || '').toUpperCase().replace(/^BS/i, '')
    const normYear = (y) => { const m = String(y || '').match(/[1-4]/); return m ? m[0] : '' }
    const targetProg = normProg(syllabus.program)
    const targetYear = normYear(syllabus.yearLevel)
    return (students || []).filter(st => {
      const course = st.dynamic_data?.['Course'] || st.course || ''
      const yearLevel = st.dynamic_data?.['Year Level'] || st.yearLevel || ''
      return normProg(course) === targetProg && normYear(yearLevel) === targetYear
    })
  }, [students, syllabus])

  /** Faculty member assigned to this syllabus */
  const assignedFaculty = useMemo(() => {
    if (!syllabus?.instructor || !faculty) return null
    return faculty.find(m => {
      const fullName = `${m.firstName} ${m.middleName ? m.middleName + ' ' : ''}${m.lastName}`
      const label = `${m.position ? m.position + ' ' : ''}${fullName}`
      return label === syllabus.instructor || fullName === syllabus.instructor
    }) || null
  }, [faculty, syllabus])

  const [editModal, setEditModal] = useState(false)
  const [fileModal, setFileModal] = useState(false)
  const [replaceModal, setReplaceModal] = useState(false)

  const [uploadType, setUploadType] = useState('file')
  const [uploadFile, setUploadFile] = useState(null)
  const [lessonWeek, setLessonWeek] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [driveLink, setDriveLink] = useState('')

  const [replaceLessonId, setReplaceLessonId] = useState(null)
  const [replaceWeek, setReplaceWeek] = useState('')
  const [replaceTitle, setReplaceTitle] = useState('')
  const [replaceType, setReplaceType] = useState('file')
  const [replaceFile, setReplaceFile] = useState(null)
  const [replaceDriveLink, setReplaceDriveLink] = useState('')

  const [isUploadDragOver, setIsUploadDragOver] = useState(false)
  const [isReplaceDragOver, setIsReplaceDragOver] = useState(false)

  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})

  // Instructor picker
  const [instrSearch, setInstrSearch] = useState('')
  const [instrOpen, setInstrOpen] = useState(false)

  // Structured schedule
  const [schedDays, setSchedDays] = useState([])
  const [schedStart, setSchedStart] = useState('')
  const [schedEnd, setSchedEnd] = useState('')
  const [schedRoom, setSchedRoom] = useState('')

  // Structured grading
  const [gradPrelim, setGradPrelim] = useState(30)
  const [gradMidterm, setGradMidterm] = useState(30)
  const [gradFinals, setGradFinals] = useState(40)
  const [gradTemplate, setGradTemplate] = useState(0)

  if (!syllabus) {
    return (
      <div className="ls-root">
        <Header title="Instructional Content" subtitle="Organize syllabus, lessons, and curriculum materials" />
        <div className="ls-body">
          <p>Syllabus not found.</p>
          <Link to="/instructional/syllabus" className="ls-back-link">← Back</Link>
        </div>
      </div>
    )
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const openEdit = () => {
    setForm({
      ...syllabus,
      weeklyPlan: syllabus.weeklyPlan ? [...syllabus.weeklyPlan] : []
    })
    setErrors({})
    setInstrSearch('')
    setInstrOpen(false)

    // Hydrate schedule
    const s = parseSchedule(syllabus.schedule)
    setSchedDays(s.days)
    setSchedStart(s.startTime)
    setSchedEnd(s.endTime)
    setSchedRoom(s.room)

    // Hydrate grading
    const g = parseGrading(syllabus.gradingSystem)
    setGradPrelim(g.prelim)
    setGradMidterm(g.midterm)
    setGradFinals(g.finals)
    // Pick matching template or Custom
    const tIdx = GRADING_TEMPLATES.findIndex(t =>
      t.label !== 'Custom' &&
      Number(t.prelim) === Number(g.prelim) &&
      Number(t.midterm) === Number(g.midterm) &&
      Number(t.finals) === Number(g.finals)
    )
    setGradTemplate(tIdx >= 0 ? tIdx : 3)

    setEditModal(true)
  }

  const openReplaceModal = (lesson) => {
    setReplaceLessonId(lesson.id)
    setReplaceWeek(String(lesson.week || ''))
    setReplaceTitle(lesson.title || '')
    setReplaceType(lesson.file?.source === 'drive' ? 'drive' : 'file')
    setReplaceDriveLink(lesson.file?.source === 'drive' ? lesson.file.url || '' : '')
    setReplaceFile(null)
    setReplaceModal(true)
    setErrors({})
  }

  const handleDropFile = (e, setter, dragSetter) => {
    e.preventDefault()
    dragSetter(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type === 'application/pdf') {
      setter(file)
    }
  }

  const validate = () => {
    const e = {}
    if (!form.description?.trim()) e.description = 'Required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const validateLessonUpload = () => {
    const e = {}

    if (!lessonWeek) e.lessonWeek = 'Week is required'
    if (!lessonTitle.trim()) e.lessonTitle = 'Title is required'

    if (uploadType === 'file' && !uploadFile) {
      e.uploadFile = 'Upload a PDF file'
    }

    if (uploadType === 'drive' && !driveLink.trim()) {
      e.driveLink = 'Google Drive link is required'
    }

    setErrors(e)
    return !Object.keys(e).length
  }

  const validateLessonReplace = () => {
    const e = {}

    if (!replaceWeek) e.replaceWeek = 'Week is required'
    if (!replaceTitle.trim()) e.replaceTitle = 'Title is required'

    if (replaceType === 'drive' && !replaceDriveLink.trim()) {
      e.replaceDriveLink = 'Google Drive link is required'
    }

    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return

    const schedule = buildSchedule({ days: schedDays, startTime: schedStart, endTime: schedEnd, room: schedRoom })
    const gradingSystem = buildGrading({ prelim: gradPrelim, midterm: gradMidterm, finals: gradFinals })

    updateSyllabus(syllabus.id, {
      description: form.description,
      instructor: form.instructor,
      instructorEmail: form.instructorEmail,
      schedule,
      gradingSystem,
      weeklyPlan: form.weeklyPlan
    })

    setEditModal(false)
  }

  const handleLessonUpload = () => {
    if (!validateLessonUpload()) return

    const payload =
      uploadType === 'file'
        ? { type: 'file', file: uploadFile, title: lessonTitle.trim() }
        : { type: 'drive', url: driveLink.trim(), title: lessonTitle.trim() }

    if (uploadLessonFile) {
      uploadLessonFile(syllabus.id, payload, lessonWeek)
    }

    setUploadFile(null)
    setLessonWeek('')
    setLessonTitle('')
    setDriveLink('')
    setUploadType('file')
    setFileModal(false)
    setIsUploadDragOver(false)
    setErrors({})
  }

  const handleLessonReplace = () => {
    if (!validateLessonReplace()) return

    let payload

    if (replaceType === 'file') {
      payload = replaceFile
        ? { type: 'file', file: replaceFile, title: replaceTitle.trim() }
        : { type: 'keep', title: replaceTitle.trim() }
    } else {
      payload = {
        type: 'drive',
        url: replaceDriveLink.trim(),
        title: replaceTitle.trim()
      }
    }

    if (updateLessonFile) {
      updateLessonFile(syllabus.id, replaceLessonId, payload, replaceWeek)
    }

    setReplaceLessonId(null)
    setReplaceWeek('')
    setReplaceTitle('')
    setReplaceDriveLink('')
    setReplaceFile(null)
    setReplaceType('file')
    setReplaceModal(false)
    setIsReplaceDragOver(false)
    setErrors({})
  }

  const handleDeleteLesson = (lessonId) => {
    const confirmed = window.confirm('Are you sure you want to delete this lesson file?')
    if (!confirmed) return

    if (deleteLessonFile) {
      deleteLessonFile(syllabus.id, lessonId)
    }
  }

  const updateWeek = (i, k, v) => {
    const arr = [...form.weeklyPlan]
    arr[i] = { ...arr[i], [k]: v }
    f('weeklyPlan', arr)
  }

  // Faculty initials helper
  const getFacultyInitials = (fac) => {
    if (!fac) return '—'
    return ((fac.firstName?.[0] || '') + (fac.lastName?.[0] || '')).toUpperCase() || '—'
  }

  return (
    <div className="ls-root">
      <Header title="Instructional Content" subtitle="Organize syllabus, lessons, and curriculum materials" />

      <div className="ls-body">
        <div className="ls-breadcrumb-row">
          <div className="ls-breadcrumb">
            <Link to="/instructional/curriculum" className="ls-bc-link">Curriculum</Link>
            <ChevronRight size={12} className="ls-bc-sep" />
            <Link to="/instructional/syllabus" className="ls-bc-link">Syllabus</Link>
            <ChevronRight size={12} className="ls-bc-sep" />
            <span className="ls-bc-cur">Lesson</span>
          </div>

          <div className="ls-top-actions">
            <span className="ls-upload-date">Date Uploaded {syllabus.dateUploaded}</span>

            {isAdmin && (
              <>
                <button className="ls-btn-outline" onClick={() => setFileModal(true)}>
                  <Upload size={13} /> Upload Lesson File
                </button>
                <button className="ls-btn-primary" onClick={openEdit}>
                  <Pencil size={13} /> Edit Course Details
                </button>
              </>
            )}
          </div>
        </div>

        <div className="ls-card">
          <div className="ls-card-head">
            <div className="ls-label">Lesson</div>
            <h2 className="ls-title">{syllabus.courseTitle}</h2>
          </div>

          <div className="ls-two-col">
            <div className="ls-panel ls-panel-right-border">
              <h3 className="ls-subtitle">Course Description</h3>
              <p className="ls-text">{syllabus.description || '—'}</p>
            </div>

            <div className="ls-panel">
              <h3 className="ls-subtitle">Course Objectives</h3>
              <ul className="ls-objectives">
                {(syllabus.objectives || []).map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="ls-main-grid">
            <div className="ls-side-info">
              <div className="ls-side-block-title">Assigned Instructor</div>
              <div className="ls-side-block">
                <div className="ls-side-main">{syllabus.instructor || '—'}</div>
                <div className="ls-side-sub">{syllabus.instructorEmail || ''}</div>
              </div>

              <div className="ls-side-block-title">Class Schedule</div>
              <div className="ls-side-block">
                {(syllabus.schedule || '—').split('|').map((part, i) => (
                  <div key={i} className="ls-side-line">{part.trim()}</div>
                ))}
              </div>

              <div className="ls-side-block-title">Grading System</div>
              <div className="ls-side-block">
                {(syllabus.gradingSystem || '—').split('|').map((part, i) => (
                  <div key={i} className="ls-side-line">{part.trim()}</div>
                ))}
              </div>
            </div>

            <div className="ls-plan-wrap">
              <div className="ls-plan-head">
                <span className="ls-plan-title">Weekly Course Plan</span>
                <span className="ls-plan-note">
                  (Note: Topics are samples only, course topic may vary on each week)
                </span>
              </div>

              <div className="ls-table-wrap">
                <table className="ls-table">
                  <thead>
                    <tr>
                      <th style={{ width: 70 }}>Week</th>
                      <th>Topic</th>
                      <th>Activities</th>
                      <th>Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(syllabus.weeklyPlan || []).map((row, i) => (
                      <tr key={i}>
                        <td className="ls-week-cell">{row.week}</td>
                        <td>{row.topic}</td>
                        <td>{row.activities}</td>
                        <td>{row.assessment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="ls-files-section">
            <div className="ls-files-head">
              <h3 className="ls-files-title">Lesson Files Per Week</h3>
              <span className="ls-files-count">
                {(syllabus.lessons || []).length} lesson file{(syllabus.lessons || []).length !== 1 ? 's' : ''}
              </span>
            </div>

            {(syllabus.lessons || []).length === 0 ? (
              <div className="ls-empty">No lesson file uploaded yet.</div>
            ) : (
              <div className="ls-files-list">
                {(syllabus.lessons || [])
                  .slice()
                  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
                  .map(lesson => (
                    <div key={lesson.id} className="ls-file-card">
                      <div className="ls-file-left">
                        <div className="ls-file-icon">
                          {lesson.file?.source === 'drive'
                            ? <LinkIcon size={16} />
                            : <FileText size={16} />
                          }
                        </div>

                        <div>
                          <div className="ls-file-title">
                            Week {lesson.week} — {lesson.title}
                          </div>

                          {lesson.file?.url && (
                            <a
                              href={lesson.file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="ls-file-link"
                            >
                              {lesson.file.name || lesson.file.url}
                            </a>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="ls-row-actions">
                          <button
                            className="ls-action-btn"
                            onClick={() => openReplaceModal(lesson)}
                            title="Update lesson file"
                          >
                            <RefreshCw size={13} />
                          </button>
                          <button
                            className="ls-action-btn danger"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            title="Delete lesson file"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* ── Enrolled Students ─────────────────────────────────────────── */}
          <div className="ls-files-section">
            <div className="ls-files-head">
              <h3 className="ls-files-title">Enrolled Students</h3>
              <span className="ls-files-count">
                {enrolledStudents.length} student{enrolledStudents.length !== 1 ? 's' : ''} · {syllabus.program} {syllabus.yearLevel}
              </span>
            </div>

            {/* ── Handling Faculty Banner ── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16
            }}>
              {/* Avatar */}
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--orange)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontWeight: 700,
                fontSize: 15,
                color: '#fff',
                letterSpacing: '0.03em'
              }}>
                {getFacultyInitials(assignedFaculty)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#aaa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: 3
                }}>
                  Handling Faculty
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {syllabus.instructor || '—'}
                </div>
                {syllabus.instructorEmail && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {syllabus.instructorEmail}
                  </div>
                )}
              </div>

              {/* Right-side badges */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                {assignedFaculty?.specialization && (
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: '#fff',
                    border: '1px solid var(--border)',
                    fontSize: 11,
                    color: '#666',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {assignedFaculty.specialization}
                  </span>
                )}
                {assignedFaculty?.position && (
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'rgba(var(--orange-rgb, 220,100,40), 0.08)',
                    border: '1px solid rgba(var(--orange-rgb, 220,100,40), 0.2)',
                    fontSize: 11,
                    color: 'var(--orange)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {assignedFaculty.position}
                  </span>
                )}
              </div>
            </div>

            {enrolledStudents.length === 0 ? (
              <div className="ls-empty">No students currently enrolled in this program and year level.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ls-table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Student No.</th>
                      <th>Name</th>
                      <th style={{ width: 80 }}>Section</th>
                      <th style={{ width: 80 }}>Gender</th>
                      <th>Email</th>
                      <th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map(st => {
                      const dd = st.dynamic_data || {}
                      const studentNum = dd['Student Number'] || st.studentNumber || '—'
                      const lastName   = dd['Last Name']     || st.lastName     || ''
                      const firstName  = dd['First Name']    || st.firstName    || ''
                      const middleName = dd['Middle Name']   || st.middleName   || ''
                      const section    = dd['Section']       || st.section      || '—'
                      const gender     = dd['Gender']        || st.gender       || '—'
                      const email      = dd['Email Address'] || st.emailAddress || '—'
                      const contact    = dd['Contact Number']|| st.contactNumber|| '—'
                      return (
                        <tr key={st.id}>
                          <td>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', fontFamily: 'monospace' }}>
                              {studentNum}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, fontSize: 13 }}>
                            {lastName}{lastName && firstName ? ', ' : ''}{firstName}{middleName ? ` ${middleName}` : ''}
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                              background: 'var(--bg)', border: '1px solid var(--border)',
                              fontSize: 12, fontWeight: 700
                            }}>
                              {section}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gender}</td>
                          <td style={{ fontSize: 12 }}>{email}</td>
                          <td style={{ fontSize: 12 }}>{contact}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <Modal
          open={editModal}
          onClose={() => setEditModal(false)}
          title="Edit Course Details"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
            </>
          }
        >
          <div className="ls-modal-stack">
            <div className="form-group">
              <label>Course Description *</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.description || ''}
                onChange={e => f('description', e.target.value)}
                style={{ resize: 'vertical' }}
              />
              {errors.description && <span className="ls-error">{errors.description}</span>}
            </div>

            {/* ── Instructor Picker ─────────────────────────────────── */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Assigned Instructor</label>
              <div
                className="form-input"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', padding: '8px 10px' }}
                onClick={() => setInstrOpen(o => !o)}
              >
                <span style={{ color: form.instructor ? 'inherit' : '#aaa' }}>
                  {form.instructor || 'Select an instructor…'}
                </span>
                <ChevronDown size={14} />
              </div>

              {instrOpen && (
                <div style={{
                  position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0,
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 240, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column'
                }}>
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Search size={13} color="#aaa" />
                    <input
                      autoFocus
                      className="form-input"
                      style={{ border: 'none', padding: 0, fontSize: 13, outline: 'none', flex: 1 }}
                      placeholder="Search faculty…"
                      value={instrSearch}
                      onChange={e => setInstrSearch(e.target.value)}
                    />
                  </div>
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {(faculty || [])
                      .filter(m => {
                        const full = `${m.firstName} ${m.lastName} ${m.specialization || ''}`.toLowerCase()
                        return full.includes(instrSearch.toLowerCase())
                      })
                      .map(m => {
                        const fullName = `${m.firstName} ${m.middleName ? m.middleName + ' ' : ''}${m.lastName}`
                        const label = `${m.position ? m.position + ' ' : ''}${fullName}`
                        return (
                          <div
                            key={m.id}
                            style={{
                              padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                              background: form.instructor === label ? 'var(--bg)' : '#fff',
                              borderBottom: '1px solid #f5f0eb'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = form.instructor === label ? 'var(--bg)' : '#fff'}
                            onClick={() => {
                              f('instructor', label)
                              f('instructorEmail', m.emailAddress || '')
                              setInstrOpen(false)
                              setInstrSearch('')
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{label}</div>
                            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                              {m.specialization || ''}{m.emailAddress ? ` · ${m.emailAddress}` : ''}
                            </div>
                          </div>
                        )
                      })}
                    {(faculty || []).filter(m => {
                      const full = `${m.firstName} ${m.lastName} ${m.specialization || ''}`.toLowerCase()
                      return full.includes(instrSearch.toLowerCase())
                    }).length === 0 && (
                      <div style={{ padding: '10px 12px', fontSize: 13, color: '#aaa' }}>No faculty found.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Instructor Email</label>
              <input
                className="form-input"
                type="email"
                value={form.instructorEmail || ''}
                onChange={e => f('instructorEmail', e.target.value)}
                placeholder="Auto-filled from selection"
              />
            </div>

            {/* ── Class Schedule Builder ────────────────────────────── */}
            <div className="form-group">
              <label>Class Schedule</label>
              <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Days */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DAYS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSchedDays(prev =>
                          prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                        )}
                        style={{
                          padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          border: schedDays.includes(d) ? '1.5px solid var(--orange)' : '1.5px solid var(--border)',
                          background: schedDays.includes(d) ? 'var(--orange)' : '#fff',
                          color: schedDays.includes(d) ? '#fff' : 'var(--text)',
                          transition: 'all 0.15s'
                        }}
                      >{d}</button>
                    ))}
                  </div>
                </div>

                {/* Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Time</div>
                    <input
                      className="form-input"
                      type="time"
                      value={schedStart}
                      onChange={e => setSchedStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Time</div>
                    <input
                      className="form-input"
                      type="time"
                      value={schedEnd}
                      onChange={e => setSchedEnd(e.target.value)}
                    />
                  </div>
                </div>

                {/* Room */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Room</div>
                  <input
                    className="form-input"
                    placeholder="e.g. Computer Lab 2"
                    value={schedRoom}
                    onChange={e => setSchedRoom(e.target.value)}
                  />
                </div>

                {/* Preview */}
                {(schedDays.length > 0 || schedStart || schedRoom) && (
                  <div style={{ fontSize: 12, color: '#888', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600 }}>Preview: </span>
                    {buildSchedule({ days: schedDays, startTime: schedStart, endTime: schedEnd, room: schedRoom }) || '—'}
                  </div>
                )}
              </div>
            </div>

            {/* ── Grading System Builder ────────────────────────────── */}
            <div className="form-group">
              <label>Grading System</label>
              <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 12, background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Template selector */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Template</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {GRADING_TEMPLATES.map((t, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                        <input
                          type="radio"
                          name="gradTemplate"
                          checked={gradTemplate === i}
                          onChange={() => {
                            setGradTemplate(i)
                            if (t.label !== 'Custom') {
                              setGradPrelim(t.prelim)
                              setGradMidterm(t.midterm)
                              setGradFinals(t.finals)
                            }
                          }}
                          style={{ accentColor: 'var(--orange)' }}
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Weight inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[['Prelim', gradPrelim, setGradPrelim], ['Midterm', gradMidterm, setGradMidterm], ['Finals', gradFinals, setGradFinals]].map(([label, val, setter]) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                      <div style={{ position: 'relative' }}>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          max="100"
                          value={val}
                          onChange={e => {
                            setter(Number(e.target.value))
                            setGradTemplate(3) // switch to Custom
                          }}
                          style={{ paddingRight: 24 }}
                        />
                        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#aaa' }}>%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total + preview */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: '#888' }}>
                    <span style={{ fontWeight: 600 }}>Preview: </span>
                    {buildGrading({ prelim: gradPrelim, midterm: gradMidterm, finals: gradFinals }) || '—'}
                  </span>
                  <span style={{
                    fontWeight: 700, fontSize: 13,
                    color: (Number(gradPrelim) + Number(gradMidterm) + Number(gradFinals)) === 100 ? 'green' : '#e74c3c'
                  }}>
                    Total: {Number(gradPrelim) + Number(gradMidterm) + Number(gradFinals)}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="ls-modal-label">Weekly Course Plan</label>
              <div className="ls-table-wrap">
                <table className="ls-table ls-table-compact">
                  <thead>
                    <tr>
                      <th style={{ width: 50 }}>Week</th>
                      <th>Topic</th>
                      <th>Activities</th>
                      <th>Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.weeklyPlan || []).map((row, i) => (
                      <tr key={i}>
                        <td className="ls-week-cell">{row.week}</td>
                        <td>
                          <input
                            className="form-input ls-compact-input"
                            value={row.topic}
                            onChange={e => updateWeek(i, 'topic', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input ls-compact-input"
                            value={row.activities}
                            onChange={e => updateWeek(i, 'activities', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            className="form-input ls-compact-input"
                            value={row.assessment}
                            onChange={e => updateWeek(i, 'assessment', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {isAdmin && (
        <Modal
          open={fileModal}
          onClose={() => setFileModal(false)}
          title="Upload Lesson File"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setFileModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleLessonUpload}>Upload Lesson</button>
            </>
          }
        >
          <div className="ls-modal-stack">
            <div className="form-group">
              <label>Week *</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={lessonWeek}
                onChange={e => setLessonWeek(e.target.value)}
              />
              {errors.lessonWeek && <span className="ls-error">{errors.lessonWeek}</span>}
            </div>

            <div className="form-group">
              <label>Lesson Title *</label>
              <input
                className="form-input"
                type="text"
                value={lessonTitle}
                onChange={e => setLessonTitle(e.target.value)}
                placeholder="Enter lesson title"
              />
              {errors.lessonTitle && <span className="ls-error">{errors.lessonTitle}</span>}
            </div>

            <div className="ls-type-switch">
              <button
                type="button"
                className={uploadType === 'file' ? 'ls-btn-primary' : 'ls-btn-outline'}
                onClick={() => setUploadType('file')}
              >
                PDF File
              </button>
              <button
                type="button"
                className={uploadType === 'drive' ? 'ls-btn-primary' : 'ls-btn-outline'}
                onClick={() => setUploadType('drive')}
              >
                Google Drive Link
              </button>
            </div>

            {uploadType === 'file' ? (
              <div className="form-group">
                <label>Lesson PDF *</label>

                <div
                  className={`ls-dropzone ${isUploadDragOver ? 'dragover' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsUploadDragOver(true)
                  }}
                  onDragLeave={() => setIsUploadDragOver(false)}
                  onDrop={(e) => handleDropFile(e, setUploadFile, setIsUploadDragOver)}
                  onClick={() => document.getElementById('lesson-pdf-upload')?.click()}
                >
                  <p>Drag and drop a PDF here, or click to browse</p>

                  <input
                    id="lesson-pdf-upload"
                    className="form-input"
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>

                {errors.uploadFile && <span className="ls-error">{errors.uploadFile}</span>}
              </div>
            ) : (
              <div className="form-group">
                <label>Google Drive Link *</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                />
                {errors.driveLink && <span className="ls-error">{errors.driveLink}</span>}
              </div>
            )}

            {uploadType === 'file' && uploadFile && (
              <div className="ls-selected-file">
                <div className="ls-selected-file-left">
                  <Paperclip size={14} />
                  <span>{uploadFile.name}</span>
                </div>

                <button
                  type="button"
                  className="ls-action-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setUploadFile(null)
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {isAdmin && (
        <Modal
          open={replaceModal}
          onClose={() => setReplaceModal(false)}
          title="Update Lesson File"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setReplaceModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleLessonReplace}>Save Update</button>
            </>
          }
        >
          <div className="ls-modal-stack">
            <div className="form-group">
              <label>Week *</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={replaceWeek}
                onChange={e => setReplaceWeek(e.target.value)}
              />
              {errors.replaceWeek && <span className="ls-error">{errors.replaceWeek}</span>}
            </div>

            <div className="form-group">
              <label>Lesson Title *</label>
              <input
                className="form-input"
                type="text"
                value={replaceTitle}
                onChange={e => setReplaceTitle(e.target.value)}
                placeholder="Enter lesson title"
              />
              {errors.replaceTitle && <span className="ls-error">{errors.replaceTitle}</span>}
            </div>

            <div className="ls-type-switch">
              <button
                type="button"
                className={replaceType === 'file' ? 'ls-btn-primary' : 'ls-btn-outline'}
                onClick={() => setReplaceType('file')}
              >
                PDF File
              </button>
              <button
                type="button"
                className={replaceType === 'drive' ? 'ls-btn-primary' : 'ls-btn-outline'}
                onClick={() => setReplaceType('drive')}
              >
                Google Drive Link
              </button>
            </div>

            {replaceType === 'file' ? (
              <div className="form-group">
                <label>Replace with PDF</label>

                <div
                  className={`ls-dropzone ${isReplaceDragOver ? 'dragover' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsReplaceDragOver(true)
                  }}
                  onDragLeave={() => setIsReplaceDragOver(false)}
                  onDrop={(e) => handleDropFile(e, setReplaceFile, setIsReplaceDragOver)}
                  onClick={() => document.getElementById('replace-lesson-pdf-upload')?.click()}
                >
                  <p>Drag and drop a PDF here, or click to browse</p>

                  <input
                    id="replace-lesson-pdf-upload"
                    className="form-input"
                    type="file"
                    accept=".pdf"
                    style={{ display: 'none' }}
                    onChange={e => setReplaceFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="ls-plan-note" style={{ marginTop: 8 }}>
                  Leave this empty if you only want to update the title or week.
                </div>

                {replaceFile && (
                  <div className="ls-selected-file">
                    <div className="ls-selected-file-left">
                      <Paperclip size={14} />
                      <span>{replaceFile.name}</span>
                    </div>

                    <button
                      type="button"
                      className="ls-action-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setReplaceFile(null)
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="form-group">
                <label>Replace with Google Drive Link *</label>
                <input
                  className="form-input"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={replaceDriveLink}
                  onChange={e => setReplaceDriveLink(e.target.value)}
                />
                {errors.replaceDriveLink && <span className="ls-error">{errors.replaceDriveLink}</span>}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}