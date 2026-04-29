import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { PROGRAMS, YEAR_LEVELS, SEMESTERS } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import { ConfirmDialog } from '../../components/Modal'
import { Search, Filter, Plus, Download, Eye, Pencil, Trash2, Paperclip, X, FileText, ChevronLeft } from 'lucide-react'
import '../../../../css/syllabus.css'

const emptyForm = {
  courseTitle: '',
  courseCode: '',
  units: '',
  program: 'IT',
  yearLevel: '1st year',
  semester: '1st Semester',
  description: '',
}

function getTagClass(program) {
  switch ((program || '').toUpperCase()) {
    case 'IT': return 'sy-tag sy-tag-it'
    case 'CS': return 'sy-tag sy-tag-cs'
    case 'IS': return 'sy-tag sy-tag-is'
    default: return 'sy-tag sy-tag-def'
  }
}

export default function Syllabus() {
  const {
    curricula,
    syllabi,
    addSyllabus,
    updateSyllabus,
    deleteSyllabus,
    addSyllabusFiles,
    deleteSyllabusFile,
    importSyllabusPackage,
    isAdmin,
    students
  } = useApp()

  /** Count students enrolled in a syllabus — matched by program + yearLevel via dynamic_data */
  const enrolledCount = (s) => {
    const normProg = (p) => String(p || '').toUpperCase().replace(/^BS/i, '')
    const normYear = (y) => { const m = String(y || '').match(/[1-4]/); return m ? m[0] : '' }
    const targetProg = normProg(s.program)
    const targetYear = normYear(s.yearLevel)
    return (students || []).filter(st => {
      const course    = st.dynamic_data?.['Course']     || st.course     || ''
      const yearLevel = st.dynamic_data?.['Year Level'] || st.yearLevel  || ''
      return normProg(course) === targetProg && normYear(yearLevel) === targetYear
    }).length
  }

  const navigate = useNavigate()
  const { id } = useParams()

  const selectedCurriculum = useMemo(
    () => (curricula || []).find(c => c.id === Number(id)),
    [curricula, id]
  )

  const [search, setSearch] = useState('')
  const [progFilter, setProgFilter] = useState(selectedCurriculum?.program || 'All')
  const [yearFilter, setYearFilter] = useState('All')
  const [semFilter, setSemFilter] = useState('All')
  const [showFilter, setShowFilter] = useState(false)
  const [modal, setModal] = useState(null)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [fileModal, setFileModal] = useState(null)
  const [uploadFiles, setUploadFiles] = useState([])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.courseTitle.trim()) e.courseTitle = 'Required'
    if (!form.courseCode.trim()) e.courseCode = 'Required'
    if (!form.units) e.units = 'Required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const validateImport = () => {
    const e = {}
    if (!importFile) e.importFile = 'Upload a PDF or Word file'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return
    if (modal === 'add') addSyllabus && addSyllabus(form)
    else updateSyllabus && updateSyllabus(editId, form)
    setModal(null)
    setErrors({})
  }

  const handleImport = () => {
    if (!validateImport()) return

    importSyllabusPackage && importSyllabusPackage({
      syllabusId: null,
      file: importFile,
      parsedData: {
        program: selectedCurriculum?.program || 'IT',
        lessons: []
      }
    })

    setImportOpen(false)
    setImportFile(null)
    setErrors({})
  }

  const openAdd = () => {
    setForm({
      ...emptyForm,
      program: selectedCurriculum?.program || 'IT'
    })
    setModal('add')
    setErrors({})
  }

  const openEdit = (s) => {
    setForm({ ...emptyForm, ...s })
    setEditId(s.id)
    setModal('edit')
    setErrors({})
  }

  const openFiles = (s) => {
    setEditId(s.id)
    setFileModal(s.id)
    setUploadFiles([])
  }

  const handleUploadFiles = () => {
    if (!uploadFiles.length || !addSyllabusFiles) return
    addSyllabusFiles(editId, uploadFiles)
    setUploadFiles([])
  }

  const clearFilters = () => {
    setProgFilter(selectedCurriculum?.program || 'All')
    setYearFilter('All')
    setSemFilter('All')
  }

  const hasFilters =
    progFilter !== (selectedCurriculum?.program || 'All') ||
    yearFilter !== 'All' ||
    semFilter !== 'All'

  const list = syllabi || []

  const filtered = list.filter(s => {
    if (selectedCurriculum && s.program !== selectedCurriculum.program) return false
    if (progFilter !== 'All' && s.program !== progFilter) return false
    if (yearFilter !== 'All' && s.yearLevel !== yearFilter) return false
    if (semFilter !== 'All' && s.semester !== semFilter) return false

    const q = search.toLowerCase()
    if (q && !`${s.courseTitle} ${s.courseCode} ${s.program}`.toLowerCase().includes(q)) return false
    return true
  })

  const ErrMsg = ({ k }) =>
    errors[k] ? <span style={{ color: '#e74c3c', fontSize: 11 }}>{errors[k]}</span> : null

  return (
    <div className="sy-root">
      <Header title="Instructional Content" />
      <div className="sy-body">
        <div className="sy-breadcrumb">
          <span className="sy-bc-link" onClick={() => navigate('/instructional/curriculum')}>
            Curriculum
          </span>
          <span className="sy-bc-sep">›</span>
          <span className="sy-bc-cur">
            {selectedCurriculum ? `${selectedCurriculum.program} Syllabus` : 'Syllabus'}
          </span>
        </div>

        <div className="sy-card">
          <div className="sy-card-head">
            <div className="sy-head-top">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '6px 12px', height: 32, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, width: 'fit-content' }}>
                  <ChevronLeft size={14} /> Back
                </button>
                <h2 className="sy-title">
                  {selectedCurriculum ? `${selectedCurriculum.program} Syllabus` : 'Syllabus'}
                </h2>
              </div>

              {isAdmin && (
                <div className="sy-head-actions">
                  <button className="sy-btn-outline" onClick={() => setImportOpen(true)}>
                    <Download size={13} /> Upload Syllabus File
                  </button>
                  <button className="sy-btn-primary" onClick={openAdd}>
                    <Plus size={13} /> Add Course
                  </button>
                </div>
              )}
            </div>

            <div className="sy-filter-row">
              <div className="sy-filter-tabs">
                {!selectedCurriculum && (
                  <button
                    className={`sy-ftab${progFilter === 'All' ? ' active' : ''}`}
                    onClick={() => setProgFilter('All')}
                  >
                    All Programs
                  </button>
                )}

                {(selectedCurriculum ? [selectedCurriculum.program] : (PROGRAMS || ['IT', 'CS', 'IS'])).map(p => (
                  <button
                    key={p}
                    className={`sy-ftab${progFilter === p ? ' active' : ''}`}
                    onClick={() => setProgFilter(p)}
                  >
                    {p}
                  </button>
                ))}

                {hasFilters && (
                  <button className="sy-clear-btn" onClick={clearFilters}>Clear filters</button>
                )}
              </div>

              <div className="sy-filter-right">
                <div className="sy-search-wrap">
                  <Search size={13} className="sy-search-icon" />
                  <input
                    className="sy-search-input"
                    placeholder="Search courses..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <button
                  className={`sy-btn-outline${showFilter ? ' active' : ''}`}
                  onClick={() => setShowFilter(!showFilter)}
                >
                  <Filter size={13} /> Filter
                </button>
              </div>
            </div>
          </div>

          {showFilter && (
            <div className="sy-filter-panel">
              <div className="sy-filter-group">
                <label className="sy-filter-label">Year Level:</label>
                <select className="sy-filter-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                  <option value="All">All</option>
                  {(YEAR_LEVELS || ['1st year', '2nd year', '3rd year', '4th year']).map(y => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="sy-filter-group">
                <label className="sy-filter-label">Semester:</label>
                <select className="sy-filter-select" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
                  <option value="All">All</option>
                  {(SEMESTERS || ['1st Semester', '2nd Semester', 'Summer']).map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <span className="sy-filter-count">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <table className="sy-table">
            <thead>
              <tr>
                <th>Course Title</th>
                <th>Course Code</th>
                <th>Units</th>
                <th>Program</th>
                <th>Semester</th>
                <th>Enrolled</th>
                <th>Files</th>
                <th>Lessons</th>
                <th>Date Uploaded</th>
                {isAdmin && <th style={{ width: 160 }}></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9}>
                    <div className="sy-empty">No courses found</div>
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} onDoubleClick={() => navigate(`/instructional/syllabus/${s.id}`)}>
                    <td>
                      <span className="sy-course-title" onClick={() => navigate(`/instructional/syllabus/${s.id}`)}>
                        {s.courseTitle}
                      </span>
                    </td>
                    <td><span className="sy-code-badge">{s.courseCode}</span></td>
                    <td>{s.units}</td>
                    <td><span className={getTagClass(s.program)}>{s.program}</span></td>
                    <td>{s.yearLevel} - {s.semester}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, fontWeight: 700,
                        color: enrolledCount(s) > 0 ? 'var(--orange)' : 'var(--text-muted)',
                        background: enrolledCount(s) > 0 ? 'rgba(232,119,34,0.1)' : 'var(--bg)',
                        padding: '2px 8px', borderRadius: 10
                      }}>
                        {enrolledCount(s)} student{enrolledCount(s) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>{(s.files || []).length}</td>
                    <td>{(s.lessons || []).length}</td>
                    <td>{s.dateUploaded || s.dateRegistered || '—'}</td>

                    {isAdmin && (
                      <td>
                        <div className="sy-row-actions">
                          <button
                            className="sy-action-btn"
                            title="View"
                            onClick={e => {
                              e.stopPropagation()
                              navigate(`/instructional/syllabus/${s.id}`)
                            }}
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            className="sy-action-btn"
                            title="Files"
                            onClick={e => {
                              e.stopPropagation()
                              openFiles(s)
                            }}
                          >
                            <Paperclip size={13} />
                          </button>

                          <button
                            className="sy-action-btn"
                            title="Edit"
                            onClick={e => {
                              e.stopPropagation()
                              openEdit(s)
                            }}
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            className="sy-action-btn danger"
                            title="Delete"
                            onClick={e => {
                              e.stopPropagation()
                              setConfirm(s.id)
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

          <div className="sy-table-footer">
            <span className="sy-count">
              Showing <strong>{filtered.length}</strong> of <strong>{list.length}</strong> course{list.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add New Course' : 'Edit Course'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {modal === 'add' ? 'Add Course' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="sy-section-header">Course Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Course Title *</label>
                <input className="form-input" value={form.courseTitle} onChange={e => f('courseTitle', e.target.value)} />
                <ErrMsg k="courseTitle" />
              </div>

              <div className="form-group">
                <label>Course Code *</label>
                <input className="form-input" value={form.courseCode} onChange={e => f('courseCode', e.target.value)} />
                <ErrMsg k="courseCode" />
              </div>

              <div className="form-group">
                <label>Units *</label>
                <input className="form-input" type="number" min="1" max="6" value={form.units} onChange={e => f('units', e.target.value)} />
                <ErrMsg k="units" />
              </div>

              <div className="form-group">
                <label>Program</label>
                <select className="form-input" value={form.program} onChange={e => f('program', e.target.value)}>
                  {(PROGRAMS || ['IT', 'CS', 'IS']).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Year Level</label>
                <select className="form-input" value={form.yearLevel} onChange={e => f('yearLevel', e.target.value)}>
                  {(YEAR_LEVELS || ['1st year', '2nd year', '3rd year', '4th year']).map(y => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Semester</label>
                <select className="form-input" value={form.semester} onChange={e => f('semester', e.target.value)}>
                  {(SEMESTERS || ['1st Semester', '2nd Semester', 'Summer']).map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Description</label>
                <textarea className="form-input" rows={3} value={form.description} onChange={e => f('description', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Upload Syllabus File"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setImportOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleImport}>Upload Syllabus</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 12, border: '1px solid #e0d8d0', borderRadius: 8, fontSize: 13, color: '#555' }}>
            <strong>Accepted files:</strong> PDF or Word<br />
            <strong>Purpose:</strong> Upload a syllabus file that contains multiple lessons.<br />
            <strong>System behavior:</strong> The file is stored and is ready for parser-based lesson recreation.
          </div>

          <div className="form-group">
            <label>Upload Syllabus PDF/Word *</label>
            <input
              className="form-input"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
            />
            <ErrMsg k="importFile" />
          </div>

          {importFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <FileText size={14} />
              <span>{importFile.name}</span>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={!!fileModal}
        onClose={() => setFileModal(null)}
        title="Manage Syllabus Files"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setFileModal(null)}>Close</button>
            <button className="btn btn-primary" onClick={handleUploadFiles}>
              Upload Selected Files
            </button>
          </>
        }
      >
        {(() => {
          const syllabus = list.find(s => s.id === fileModal)
          if (!syllabus) return null

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Upload related syllabus files</label>
                <input
                  className="form-input"
                  type="file"
                  multiple
                  onChange={e => setUploadFiles(Array.from(e.target.files || []))}
                />
              </div>

              <div style={{ fontSize: 12, color: '#666' }}>
                Uploaded files: <strong>{(syllabus.files || []).length}</strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(syllabus.files || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: '#999' }}>No files uploaded.</div>
                ) : (
                  (syllabus.files || []).map(file => (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '10px 12px',
                        border: '1px solid #e0d8d0',
                        borderRadius: 8
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Paperclip size={14} />
                        <a href={file.url} target="_blank" rel="noreferrer" style={{ color: 'var(--orange)', textDecoration: 'none', fontSize: 13 }}>
                          {file.name}
                        </a>
                      </div>

                      <button
                        className="sy-action-btn danger"
                        onClick={() => deleteSyllabusFile && deleteSyllabusFile(syllabus.id, file.id)}
                        title="Delete file"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })()}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          deleteSyllabus && deleteSyllabus(confirm)
          setConfirm(null)
        }}
        title="Delete Course"
        message="Delete this course? This cannot be undone."
      />
    </div>
  )
}