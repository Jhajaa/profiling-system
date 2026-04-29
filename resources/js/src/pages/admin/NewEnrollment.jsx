import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Copy, Check, ExternalLink, Eye, CheckCircle, XCircle, User, ChevronLeft, Trash2, RefreshCw } from 'lucide-react'
import { useApp, getAcademicSectionInfo, getStudentAcademicInfo, normalizeCourseCode, getYearLevelNumber, studentMatchesSection } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import '../../../../css/StudentList.css'

const ImagePreview = ({ fileInfo }) => {
  const [src, setSrc] = useState(null)
  React.useEffect(() => {
    if (!fileInfo) return
    if (typeof fileInfo === 'string') {
      setSrc(fileInfo)
    } else if (fileInfo && fileInfo.dataUrl) {
      setSrc(fileInfo.dataUrl)
    } else if (fileInfo instanceof File || fileInfo instanceof Blob) {
      const u = URL.createObjectURL(fileInfo)
      setSrc(u)
      return () => {
        try { URL.revokeObjectURL(u) } catch(e){}
      }
    }
  }, [fileInfo])

  if (!src) {
    return (
      <div style={{ width: 80, height: 80, background: '#eee', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd' }}>
        <User size={30} color="#ccc" />
      </div>
    )
  }

  return <img src={src} alt="Profile" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
}

export default function NewEnrollment() {
  const navigate = useNavigate()

  const { enrollees, addEnrollee, approveEnrollment, rejectEnrollment, deleteEnrollee, regenerateEnrolleeCode, dynamicFields, showToast, academicSections, students: allStudents, findNextAvailableSection } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [reviewEnrollee, setReviewEnrollee] = useState(null)
  const [dynamicData, setDynamicData] = useState({})
  const [errors, setErrors] = useState({})
  const [copiedCode, setCopiedCode] = useState(null)
  
  const [allocation, setAllocation] = useState({ section: '', program: '', yearLevel: '' })

  const enrollmentFields = useMemo(() => 
    (dynamicFields || []).filter(f => (f.module || 'students') === 'enrollment'), 
    [dynamicFields]
  )
  
  const studentFields = useMemo(() => 
    (dynamicFields || []).filter(f => (f.module || 'students') === 'students'), 
    [dynamicFields]
  )

  const pendingEnrollees = useMemo(() => 
    (enrollees || []).filter(e => e.status !== 'enrolled'),
    [enrollees]
  )

  const dfStore = (k, v) => setDynamicData(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    enrollmentFields.forEach(field => {
      if (field.is_required) {
        const val = dynamicData[field.name]
        if (!val || (Array.isArray(val) && val.length === 0) || !String(val).trim()) {
            e[field.name] = 'Required'
        }
      }
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleAdd = (e) => {
    if (e) e.preventDefault()
    if (!validate()) return
    
    addEnrollee(dynamicData)
    setDynamicData({})
    setErrors({})
    setShowModal(false)
  }

  const copyLink = (code) => {
    const link = `${window.location.origin}/enrollment-portal?code=${code}`
    navigator.clipboard.writeText(link)
    setCopiedCode(code)
    showToast('Access link copied to clipboard!', 'success')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const renderInput = (field) => {
    const val = dynamicData[field.name]
    const onChange = (v) => dfStore(field.name, v)

    if (field.type === 'short_text' || field.type === 'email') {
      return <input className="form-input" value={val || ''} onChange={e => onChange(e.target.value)} placeholder={`Enter ${field.name.toLowerCase()}...`} />
    }
    if (field.type === 'long_text' || field.type === 'paragraph') {
      return <textarea className="form-input" style={{ height: field.type === 'paragraph' ? 120 : 80 }} value={val || ''} onChange={e => onChange(e.target.value)} placeholder={`Enter ${field.name.toLowerCase()}...`} />
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
              <input type="checkbox" checked={arr.includes(opt)} onChange={e => {
                onChange(e.target.checked ? [...arr, opt] : arr.filter(x => x !== opt))
              }} /> {opt}
            </label>
          ))}
        </div>
      )
    }
    if (field.type === 'file') {
      return <input type="file" className="form-input" onChange={e => onChange(e.target.files[0])} />
    }
    if (field.type === 'sections') {
      const { academicSections, students: allStudents, findNextAvailableSection } = useApp()
      const rawProgram = dynamicData['Course'] || dynamicData['course'] || dynamicData['Expected Course'] || dynamicData['expected course'] || ''
      const currentYearLevel = dynamicData['Year Level'] || dynamicData['yearLevel'] || dynamicData['year level'] || ''
      let currentProgram = String(rawProgram).toUpperCase().trim()
      if (currentProgram === 'BSIT') currentProgram = 'IT'
      if (currentProgram === 'BSCS') currentProgram = 'CS'

      const filteredSections = (academicSections || []).filter(s => 
        (!currentProgram || normalizeCourseCode(s.program) === currentProgram) &&
        (!currentYearLevel || getAcademicSectionInfo(s).yearNumber === getYearLevelNumber(currentYearLevel))
      )

      return (
        <div style={{ position: 'relative' }}>
          <select 
            className="form-input" 
            value={val || ''} 
            onChange={e => onChange(e.target.value)}
          >
            <option value="">-- Auto-allocate (Priority Fill) --</option>
            {filteredSections.map(s => {
              const count = (allStudents || []).filter(st => {
                 return getStudentAcademicInfo(st).canonicalSection === getAcademicSectionInfo(s).canonicalName
              }).length
              const isFull = count >= (s.capacity || 50)
              return (
                <option key={`${s.program}-${s.name}`} value={s.name} disabled={isFull}>
                  {s.program} - {s.name} ({count}/{s.capacity || 50} slots) {isFull ? '[FULL]' : ''}
                </option>
              )
            })}
          </select>
          {!val && currentProgram && (
            <div style={{ fontSize: 11, color: 'var(--orange)', marginTop: 4, fontWeight: 600 }}>
               Next available: {findNextAvailableSection(currentProgram, currentYearLevel) || 'No slots left'}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  const sectionMap = {}
  enrollmentFields.forEach(f => {
    const s = f.section || 'Basic Information'
    if (!sectionMap[s] || f.order_index < sectionMap[s]) sectionMap[s] = f.order_index
  })
  const orderedSections = Object.keys(sectionMap).sort((a, b) => sectionMap[a] - sectionMap[b])

  // Pre-fill allocation when review starts
  React.useEffect(() => {
    if (reviewEnrollee) {
      const sub = {
        ...(reviewEnrollee.dynamic_data || {}),
        ...(reviewEnrollee.submission?.dynamic_data || reviewEnrollee.submission || {})
      }
      setAllocation({
        section: sub['Section'] || sub['section'] || '',
        program: sub['Course'] || sub['course'] || sub['Expected Course'] || sub['Expected course'] || sub['expected course'] || '',
        yearLevel: sub['Year Level'] || sub['yearLevel'] || sub['year level'] || ''
      })
    }
  }, [reviewEnrollee])

  const allocationSectionOptions = useMemo(() => {
    const normalizedProgram = normalizeCourseCode(allocation.program)
    const normalizedYear = getYearLevelNumber(allocation.yearLevel)

    return (academicSections || []).filter(section => {
      const info = getAcademicSectionInfo(section)
      if (normalizedProgram && normalizeCourseCode(info.program) !== normalizedProgram) return false
      if (normalizedYear && info.yearNumber !== normalizedYear) return false
      return true
    })
  }, [academicSections, allocation.program, allocation.yearLevel])

  // Review Page Logic
  const handleApprove = async () => {
    if (window.confirm('Are you sure you want to approve this enrollment? This will create an official student record.')) {
        if (allocation.section && allocation.program) {
          const selectedSection = (academicSections || []).find(section => {
            const info = getAcademicSectionInfo(section)
            return String(info.name).toLowerCase() === String(allocation.section).toLowerCase() &&
              normalizeCourseCode(info.program) === normalizeCourseCode(allocation.program) &&
              (!allocation.yearLevel || info.yearNumber === getYearLevelNumber(allocation.yearLevel))
          })

          if (selectedSection) {
            const selectedInfo = getAcademicSectionInfo(selectedSection)
            const currentCount = allStudents.filter(student => studentMatchesSection(student, selectedInfo)).length
            const capacity = Number(selectedInfo.capacity) || 50

            if (currentCount >= capacity) {
              showToast(
                `Section ${selectedInfo.canonicalName || selectedInfo.name} is already full (${currentCount}/${capacity}).`,
                'error'
              )
              return
            }
          }
        }

        await approveEnrollment(reviewEnrollee.id, {
          'Section': allocation.section,
          'Course': allocation.program,
          ...(allocation.yearLevel ? { 'Year Level': allocation.yearLevel } : {})
        })
        setReviewEnrollee(null)
    }
  }

  const handleReject = async () => {
    const reason = window.prompt('Please enter the reason for returning this application for correction:', 'Some information is missing or incorrect.')
    if (reason !== null && reason.trim() !== '') {
        await rejectEnrollment(reviewEnrollee.id, reason)
        setReviewEnrollee(null)
    }
  }

  return (
    <div className="sl-root">
      <Header title="New Students" />
      <div className="sl-body">
        <div className="sl-card">
          <div className="sl-card-head">
            <div className="sl-head-top">
              <div>
                <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '6px 12px', height: 32, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                  <ChevronLeft size={14} /> Back
                </button>
                <h2 className="sl-title">Incoming Students</h2>
                <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>Manage students who have passed the admission exam and are ready to enroll.</p>
              </div>
              <button className="sl-btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={13} /> Add Confirmed Student
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', padding: 0 }}>
            <table className="sl-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Access Code</th>
                  <th>Status</th>
                  <th>Date Added</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingEnrollees.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="sl-empty">No pending students. All confirmed students have been processed or enrolled.</div>
                    </td>
                  </tr>
                ) : (
                  pendingEnrollees.map(e => (
                    <tr key={e.id}>
                      <td className="sl-stud-name">
                        {e.name}
                        {e.status === 'enrolled' && <span style={{ marginLeft: 8, color: '#2ecc71' }}><CheckCircle size={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} /></span>}
                      </td>
                      <td>
                        <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, fontWeight: 600, letterSpacing: 1 }}>
                          {e.code}
                        </code>
                      </td>
                      <td>
                        <span className={`am-badge`} style={{ 
                          background: e.status === 'enrolled' ? 'rgba(46, 204, 113, 0.1)' : e.status === 'submitted' ? 'rgba(52, 152, 219, 0.1)' : 'rgba(230, 126, 34, 0.1)',
                          color: e.status === 'enrolled' ? '#2ecc71' : e.status === 'submitted' ? '#3498db' : '#e67e22',
                          textTransform: 'capitalize',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px'
                        }}>
                          {e.status === 'submitted' ? 'For Review' : e.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(e.created_at || e.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="sl-row-actions" style={{ justifyContent: 'flex-end' }}>
                          {e.status === 'submitted' ? (
                            <button 
                                className="sl-action-btn" 
                                title="Review Submission" 
                                onClick={() => setReviewEnrollee(e)}
                                style={{ background: 'var(--orange)', color: '#fff', borderRadius: '6px' }}
                            >
                                <Eye size={14} />
                            </button>
                          ) : e.status === 'rejected' ? (
                            <button 
                                className="sl-action-btn" 
                                title="Regenerate New Access Code" 
                                onClick={() => {
                                  if (window.confirm('This student was rejected. Regenerate a brand new access code for them?')) {
                                    regenerateEnrolleeCode(e.id)
                                  }
                                }}
                                style={{ background: 'var(--orange)', color: '#fff', borderRadius: '6px' }}
                            >
                                <RefreshCw size={14} />
                            </button>
                          ) : (
                            <>
                                <button 
                                    className="sl-action-btn" 
                                    title="Copy Enrollment Link" 
                                    onClick={() => copyLink(e.code)}
                                    style={{ color: copiedCode === e.code ? '#2ecc71' : 'var(--orange)' }}
                                >
                                    {copiedCode === e.code ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                                <button 
                                    className="sl-action-btn" 
                                    title="Open Portal" 
                                    onClick={() => window.open(`/enrollment-portal?code=${e.code}`, '_blank')}
                                >
                                    <ExternalLink size={14} />
                                </button>
                            </>
                          )}

                          <button 
                              className="sl-action-btn danger" 
                              title="Delete Submission" 
                              onClick={() => {
                                  if (window.confirm('Move this enrollment record to the Recycle Bin?')) {
                                      deleteEnrollee(e.id)
                                  }
                              }}
                          >
                              <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="sl-table-footer">
            <span className="sl-count">
              Total <strong>{pendingEnrollees.length}</strong> pending student{pendingEnrollees.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setErrors({}); setDynamicData({}); }} title="Add Confirmed Student" size="large" footer={
        <>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Generate Code</button>
        </>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
             This data is used to verify the enrollee and will be pre-filled in their final enrollment form.
          </p>
          
          {orderedSections.map(sectionName => (
            <div key={sectionName}>
              <div className="sl-section-header" style={{ marginBottom: 16 }}>{sectionName}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {enrollmentFields
                  .filter(f => (f.section || 'Basic Information') === sectionName)
                  .sort((a, b) => a.order_index - b.order_index)
                  .map(field => (
                    <div key={field.id} className="form-group" style={{ gridColumn: field.type === 'long_text' || field.type === 'paragraph' ? '1/-1' : 'auto' }}>
                      <label style={{ fontWeight: 600 }}>{field.name}{field.is_required && ' *'}</label>
                      {renderInput(field)}
                      {errors[field.name] && <span style={{ color: '#e74c3c', fontSize: 11, marginTop: 4, display: 'block' }}>{errors[field.name]}</span>}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={!!reviewEnrollee} onClose={() => setReviewEnrollee(null)} title="Review Enrollment Submission" size="large" footer={
        <>
          <button className="btn btn-outline" style={{ color: '#e74c3c', borderColor: '#e74c3c' }} onClick={handleReject}>
            <XCircle size={14} style={{ marginRight: 6 }} /> Return for Correction
          </button>
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-outline" onClick={() => setReviewEnrollee(null)}>Close</button>
          <button className="btn btn-primary" style={{ background: '#2ecc71', borderColor: '#2ecc71' }} onClick={handleApprove}>
            <CheckCircle size={14} style={{ marginRight: 6 }} /> Approve & Enroll
          </button>
        </>
      }>
        {reviewEnrollee && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {(() => {
                        const subData = reviewEnrollee.submission?.dynamic_data || reviewEnrollee.submission?.studentData?.dynamic_data || reviewEnrollee.submission || {};
                        
                        // Try to find the field explicitly named like a photo
                        const profilePicField = studentFields.find(f => {
                            const n = f.name.toLowerCase();
                            return f.type === 'file' && (n.includes('profile') || n.includes('picture') || n.includes('photo') || n.includes('image') || n.includes('avatar') || n.includes('pic'));
                        });
                        
                        let picVal = null;
                        if (profilePicField && subData[profilePicField.name]) {
                            picVal = subData[profilePicField.name];
                        } else {
                            // Fallback: search ALL submission data for the first valid image Base64 or File object
                            const allVals = Object.values(subData);
                            picVal = allVals.find(v => v && (v.dataUrl || (typeof v === 'string' && v.startsWith('data:image')))) || 
                                     reviewEnrollee.submission?.photo || 
                                     null;
                        }
                        
                        return (
                            <div style={{ flexShrink: 0 }}>
                                <ImagePreview fileInfo={picVal} />
                            </div>
                        )
                    })()}
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Enrollee Information</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontSize: '14px' }}>
                            <div><strong style={{ color: '#666' }}>Name:</strong> {reviewEnrollee.name}</div>
                            <div><strong style={{ color: '#666' }}>Code:</strong> {reviewEnrollee.code}</div>
                            <div><strong style={{ color: '#666' }}>Submitted:</strong> { (reviewEnrollee.submitted_at || reviewEnrollee.submittedAt) ? new Date(reviewEnrollee.submitted_at || reviewEnrollee.submittedAt).toLocaleString() : 'N/A'}</div>
                        </div>
                    </div>
                </div>

                <div style={{ background: 'rgba(232, 119, 34, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(232, 119, 34, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)' }}></div>
                          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section Allocation</h3>
                       </div>
                       <button 
                          className="sl-btn-outline" 
                          style={{ height: 28, fontSize: 11, padding: '0 12px' }}
                          onClick={() => {
                             const bestSect = findNextAvailableSection(allocation.program, allocation.yearLevel);
                             if (bestSect) {
                                setAllocation(p => ({ ...p, section: bestSect }));
                                showToast(`Auto-allocated to Section ${bestSect}`, 'info');
                             } else {
                                showToast('No available slots found for this program.', 'error');
                             }
                          }}
                       >
                          Find Available Slot
                       </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="form-group">
                           <label style={{ fontSize: 12, fontWeight: 700, color: '#666' }}>Select Section</label>
                           <select 
                              className="form-input" 
                              style={{ background: '#fff' }}
                              value={allocation.section}
                              onChange={(e) => {
                                 const sectName = e.target.value;
                                 const sectObj = academicSections.find(s => s.name === sectName);
                                 setAllocation({
                                    section: sectName,
                                    program: sectObj ? sectObj.program : allocation.program,
                                    yearLevel: sectObj ? getAcademicSectionInfo(sectObj).yearLevel : allocation.yearLevel
                                 });
                              }}
                           >
                              <option value="">-- No Section Assigned --</option>
                              {allocationSectionOptions.map((s) => {
                                 const sectionInfo = getAcademicSectionInfo(s)
                                 const count = allStudents.filter(st => studentMatchesSection(st, sectionInfo)).length
                                 const capacity = Number(sectionInfo.capacity) || 50
                                 const isFull = count >= capacity
                                 return (
                                    <option key={`${sectionInfo.program}-${sectionInfo.canonicalName || sectionInfo.name}`} value={sectionInfo.name} disabled={isFull}>
                                       {sectionInfo.program} - {sectionInfo.name} ({count}/{capacity} slots) {isFull ? '[FULL]' : ''}
                                    </option>
                                 );
                              })}
                           </select>
                        </div>
                        <div className="form-group">
                           <label style={{ fontSize: 12, fontWeight: 700, color: '#666' }}>Program/Course</label>
                           <div style={{ padding: '10px 12px', background: '#fff', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 14, minHeight: 38, display: 'flex', alignItems: 'center' }}>
                              {allocation.program || 'N/A'}
                           </div>
                        </div>
                    </div>
                    <p style={{ margin: '12px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                       Assigning a section here will override the student's preference and finalize their placement.
                    </p>
                </div>

                {Array.from(new Set(studentFields.map(f => f.section || 'Basic Information'))).map(section => {
                    const fields = studentFields.filter(f => (f.section || 'Basic Information') === section);
                    return (
                        <div key={section}>
                            <div className="sl-section-header" style={{ marginBottom: 16 }}>{section}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                                {fields.map(field => {
                                    const val = reviewEnrollee.submission?.dynamic_data?.[field.name] || reviewEnrollee.submission?.[field.name];
                                    return (
                                        <div key={field.id} style={{ gridColumn: field.type === 'paragraph' || field.type === 'long_text' ? '1/-1' : 'auto' }}>
                                            <div style={{ fontSize: '12px', color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{field.name}</div>
                                            <div style={{ 
                                                minHeight: '38px', 
                                                padding: '8px 12px', 
                                                background: '#fff', 
                                                border: '1px solid #e4e4e7', 
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                color: val ? '#1a1a1a' : '#a1a1aa'
                                            }}>
                                                {field.type === 'file' ? (
                                                    val ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#3498db' }}>
                                                                <Check size={14} /> {val.name ? `File uploaded (${val.name})` : 'File uploaded'}
                                                            </div>
                                                            {(val.type?.startsWith('image/') || val.dataUrl) && (
                                                                <div style={{ maxWidth: '200px' }}>
                                                                    <ImagePreview fileInfo={val} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : 'Not provided'
                                                ) : (
                                                    Array.isArray(val) ? val.join(', ') : val || 'Not provided'
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        )}
      </Modal>
    </div>
  )
}
 
