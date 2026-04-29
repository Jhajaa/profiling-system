import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { PROGRAMS } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import { ConfirmDialog } from '../../components/Modal'
import { Search, Plus, Download, BookOpen, Pencil, Trash2, Upload, FileText, ChevronLeft } from 'lucide-react'
import '../../../../css/curriculum.css'

const emptyForm = {
  program: 'IT',
  programName: '',
  totalUnits: '',
  duration: '4 years',
  version: '',
  status: 'Active',
  description: '',
}

function getBadgeClass(program) {
  switch ((program || '').toUpperCase()) {
    case 'IT': return 'cur-prog-badge it'
    case 'CS': return 'cur-prog-badge cs'
    default: return 'cur-prog-badge def'
  }
}

function getTagClass(program) {
  switch ((program || '').toUpperCase()) {
    case 'IT': return 'cur-tag cur-tag-it'
    case 'CS': return 'cur-tag cur-tag-cs'
    default: return 'cur-tag cur-tag-def'
  }
}

export default function Curriculum() {
  const {
    curricula,
    syllabi,
    addCurriculum,
    updateCurriculum,
    deleteCurriculum,
    importCurriculumPackage,
    isAdmin
  } = useApp()

  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modal, setModal] = useState(null)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importForm, setImportForm] = useState(emptyForm)
  const [importFile, setImportFile] = useState(null)

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const fi = (k, v) => setImportForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.programName.trim()) e.programName = 'Required'
    if (!form.totalUnits) e.totalUnits = 'Required'
    if (!form.version.trim()) e.version = 'Required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const validateImport = () => {
    const e = {}
    if (!importForm.programName.trim()) e.programName = 'Required'
    if (!importForm.totalUnits) e.totalUnits = 'Required'
    if (!importForm.version.trim()) e.version = 'Required'
    if (!importFile) e.importFile = 'Upload an Excel or PDF file'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return
    if (modal === 'add') addCurriculum && addCurriculum(form)
    else updateCurriculum && updateCurriculum(editId, form)
    setModal(null)
    setErrors({})
  }

  const handleImport = () => {
    if (!validateImport()) return

    importCurriculumPackage && importCurriculumPackage({
      file: importFile,
      form: importForm,
      parsedData: {
        syllabi: []
      }
    })

    setImportOpen(false)
    setImportFile(null)
    setImportForm(emptyForm)
    setErrors({})
  }

  const openAdd = () => {
    setForm(emptyForm)
    setModal('add')
    setErrors({})
  }

  const openEdit = (c) => {
    setForm({ ...emptyForm, ...c })
    setEditId(c.id)
    setModal('edit')
    setErrors({})
  }

  const filtered = (curricula || []).filter(c => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false
    const q = search.toLowerCase()
    if (q && !`${c.program} ${c.programName} ${c.version}`.toLowerCase().includes(q)) return false
    return true
  })

  const getCurriculumCourseCount = (program) => {
    return (syllabi || []).filter(s => s.program === program).length
  }

  const ErrMsg = ({ k }) =>
    errors[k] ? <span style={{ color: '#e74c3c', fontSize: 11 }}>{errors[k]}</span> : null

  return (
    <div className="cur-root">
      <Header title="Instructional Content" />
      <div className="cur-body">
        <div className="cur-card">
          <div className="cur-card-head">
            <div className="cur-head-top">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '6px 12px', height: 32, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, width: 'fit-content' }}>
                  <ChevronLeft size={14} /> Back
                </button>
                <h2 className="cur-title">Curriculum</h2>
              </div>
              {isAdmin && (
                <div className="cur-head-actions">
                  <button className="cur-btn-outline" onClick={() => setImportOpen(true)}>
                    <Download size={13} /> Upload Curriculum File
                  </button>
                  <button className="cur-btn-primary" onClick={openAdd}>
                    <Plus size={13} /> Add Curriculum
                  </button>
                </div>
              )}
            </div>

            <div className="cur-filter-row">
              <div className="cur-filter-tabs">
                {['All', 'Active', 'Inactive'].map(s => (
                  <button
                    key={s}
                    className={`cur-ftab${statusFilter === s ? ' active' : ''}`}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="cur-search-wrap">
                <Search size={13} className="cur-search-icon" />
                <input
                  className="cur-search-input"
                  placeholder="Search curriculum..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {filtered.length > 0 && (
            <div className="cur-prog-grid">
              {filtered.map(c => (
                <div
                  key={c.id}
                  className="cur-prog-card"
                  onDoubleClick={() => navigate(`/instructional/curriculum/${c.id}`)}
                >
                  <div className="cur-prog-top">
                    <div className={getBadgeClass(c.program)}>{c.program}</div>

                    <div className="cur-prog-meta-row">
                      <div className="cur-prog-status">
                        <span className={`cur-status-dot ${(c.status || '').toLowerCase()}`} />
                        <span className={`cur-status-txt ${(c.status || '').toLowerCase()}`}>
                          {c.status}
                        </span>
                      </div>

                      {isAdmin && (
                        <button
                          className="cur-prog-menu-btn"
                          onClick={e => {
                            e.stopPropagation()
                            openEdit(c)
                          }}
                          title="Edit"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="cur-prog-name">{c.programName}</div>
                  <div className="cur-prog-info">
                    {c.totalUnits} units · {c.duration} · v{c.version}
                  </div>

                  <div
                    className="cur-prog-link"
                    onClick={e => {
                      e.stopPropagation()
                      navigate(`/instructional/curriculum/${c.id}`)
                    }}
                  >
                    <BookOpen size={12} />
                    {getCurriculumCourseCount(c.program)} course{getCurriculumCourseCount(c.program) !== 1 ? 's' : ''} → View Syllabus
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cur-tbl-label">All Curriculum Records</div>

          <table className="cur-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Program Name</th>
                <th>Total Units</th>
                <th>Duration</th>
                <th>Version</th>
                <th>Status</th>
                <th>Date Uploaded</th>
                {isAdmin && <th style={{ width: 80 }}></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7}>
                    <div className="cur-empty">No curriculum records found</div>
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr
                    key={c.id}
                    onDoubleClick={() => navigate(`/instructional/curriculum/${c.id}`)}
                  >
                    <td><span className={getTagClass(c.program)}>{c.program}</span></td>
                    <td>
                      <span
                        className="cur-name-link"
                        onClick={e => {
                          e.stopPropagation()
                          navigate(`/instructional/curriculum/${c.id}`)
                        }}
                      >
                        {c.programName}
                      </span>
                    </td>
                    <td>{c.totalUnits}</td>
                    <td>{c.duration}</td>
                    <td>{c.version}</td>
                    <td>
                      <span className={`cur-tbl-status ${(c.status || '').toLowerCase()}`}>
                        <span className="cur-tbl-status-dot" />
                        {c.status}
                      </span>
                    </td>
                    <td>{c.dateUploaded || c.dateRegistered || '—'}</td>
                    {isAdmin && (
                      <td>
                        <div className="cur-row-actions">
                          <button
                            className="cur-action-btn"
                            title="Edit"
                            onClick={e => {
                              e.stopPropagation()
                              openEdit(c)
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="cur-action-btn danger"
                            title="Delete"
                            onClick={e => {
                              e.stopPropagation()
                              setConfirm(c.id)
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="cur-table-footer">
            <span className="cur-count">
              Showing <strong>{filtered.length}</strong> of <strong>{(curricula || []).length}</strong> curricula
            </span>
          </div>
        </div>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add New Curriculum' : 'Edit Curriculum'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {modal === 'add' ? 'Add Curriculum' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="cur-section-header">Curriculum Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Program</label>
              <select className="form-input" value={form.program} onChange={e => f('program', e.target.value)}>
                {(PROGRAMS || ['IT', 'CS']).map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select className="form-input" value={form.status} onChange={e => f('status', e.target.value)}>
                {['Active', 'Inactive'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Program Name *</label>
              <input className="form-input" value={form.programName} onChange={e => f('programName', e.target.value)} />
              <ErrMsg k="programName" />
            </div>

            <div className="form-group">
              <label>Total Units *</label>
              <input className="form-input" type="number" min="1" value={form.totalUnits} onChange={e => f('totalUnits', e.target.value)} />
              <ErrMsg k="totalUnits" />
            </div>

            <div className="form-group">
              <label>Duration</label>
              <select className="form-input" value={form.duration} onChange={e => f('duration', e.target.value)}>
                {['2 years', '3 years', '4 years', '5 years'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Version *</label>
              <input className="form-input" value={form.version} onChange={e => f('version', e.target.value)} />
              <ErrMsg k="version" />
            </div>

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={e => f('description', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Upload Curriculum File"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setImportOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleImport}>Upload Curriculum</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ padding: 12, border: '1px solid #e0d8d0', borderRadius: 8, fontSize: 13, color: '#555' }}>
            <strong>Accepted files:</strong> Excel or PDF<br />
            <strong>Purpose:</strong> Upload curriculum template that may contain syllabus and lesson structure.<br />
            <strong>Template note:</strong> The system is ready for parser-based scanning. Connect your backend parser to auto-create syllabus and lessons.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Program</label>
              <select className="form-input" value={importForm.program} onChange={e => fi('program', e.target.value)}>
                {(PROGRAMS || ['IT', 'CS']).map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select className="form-input" value={importForm.status} onChange={e => fi('status', e.target.value)}>
                {['Active', 'Inactive'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Program Name *</label>
              <input className="form-input" value={importForm.programName} onChange={e => fi('programName', e.target.value)} />
              <ErrMsg k="programName" />
            </div>

            <div className="form-group">
              <label>Total Units *</label>
              <input className="form-input" type="number" value={importForm.totalUnits} onChange={e => fi('totalUnits', e.target.value)} />
              <ErrMsg k="totalUnits" />
            </div>

            <div className="form-group">
              <label>Duration</label>
              <select className="form-input" value={importForm.duration} onChange={e => fi('duration', e.target.value)}>
                {['2 years', '3 years', '4 years', '5 years'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Version *</label>
              <input className="form-input" value={importForm.version} onChange={e => fi('version', e.target.value)} />
              <ErrMsg k="version" />
            </div>

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Upload Curriculum Excel/PDF *</label>
              <input
                className="form-input"
                type="file"
                accept=".xlsx,.xls,.pdf"
                onChange={e => setImportFile(e.target.files?.[0] || null)}
              />
              <ErrMsg k="importFile" />
            </div>
          </div>

          {importFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <FileText size={14} />
              <span>{importFile.name}</span>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          deleteCurriculum && deleteCurriculum(confirm)
          setConfirm(null)
        }}
        title="Delete Curriculum"
        message="Delete this curriculum record? This cannot be undone."
      />
    </div>
  )
}