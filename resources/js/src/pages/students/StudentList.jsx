import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import { ConfirmDialog } from '../../components/Modal'
import ImportModal from '../../components/ImportModal'
import { Search, Filter, Plus, Download, Eye, Pencil, Trash2, Columns, Archive, CheckSquare, Square, ChevronLeft, ChevronRight, Key, Copy, Check, RefreshCw, XCircle, CheckCircle, ClipboardCheck } from 'lucide-react'
import '../../../../css/StudentList.css'

const ImagePreview = ({ fileInfo }) => {
  const [src, setSrc] = useState(null)
  React.useEffect(() => {
    if (!fileInfo) return
    if (typeof fileInfo === 'string') {
      if (fileInfo.startsWith('http') || fileInfo.startsWith('data:') || fileInfo.startsWith('/storage/')) {
        setSrc(fileInfo)
      } else if (fileInfo.includes('.')) {
        setSrc(`/storage/${fileInfo}`)
      } else {
        setSrc(null)
      }
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
        <Eye size={30} color="#ccc" />
      </div>
    )
  }

  return <img src={src} alt="Profile" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
}

export default function StudentList() {
  const { 
    students, addStudent, addStudentsBulk, updateStudent, deleteStudent, archiveStudent, bulkArchiveStudents, 
    isAdmin, dynamicFields, generateStudentAccessCode, showToast,
    enrollees, approveEnrollment, rejectEnrollment, regenerateEnrolleeCode
  } = useApp()
  const navigate = useNavigate()
  
  const studentFields = React.useMemo(() => (dynamicFields || []).filter(f => (f.module || 'students') === 'students'), [dynamicFields])

  const [search,        setSearch]        = useState('')
  const [showFilter,    setShowFilter]    = useState(false)
  const [dynamicFilterVals, setDynamicFilterVals] = useState({})
  const [modal,         setModal]         = useState(null)
  const [editId,        setEditId]        = useState(null)
  const [dynamicData,   setDynamicData]   = useState({})
  const [errors,        setErrors]        = useState({})
  const [confirm,       setConfirm]       = useState(null)
  const [archiveConfirm, setArchiveConfirm] = useState(null)
  const [reviewEnrollee, setReviewEnrollee] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  const handleApprove = async () => {
    if (!reviewEnrollee) return
    try {
      await approveEnrollment(reviewEnrollee.id)
      showToast('Student profiling approved!', 'success')
      setReviewEnrollee(null)
    } catch (err) {
      showToast('Failed to approve profiling.', 'error')
    }
  }

  const handleReject = async () => {
    if (!reviewEnrollee || !rejectionReason.trim()) return
    try {
      await rejectEnrollment(reviewEnrollee.id, rejectionReason)
      showToast('Student profiling returned for correction.', 'info')
      setReviewEnrollee(null)
      setShowRejectModal(false)
      setRejectionReason('')
    } catch (err) {
      showToast('Failed to reject profiling.', 'error')
    }
  }
  const [selectedIds,    setSelectedIds]    = useState([])
  const [bulkArchiveConfirm, setBulkArchiveConfirm] = useState(false)
  const [importOpen,    setImportOpen]    = useState(false)
  const [columnModal,   setColumnModal]   = useState(false)
  const [currentPage,   setCurrentPage]   = useState(1)
  const [rowsPerPage,   setRowsPerPage]   = useState(10)
  const [visibleColumnNames, setVisibleColumnNames] = useState(() => {
      const saved = localStorage.getItem('studentListVisibleColumns')
      return saved ? JSON.parse(saved) : null
  })
  
  const [generatedCode, setGeneratedCode] = useState(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const dfStore = (k, v) => setDynamicData(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    studentFields.forEach(field => {
      if (field.is_required) {
        const val = dynamicData[field.name]
        if (field.type === 'file') {
          if (!val && modal === 'add') e[field.name] = 'Required'
        } else if (field.type === 'checkbox') {
          if (!val || val.length === 0) e[field.name] = 'Required'
        } else {
          if (!val || !String(val).trim()) e[field.name] = 'Required'
        }
      }
    })
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return

    const hasFiles = studentFields.some(f => f.type === 'file' && dynamicData[f.name] instanceof File)

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

    if (modal === 'add') addStudent(payload)
    else updateStudent(editId, payload)

    closeModal()
  }

  const openEdit = (s) => {
    setDynamicData(s.dynamic_data || {})
    setEditId(s.id)
    setErrors({})
    setModal('edit')
  }

  const openAdd = () => {
    setDynamicData({})
    setEditId(null)
    setErrors({})
    setModal('add')
  }

  const closeModal = () => {
    setModal(null)
    setErrors({})
    setDynamicData({})
  }

  const handleGenerateCode = async (studentId) => {
    const code = await generateStudentAccessCode(studentId)
    if (code) {
      setGeneratedCode({ studentId, code })
    }
  }

  const copyLink = (code) => {
    const link = `${window.location.origin}/enrollment-portal?code=${code}`
    navigator.clipboard.writeText(link)
    setCopiedCode(true)
    showToast('Link copied to clipboard!', 'success')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const clearFilters = () => setDynamicFilterVals({})
  const hasFilters = Object.keys(dynamicFilterVals).some(k => dynamicFilterVals[k] && dynamicFilterVals[k] !== 'All')

  const filtered = students.filter(s => {
    for (const key of Object.keys(dynamicFilterVals)) {
      const filterVal = dynamicFilterVals[key]
      if (!filterVal || filterVal === 'All') continue
      const studentVal = s.dynamic_data?.[key]
      if (!studentVal) return false
      const fieldDef = studentFields.find(f => f.name === key)
      if (fieldDef?.type === 'checkbox' && Array.isArray(studentVal)) {
        if (!studentVal.includes(filterVal)) return false
      } else if (!String(studentVal).toLowerCase().includes(filterVal.toLowerCase())) return false
    }
    const q = search.toLowerCase()
    if (!q) return true
    const allValues = Object.values(s.dynamic_data || {}).join(' ').toLowerCase()
    return allValues.includes(q)
  })

  const ErrMsg = ({ k }) =>
    errors[k] ? <span style={{ color: '#e74c3c', fontSize: 11, display: 'block', marginTop: 4 }}>{errors[k]}</span> : null

  const renderInput = (field) => {
    const val = dynamicData[field.name]
    const onChange = (v) => dfStore(field.name, v)

    if (field.type === 'short_text' || field.type === 'email') {
      return <input type={field.type === 'email' ? 'email' : 'text'} className="form-input" value={val || ''} onChange={e => onChange(e.target.value)} />
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
              <input type="checkbox" checked={arr.includes(opt)} onChange={e => {
                onChange(e.target.checked ? [...arr, opt] : arr.filter(x => x !== opt))
              }} /> {opt}
            </label>
          ))}
        </div>
      )
    }
    if (field.type === 'file') {
      const isImage = val && (
        (typeof val === 'string' && val.startsWith('data:image')) || 
        (val instanceof File && val.type.startsWith('image/'))
      )
      const previewUrl = val instanceof File ? URL.createObjectURL(val) : val

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 4 }}>
          <div style={{ 
            width: 60, 
            height: 60, 
            borderRadius: '50%', 
            background: '#f4f4f5', 
            border: '2px dashed #e4e4e7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {isImage ? (
              <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Plus size={18} color="#a1a1aa" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label className="sl-file-upload">
              <input type="file" accept="image/*" onChange={e => onChange(e.target.files[0])} style={{ display: 'none' }} />
              <div className="sl-file-btn">
                <Plus size={13} /> {val ? 'Change Photo' : 'Upload Photo'}
              </div>
            </label>
            {val && !(val instanceof File) && typeof val === 'string' && !val.startsWith('data:') && (
              <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Stored: {val.split('/').pop()}</div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  // Compute ordered sections
  const sectionMap = {}
  studentFields.forEach(f => {
    const s = f.section || 'Basic Information'
    if (!sectionMap[s] || f.order_index < sectionMap[s]) sectionMap[s] = f.order_index
  })
  const orderedSections = Object.keys(sectionMap).sort((a, b) => sectionMap[a] - sectionMap[b])

  const allTableFields = studentFields.slice().sort((a, b) => a.order_index - b.order_index)
  const effectiveVisibleColumns = visibleColumnNames || ['Student Number', 'Course', 'Last Name', 'First Name', 'Profiling Status']
  const tableFields = allTableFields.filter(f => effectiveVisibleColumns.includes(f.name))
  const showDateRegistered = effectiveVisibleColumns.includes('Date Registered')

  // Unique course values from the data for quick-filter tabs
  const courses = [...new Set((students || []).map(s => s.dynamic_data?.['Course'] || s.dynamic_data?.['course']).filter(Boolean))]

  const [courseFilter, setCourseFilter] = useState('All')

  const filteredWithCourse = filtered.filter(s => {
    if (courseFilter === 'All') return true
    if (courseFilter === 'For Review') {
       return (s.dynamic_data?.profileStatus || s.profileStatus) === 'submitted_for_review'
    }
    const c = s.dynamic_data?.['Course'] || s.dynamic_data?.['course'] || ''
    return c === courseFilter
  })

  // Pagination Logic
  const totalRows = filteredWithCourse.length
  const totalPages = Math.ceil(totalRows / rowsPerPage)
  const indexOfLastRow = currentPage * rowsPerPage
  const indexOfFirstRow = indexOfLastRow - Math.min(rowsPerPage, totalRows) >= 0 ? indexOfLastRow - rowsPerPage : 0
  const currentRows = filteredWithCourse.slice(indexOfFirstRow, indexOfLastRow)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, dynamicFilterVals, rowsPerPage, courseFilter])

  return (
    <div className="sl-root">
      <Header title="Student Information" />
      <div className="sl-body">
        <div className="sl-card">

          <div className="sl-card-head">
            <div className="sl-head-top">
              <h2 className="sl-title">Student List</h2>
              {isAdmin && (
                <div className="sl-head-actions">
                  {selectedIds.length > 0 && (
                    <button className="sl-btn-primary" style={{ background: '#e67e22' }} onClick={() => setBulkArchiveConfirm(true)}>
                      <Archive size={13} /> Archive Selected ({selectedIds.length})
                    </button>
                  )}
                  <button className="sl-btn-outline" onClick={() => setColumnModal(true)}>
                    <Columns size={13} /> Columns
                  </button>
                  <button className="sl-btn-outline" onClick={() => setImportOpen(true)}>
                    <Download size={13} /> Import
                  </button>
                  <button className="sl-btn-primary" onClick={openAdd}>
                    <Plus size={13} /> Add Student
                  </button>
                </div>
              )}
            </div>

            <div className="sl-filter-row">
              <div className="sl-filter-tabs">
                <button className={`sl-ftab${courseFilter === 'All' ? ' active' : ''}`} onClick={() => setCourseFilter('All')}>All</button>
                <button className={`sl-ftab${courseFilter === 'For Review' ? ' active' : ''}`} 
                  onClick={() => setCourseFilter('For Review')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                   For Review 
                   {students.filter(s => (s.dynamic_data?.profileStatus || s.profileStatus) === 'submitted_for_review').length > 0 && (
                     <span style={{ background: '#3498db', color: 'white', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>
                        {students.filter(s => (s.dynamic_data?.profileStatus || s.profileStatus) === 'submitted_for_review').length}
                     </span>
                   )}
                </button>
                {courses.map(c => (
                  <button key={c} className={`sl-ftab${courseFilter === c ? ' active' : ''}`} onClick={() => setCourseFilter(c)}>{c}</button>
                ))}
                {(hasFilters || courseFilter !== 'All') && (
                  <button className="sl-clear-btn" onClick={() => { clearFilters(); setCourseFilter('All') }}>Clear filters</button>
                )}
              </div>

              <div className="sl-filter-right">
                <div className="sl-search-wrap">
                  <Search size={13} className="sl-search-icon" />
                  <input className="sl-search-input" placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className={`sl-btn-outline${showFilter ? ' active' : ''}`} onClick={() => setShowFilter(!showFilter)}>
                  <Filter size={13} /> Advanced Queries
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Pills */}
          {hasFilters && (
            <div className="sl-active-filters">
              {Object.entries(dynamicFilterVals).map(([key, val]) => {
                if (!val || val === 'All') return null
                return (
                  <div key={key} className="sl-pill">
                    <span>{key}: <strong>{val}</strong></span>
                    <button className="sl-pill-x" onClick={() => setDynamicFilterVals(p => ({ ...p, [key]: 'All' }))}>
                       <Plus size={10} style={{ transform: 'rotate(45deg)' }} />
                    </button>
                  </div>
                )
              })}
              <button className="sl-clear-btn" onClick={clearFilters} style={{ marginLeft: 4 }}>Clear all</button>
              <div className="sl-count" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                <strong>{filteredWithCourse.length}</strong> result{filteredWithCourse.length !== 1 ? 's' : ''} found
              </div>
            </div>
          )}

          {/* Side Drawer Filter */}
          <div className={`sl-drawer-overlay ${showFilter ? 'open' : ''}`} onClick={() => setShowFilter(false)} />
          <div className={`sl-drawer ${showFilter ? 'open' : ''}`}>
            <div className="sl-drawer-head">
              <h3 className="sl-drawer-title">Advanced Queries</h3>
              <button className="sl-action-btn" onClick={() => setShowFilter(false)}>
                <Plus size={18} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <div className="sl-drawer-body">
              <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.5, margin: 0 }}>
                Refine your search by applying specific filters across student profiles.
              </p>

              {orderedSections.map(section => {
                const fields = studentFields.filter(f => (f.section || 'Basic Information') === section && f.type !== 'file' && f.type !== 'long_text')
                if (fields.length === 0) return null

                return (
                  <div key={section} className="sl-drawer-section">
                    <div className="sl-drawer-section-title">{section}</div>
                    <div className="sl-drawer-grid">
                      {fields.map(field => (
                        <div key={field.id} className="sl-drawer-group">
                          <label className="sl-drawer-label">{field.name}</label>
                          {['select', 'checkbox', 'radio'].includes(field.type) ? (
                            <select 
                              className="sl-drawer-input" 
                              value={dynamicFilterVals[field.name] || 'All'} 
                              onChange={e => setDynamicFilterVals(p => ({ ...p, [field.name]: e.target.value }))}
                            >
                              <option value="All">All {field.name}s</option>
                              {(Array.isArray(field.options) ? field.options : []).map(opt => <option key={opt}>{opt}</option>)}
                            </select>
                          ) : (
                            <input 
                              className="sl-drawer-input" 
                              placeholder={`Type ${field.name.toLowerCase()}...`}
                              value={dynamicFilterVals[field.name] || ''} 
                              onChange={e => setDynamicFilterVals(p => ({ ...p, [field.name]: e.target.value }))} 
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="sl-drawer-footer">
              <button className="sl-btn-outline" onClick={clearFilters}>Reset All</button>
              <button className="sl-btn-primary" onClick={() => setShowFilter(false)}>Apply Filters</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="sl-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <button className="sl-check-btn" onClick={() => {
                        if (selectedIds.length === filteredWithCourse.length) setSelectedIds([])
                        else setSelectedIds(filteredWithCourse.map(s => s.id))
                      }}>
                        {selectedIds.length === filteredWithCourse.length && filteredWithCourse.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                  )}
                  {tableFields.map(f => <th key={f.id}>{f.name}</th>)}
                  {effectiveVisibleColumns.includes('Profiling Status') && <th>Profiling Status</th>}
                  {showDateRegistered && <th>Date Registered</th>}
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length === 0 ? (
                  <tr><td colSpan={tableFields.length + (showDateRegistered ? 3 : 2)}><div className="sl-empty">No students found</div></td></tr>
                ) : currentRows.map(s => {
                  const pStatus = s.dynamic_data?.profileStatus || s.profileStatus;
                  const aCode = s.dynamic_data?.accessCode || s.accessCode;

                  return (
                    <tr key={s.id} onDoubleClick={() => navigate(`/students/${s.id}`)} className={selectedIds.includes(s.id) ? 'selected' : ''}>
                    {isAdmin && (
                      <td style={{ textAlign: 'center' }}>
                         <button className="sl-check-btn" onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]) }}>
                            {selectedIds.includes(s.id) ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                         </button>
                      </td>
                    )}
                    {tableFields.map(field => {
                      const val = s.dynamic_data?.[field.name]
                      let display = '-'
                      if (field.type === 'file' && val) display = '📎 Attached'
                      else if (Array.isArray(val)) display = val.join(', ')
                      else if (val !== null && val !== undefined) display = String(val).substring(0, 30) + (String(val).length > 30 ? '…' : '')
                      return <td key={field.id} style={{ minWidth: 120, color: '#555' }} title={String(val || '')}>{display}</td>
                    })}
                    {effectiveVisibleColumns.includes('Profiling Status') && (
                       <td>
                          <span className="sl-badge" style={{ 
                             background: pStatus === 'submitted_for_review' ? 'rgba(52, 152, 219, 0.1)' : pStatus === 'pending_form' ? 'rgba(230, 126, 34, 0.1)' : pStatus === 'done' ? 'rgba(46, 204, 113, 0.1)' : pStatus === 'rejected' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(127, 140, 141, 0.1)',
                             color: pStatus === 'submitted_for_review' ? '#3498db' : pStatus === 'pending_form' ? '#e67e22' : pStatus === 'done' ? '#2ecc71' : pStatus === 'rejected' ? '#e74c3c' : '#7f8c8d',
                             fontSize: 11,
                             padding: '2px 8px',
                             borderRadius: 12,
                             fontWeight: 600
                          }}>
                             {pStatus === 'submitted_for_review' ? 'For Review' : pStatus === 'pending_form' ? 'Pending submission' : pStatus === 'done' ? 'Profiling Done' : pStatus === 'rejected' ? 'Rejected' : 'No form generated'}
                          </span>
                       </td>
                    )}
                    {showDateRegistered && <td style={{ whiteSpace: 'nowrap' }}>{s.dateRegistered}</td>}
                    <td>
                      <div className="sl-row-actions">
                        <button className="sl-action-btn" onClick={(e) => { e.stopPropagation(); navigate(`/students/${s.id}`); }} title="View Details">
                          <Eye size={13} />
                        </button>
                        {isAdmin && (
                          <>
                            <button className="sl-action-btn" onClick={(e) => { e.stopPropagation(); openEdit(s); }} title="Edit"><Pencil size={13} /></button>
                            <button className="sl-action-btn" onClick={(e) => { e.stopPropagation(); setArchiveConfirm(s.id); }} title="Archive">
                              <Archive size={13} />
                            </button>
                            {pStatus === 'submitted_for_review' && (
                                <button 
                                   className="sl-action-btn" 
                                   onClick={(e) => { 
                                       e.stopPropagation(); 
                                       const en = enrollees.find(en => en.code === aCode);
                                       if(en) setReviewEnrollee(en);
                                       else showToast('Could not find enrolment data for this student.', 'error');
                                   }} 
                                   title="Review Submission"
                                   style={{ color: '#3498db' }}
                                >
                                  <ClipboardCheck size={13} />
                                </button>
                            )}
                            {pStatus === 'rejected' && (
                               <button 
                                  className="sl-action-btn" 
                                  onClick={async (e) => { 
                                      e.stopPropagation();
                                      // Multi-strategy lookup: by accessCode, then student number, then name
                                      const sNum = s.dynamic_data?.['Student Number'] || s.dynamic_data?.studentNumber
                                      let en = enrollees.find(en => aCode && en.code === aCode)
                                      if (!en && sNum) {
                                          en = enrollees.find(en => {
                                              const d = en.dynamic_data || {}
                                              return d['Student Number'] === sNum || d.studentNumber === sNum
                                          })
                                      }
                                      if (!en) {
                                          // Last resort: match by name
                                          const sName = (s.dynamic_data?.['First Name'] || '') + ' ' + (s.dynamic_data?.['Last Name'] || '')
                                          en = enrollees.find(en => en.name && en.name.trim().toLowerCase() === sName.trim().toLowerCase())
                                      }
                                      if (en) {
                                          const result = await regenerateEnrolleeCode(en.id);
                                          if (result.success) showToast(`New code generated and sent to student!`, 'success');
                                      } else {
                                          showToast('Could not find enrollment record. Please delete and re-add this student.', 'error');
                                      }
                                  }} 
                                  title="Generate New Code (Rejected)"
                                  style={{ color: '#e74c3c' }}
                               >
                                 <RefreshCw size={13} />
                               </button>
                            )}
                            {!pStatus && !aCode && (
                               <button 
                                  className="sl-action-btn" 
                                  onClick={(e) => { e.stopPropagation(); handleGenerateCode(s.id); }} 
                                  title="Generate Profiling Code"
                                  style={{ color: 'var(--orange)' }}
                               >
                                 <Key size={13} />
                               </button>
                            )}
                            {aCode && (
                               <button 
                                  className="sl-action-btn" 
                                  onClick={(e) => { e.stopPropagation(); setGeneratedCode({ studentId: s.id, code: aCode }); }} 
                                  title="View Access Code"
                                  style={{ color: '#2ecc71' }}
                                >
                                  <Key size={13} />
                                </button>
                             )}
                          </>
                        )}
                      </div>
                    </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

            <div className="sl-table-footer">
              <span className="sl-count">
                Showing <strong>{totalRows > 0 ? indexOfFirstRow + 1 : 0}</strong> to <strong>{Math.min(indexOfLastRow, totalRows)}</strong> of <strong>{totalRows}</strong> students
              </span>

              <div className="sl-footer-right">
                <div className="sl-rows-per-page">
                   <span>Rows per page:</span>
                   <select className="sl-rows-select" value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))}>
                      {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                   </select>
                </div>

                <div className="sl-pagination">
                  <button className="sl-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft size={14} /></button>
                  {totalPages <= 7 ? (
                    [...Array(totalPages)].map((_, i) => (
                      <button key={i+1} className={`sl-page-btn${currentPage === i+1 ? ' active' : ''}`} onClick={() => setCurrentPage(i+1)}>{i+1}</button>
                    ))
                  ) : (
                    <>
                      <button className={`sl-page-btn${currentPage === 1 ? ' active' : ''}`} onClick={() => setCurrentPage(1)}>1</button>
                      {currentPage > 3 && <span className="sl-count">...</span>}
                      {[...Array(totalPages)].map((_, i) => {
                        const p = i + 1
                        if (p > 1 && p < totalPages && Math.abs(p - currentPage) <= 1) {
                          return <button key={p} className={`sl-page-btn${currentPage === p ? ' active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
                        }
                        return null
                      })}
                      {currentPage < totalPages - 2 && <span className="sl-count">...</span>}
                      <button className={`sl-page-btn${currentPage === totalPages ? ' active' : ''}`} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                    </>
                  )}
                  <button className="sl-page-btn" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight size={14} /></button>
                </div>
              </div>
            </div>
        </div>
      </div>

      <Modal open={!!modal} onClose={closeModal} title={modal === 'add' ? 'Add New Student' : 'Edit Student Profile'} size="large" footer={
        <>
          <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>{modal === 'add' ? 'Add Student' : 'Save Changes'}</button>
        </>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {orderedSections.map(sectionName => (
            <div key={sectionName}>
              <div className="sl-section-header">{sectionName}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
                {studentFields
                  .filter(f => (f.section || 'Basic Information') === sectionName)
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

      <ConfirmDialog 
        open={!!confirm} 
        onClose={() => setConfirm(null)} 
        onConfirm={() => { deleteStudent(confirm); setConfirm(null) }} 
        title="Delete Student Record" 
        message="This action will permanently move the student record to the Recycle Bin. This cannot be easily undone. Please type DELETE to confirm."
        confirmLabel="Delete Student"
        confirmVariant="danger"
        requireTypedConfirmation
        typedConfirmationWord="DELETE"
      />
      
      <ConfirmDialog 
        open={!!archiveConfirm} 
        onClose={() => setArchiveConfirm(null)} 
        onConfirm={() => { archiveStudent(archiveConfirm); setArchiveConfirm(null); setSelectedIds(p => p.filter(x => x !== archiveConfirm)) }} 
        title="Archive Student" 
        message="This student will be moved to the Archived Students list. You can restore them later from the Archived Students page." 
        confirmLabel="Archive Student"
        confirmVariant="archive"
      />

      <ConfirmDialog 
        open={bulkArchiveConfirm} 
        onClose={() => setBulkArchiveConfirm(false)} 
        onConfirm={() => { bulkArchiveStudents(selectedIds); setBulkArchiveConfirm(false); setSelectedIds([]) }} 
        title="Bulk Archive Students" 
        message={`You are about to archive ${selectedIds.length} selected student${selectedIds.length !== 1 ? 's' : ''}. They will be moved to the Archived Students list and can be restored later.`} 
        confirmLabel={`Archive ${selectedIds.length} Student${selectedIds.length !== 1 ? 's' : ''}`}
        confirmVariant="archive"
      />

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={addStudentsBulk} type="student" />

      <Modal 
        open={!!generatedCode} 
        onClose={() => setGeneratedCode(null)} 
        title="Student Access Code" 
        size="small"
        footer={<button className="btn btn-primary" onClick={() => setGeneratedCode(null)}>Done</button>}
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>Give this code to the student to access the enrollment form.</p>
          <div style={{ 
             background: '#f8f9fa', 
             padding: '20px', 
             borderRadius: '12px', 
             border: '1px solid var(--border)',
             marginBottom: 20
          }}>
             <code style={{ fontSize: 32, fontWeight: 800, letterSpacing: 4, color: 'var(--orange)' }}>
                {generatedCode?.code}
             </code>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button 
               className="btn btn-outline" 
               onClick={() => copyLink(generatedCode?.code)}
               style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
               {copiedCode ? <Check size={16} color="#2ecc71" /> : <Copy size={16} />}
               {copiedCode ? 'Copied!' : 'Copy Portal Link'}
            </button>
            <button 
               className="btn btn-primary" 
               onClick={() => {
                  if (window.confirm('Regenerate a brand new code for this student and resend it to their email?')) {
                      handleGenerateCode(generatedCode.studentId)
                  }
               }}
               style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--orange)' }}
            >
               <RefreshCw size={16} /> Regenerate & Resend Email
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        open={columnModal} 
        onClose={() => setColumnModal(false)} 
        title="Table Columns" 
        size="medium"
        footer={<button className="btn btn-primary" onClick={() => setColumnModal(false)}>Done</button>}
      >
        <div style={{ padding: '5px 0' }}>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>Select which columns to display in the student list.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
            {allTableFields.map(f => (
              <label key={f.id} className="sl-column-item">
                <span className="sl-column-label">{f.name}</span>
                <div className="sl-switch">
                  <input 
                    type="checkbox" 
                    checked={effectiveVisibleColumns.includes(f.name)} 
                    onChange={() => {
                        const isChecked = effectiveVisibleColumns.includes(f.name)
                        const newVal = !isChecked 
                          ? [...effectiveVisibleColumns, f.name] 
                          : effectiveVisibleColumns.filter(name => name !== f.name)
                        setVisibleColumnNames(newVal)
                        localStorage.setItem('studentListVisibleColumns', JSON.stringify(newVal))
                    }}
                  />
                  <span className="sl-slider"></span>
                </div>
              </label>
            ))}
            <label className="sl-column-item">
              <span className="sl-column-label">Profiling Status</span>
              <div className="sl-switch">
                <input 
                  type="checkbox" 
                  checked={effectiveVisibleColumns.includes('Profiling Status')} 
                  onChange={() => {
                      const name = 'Profiling Status'
                      const isChecked = effectiveVisibleColumns.includes(name)
                      const newVal = !isChecked 
                        ? [...effectiveVisibleColumns, name] 
                        : effectiveVisibleColumns.filter(n => n !== name)
                      setVisibleColumnNames(newVal)
                      localStorage.setItem('studentListVisibleColumns', JSON.stringify(newVal))
                  }}
                />
                <span className="sl-slider"></span>
              </div>
            </label>
            <label className="sl-column-item" style={{ gridColumn: '1 / -1', marginTop: 8, paddingTop: 12, borderTop: '0.5px solid var(--border)' }}>
              <span className="sl-column-label"><strong>Date Registered</strong></span>
              <div className="sl-switch">
                <input 
                  type="checkbox" 
                  checked={effectiveVisibleColumns.includes('Date Registered')} 
                  onChange={() => {
                    const name = 'Date Registered'
                    const isChecked = effectiveVisibleColumns.includes(name)
                    const newVal = !isChecked 
                      ? [...effectiveVisibleColumns, name] 
                      : effectiveVisibleColumns.filter(n => n !== name)
                    setVisibleColumnNames(newVal)
                    localStorage.setItem('studentListVisibleColumns', JSON.stringify(newVal))
                  }}
                />
                <span className="sl-slider"></span>
              </div>
            </label>
          </div>
        </div>
      </Modal>

      <Modal open={!!reviewEnrollee} onClose={() => setReviewEnrollee(null)} title="Review Profiling Submission" size="large" footer={
        <>
          <button className="btn btn-outline" style={{ color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => setShowRejectModal(true)}>
            <XCircle size={14} style={{ marginRight: 6 }} /> Return for Correction
          </button>
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-outline" onClick={() => setReviewEnrollee(null)}>Close</button>
          <button className="btn btn-primary" style={{ background: '#2ecc71', borderColor: '#2ecc71' }} onClick={handleApprove}>
            <CheckCircle size={14} style={{ marginRight: 6 }} /> Approve Profiling
          </button>
        </>
      }>
        {reviewEnrollee && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {(() => {
                        const subData = reviewEnrollee.submission?.dynamic_data || reviewEnrollee.submission?.studentData?.dynamic_data || reviewEnrollee.submission || {};
                        const allVals = Object.values(subData);
                        const picVal = allVals.find(v => v && (v.dataUrl || (typeof v === 'string' && v.startsWith('data:image')))) || null;
                        return <div style={{ flexShrink: 0 }}><ImagePreview fileInfo={picVal} /></div>
                    })()}
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Student Profile Update</h3>
                        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Submitted by <strong>{reviewEnrollee.name}</strong> on {new Date(reviewEnrollee.submitted_at).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="sl-review-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {(() => {
                        const sub = reviewEnrollee.submission?.dynamic_data || reviewEnrollee.submission || {};
                        return dynamicFields.filter(f => (f.module || 'students') === 'students').sort((a,b) => a.order_index - b.order_index).map(f => {
                            const val = sub[f.name];
                            return (
                                <div key={f.id} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4, fontWeight: 500 }}>{f.name}</label>
                                    <div style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>
                                        {f.type === 'file' && val ? (
                                            <a href={val.dataUrl || val} target="_blank" rel="noreferrer" style={{ color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                📎 View Attachment
                                            </a>
                                        ) : Array.isArray(val) ? val.join(', ') : String(val || '-')}
                                    </div>
                                </div>
                            )
                        })
                    })()}
                </div>
            </div>
        )}
      </Modal>

      <ConfirmDialog 
        open={showRejectModal} 
        onClose={() => setShowRejectModal(false)} 
        title="Return for Correction"
        message={
          <div style={{ marginTop: 15 }}>
            <p style={{ marginBottom: 10 }}>Please provide a reason for the student to correct their profiling information.</p>
            <textarea 
              className="form-input" 
              style={{ height: 100 }} 
              placeholder="e.g. Please upload a clearer profile picture."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
            />
          </div>
        }
        onConfirm={handleReject}
        confirmText="Send Rejection"
        confirmColor="#e74c3c"
      />
    </div>
  )
}
