import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import { Search, Plus, Filter, AlertTriangle, Users, Eye, Pencil, Trash2, CheckSquare, Square } from 'lucide-react'
import { ConfirmDialog } from '../../components/Modal'
import '../../../../css/StudentList.css'

export default function ViolationsList() {
  const { students, violations, addViolation, updateViolation, deleteViolation, dynamicFields } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [dynamicFilterVals, setDynamicFilterVals] = useState({})
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModal, setViewModal] = useState(null) // the violation object to view
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  
  useEffect(() => {
    if (location.state?.presetStudentId) {
      setSelectedStudentId(location.state.presetStudentId)
      setModalOpen(true)
    }
  }, [location.state])
  const [studentQuery, setStudentQuery] = useState('')
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [formData, setFormData] = useState({})

  // Determine the dynamic columns
  const violationFields = dynamicFields.filter(f => f.module === 'violations').sort((a,b) => a.order_index - b.order_index)
  // Which fields are shown in the data table
  const tableColumns = violationFields.filter(f => f.show_in_table)

  // Autocomplete filtering for student selection
  const studentResults = useMemo(() => {
    if (!studentQuery.trim()) return []
    const q = studentQuery.toLowerCase()
    return students.filter(s => {
      const getVal = (name) => s.dynamic_data?.[name] || '—'
      const studentNum = getVal('Student Number') || getVal('studentNumber') || ''
      const section = getVal('Section') || getVal('section') || ''
      const fullName = `${getVal('First Name')} ${getVal('Middle Name')} ${getVal('Last Name')}`.toLowerCase()
      return fullName.includes(q) || studentNum.toLowerCase().includes(q) || section.toLowerCase().includes(q)
    }).slice(0, 5) // top 5 matches
  }, [students, studentQuery])

  // Filter list
  const filteredViolations = useMemo(() => {
    const safeViolations = Array.isArray(violations) ? violations : [];
    let validViolations = safeViolations.filter(v => students.some(s => s.id === v.studentId));
    
    // Apply dynamic filters
    validViolations = validViolations.filter(v => {
      for (const key of Object.keys(dynamicFilterVals)) {
        const filterVal = dynamicFilterVals[key]
        if (!filterVal || filterVal === 'All') continue
        const cellVal = v.dynamic_data?.[key]
        if (!cellVal) return false
        
        const fieldDef = violationFields.find(f => f.name === key)
        if (fieldDef?.type === 'checkbox' && Array.isArray(cellVal)) {
          if (!cellVal.includes(filterVal)) return false
        } else if (!String(cellVal).toLowerCase().includes(filterVal.toLowerCase())) {
          return false
        }
      }
      return true
    })

    if (!search.trim()) return validViolations
    const q = search.toLowerCase()
    return validViolations.filter(v => {
      const student = students.find(s => s.id === v.studentId)
      const fullName = student ? `${student.dynamic_data?.['First Name']} ${student.dynamic_data?.['Last Name']}`.toLowerCase() : ''
      const studentNum = student?.dynamic_data?.['Student Number']?.toLowerCase() || ''
      
      // search within the table columns exactly
      const dataValues = tableColumns.map(col => String(v.dynamic_data?.[col.name] || '')).join(' ').toLowerCase()
      return fullName.includes(q) || studentNum.includes(q) || dataValues.includes(q)
    })
  }, [violations, search, students, tableColumns, dynamicFilterVals, violationFields])

  useEffect(() => {
    setSelectedIds([])
  }, [search, dynamicFilterVals])

  const handleSelectAll = () => {
    if (selectedIds.length === filteredViolations.length && filteredViolations.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredViolations.map(v => v.id))
    }
  }

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteViolation(id)
    }
    setSelectedIds([])
    setBulkDeleteConfirm(false)
  }

  const handleSaveViolation = () => {
    if (!selectedStudentId) return alert('Please select a student first.')
    // basic validation
    for (let f of violationFields) {
      if (f.is_required && !formData[f.name]) {
        return alert(`Field "${f.name}" is required.`)
      }
    }

    const targetStudent = students.find(s => s.id === selectedStudentId)
    addViolation({
      studentId: selectedStudentId,
      studentNumber: targetStudent?.dynamic_data?.['Student Number'] || targetStudent?.studentNumber || '',
      dynamic_data: formData
    })
    closeModal()
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedStudentId(null)
    setStudentQuery('')
    setShowStudentDropdown(false)
    setFormData({})
  }

  const selectedStudentObj = students.find(s => s.id === selectedStudentId)

  return (
    <div className="sl-root">
      <Header title="Violations Management" subtitle="Record, manage, and monitor student disciplinary actions." />
      
      <div className="sl-body">
        <div className="sl-card">
          <div className="sl-card-head">
            <div className="sl-head-top">
              <h2 className="sl-title">Violations List</h2>
              <div className="sl-head-actions">
                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(230, 126, 34, 0.1)', padding: '4px 12px', borderRadius: 20, marginRight: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange)' }}>{selectedIds.length} selected</span>
                    <button className="sl-btn-outline danger" style={{ height: 28, padding: '0 10px', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => setBulkDeleteConfirm(true)}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
                <button className="sl-btn-primary" onClick={() => setModalOpen(true)}>
                  <Plus size={14} /> Add Violation
                </button>
              </div>
            </div>

            <div className="sl-filter-row">
              <div className="sl-search-wrap" style={{ flex: 1, maxWidth: 360 }}>
                <Search size={13} className="sl-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search by student, type, status..." 
                  className="sl-search-input"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="sl-filter-right">
                <button className={`sl-btn-outline${showFilter ? ' active' : ''}`} onClick={() => setShowFilter(!showFilter)}>
                  <Filter size={13} /> Advanced Queries
                </button>
              </div>
            </div>
          </div>

          {showFilter && (
            <div style={{ padding: '20px 24px', background: 'var(--bg)', borderBottom: '0.5px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 15 }}>
              {violationFields.filter(f => f.type !== 'file' && f.type !== 'long_text' && f.type !== 'paragraph').map(field => {
                if (['select', 'checkbox', 'radio'].includes(field.type)) {
                  return (
                    <div key={field.id} className="sl-drawer-group">
                      <label className="sl-drawer-label">{field.name}:</label>
                      <select className="sl-drawer-input" value={dynamicFilterVals[field.name] || 'All'} onChange={e => setDynamicFilterVals(p => ({ ...p, [field.name]: e.target.value }))}>
                        <option value="All">All {field.name}s</option>
                        {(Array.isArray(field.options) ? field.options : []).map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                    </div>
                  )
                }
                return (
                  <div key={field.id} className="sl-drawer-group">
                    <label className="sl-drawer-label">{field.name}:</label>
                    <input className="sl-drawer-input" placeholder={`Search ${field.name}...`} value={dynamicFilterVals[field.name] || ''} onChange={e => setDynamicFilterVals(p => ({ ...p, [field.name]: e.target.value }))} />
                  </div>
                )
              })}
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span className="sl-count"><strong>{filteredViolations.length}</strong> result{filteredViolations.length !== 1 ? 's' : ''} found</span>
                {Object.keys(dynamicFilterVals).some(k => dynamicFilterVals[k] && dynamicFilterVals[k] !== 'All') && (
                  <button className="sl-clear-btn" onClick={() => setDynamicFilterVals({})}>Clear all filters</button>
                )}
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="sl-table">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <button className="sl-check-btn" onClick={handleSelectAll}>
                      {selectedIds.length > 0 && selectedIds.length === filteredViolations.length ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                    </button>
                  </th>
                  <th style={{ minWidth: 200 }}>Student Information</th>
                  {tableColumns.map(col => <th key={col.id}>{col.name}</th>)}
                  <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredViolations.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length + 3}>
                      <div className="sl-empty">
                        <AlertTriangle size={36} color="var(--border)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <p>No violations recorded yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredViolations.map(v => {
                  const student = students.find(s => s.id === v.studentId)
                  
                  return (
                    <tr key={v.id} className={selectedIds.includes(v.id) ? 'selected' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <button className="sl-check-btn" onClick={(event) => { event.stopPropagation(); setSelectedIds(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id]) }}>
                          {selectedIds.includes(v.id) ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                        </button>
                      </td>
                      <td>
                        {student ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                             <div className="sl-stud-name">
                               {student.dynamic_data?.[ 'First Name']} {student.dynamic_data?.[ 'Last Name']}
                             </div>
                             <div className="sl-stud-num" style={{ fontSize: 11 }}>
                               {student.dynamic_data?.[ 'Student Number']}
                             </div>
                           </div>
                        ) : <span className="sl-count">Unknown Student</span>}
                      </td>
                      
                      {tableColumns.map(col => {
                        const val = v.dynamic_data?.[col.name]
                        const isBadge = col.type === 'select' || col.type === 'radio' || col.name.toLowerCase().includes('status') || col.name.toLowerCase().includes('type')
                        
                        return (
                          <td key={col.id}>
                             {isBadge ? (
                               <span className="sl-badge sl-badge-default" style={{ 
                                 background: val?.toLowerCase().includes('major') || val?.toLowerCase().includes('high') ? 'rgba(231, 76, 60, 0.1)' : 'var(--bg)',
                                 color: val?.toLowerCase().includes('major') || val?.toLowerCase().includes('high') ? '#e74c3c' : 'inherit',
                                 borderColor: val?.toLowerCase().includes('major') || val?.toLowerCase().includes('high') ? 'rgba(231, 76, 60, 0.2)' : 'var(--border)'
                               }}>
                                 {val || '—'}
                               </span>
                             ) : (
                               <span style={{ fontSize: 13 }}>{val || '—'}</span>
                             )}
                          </td>
                        )
                      })}
                      
                      <td>
                        <div className="sl-row-actions">
                          <button className="sl-action-btn" onClick={() => setViewModal(v)} title="View Details">
                            <Eye size={14} />
                          </button>
                          <button className="sl-action-btn danger" onClick={() => setConfirmDelete(v.id)} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ConfirmDialog 
            open={!!confirmDelete} 
            onClose={() => setConfirmDelete(null)} 
            onConfirm={() => { deleteViolation(confirmDelete); setConfirmDelete(null); }} 
            title="Delete Violation" 
            message="Are you sure you want to delete this violation record? It will be moved to the Recycle Bin." 
          />
          <ConfirmDialog 
            open={bulkDeleteConfirm} 
            onClose={() => setBulkDeleteConfirm(false)} 
            onConfirm={handleBulkDelete} 
            title={`Delete ${selectedIds.length} Violations`} 
            message={`Are you sure you want to delete ${selectedIds.length} violation records? They will be moved to the Recycle Bin.`} 
            confirmText="Delete Violations"
            isDanger={true}
            requireTypedConfirmation={true}
            typedConfirmationWord="DELETE"
          />
        </div>
      </div>


      {/* ADD VIOLATION MODAL */}
      <Modal open={modalOpen} onClose={closeModal} title="Record New Violation" size="large" footer={
        <>
           <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
           <button className="btn btn-primary" onClick={handleSaveViolation}>Save Violation</button>
        </>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: !selectedStudentId ? 300 : 'auto' }}>
          {/* Step 1: Student Selection */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Select Student *</label>
            {selectedStudentId && selectedStudentObj ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--orange)' }}>
                 <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedStudentObj.dynamic_data?.['First Name']} {selectedStudentObj.dynamic_data?.['Last Name']}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {selectedStudentObj.dynamic_data?.['Student Number']} &middot; Sec: {selectedStudentObj.dynamic_data?.['Section'] || '—'}</div>
                 </div>
                 <button className="btn btn-outline" onClick={() => { setSelectedStudentId(null); setStudentQuery(''); }} style={{ height: 32, padding: '0 12px', fontSize: 12 }}>
                   Change
                 </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 16, top: 14, color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={studentQuery}
                  onChange={e => { setStudentQuery(e.target.value); setShowStudentDropdown(true); }}
                  placeholder="Search by student name, ID, or section..."
                  className="form-input"
                  style={{ paddingLeft: 42, width: '100%', borderRadius: 8 }}
                  onFocus={() => setShowStudentDropdown(true)}
                />
                
                {showStudentDropdown && studentQuery.trim() !== '' && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {studentResults.length > 0 ? studentResults.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => { setSelectedStudentId(s.id); setShowStudentDropdown(false); }}
                        style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        className="dropdown-item-hover"
                      >
                         <div style={{ fontWeight: 600, fontSize: 14 }}>{s.dynamic_data?.['First Name']} {s.dynamic_data?.['Last Name']}</div>
                         <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.dynamic_data?.['Student Number']} - {s.dynamic_data?.['Section'] || '—'}</div>
                      </div>
                    )) : (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No students found.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Step 2: Dynamic Form Fields */}
          {selectedStudentId && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ gridColumn: '1 / -1' }}><h3 style={{ fontSize: 16, fontWeight: 700 }}>Violation Details</h3></div>
              
              {violationFields.length === 0 ? (
                 <div style={{ gridColumn: '1 / -1', padding: 20, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: 8 }}>
                    No violation fields configured. Please visit the Dynamic Form Builder.
                 </div>
              ) : violationFields.map(field => (
                 <div key={field.id} className="form-group" style={{ gridColumn: (field.type === 'long_text' || field.type === 'paragraph') ? '1 / -1' : 'auto' }}>
                    <label>{field.name} {field.is_required && <span style={{ color: 'red' }}>*</span>}</label>
                    
                    {['short_text', 'email', 'number', 'date', 'time'].includes(field.type) && (
                      <input 
                        type={field.type === 'short_text' || field.type === 'email' ? 'text' : field.type} 
                        className="form-input" 
                        value={formData[field.name] || ''}
                        onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                        placeholder={`Enter ${field.name.toLowerCase()}...`}
                      />
                    )}
                    
                    {(field.type === 'long_text' || field.type === 'paragraph') && (
                      <textarea 
                        className="form-input" 
                        rows={3} 
                        value={formData[field.name] || ''}
                        onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                        placeholder={`Enter ${field.name.toLowerCase()}...`}
                      />
                    )}
                    
                    {field.type === 'select' && (
                      <select 
                        className="form-input"
                        value={formData[field.name] || ''}
                        onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                      >
                        <option value="">Select an option...</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    
                    {field.type === 'radio' && (
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                        {field.options?.map(o => (
                          <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                            <input 
                              type="radio" 
                              name={`form-${field.id}`} 
                              value={o}
                              checked={formData[field.name] === o}
                              onChange={e => setFormData({ ...formData, [field.name]: e.target.value })}
                            />
                            {o}
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {field.type === 'checkbox' && (
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                        {field.options?.map(o => {
                          const currentVals = Array.isArray(formData[field.name]) ? formData[field.name] : []
                          return (
                            <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                              <input 
                                type="checkbox" 
                                value={o}
                                checked={currentVals.includes(o)}
                                onChange={e => {
                                  if (e.target.checked) setFormData({ ...formData, [field.name]: [...currentVals, o] })
                                  else setFormData({ ...formData, [field.name]: currentVals.filter(v => v !== o) })
                                }}
                              />
                              {o}
                            </label>
                          )
                        })}
                      </div>
                    )}
                 </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Violation Information" size="medium" footer={
        <>
           <button className="btn btn-outline" style={{ border: '1px solid #e74c3c', color: '#e74c3c' }} onClick={() => { deleteViolation(viewModal.id); setViewModal(null); }}>Delete Record</button>
           <div style={{ flex: 1 }}></div>
           <button className="btn btn-primary" onClick={() => setViewModal(null)}>Close</button>
        </>
      }>
        {viewModal && (() => {
           const student = students.find(s => s.id === viewModal.studentId)
           return (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {student && (
                  <div style={{ background: 'var(--bg)', padding: '16px 20px', borderRadius: 8, display: 'flex', gap: 16, alignItems: 'center' }}>
                     <div style={{ width: 40, height: 40, background: 'var(--border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={20} color="var(--text-muted)" />
                     </div>
                     <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{student.dynamic_data?.['First Name']} {student.dynamic_data?.['Last Name']}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Student No: {student.dynamic_data?.['Student Number']}</div>
                     </div>
                  </div>
                )}
                
                <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Report Details</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
                  {violationFields.map(field => {
                    const val = viewModal.dynamic_data?.[field.name]
                    let display = '—'
                    if (Array.isArray(val)) display = val.join(', ')
                    else if (val) display = String(val)
                    
                    return (
                      <div key={field.id} style={{ gridColumn: (field.type === 'long_text' || field.type === 'paragraph') ? '1 / -1' : 'auto' }}>
                         <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{field.name}</div>
                         <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{display}</div>
                      </div>
                    )
                  })}
                </div>
             </div>
           )
        })()}
      </Modal>

      {/* Internal styles for hover since dropdown uses them */}
      <style>{`
        .dropdown-item-hover:hover {
          background: rgba(230, 126, 34, 0.05);
        }
      `}</style>
    </div>
  )
}
