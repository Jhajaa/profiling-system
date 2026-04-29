import React, { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import { ConfirmDialog } from '../../components/Modal'
import { Trash2, RotateCcw, Search, Filter, AlertCircle, Clock, Tag, User, BookOpen, Star, AlertTriangle, Shield, ChevronLeft, GraduationCap, CheckSquare, Square } from 'lucide-react'
import '../../../../css/StudentList.css'

export default function RecycleBin() {
  const { deletedItems, restoreFromBin, permanentDelete, showToast } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [restoreConfirm, setRestoreConfirm] = useState(null)
  const [purgeConfirm, setPurgeConfirm] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkRestoreConfirm, setBulkRestoreConfirm] = useState(false)
  const [bulkPurgeConfirm, setBulkPurgeConfirm] = useState(false)

  const types = ['All', ...new Set(deletedItems.map(i => i.type))]

  const filtered = deletedItems.filter(item => {
    const typeMatch = filterType === 'All' || item.type === filterType
    const q = search.toLowerCase()
    if (!q) return typeMatch
    
    // Search in names/titles depending on type
    const data = item.data
    const dData = data.dynamic_data || {}
    const searchString = (
      (data.firstName || dData['First Name'] || '') + ' ' + 
      (data.lastName || dData['Last Name'] || '') + ' ' + 
      (data.name || dData.name || '') + ' ' + 
      (data.title || dData.title || '') + ' ' + 
      (data.subject || dData.subject || '') + ' ' +
      (data.courseTitle || dData.courseTitle || '')
    ).toLowerCase()
    
    return typeMatch && searchString.includes(q)
  })

  const getIcon = (type) => {
    switch(type) {
      case 'student': return <User size={14} />
      case 'faculty': return <Shield size={14} />
      case 'announcement': return <Tag size={14} />
      case 'event': return <Star size={14} />
      case 'violation': return <AlertTriangle size={14} />
      case 'enrollee': return <GraduationCap size={14} />
      case 'curriculum': 
      case 'syllabus': return <BookOpen size={14} />
      default: return <AlertCircle size={14} />
    }
  }

  const getItemName = (item) => {
    const d = item.data
    const dd = d.dynamic_data || {}
    if (item.type === 'student') return `${d.firstName || dd['First Name'] || 'Unnamed'} ${d.lastName || dd['Last Name'] || 'Student'}`
    if (item.type === 'faculty') return d.name || dd['Name'] || `${d.firstName || dd['First Name']} ${d.lastName || dd['Last Name']}`
    if (item.type === 'enrollee') return d.name || `${dd['First Name'] || ''} ${dd['Last Name'] || ''}`.trim() || 'New Enrollee'
    return d.title || d.name || d.subject || d.courseTitle || 'Unnamed Item'
  }

  useEffect(() => {
    setSelectedIds([])
  }, [search, filterType])

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(i => i.binId))
    }
  }

  const handleBulkRestore = async () => {
    for (const id of selectedIds) {
      const item = deletedItems.find(i => i.binId === id)
      if (item) await restoreFromBin(item)
    }
    setSelectedIds([])
    setBulkRestoreConfirm(false)
  }

  const handleBulkPurge = async () => {
    for (const id of selectedIds) {
      await permanentDelete(id)
    }
    setSelectedIds([])
    setBulkPurgeConfirm(false)
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="sl-root">
      <Header title="Recycle Bin" subtitle="Manage deleted items from across the system. Items here can be restored or permanently purged." />
      
      <div className="sl-body">
        <div className="sl-card">
          <div className="sl-card-head">
            <div className="sl-head-top">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '6px 12px', height: 32, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, width: 'fit-content' }}>
                  <ChevronLeft size={14} /> Back
                </button>
                <h2 className="sl-title">Deleted Items</h2>
              </div>
              <div className="sl-head-actions">
                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(230, 126, 34, 0.1)', padding: '4px 12px', borderRadius: 20, marginRight: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange)' }}>{selectedIds.length} selected</span>
                    <button className="sl-btn-outline success" style={{ height: 28, padding: '0 10px', color: '#27ae60', borderColor: '#27ae60' }} onClick={() => setBulkRestoreConfirm(true)}>
                      <RotateCcw size={13} /> Restore
                    </button>
                    <button className="sl-btn-outline danger" style={{ height: 28, padding: '0 10px', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => setBulkPurgeConfirm(true)}>
                      <Trash2 size={13} /> Purge
                    </button>
                  </div>
                )}
                {deletedItems.length > 0 && (
                   <button className="sl-btn-outline danger" onClick={() => {
                     // If no selection, purge all
                     if (selectedIds.length === 0) {
                        setSelectedIds(deletedItems.map(i => i.binId));
                        setBulkPurgeConfirm(true);
                     }
                   }}>
                     <Trash2 size={13} /> Empty Bin
                   </button>
                )}
              </div>
            </div>

            <div className="sl-filter-row">
              <div className="sl-filter-tabs">
                {types.map(t => (
                  <button 
                    key={t} 
                    className={`sl-ftab ${filterType === t ? 'active' : ''}`}
                    onClick={() => setFilterType(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div className="sl-filter-right">
                <div className="sl-search-wrap">
                  <Search size={13} className="sl-search-icon" />
                  <input 
                    className="sl-search-input" 
                    placeholder="Search deleted items..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <table className="sl-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <button className="sl-check-btn" onClick={handleSelectAll}>
                    {selectedIds.length > 0 && selectedIds.length === filtered.length ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                  </button>
                </th>
                <th style={{ width: 40 }}>Type</th>
                <th>Item Name</th>
                <th>Original ID / Info</th>
                <th>Deleted At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="sl-empty">
                      <Trash2 size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                      <p>The recycle bin is empty.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.binId} onClick={() => {}} className={selectedIds.includes(item.binId) ? 'selected' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <button className="sl-check-btn" onClick={(event) => { event.stopPropagation(); setSelectedIds(prev => prev.includes(item.binId) ? prev.filter(x => x !== item.binId) : [...prev, item.binId]) }}>
                        {selectedIds.includes(item.binId) ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td>
                      <div className="sl-badge sl-badge-default" title={item.type}>
                         {getIcon(item.type)}
                      </div>
                    </td>
                    <td>
                      <div className="sl-stud-name">{getItemName(item)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.type.toUpperCase()}</div>
                    </td>
                    <td>
                       <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                         {item.data.studentNumber || (item.data.dynamic_data && item.data.dynamic_data['Student Number']) || item.data.facultyNumber || item.data.id || 'N/A'}
                       </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                        <Clock size={12} /> {formatDate(item.deletedAt)}
                      </div>
                    </td>
                    <td>
                      <div className="sl-row-actions">
                        <button 
                          className="sl-action-btn" 
                          title="Restore"
                          onClick={(e) => { e.stopPropagation(); setRestoreConfirm(item); }}
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button 
                          className="sl-action-btn danger" 
                          title="Permanently Delete"
                          onClick={(e) => { e.stopPropagation(); setPurgeConfirm(item); }}
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

          <div className="sl-table-footer">
            <div className="sl-count">
              Showing <strong>{filtered.length}</strong> of <strong>{deletedItems.length}</strong> total items
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog 
        open={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        onConfirm={() => { restoreFromBin(restoreConfirm.binId); setRestoreConfirm(null); }}
        title="Restore Item"
        message={`Are you sure you want to restore "${restoreConfirm ? getItemName(restoreConfirm) : ''}" to its original location?`}
      />
      {/* Delete / Purge Confirm */}
      <ConfirmDialog 
        open={!!purgeConfirm} 
        onClose={() => setPurgeConfirm(null)} 
        onConfirm={() => permanentDelete(purgeConfirm)} 
        title="Permanent Delete" 
        message="Are you sure you want to permanently delete this item? This action cannot be undone." 
        confirmText="Permanently Delete"
        isDanger={true}
        requireTypedConfirmation={true}
        typedConfirmationWord="DELETE"
      />

      {/* Bulk Restore Confirm */}
      <ConfirmDialog 
        open={bulkRestoreConfirm} 
        onClose={() => setBulkRestoreConfirm(false)} 
        onConfirm={handleBulkRestore} 
        title={`Restore ${selectedIds.length} Items`} 
        message={`Are you sure you want to restore ${selectedIds.length} items to their original locations?`} 
        confirmText="Restore Items"
        icon={<RotateCcw size={24} style={{ color: 'var(--blue)' }} />}
      />

      {/* Bulk Purge Confirm */}
      <ConfirmDialog 
        open={bulkPurgeConfirm} 
        onClose={() => setBulkPurgeConfirm(false)} 
        onConfirm={handleBulkPurge} 
        title={`Permanently Delete ${selectedIds.length} Items`} 
        message={`Are you sure you want to permanently delete ${selectedIds.length} items? This action cannot be undone.`} 
        confirmText="Permanently Delete"
        isDanger={true}
        requireTypedConfirmation={true}
        typedConfirmationWord="DELETE"
      />
    </div>
  )
}
