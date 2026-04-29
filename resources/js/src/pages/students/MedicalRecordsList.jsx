import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { PROGRAMS, YEAR_LEVELS, SECTIONS, GENDERS } from '../../context/AppContext'
import Header from '../../components/Header'
import { Search, Filter, Eye, CheckSquare, Square, Download } from 'lucide-react'
import '../../../../css/StudentList.css'

function getBadgeClass(course) {
  switch ((course || '').toUpperCase()) {
    case 'IT': return 'sl-badge sl-badge-it'
    case 'CS': return 'sl-badge sl-badge-cs'
    case 'IS': return 'sl-badge sl-badge-is'
    default:   return 'sl-badge sl-badge-default'
  }
}

export default function MedicalRecordsList() {
  const { students, studentMedicalDocs } = useApp()
  const navigate = useNavigate()

  const [search,        setSearch]        = useState('')
  const [courseFilter,  setCourseFilter]  = useState('All')
  const [yearFilter,    setYearFilter]    = useState('All')
  const [sectionFilter, setSectionFilter] = useState('All')
  const [showFilter,    setShowFilter]    = useState(false)
  const [selectedIds,   setSelectedIds]   = useState([])

  const clearFilters = () => {
    setCourseFilter('All'); setYearFilter('All'); setSectionFilter('All')
  }
  const hasFilters = courseFilter !== 'All' || yearFilter !== 'All' || sectionFilter !== 'All'

  const getStudentNumber = (s) =>
    String(s.studentNumber || s.student_number || s.dynamic_data?.['Student Number'] || s.dynamicData?.['Student Number'] || '').trim()

  const getStudentName = (s) => {
    const first = s.firstName || s.first_name || s.dynamic_data?.['First Name'] || s.dynamicData?.['First Name'] || ''
    const middle = s.middleName || s.middle_name || s.dynamic_data?.['Middle Name'] || s.dynamicData?.['Middle Name'] || ''
    const last = s.lastName || s.last_name || s.dynamic_data?.['Last Name'] || s.dynamicData?.['Last Name'] || ''
    const fullName = `${first} ${middle} ${last}`.replace(/\s+/g, ' ').trim()
    return fullName || s.studentName || s.name || 'Student'
  }

  const getCourse = (s) =>
    s.course || s.program || s.dynamic_data?.['Course'] || s.dynamicData?.['Course'] || ''

  const getYearLevel = (s) =>
    s.yearLevel || s.year_level || s.dynamic_data?.['Year Level'] || s.dynamicData?.['Year Level'] || ''

  const getSection = (s) =>
    s.section || s.dynamic_data?.['Section'] || s.dynamicData?.['Section'] || ''

  const filtered = students.filter(s => {
    const studentCourse = getCourse(s)
    const studentYear = getYearLevel(s)
    const studentSection = getSection(s)
    if (courseFilter  !== 'All' && studentCourse  !== courseFilter)  return false
    if (yearFilter    !== 'All' && studentYear    !== yearFilter)    return false
    if (sectionFilter !== 'All' && studentSection !== sectionFilter) return false
    const q = search.toLowerCase()
    if (q && !`${getStudentNumber(s)} ${getStudentName(s)} ${studentCourse} ${studentYear} ${studentSection}`.toLowerCase().includes(q)) return false
    return true
  })

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(s => s.id))
    }
  }

  return (
    <div className="sl-root">
      <Header title="Student Medical Records" subtitle="Overview of medical statuses and specific records" />
      <div className="sl-body">
        <div className="sl-card">

          <div className="sl-card-head">
            <div className="sl-head-top">
              <h2 className="sl-title">Medical Records Overview</h2>
              <div className="sl-head-actions">
                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(230, 126, 34, 0.1)', padding: '4px 12px', borderRadius: 20 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange)' }}>{selectedIds.length} selected</span>
                    <button className="sl-btn-outline" style={{ height: 28, padding: '0 10px' }} onClick={() => {
                        alert(`Downloading records for ${selectedIds.length} students...`)
                    }}>
                      <Download size={13} /> Download Records
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="sl-filter-row">
              <div className="sl-filter-tabs">
                <button
                  className={`sl-ftab${courseFilter === 'All' ? ' active' : ''}`}
                  onClick={() => setCourseFilter('All')}
                >All</button>
                {PROGRAMS.map(c => (
                  <button
                    key={c}
                    className={`sl-ftab${courseFilter === c ? ' active' : ''}`}
                    onClick={() => setCourseFilter(c)}
                  >{c}</button>
                ))}
                {hasFilters && (
                  <button className="sl-clear-btn" onClick={clearFilters}>Clear filters</button>
                )}
              </div>

              <div className="sl-filter-right">
                <div className="sl-search-wrap">
                  <Search size={13} className="sl-search-icon" />
                  <input
                    className="sl-search-input"
                    placeholder="Search student..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button
                  className={`sl-btn-outline${showFilter ? ' active' : ''}`}
                  onClick={() => setShowFilter(!showFilter)}
                >
                  <Filter size={13} /> Filter
                </button>
              </div>
            </div>
          </div>

          {showFilter && (
            <div className="sl-filter-panel">
              <div className="sl-filter-group">
                <label className="sl-filter-label">Year Level:</label>
                <select className="sl-filter-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                  <option value="All">All</option>
                  {YEAR_LEVELS.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <div className="sl-filter-group">
                <label className="sl-filter-label">Section:</label>
                <select className="sl-filter-select" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
                  <option value="All">All</option>
                  {SECTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <span className="sl-filter-count">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <table className="sl-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <button className="sl-check-btn" onClick={handleSelectAll}>
                    {selectedIds.length > 0 && selectedIds.length === filtered.length ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                  </button>
                </th>
                <th>Student Number</th>
                <th>Student Name</th>
                <th>Course</th>
                <th>Year & Section</th>
                <th>Medical Record</th>
                <th style={{ width: 80, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="sl-empty">No students found</div>
                  </td>
                </tr>
              ) : (
                filtered.map(s => {
                  const hasRecord = !!s.medicalRecord && (s.medicalRecord.allergies || s.medicalRecord.chronicConditions);
                  const studentNumber = String(s.studentNumber || s.student_number || s.dynamic_data?.['Student Number'] || s.dynamicData?.['Student Number'] || '').trim().replace('#', '').toLowerCase();
                  const studentName = `${s.firstName || s.first_name || s.dynamic_data?.['First Name'] || s.dynamicData?.['First Name'] || ''} ${s.lastName || s.last_name || s.dynamic_data?.['Last Name'] || s.dynamicData?.['Last Name'] || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
                  const uploadCount = (studentMedicalDocs || []).filter(d => {
                    const uploadStudentId = String(d.studentId ?? '').trim();
                    const uploadStudentNumber = String(d.studentNumber || d.student_number || d.dynamic_data?.['Student Number'] || d.dynamicData?.['Student Number'] || '').trim().replace('#', '').toLowerCase();
                    const uploadStudentName = String(d.studentName || d.student_name || d.name || d.dynamic_data?.['Student Full Name'] || d.dynamicData?.['Student Full Name'] || '').replace(/\s+/g, ' ').trim().toLowerCase();
                    return uploadStudentId === String(s.id ?? '').trim() || (studentNumber && uploadStudentNumber === studentNumber) || (studentName && uploadStudentName === studentName);
                  }).length;
                  return (
                  <tr
                    key={s.id}
                    onDoubleClick={() => navigate(`/students/${s.id}/medical`)}
                    className={selectedIds.includes(s.id) ? 'selected' : ''}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <button className="sl-check-btn" onClick={(e) => { e.stopPropagation(); setSelectedIds(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]) }}>
                        {selectedIds.includes(s.id) ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td><span className="sl-stud-num">{getStudentNumber(s)}</span></td>
                    <td><span className="sl-stud-name">{getStudentName(s)}</span></td>
                    <td><span className={getBadgeClass(getCourse(s))}>{getCourse(s)}</span></td>
                    <td>{getYearLevel(s)} - {getSection(s)}</td>
                    <td>
                      {uploadCount > 0 ? (
                        <span style={{color: '#3498db', fontSize: '12px', fontWeight: '600', background: 'rgba(52, 152, 219, 0.1)', padding: '4px 8px', borderRadius: '4px'}}>{uploadCount} Uploaded Document{uploadCount !== 1 ? 's' : ''}</span>
                      ) : hasRecord ? (
                        <span style={{color: '#27ae60', fontSize: '12px', fontWeight: '600', background: 'rgba(39, 174, 96, 0.1)', padding: '4px 8px', borderRadius: '4px'}}>Record Available</span>
                      ) : (
                        <span style={{color: '#95a5a6', fontSize: '12px', background: 'rgba(149, 165, 166, 0.1)', padding: '4px 8px', borderRadius: '4px'}}>No Detailed Record</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="sl-row-actions" style={{ justifyContent: 'center' }}>
                        <button
                          className="sl-action-btn"
                          style={{ width: 'auto', padding: '6px 14px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}
                          title="View Medical Record"
                          onClick={() => navigate(`/students/${s.id}/medical`)}
                        >
                          <Eye size={13} /> View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>

          {filtered.length > 0 && filtered.length < 6 &&
            [...Array(Math.max(0, 6 - filtered.length))].map((_, i) => (
              <div key={i} className="sl-filler" />
            ))
          }

          <div className="sl-table-footer">
            <span className="sl-count">
              Showing <strong>{filtered.length}</strong> of <strong>{students.length}</strong> student{students.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
