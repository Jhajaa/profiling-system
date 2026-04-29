import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import { ConfirmDialog } from '../../components/Modal'
import { Search, Filter, Eye, Trash2, RotateCcw, Columns, ChevronLeft, ChevronRight, CheckSquare, Square, CheckCircle2 } from 'lucide-react'
import Modal from '../../components/Modal'
import '../../../../css/StudentList.css'

export default function ArchivedStudents() {
  const { archivedStudents, fetchArchivedStudents, restoreStudent, deleteStudent, isAdmin, dynamicFields } = useApp()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [dynamicFilterVals, setDynamicFilterVals] = useState({})
  const [restoreConfirm, setRestoreConfirm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [columnModal, setColumnModal] = useState(false)
  const [visibleColumnNames, setVisibleColumnNames] = useState(() => {
    const saved = localStorage.getItem('studentListVisibleColumns')
    return saved ? JSON.parse(saved) : null
  })
  const [currentPage,   setCurrentPage]   = useState(1)
  const [rowsPerPage,   setRowsPerPage]   = useState(10)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkRestoreConfirm, setBulkRestoreConfirm] = useState(false)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchArchivedStudents()
  }, [])

  const clearFilters = () => setDynamicFilterVals({})
  const hasFilters = Object.keys(dynamicFilterVals).some(k => dynamicFilterVals[k] && dynamicFilterVals[k] !== 'All')

  const filtered = (archivedStudents || []).filter(s => {
    for (const key of Object.keys(dynamicFilterVals)) {
      const filterVal = dynamicFilterVals[key]
      if (!filterVal || filterVal === 'All') continue
      const studentVal = s.dynamic_data?.[key]
      if (!studentVal) return false
      const fieldDef = dynamicFields?.find(f => f.name === key)
      if (fieldDef?.type === 'checkbox' && Array.isArray(studentVal)) {
        if (!studentVal.includes(filterVal)) return false
      } else if (!String(studentVal).toLowerCase().includes(filterVal.toLowerCase())) return false
    }
    const q = search.toLowerCase()
    if (!q) return true
    const allValues = Object.values(s.dynamic_data || {}).join(' ').toLowerCase()
    return allValues.includes(q)
  })

  // Pagination Logic
  const totalRows = filtered.length
  const totalPages = Math.ceil(totalRows / rowsPerPage)
  const indexOfLastRow = currentPage * rowsPerPage
  const indexOfFirstRow = indexOfLastRow - Math.min(rowsPerPage, totalRows) >= 0 ? indexOfLastRow - rowsPerPage : 0
  const currentRows = filtered.slice(indexOfFirstRow, indexOfLastRow)

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds([])
  }, [search, dynamicFilterVals, rowsPerPage])

  const handleSelectAll = () => {
    if (selectedIds.length === currentRows.length && currentRows.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(currentRows.map(s => s.id))
    }
  }

  const handleBulkRestore = async () => {
    for (const id of selectedIds) {
      await restoreStudent(id)
    }
    setSelectedIds([])
    setBulkRestoreConfirm(false)
  }

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteStudent(id)
    }
    setSelectedIds([])
    setBulkDeleteConfirm(false)
  }

  // Which fields to pin as primary table columns
  const allTableFields = (dynamicFields || []).slice().sort((a, b) => a.order_index - b.order_index)
  const effectiveVisibleColumns = visibleColumnNames || [...allTableFields.map(f => f.name), 'Date Registered']
  const tableFields = allTableFields.filter(f => effectiveVisibleColumns.includes(f.name))
  const showDateRegistered = effectiveVisibleColumns.includes('Date Registered')

  return (
    <div className="sl-root">
      <Header title="Archived Students" subtitle="Manage students who have been transitioned to an inactive/archived status." />
      <div className="sl-body">
        <div className="sl-card">

          <div className="sl-card-head">
            <div className="sl-head-top">
              <div>
                <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '6px 12px', height: 32, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                  <ChevronLeft size={14} /> Back
                </button>
                <h2 className="sl-title">Archived Students</h2>
              </div>
              <div className="sl-head-actions">
                {selectedIds.length > 0 && isAdmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(230, 126, 34, 0.1)', padding: '4px 12px', borderRadius: 20 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange)' }}>{selectedIds.length} selected</span>
                    <button className="sl-btn-outline" style={{ height: 28, padding: '0 10px' }} onClick={() => setBulkRestoreConfirm(true)}>
                      <RotateCcw size={13} /> Restore
                    </button>
                    <button className="sl-btn-outline danger" style={{ height: 28, padding: '0 10px' }} onClick={() => setBulkDeleteConfirm(true)}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
                <button className="sl-btn-outline" onClick={() => setColumnModal(true)}>
                  <Columns size={13} /> Columns
                </button>
              </div>
            </div>

            <div className="sl-filter-row">
              <div className="sl-filter-tabs">
                <button className="sl-ftab active">All Archived</button>
                {hasFilters && (
                  <button className="sl-clear-btn" onClick={clearFilters}>Clear filters</button>
                )}
              </div>

              <div className="sl-filter-right">
                <div className="sl-search-wrap">
                  <Search size={13} className="sl-search-icon" />
                  <input className="sl-search-input" placeholder="Search archived students..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className={`sl-btn-outline${showFilter ? ' active' : ''}`} onClick={() => setShowFilter(!showFilter)}>
                  <Filter size={13} /> Advanced Queries
                </button>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="sl-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <button className="sl-check-btn" onClick={handleSelectAll}>
                        {selectedIds.length > 0 && selectedIds.length === currentRows.length ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                      </button>
                    </th>
                  )}
                  {tableFields.map(f => <th key={f.id}>{f.name}</th>)}
                  {showDateRegistered && <th>Date Registered</th>}
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length === 0 ? (
                  <tr><td colSpan={tableFields.length + (showDateRegistered ? 3 : 2) + (isAdmin ? 1 : 0)}><div className="sl-empty">No archived students found</div></td></tr>
                ) : currentRows.map(s => (
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
                    {showDateRegistered && <td style={{ whiteSpace: 'nowrap' }}>{s.dateRegistered}</td>}
                    <td>
                      <div className="sl-row-actions">
                        <button className="sl-action-btn" onClick={() => navigate(`/students/${s.id}`)} title="View"><Eye size={13} /></button>
                        {isAdmin && (
                          <>
                            <button className="sl-action-btn" onClick={() => setRestoreConfirm(s.id)} title="Restore">
                              <RotateCcw size={13} />
                            </button>
                            <button className="sl-action-btn danger" onClick={() => setDeleteConfirm(s)} title="Delete Student">
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

            <div className="sl-table-footer">
              <span className="sl-count">
                Showing <strong>{totalRows > 0 ? indexOfFirstRow + 1 : 0}</strong> to <strong>{Math.min(indexOfLastRow, totalRows)}</strong> of <strong>{totalRows}</strong> archived students
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

      {/* Restore Confirm Modal */}
      <ConfirmDialog 
        open={!!restoreConfirm} 
        onClose={() => setRestoreConfirm(null)} 
        onConfirm={() => { restoreStudent(restoreConfirm); setRestoreConfirm(null); }} 
        title="Restore Student" 
        message="Are you sure you want to restore this student to the active roster? They will be removed from the archive." 
        confirmText="Restore Student"
        icon={<RotateCcw size={24} style={{ color: 'var(--blue)' }} />}
      />

      {/* Delete Confirm Modal (V2 with typed confirmation) */}
      <ConfirmDialog 
        open={!!deleteConfirm} 
        onClose={() => setDeleteConfirm(null)} 
        onConfirm={() => { deleteStudent(deleteConfirm.id); setDeleteConfirm(null); }} 
        title="Delete Archived Student" 
        message={`Are you sure you want to delete ${deleteConfirm?.dynamic_data?.['First Name'] || 'this student'}? This will move them to the Recycle Bin.`}
        confirmText="Delete Student"
        isDanger={true}
        requireTypedConfirmation={true}
        typedConfirmationWord="DELETE"
      />

      {/* Bulk Restore Confirm Modal */}
      <ConfirmDialog 
        open={bulkRestoreConfirm} 
        onClose={() => setBulkRestoreConfirm(false)} 
        onConfirm={handleBulkRestore} 
        title={`Restore ${selectedIds.length} Students`} 
        message={`Are you sure you want to restore ${selectedIds.length} students to the active roster?`} 
        confirmText="Restore Students"
        icon={<RotateCcw size={24} style={{ color: 'var(--blue)' }} />}
      />

      {/* Bulk Delete Confirm Modal */}
      <ConfirmDialog 
        open={bulkDeleteConfirm} 
        onClose={() => setBulkDeleteConfirm(false)} 
        onConfirm={handleBulkDelete} 
        title={`Delete ${selectedIds.length} Students`} 
        message={`Are you sure you want to delete ${selectedIds.length} students? They will be moved to the Recycle Bin.`} 
        confirmText="Delete Students"
        isDanger={true}
        requireTypedConfirmation={true}
        typedConfirmationWord="DELETE"
      />
      <Modal 
        open={columnModal} 
        onClose={() => setColumnModal(false)} 
        title="Table Columns" 
        size="medium"
        footer={<button className="btn btn-primary" onClick={() => setColumnModal(false)}>Done</button>}
      >
        <div style={{ padding: '5px 0' }}>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>Select which columns to display in the archived students list.</p>
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
    </div>
  )
}
