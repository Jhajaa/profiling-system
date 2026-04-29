import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Shield, Loader2, Info, GraduationCap, User, Phone, MapPin, Send, ArrowRight, Home } from 'lucide-react'
import { useApp, getAcademicSectionInfo, getStudentAcademicInfo, normalizeCourseCode, getYearLevelNumber } from '../../context/AppContext'
import '../../../../css/StudentList.css'
import '../../../../css/home.css'

export default function EnrollmentForm() {
  const { code } = useParams()
  const { verifyEnrollmentCode, finalizeEnrollment, dynamicFields, showToast, isSectionFull, academicSections, students: allStudents, findNextAvailableSection } = useApp()
  const navigate = useNavigate()

  const [enrollee, setEnrollee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  
  const [dynamicData, setDynamicData] = useState({})
  const [errors, setErrors] = useState({})

  const studentFields = React.useMemo(() => 
    (dynamicFields || []).filter(f => (f.module || 'students') === 'students'), 
    [dynamicFields]
  )

  const [isReady, setIsReady] = React.useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [profilePreview, setProfilePreview] = useState(null)
  
  const sectionRefs = React.useRef({})
  const fileInputRef = React.useRef(null)

  useEffect(() => {
    const checkCode = async () => {
      const found = await verifyEnrollmentCode(code)
      if (!found) {
        showToast('Invalid or expired enrollment session.', 'error')
        navigate('/enrollment-portal')
        return
      }
      
      const target = found.data
      setEnrollee(target)
      setLoading(false)

      // Pre-fill from confirmation step data or existing student data
      const existingData = target.dynamic_data || {}
      setDynamicData(p => ({ ...p, ...existingData }))

      // Auto-detect and set profile preview if exists
      const profilePicField = studentFields.find(f => {
         const n = f.name.toLowerCase()
         return f.type === 'file' && (n.includes('profile') || n.includes('picture') || n.includes('photo') || n.includes('image'))
      })
      
      if (profilePicField && existingData[profilePicField.name]) {
         const picVal = existingData[profilePicField.name]
         if (picVal && typeof picVal === 'object' && picVal.dataUrl) {
            setProfilePreview(picVal.dataUrl)
         } else if (typeof picVal === 'string' && picVal !== '—') {
            const url = picVal.startsWith('http') || picVal.startsWith('data:') 
                ? picVal 
                : (picVal.includes('.') ? (picVal.startsWith('/storage/') ? picVal : `/storage/${picVal}`) : picVal)
            setProfilePreview(url)
         }
      } else if (target.profile_image) {
         setProfilePreview(target.profile_image)
      }

      if (!target.dynamic_data && target.name) {
          // Fallback for legacy records
          const parts = target.name.split(' ')
          setDynamicData(p => ({
              ...p,
              'First Name': parts[0],
              'Last Name': parts.slice(1).join(' ')
          }))
      }
      
      setIsReady(true)
    }
    checkCode()
  }, [code, verifyEnrollmentCode, navigate, isReady, studentFields, showToast])

  const validate = () => {
    const e = {}
    studentFields.forEach(field => {
      if (field.is_required) {
        const val = dynamicData[field.name]
        if (field.type === 'file') {
          if (!val) e[field.name] = 'Required'
        } else if (field.type === 'checkbox') {
          if (!val || val.length === 0) e[field.name] = 'Required'
        } else {
          if (!val || !String(val).trim()) e[field.name] = 'Required'
        }
      }
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
        showToast('Please correct the errors in the form.', 'error')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
    }

    const selectedSection = dynamicData['Section'] || dynamicData['section']
    const selectedCourse = dynamicData['Course'] || dynamicData['course']
    
    const selectedYearLevel = dynamicData['Year Level'] || dynamicData['yearLevel'] || dynamicData['year level'] || ''

    if (selectedSection && selectedCourse) {
       if (isSectionFull(selectedCourse, selectedSection, selectedYearLevel)) {
          showToast(`Section ${selectedSection} for ${selectedCourse} is already full. Please select another section.`, 'error')
          return
       }
    }

    setSubmitting(true)
    
    // Format payload for crystallization
    const payload = {
      firstName: dynamicData['First Name'] || enrollee.name?.split(' ')[0] || '',
      lastName: dynamicData['Last Name'] || enrollee.name?.split(' ').slice(1).join(' ') || '',
      studentNumber: dynamicData['Student Number'] || '',
      emailAddress: dynamicData['Email Address'] || '',
      dynamic_data: dynamicData,
      dateRegistered: enrollee.dateRegistered || new Date().toLocaleDateString('en-US')
    }

    const found = await verifyEnrollmentCode(code)
    const result = await finalizeEnrollment(enrollee.id, payload, found?.type || 'enrollee', code)
    if (result.success) {
      setCompleted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setSubmitting(false)
    }
  }

  const handleFileChange = (field, file) => {
    if (!file) {
      setDynamicData(p => ({ ...p, [field.name]: null }))
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setDynamicData(p => ({ 
        ...p, 
        [field.name]: { name: file.name, type: file.type, dataUrl: reader.result }
      }))
      const n = field.name.toLowerCase()
      if (n.includes('profile') || n.includes('picture') || n.includes('photo') || n.includes('image') || n.includes('avatar') || n.includes('pic')) {
        setProfilePreview(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const renderInput = (field) => {
    const val = dynamicData[field.name]
    const onChange = (v) => setDynamicData(p => ({ ...p, [field.name]: v }))

    if (field.type === 'short_text' || field.type === 'email') {
      return <input className="de-fi" value={val || ''} onChange={e => onChange(e.target.value)} />
    }
    if (field.type === 'long_text' || field.type === 'paragraph') {
      return <textarea className="de-fi" style={{ height: field.type === 'paragraph' ? 100 : 72 }} value={val || ''} onChange={e => onChange(e.target.value)} />
    }
    if (field.type === 'number') {
      return <input type="number" className="de-fi" value={val || ''} onChange={e => onChange(e.target.value)} />
    }
    if (field.type === 'date') {
      return <input type="date" className="de-fi" value={val || ''} onChange={e => onChange(e.target.value)} />
    }
    if (field.type === 'time') {
      return <input type="time" className="de-fi" value={val || ''} onChange={e => onChange(e.target.value)} />
    }
    if (field.type === 'select') {
      return (
        <select className="de-fi" value={val || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Select an option...</option>
          {(Array.isArray(field.options) ? field.options : []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    }
    if (field.type === 'radio') {
      return (
        <div className="de-radio-row">
          {(Array.isArray(field.options) ? field.options : []).map(opt => (
            <div 
              key={opt} 
              className={`de-rpill ${val === opt ? 'sel' : ''}`}
              onClick={() => onChange(opt)}
            >
              <div className="de-rpill-dot"><div className="de-rpill-dot-c"></div></div>
              {opt}
            </div>
          ))}
        </div>
      )
    }
    if (field.type === 'checkbox') {
      const arr = Array.isArray(val) ? val : []
      return (
        <div className="de-cb-row">
          {(Array.isArray(field.options) ? field.options : []).map(opt => (
            <div 
              key={opt} 
              className={`de-cbpill ${arr.includes(opt) ? 'sel' : ''}`}
              onClick={() => {
                onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt])
              }}
            >
              <div className="de-cbbox"><div className="de-cbcheck"></div></div>
              {opt}
            </div>
          ))}
        </div>
      )
    }
    if (field.type === 'file') {
      return (
        <div 
          className="de-file-zone" 
          onClick={() => document.getElementById(`file_inp_${field.id}`).click()}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B0B0B0" strokeWidth="1.5" style={{ margin: '0 auto', display: 'block' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p>
            {val ? `✓ File selected: ${val.name || val}` : 'Click to upload file'}
          </p>
          <input 
            id={`file_inp_${field.id}`}
            type="file" 
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files[0]) handleFileChange(field, e.target.files[0])
            }} 
          />
        </div>
      )
    }
    if (field.type === 'sections') {
      const rawProgram = dynamicData['Course'] || dynamicData['course'] || ''
      const currentYearLevel = dynamicData['Year Level'] || dynamicData['yearLevel'] || dynamicData['year level'] || ''
      let currentProgram = String(rawProgram).toUpperCase().trim()
      if (currentProgram === 'BSIT') currentProgram = 'IT'
      if (currentProgram === 'BSCS') currentProgram = 'CS'

      const filteredSections = academicSections.filter(s => 
        (!currentProgram || normalizeCourseCode(s.program) === currentProgram) &&
        (!currentYearLevel || getAcademicSectionInfo(s).yearNumber === getYearLevelNumber(currentYearLevel))
      )

      return (
        <div style={{ position: 'relative' }}>
          <select 
            className="de-fi" 
            value={val || ''} 
            onChange={e => onChange(e.target.value)}
          >
            <option value="">-- Auto-allocate (Priority Fill) --</option>
            {filteredSections.map(s => {
              const count = allStudents.filter(st => {
                 return getStudentAcademicInfo(st).canonicalSection === getAcademicSectionInfo(s).canonicalName
              }).length
              const isFull = count >= (s.capacity || 50)
              return (
                <option key={s.id} value={s.name} disabled={isFull}>
                  {s.program} - {s.name} ({count}/{s.capacity || 50} slots) {isFull ? '[FULL]' : ''}
                </option>
              )
            })}
          </select>
          {!val && currentProgram && (
            <div style={{ fontSize: 11, color: 'var(--orange)', marginTop: 4, fontWeight: 600 }}>
               Recommended: {findNextAvailableSection(currentProgram, currentYearLevel) || 'No slots left'}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  const sectionMap = {}
  studentFields.forEach(f => {
    const s = f.section || 'General'
    if (!sectionMap[s]) sectionMap[s] = { fields: [], minOrder: f.order_index }
    sectionMap[s].fields.push(f)
    if (f.order_index < sectionMap[s].minOrder) sectionMap[s].minOrder = f.order_index
  })
  const orderedSections = Object.entries(sectionMap).sort((a, b) => a[1].minOrder - b[1].minOrder)

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)

  // Calculate Progress
  const reqFields = studentFields.filter(f => f.is_required)
  const filledFields = reqFields.filter(f => {
    const v = dynamicData[f.name]
    if (f.type === 'file') return !!v
    if (f.type === 'checkbox') return Array.isArray(v) && v.length > 0
    return v && String(v).trim()
  })
  const progressPct = reqFields.length ? Math.round((filledFields.length / reqFields.length) * 100) : 0

  const fn = dynamicData['First Name'] || enrollee?.name?.split(' ')[0] || ''
  const ln = dynamicData['Last Name'] || enrollee?.name?.split(' ').slice(1).join(' ') || ''
  const mn = dynamicData['Middle Name'] || ''
  const studentNum = dynamicData['Student Number'] || '—'
  const displayName = [fn, mn ? mn[0]+'.' : '', ln].filter(Boolean).join(' ') || '— — —'

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', background: '#F2F0EC', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" size={32} color="#E87722" />
    </div>
  )

  if (completed) return (
    <div style={{ minHeight: '100vh', background: '#F2F0EC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Instrument Sans, sans-serif', color: '#0D0D0D' }}>
      <div style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
        <CheckCircle size={56} color="#E87722" style={{ margin: '0 auto 24px' }} />
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 800, marginBottom: 12 }}>Application Received</h1>
        <p style={{ color: '#7A7A7A', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
          Thank you, <strong>{enrollee.name}</strong>. Your profile has been submitted and is currently being reviewed.
        </p>
        <div style={{ textAlign: 'left', padding: 28, borderRadius: 12, border: '1px solid #E4E2DD', background: '#fff', marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#E87722', textTransform: 'uppercase', letterSpacing: '0.15em', paddingBottom: 10, borderBottom: '1px solid #E4E2DD', marginBottom: 16 }}>Next Steps</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#3A3A3A', fontSize: 14, lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>Credentials will be sent via email once verified.</li>
            <li>Verification usually takes 1-2 business days.</li>
          </ul>
        </div>
        <button onClick={() => navigate('/login')} style={{ background: '#0D0D0D', border: 'none', height: 48, padding: '0 40px', borderRadius: 8, fontWeight: 600, color: '#fff', fontFamily: 'Syne, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
          Return to Portal Login
        </button>
      </div>
    </div>
  )

  const handleSmartSubmit = (e) => {
    e.preventDefault()
    
    // Check for errors in the current section
    const currentSectionFields = orderedSections[currentSectionIdx]?.[1]?.fields || []
    let hasCurrentError = false
    const eObj = { ...errors }

    currentSectionFields.forEach(f => {
      if (f.is_required) {
        const v = dynamicData[f.name]
        const empty = f.type === 'file' ? !v : f.type === 'checkbox' ? (!v || !v.length) : (!v || !String(v).trim())
        if (empty) {
          eObj[f.name] = 'Required'
          hasCurrentError = true
        } else {
          delete eObj[f.name]
        }
      }
    })
    
    setErrors(eObj)

    if (hasCurrentError) {
      showToast('Please fill out all required fields in this section.', 'error')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Move to next section or submit overall
    if (currentSectionIdx < orderedSections.length - 1) {
      setCurrentSectionIdx(currentSectionIdx + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      if (validate()) {
        handleSubmit(e)
      } else {
        showToast('Please correct errors in previous sections.', 'error')
        // Automatically find the first section with an error and navigate there
        const firstErrIdx = orderedSections.findIndex(([, sec]) => {
          return sec.fields.some(f => {
            if (!f.is_required) return false
            const v = dynamicData[f.name]
            return f.type === 'file' ? !v : f.type === 'checkbox' ? (!v || !v.length) : (!v || !String(v).trim())
          })
        })
        if (firstErrIdx !== -1) {
          setCurrentSectionIdx(firstErrIdx)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
    }
  }

  return (
    <div className="de-shell">
      {/* Left Panel Sidebar */}
      <aside className="de-lpanel">
        <div className="de-lp-top">
          <div className="de-lp-wordmark">Registration System</div>
          <div className="de-lp-title">New Student<br /><span>Profile</span><br />Registration</div>
        </div>

        <div className="de-lp-avatar-zone">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0]
              if (file) {
                const targetField = studentFields.find(f => f.type === 'file' && f.name.toLowerCase().includes('profile')) || { name: 'Profile Picture' }
                handleFileChange(targetField, file)
              }
            }}
          />
          <div 
            className="de-lp-avatar" 
            onClick={() => fileInputRef.current?.click()}
            title="Upload Profile Picture"
          >
            {profilePreview ? (
              <img src={profilePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            )}
          </div>
          <div>
            <div className="de-lp-studentname">{displayName}</div>
            <div className="de-lp-studentid">Student ID: {studentNum}</div>
          </div>
        </div>

        <div className="de-lp-progress">
          <div className="de-lp-prog-label">Form completion</div>
          <div className="de-prog-track"><div className="de-prog-fill" style={{ width: `${progressPct}%` }}></div></div>
          <div className="de-prog-pct">{progressPct}<span>%</span><span style={{ fontSize: 10, color: '#555', marginLeft: 6 }}>· {filledFields.length}/{reqFields.length} required</span></div>
        </div>

        <nav className="de-lp-nav">
          {orderedSections.map(([secName, sec], i) => (
            <div 
              key={secName} 
              className={`de-nav-sec ${i === currentSectionIdx ? 'active' : ''} ${i < currentSectionIdx ? 'done' : ''}`}
              onClick={() => { setCurrentSectionIdx(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              <div className="de-nav-num">{i < currentSectionIdx ? '✓' : (i + 1)}</div>
              <div className="de-nav-sec-label">{secName}</div>
              <div className="de-nav-count">{sec.fields.length}f</div>
            </div>
          ))}
        </nav>

        <div className="de-lp-footer">
          <button 
            className="de-btn-sub" 
            onClick={handleSmartSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : currentSectionIdx === orderedSections.length - 1 ? 'Submit Profile' : 'Continue'}
          </button>
        </div>
      </aside>

      {/* Right Panel Main Content */}
      <main className="de-rpanel">
        <div className="de-rp-header">
          <div className="de-rp-eyebrow">Registration Form · {new Date().getFullYear()}</div>
          <div className="de-rp-section-title">
             {orderedSections[currentSectionIdx]?.[0]}
          </div>
          <div className="de-rp-section-sub">
             {orderedSections[currentSectionIdx]?.[1]?.fields.filter(f => f.is_required).length} required · {orderedSections[currentSectionIdx]?.[1]?.fields.length} total fields in this section
          </div>
        </div>
        <div className="de-rp-divider"></div>
        
        <div className="de-fields-wrap">
          {(() => {
            const currentFields = orderedSections[currentSectionIdx] ? [...orderedSections[currentSectionIdx][1].fields].sort((a, b) => a.order_index - b.order_index) : []
            const rows = []
            let i = 0
            while (i < currentFields.length) {
              const f = currentFields[i]
              const isWide = f.type === 'paragraph' || f.type === 'long_text' || f.type === 'file' || f.type === 'checkbox' || f.type === 'radio'
              if (isWide) {
                rows.push([f])
                i++
              } else {
                if (i + 1 < currentFields.length) {
                  const nf = currentFields[i + 1]
                  const nWide = nf.type === 'paragraph' || nf.type === 'long_text' || nf.type === 'file' || nf.type === 'checkbox' || nf.type === 'radio'
                  if (!nWide) {
                    rows.push([f, nf])
                    i += 2
                  } else {
                    rows.push([f])
                    i++
                  }
                } else {
                  rows.push([f])
                  i++
                }
              }
            }

            return rows.map((row, rIdx) => (
              <div key={rIdx} className={`de-field-row ${row.length === 2 ? 'cols-2' : 'cols-1'}`}>
                {row.map(field => (
                  <div key={field.id} className="de-field-item">
                    <div className="de-field-label">
                      {field.name}
                      {field.is_required && <span className="de-field-req">*</span>}
                    </div>
                    {renderInput(field)}
                    {errors[field.name] && (
                      <div className="de-error-msg">{errors[field.name]}</div>
                    )}
                  </div>
                ))}
              </div>
            ))
          })()}
        </div>

        <div className="de-form-note">
          All required fields must be completed before submitting.<br />
          Your data is securely stored and used only for registration purposes.
        </div>
      </main>
    </div>
  )
}
