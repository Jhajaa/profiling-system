import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { POSITIONS, FACULTY_STATUSES, GENDERS } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import { ConfirmDialog } from '../../components/Modal'
import ImportModal from '../../components/ImportModal'
import { Search, Filter, Plus, Download, Eye, Pencil, Trash2, CheckSquare, Square } from 'lucide-react'
import '../../../../css/FacultyList.css'

const emptyForm = {
  facultyNumber:'', lastName:'', firstName:'', middleName:'',
  position:'Instructor', gender:'Female', status:'F',
  dateOfBirth:'', civilStatus:'Single', nationality:'Filipino',
  religion:'', residency:'Resident', specialization:'',
  homeAddress:'', contactNumber:'', altContactNumber:'', emailAddress:'',
  lastSchool:'', lastYearAttended:'', honors:'', highestDegree:'',
  yearCompleted:'', fatherName:'', fatherOccupation:'', fatherDob:'',
  fatherContact:'', motherName:'', motherOccupation:'', motherDob:'',
  motherContact:'', siblings:'', annualIncome:'',
  guardianName:'', guardianContact:'', guardianRelation:''
}

function getStatusClass(status) {
  switch ((status || '').toUpperCase()) {
    case 'F':   return 'fl-status fl-status-f'
    case 'P':   return 'fl-status fl-status-p'
    case 'COS': return 'fl-status fl-status-cos'
    default:    return 'fl-status fl-status-def'
  }
}

export default function FacultyList() {
  const { faculty, addFaculty, addFacultyBulk, updateFaculty, deleteFaculty, isAdmin } = useApp()
  const navigate = useNavigate()

  const [search,        setSearch]        = useState('')
  const [posFilter,     setPosFilter]     = useState('All')
  const [statusFilter,  setStatusFilter]  = useState('All')
  const [genderFilter,  setGenderFilter]  = useState('All')
  const [showFilter,    setShowFilter]    = useState(false)
  const [modal,         setModal]         = useState(null)
  const [editId,        setEditId]        = useState(null)
  const [form,          setForm]          = useState(emptyForm)
  const [errors,        setErrors]        = useState({})
  const [confirm,       setConfirm]       = useState(null)
  const [importOpen,    setImportOpen]    = useState(false)
  const [selectedIds,   setSelectedIds]   = useState([])
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.facultyNumber.trim()) e.facultyNumber = 'Required'
    if (!form.lastName.trim())      e.lastName      = 'Required'
    if (!form.firstName.trim())     e.firstName     = 'Required'
    if (!form.emailAddress.trim())  e.emailAddress  = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailAddress)) e.emailAddress = 'Invalid email'
    if (!form.contactNumber.trim()) e.contactNumber = 'Required'
    if (modal === 'add' && faculty.find(fac => fac.facultyNumber === form.facultyNumber.trim()))
      e.facultyNumber = 'Faculty number already exists'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return
    if (modal === 'add') addFaculty(form)
    else updateFaculty(editId, form)
    setModal(null); setErrors({})
  }

  const openAdd  = ()    => { setForm(emptyForm); setModal('add'); setErrors({}) }
  const openEdit = (fac) => { setForm({ ...emptyForm, ...fac }); setEditId(fac.id); setModal('edit'); setErrors({}) }

  const clearFilters = () => { setPosFilter('All'); setStatusFilter('All'); setGenderFilter('All') }
  const hasFilters = posFilter !== 'All' || statusFilter !== 'All' || genderFilter !== 'All'

  const filtered = faculty.filter(fac => {
    if (posFilter    !== 'All' && fac.position !== posFilter)    return false
    if (statusFilter !== 'All' && fac.status   !== statusFilter) return false
    if (genderFilter !== 'All' && fac.gender   !== genderFilter) return false
    const q = search.toLowerCase()
    if (q && !`${fac.lastName} ${fac.firstName} ${fac.facultyNumber} ${fac.position}`.toLowerCase().includes(q)) return false
    return true
  })

  React.useEffect(() => {
    setSelectedIds([])
  }, [search, posFilter, statusFilter, genderFilter])

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(f => f.id))
    }
  }

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteFaculty(id)
    }
    setSelectedIds([])
    setBulkDeleteConfirm(false)
  }

  const ErrMsg = ({ k }) =>
    errors[k] ? <span style={{ color: '#e74c3c', fontSize: 11 }}>{errors[k]}</span> : null

  return (
    <div className="fl-root">
      <Header title="Faculty Information" />
      <div className="fl-body">

        <div className="fl-card">

          {/* ── Card header ── */}
          <div className="fl-card-head">
            <div className="fl-head-top">
              <h2 className="fl-title">Faculty List</h2>
              {isAdmin && (
                <div className="fl-head-actions">
                  {selectedIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(230, 126, 34, 0.1)', padding: '4px 12px', borderRadius: 20, marginRight: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange)' }}>{selectedIds.length} selected</span>
                      <button className="fl-btn-outline danger" style={{ height: 28, padding: '0 10px' }} onClick={() => setBulkDeleteConfirm(true)}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                  <button className="fl-btn-outline" onClick={() => setImportOpen(true)}>
                    <Download size={13} /> Import
                  </button>
                  <button className="fl-btn-primary" onClick={openAdd}>
                    <Plus size={13} /> Add Faculty
                  </button>
                </div>
              )}
            </div>

            {/* Filter row */}
            <div className="fl-filter-row">
              <div className="fl-filter-tabs">
                <button
                  className={`fl-ftab${statusFilter === 'All' ? ' active' : ''}`}
                  onClick={() => setStatusFilter('All')}
                >All Status</button>
                {['F', 'P', 'COS'].map(s => (
                  <button
                    key={s}
                    className={`fl-ftab${statusFilter === s ? ' active' : ''}`}
                    onClick={() => setStatusFilter(s)}
                  >{s}</button>
                ))}
                {hasFilters && (
                  <button className="fl-clear-btn" onClick={clearFilters}>Clear filters</button>
                )}
              </div>

              <div className="fl-filter-right">
                <div className="fl-search-wrap">
                  <Search size={13} className="fl-search-icon" />
                  <input
                    className="fl-search-input"
                    placeholder="Search faculty..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button
                  className={`fl-btn-outline${showFilter ? ' active' : ''}`}
                  onClick={() => setShowFilter(!showFilter)}
                >
                  <Filter size={13} /> Filter
                </button>
              </div>
            </div>
          </div>

          {/* ── Expanded filter panel ── */}
          {showFilter && (
            <div className="fl-filter-panel">
              <div className="fl-filter-group">
                <label className="fl-filter-label">Position:</label>
                <select className="fl-filter-select" value={posFilter} onChange={e => setPosFilter(e.target.value)}>
                  <option value="All">All</option>
                  {POSITIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="fl-filter-group">
                <label className="fl-filter-label">Gender:</label>
                <select className="fl-filter-select" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
                  <option value="All">All</option>
                  {GENDERS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <span className="fl-filter-count">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* ── Table ── */}
          <table className="fl-table">
            <thead>
              <tr>
                {isAdmin && (
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <button className="sl-check-btn" onClick={handleSelectAll}>
                      {selectedIds.length > 0 && selectedIds.length === filtered.length ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                    </button>
                  </th>
                )}
                <th>Faculty Number</th>
                <th>Faculty Name (LN, FN MN)</th>
                <th>Position</th>
                <th>Gender</th>
                <th>Status</th>
                <th>Date Registered</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7}>
                    <div className="fl-empty">No faculty records found</div>
                  </td>
                </tr>
              ) : (
                filtered.map(fac => (
                  <tr
                    key={fac.id}
                    onDoubleClick={() => navigate(`/faculty/${fac.id}`)}
                    className={selectedIds.includes(fac.id) ? 'selected' : ''}
                  >
                    {isAdmin && (
                      <td style={{ textAlign: 'center' }}>
                        <button className="sl-check-btn" onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => prev.includes(fac.id) ? prev.filter(x => x !== fac.id) : [...prev, fac.id]) }}>
                          {selectedIds.includes(fac.id) ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                        </button>
                      </td>
                    )}
                    <td><span className="fl-fac-num">{fac.facultyNumber}</span></td>
                    <td><span className="fl-fac-name">{fac.lastName}, {fac.firstName} {fac.middleName}</span></td>
                    <td>{fac.position}</td>
                    <td>
                      <span className="fl-gender">
                        <span className={`fl-gender-dot ${fac.gender === 'Female' ? 'female' : 'male'}`} />
                        {fac.gender}
                      </span>
                    </td>
                    <td>
                      <span className={getStatusClass(fac.status)}>{fac.status}</span>
                    </td>
                    <td>{fac.dateRegistered}</td>
                    <td>
                      <div className="fl-row-actions">
                        <button
                          className="fl-action-btn"
                          title="View Profile"
                          onClick={() => navigate(`/faculty/${fac.id}`)}
                        >
                          <Eye size={13} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              className="fl-action-btn"
                              title="Edit"
                              onClick={() => openEdit(fac)}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="fl-action-btn danger"
                              title="Delete"
                              onClick={() => setConfirm(fac.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Filler rows */}
          {filtered.length > 0 && filtered.length < 6 &&
            [...Array(Math.max(0, 6 - filtered.length))].map((_, i) => (
              <div key={i} className="fl-filler" />
            ))
          }

          {/* ── Table footer ── */}
          <div className="fl-table-footer">
            <span className="fl-count">
              Showing <strong>{filtered.length}</strong> of <strong>{faculty.length}</strong> faculty member{faculty.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add New Faculty' : 'Edit Faculty Profile'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {modal === 'add' ? 'Add Faculty' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Basic Information */}
          <div>
            <div className="fl-section-header">Basic Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Faculty Number *</label>
                <input className="form-input" value={form.facultyNumber} onChange={e => f('facultyNumber', e.target.value)} placeholder="#0000001" />
                <ErrMsg k="facultyNumber" />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input className="form-input" value={form.lastName} onChange={e => f('lastName', e.target.value)} />
                <ErrMsg k="lastName" />
              </div>
              <div className="form-group">
                <label>First Name *</label>
                <input className="form-input" value={form.firstName} onChange={e => f('firstName', e.target.value)} />
                <ErrMsg k="firstName" />
              </div>
              <div className="form-group">
                <label>Middle Name</label>
                <input className="form-input" value={form.middleName} onChange={e => f('middleName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Position</label>
                <select className="form-input" value={form.position} onChange={e => f('position', e.target.value)}>
                  {POSITIONS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-input" value={form.status} onChange={e => f('status', e.target.value)}>
                  {FACULTY_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select className="form-input" value={form.gender} onChange={e => f('gender', e.target.value)}>
                  {GENDERS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input className="form-input" type="date" value={form.dateOfBirth} onChange={e => f('dateOfBirth', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Specialization</label>
                <input className="form-input" value={form.specialization} onChange={e => f('specialization', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Highest Degree</label>
                <input className="form-input" value={form.highestDegree} onChange={e => f('highestDegree', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Year Completed</label>
                <input className="form-input" value={form.yearCompleted} onChange={e => f('yearCompleted', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Civil Status</label>
                <select className="form-input" value={form.civilStatus} onChange={e => f('civilStatus', e.target.value)}>
                  {['Single', 'Married', 'Widowed'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <div className="fl-section-header">Contact Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Home Address</label>
                <input className="form-input" value={form.homeAddress} onChange={e => f('homeAddress', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Contact Number *</label>
                <input className="form-input" value={form.contactNumber} onChange={e => f('contactNumber', e.target.value)} placeholder="+63 9XX XXX XXXX" />
                <ErrMsg k="contactNumber" />
              </div>
              <div className="form-group">
                <label>Alt. Contact</label>
                <input className="form-input" value={form.altContactNumber} onChange={e => f('altContactNumber', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Email Address *</label>
                <input className="form-input" type="email" value={form.emailAddress} onChange={e => f('emailAddress', e.target.value)} />
                <ErrMsg k="emailAddress" />
              </div>
            </div>
          </div>

        </div>
      </Modal>

      {/* ── Confirm delete ── */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { deleteFaculty(confirm); setConfirm(null); }}
        title="Delete Faculty"
        message="Are you sure you want to delete this faculty record? It will be moved to the Recycle Bin."
        confirmText="Delete Faculty"
        isDanger={true}
        requireTypedConfirmation={true}
        typedConfirmationWord="DELETE"
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.length} Faculty`}
        message={`Are you sure you want to delete ${selectedIds.length} faculty members? They will be moved to the Recycle Bin.`}
        confirmText="Delete Faculty"
        isDanger={true}
        requireTypedConfirmation={true}
        typedConfirmationWord="DELETE"
      />

      {/* ── Import modal ── */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={addFacultyBulk}
        type="faculty"
      />
    </div>
  )
}