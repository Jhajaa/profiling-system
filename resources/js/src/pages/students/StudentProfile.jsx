import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import { ChevronRight, ChevronLeft, Pencil } from 'lucide-react'

export default function StudentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { students, archivedStudents, updateStudent, isAdmin, syllabi, dynamicFields, violations, isSectionFull } = useApp()
  const student = students.find(s => s.id === Number(id)) || (archivedStudents || []).find(s => s.id === Number(id))
  const studentData = student?.dynamic_data || {}
  const studentFields = React.useMemo(
    () => (dynamicFields || []).filter(f => (f.module || 'students') === 'students'),
    [dynamicFields]
  )

  const [editModal, setEditModal] = useState(false)
  const [expandedSection, setExpandedSection] = useState('Basic Information')
  const [dynamicData, setDynamicData] = useState({})
  const [errors, setErrors] = useState({})
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileInputRef = React.useRef(null)

  useEffect(() => {
    if (student) {
      setDynamicData(studentData)
      setPhotoPreview(null)
    }
  }, [student, studentData])

  const resolveImageUrl = (val) => {
    if (!val || val === '—' || val === 'â€”' || val === 'Ã¢â‚¬â€') return null
    if (typeof val === 'object' && val.dataUrl) return val.dataUrl
    if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:'))) return val
    if (typeof val === 'string' && val.includes('.')) {
      return val.startsWith('/storage/') ? val : `/storage/${val}`
    }
    return null
  }

  const studentPhoto = React.useMemo(() => {
    if (photoPreview) return photoPreview
    if (!student) return null

    const knownKeys = ['Photo', 'Photo URL', 'Profile Picture', 'profile_image', 'Picture', 'avatar']
    for (const key of knownKeys) {
      const url = resolveImageUrl(studentData[key])
      if (url) return url
    }

    const photoKey = Object.keys(studentData).find(key => {
      const normalizedKey = key.toLowerCase()
      return normalizedKey.includes('photo') || normalizedKey.includes('picture') || normalizedKey.includes('image') || normalizedKey.includes('avatar') || normalizedKey.includes('pic')
    })

    return photoKey ? resolveImageUrl(studentData[photoKey]) : null
  }, [photoPreview, student, studentData])

  const dfStore = (key, value) => setDynamicData(prev => ({ ...prev, [key]: value }))

  const openEdit = () => {
    setDynamicData(studentData)
    setEditModal(true)
    setErrors({})
  }

  const validate = () => {
    const nextErrors = {}
    studentFields.forEach(field => {
      if (!field.is_required) return

      const val = dynamicData[field.name]
      if (field.type === 'file') {
        if (!val && !studentData[field.name]) nextErrors[field.name] = 'Required'
        return
      }

      if (field.type === 'checkbox') {
        if (!val || val.length === 0) nextErrors[field.name] = 'Required'
        return
      }

      if (!val || !String(val).trim()) nextErrors[field.name] = 'Required'
    })

    setErrors(nextErrors)
    return !Object.keys(nextErrors).length
  }

  const handleSave = () => {
    if (!student || !validate()) return

    const selectedSection = dynamicData['Section'] || dynamicData.section
    const selectedCourse = dynamicData['Course'] || dynamicData.course
    const selectedYearLevel = dynamicData['Year Level'] || dynamicData.yearLevel || dynamicData['year level'] || ''
    const currentSection = studentData['Section'] || studentData.section
    const currentCourse = studentData['Course'] || studentData.course
    const currentYearLevel = studentData['Year Level'] || studentData.yearLevel || studentData['year level'] || ''

    if (
      selectedSection &&
      selectedCourse &&
      (selectedSection !== currentSection || selectedCourse !== currentCourse || selectedYearLevel !== currentYearLevel)
    ) {
      if (isSectionFull(selectedCourse, selectedSection, selectedYearLevel, student.id)) {
        alert(`Section ${selectedSection} for ${selectedCourse} is already full.`)
        return
      }
    }

    const hasFiles = studentFields.some(field => field.type === 'file' && dynamicData[field.name] instanceof File)

    let payload
    if (hasFiles) {
      const fd = new FormData()
      Object.keys(dynamicData).forEach(key => {
        const val = dynamicData[key]
        if (val instanceof File) fd.append(`dynamic_data[${key}]`, val)
        else if (Array.isArray(val)) val.forEach(item => fd.append(`dynamic_data[${key}][]`, item))
        else if (val !== null && val !== undefined) fd.append(`dynamic_data[${key}]`, val)
      })
      payload = fd
    } else {
      payload = { dynamic_data: dynamicData }
    }

    updateStudent(student.id, payload)
    setEditModal(false)
  }

  const handlePhotoChange = (e) => {
    if (!student) return

    const file = e.target.files[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setPhotoPreview(previewUrl)

    const existingKey = Object.keys(studentData).find(key => {
      const normalizedKey = key.toLowerCase()
      return normalizedKey.includes('photo') || normalizedKey.includes('picture') || normalizedKey.includes('image') || normalizedKey.includes('avatar') || normalizedKey.includes('pic')
    })

    const fieldDefKey = studentFields.find(field => {
      const normalizedName = field.name.toLowerCase()
      return field.type === 'file' && (normalizedName.includes('photo') || normalizedName.includes('picture') || normalizedName.includes('image') || normalizedName.includes('avatar') || normalizedName.includes('pic'))
    })?.name

    const photoKey = existingKey || fieldDefKey || 'Photo'

    const fd = new FormData()
    fd.append(`dynamic_data[${photoKey}]`, file)
    fd.append('studentNumber', studentData['Student Number'] || student.studentNumber || '')
    updateStudent(student.id, fd)

    e.target.value = ''
  }

  const ErrMsg = ({ k }) =>
    errors[k] ? <span style={{ color: '#e74c3c', fontSize: 11, display: 'block', marginTop: 4 }}>{errors[k]}</span> : null

  const renderInput = (field) => {
    const val = dynamicData[field.name]
    const onChange = (value) => dfStore(field.name, value)

    if (field.type === 'short_text' || field.type === 'email') {
      return <input className="form-input" value={val || ''} onChange={e => onChange(e.target.value)} />
    }
    if (field.type === 'long_text' || field.type === 'paragraph') {
      return <textarea className="form-input" style={{ height: field.type === 'paragraph' ? 120 : 80 }} value={val || ''} onChange={e => onChange(e.target.value)} />
    }
    if (field.type === 'number') {
      return <input type="number" className="form-input" value={val || ''} onChange={e => onChange(e.target.value)} />
    }
    if (field.type === 'date') {
      return <input type="date" className="form-input" value={val || ''} onChange={e => onChange(e.target.value)} />
    }
    if (field.type === 'time') {
      return <input type="time" className="form-input" value={val || ''} onChange={e => onChange(e.target.value)} />
    }
    if (field.type === 'select') {
      return (
        <select className="form-input" value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Select option...</option>
          {(Array.isArray(field.options) ? field.options : []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    }
    if (field.type === 'radio') {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          {(Array.isArray(field.options) ? field.options : []).map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" name={field.name} checked={val === opt} onChange={() => onChange(opt)} />
              {opt}
            </label>
          ))}
        </div>
      )
    }
    if (field.type === 'checkbox') {
      const arr = Array.isArray(val) ? val : []
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
          {(Array.isArray(field.options) ? field.options : []).map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 4, margin: 0, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={arr.includes(opt)}
                onChange={e => {
                  onChange(e.target.checked ? [...arr, opt] : arr.filter(x => x !== opt))
                }}
              />{' '}
              {opt}
            </label>
          ))}
        </div>
      )
    }
    if (field.type === 'file') {
      return (
        <div>
          <input type="file" className="form-input" onChange={e => onChange(e.target.files[0])} />
          {typeof val === 'string' && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Current: {val.split('/').pop()}</div>}
        </div>
      )
    }
    return null
  }

  const sectionMap = {}
  studentFields.forEach(field => {
    const sectionName = field.section || 'Basic Information'
    if (['Violation Details', 'Academic Details', 'Action Taken'].includes(sectionName)) return
    if (!sectionMap[sectionName] || field.order_index < sectionMap[sectionName]) {
      sectionMap[sectionName] = field.order_index
    }
  })
  const orderedSections = Object.keys(sectionMap).sort((a, b) => sectionMap[a] - sectionMap[b])

  const getVal = (name) => studentData[name] || '—'
  const studentNum = getVal('Student Number')
  const dob = getVal('Date of Birth')
  const course = getVal('Course')
  const yearLevel = getVal('Year Level')
  const section = getVal('Section')
  const fullName = `${getVal('First Name')} ${getVal('Middle Name')} ${getVal('Last Name')}`.replace(/\s+/g, ' ').trim()

  if (!student) {
    return (
      <div>
        <Header title="Student Information" subtitle="Manage student profiles and medical records" />
        <div style={{ padding: 24 }}><p style={{ color: 'var(--text)' }}>Student not found.</p><Link to="/students" style={{ color: 'var(--orange)' }}>Back to list</Link></div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <Header title="Student Information" subtitle="Manage student profiles and medical records" />
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '6px 12px', height: 32, display: 'flex', gap: 6, alignItems: 'center' }}>
              <ChevronLeft size={14} /> Back
            </button>
            <div className="breadcrumb">
              <Link to="/students" style={{ color: 'var(--text-muted)' }}>Student List</Link>
              <ChevronRight size={12} color="var(--text-muted)" />
              <span style={{ color: 'var(--text)' }}>Student Profile</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {isAdmin && <button className="btn btn-primary" onClick={openEdit}>Update Profile</button>}
            <button className="btn btn-dark" onClick={() => navigate(`/students/${id}/medical`)}>View Medical Records</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card animate-in" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 12,
                    background: 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  {studentPhoto ? (
                    <img src={studentPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 700 }}>
                      {fullName.split(' ').map(name => name[0]).join('').slice(0, 2).toUpperCase() || 'ST'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--orange)',
                    color: '#fff',
                    border: '2px solid var(--card-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                  title="Change Profile Picture"
                >
                  <Pencil size={14} />
                </button>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handlePhotoChange} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>{fullName || 'Student Profile'}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {[
                    ['Student Number', studentNum],
                    ['Date of Birth', dob],
                    ['Course Program', `${course} â€“ ${yearLevel} Sec. ${section}`],
                  ].map(([label, value], index) => (
                    <div key={index} style={{ fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }} className="animate-in">
            <div className="card" style={{ width: 260, flexShrink: 0, background: 'var(--card-bg)', borderColor: 'var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {[...orderedSections, 'Enrolled Subjects', 'Violations'].map(sectionName => {
                const isActive = expandedSection === sectionName
                return (
                  <button
                    key={sectionName}
                    onClick={() => setExpandedSection(sectionName)}
                    style={{
                      textAlign: 'left',
                      padding: '16px 20px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--border)',
                      borderLeft: isActive ? '3px solid var(--orange)' : '3px solid transparent',
                      color: isActive ? 'var(--text)' : 'var(--text-muted)',
                      fontWeight: isActive ? 800 : 700,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {sectionName}
                  </button>
                )
              })}
            </div>

            <div className="card" style={{ flex: 1, background: 'var(--card-bg)', borderColor: 'var(--border)', minHeight: 400, overflow: 'hidden' }}>
              {expandedSection === 'Enrolled Subjects' ? (
                (() => {
                  const currentCourse = studentData['Course'] || studentData.course
                  const currentYear = studentData['Year Level'] || studentData.yearLevel
                  const enrolledSubjects = (syllabi || []).filter(subject => subject.program === currentCourse && subject.yearLevel === currentYear)

                  if (enrolledSubjects.length === 0) {
                    return (
                      <div style={{ padding: '24px', fontSize: 13, color: 'var(--text-muted)' }}>
                        No course subjects found for {currentCourse || 'â€”'} â€“ {currentYear || 'â€”'}.
                      </div>
                    )
                  }

                  return (
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {enrolledSubjects.map(subject => (
                        <div
                          key={subject.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.5fr 1fr 1fr',
                            gap: 20,
                            padding: '20px',
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            alignItems: 'start',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 700, marginBottom: 4, letterSpacing: '0.05em' }}>
                              {subject.courseCode}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{subject.courseTitle}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subject.units} unit{subject.units !== 1 ? 's' : ''} Â· {subject.semester}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</div>
                            {subject.schedule ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {subject.schedule.split('|').map((part, partIndex) => (
                                  <span key={partIndex} style={{ fontSize: 13, color: 'var(--text)', fontWeight: partIndex === 0 ? 600 : 400 }}>
                                    {part.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>â€”</span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instructor</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{subject.instructor || 'â€”'}</div>
                            {subject.instructorEmail && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subject.instructorEmail}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()
              ) : expandedSection === 'Violations' ? (
                (() => {
                  const studentViolations = (Array.isArray(violations) ? violations : []).filter(violation => violation.studentId === student.id)
                  const violationFields = (dynamicFields || []).filter(field => field.module === 'violations' && field.show_in_table)

                  return (
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Disciplinary Records</h3>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Registered infractions and disciplinary actions.</p>
                        </div>
                        {isAdmin && (
                          <button
                            className="btn-primary"
                            style={{ padding: '8px 16px', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', background: 'var(--orange)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => navigate('/academic/violations', { state: { presetStudentId: student.id } })}
                          >
                            Add Violation
                          </button>
                        )}
                      </div>

                      <div style={{ height: 1, background: 'var(--border)' }} />

                      {studentViolations.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: 8, border: '1px dashed var(--border)' }}>
                          No violations recorded for this student.
                        </div>
                      ) : (
                        studentViolations.map(violation => (
                          <div
                            key={violation.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12,
                              padding: '20px',
                              background: 'var(--bg)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                            }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                              {violationFields.map(field => {
                                let str = violation.dynamic_data?.[field.name] || 'â€”'
                                if (Array.isArray(str)) str = str.join(', ')
                                return (
                                  <div key={field.id}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{field.name}</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                                      {field.type === 'select' || field.type === 'radio' ? (
                                        <span style={{ background: 'var(--card-bg)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--border)' }}>{str}</span>
                                      ) : (
                                        str
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })()
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, padding: '24px' }}>
                  {studentFields
                    .filter(field => (field.section || 'Basic Information') === expandedSection)
                    .sort((a, b) => a.order_index - b.order_index)
                    .map(field => {
                      const val = studentData[field.name]
                      let display = 'â€”'
                      if (field.type === 'file' && val) display = 'Attached'
                      else if (Array.isArray(val)) display = val.join(', ')
                      else if (val !== null && val !== undefined) display = String(val)

                      return (
                        <div
                          key={field.id}
                          style={{
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            transition: 'border-color 0.2s',
                          }}
                        >
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.name}</div>
                          <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.4 }}>{display}</div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Update Student Profile"
        size="large"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setEditModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {orderedSections.map(sectionName => (
            <div key={sectionName}>
              <div
                style={{
                  background: 'var(--orange)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  padding: '8px 14px',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: 12,
                }}
              >
                {sectionName}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {studentFields
                  .filter(field => (field.section || 'Basic Information') === sectionName)
                  .sort((a, b) => a.order_index - b.order_index)
                  .map(field => (
                    <div key={field.id} className="form-group" style={{ gridColumn: field.type === 'long_text' ? '1/-1' : 'auto' }}>
                      <label>{field.name}{field.is_required && ' *'}</label>
                      {renderInput(field)}
                      <ErrMsg k={field.name} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
