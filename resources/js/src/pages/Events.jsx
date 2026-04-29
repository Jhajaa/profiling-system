import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { ConfirmDialog } from '../components/Modal'
import { Search, Filter, Plus, Eye, Pencil, Trash2, CheckSquare, Square } from 'lucide-react'
import '../../../css/event.css'

const STATUS_FILTERS = ['All', 'Upcoming', 'Ongoing', 'Completed', 'Cancelled']

const emptyForm = {
  name: '',
  department: '',
  dateTime: '',
  endTime: '',
  venue: '',
  participants: '',
  groups: '',
  status: 'Upcoming',
  description: '',
}

function getStatusClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'upcoming':  return 'ev-status ev-status-upcoming'
    case 'ongoing':   return 'ev-status ev-status-ongoing'
    case 'completed': return 'ev-status ev-status-completed'
    case 'cancelled': return 'ev-status ev-status-cancelled'
    default:          return 'ev-status ev-status-upcoming'
  }
}

function formatDate(dateTime) {
  if (!dateTime) return '—'
  try {
    return new Date(dateTime).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    })
  } catch { return dateTime }
}

function formatTime(dateTime) {
  if (!dateTime) return ''
  try {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return '' }
}

export default function Events() {
  const { events, addEvent, updateEvent, deleteEvent, isAdmin } = useApp()
  const navigate = useNavigate()

  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showFilter,   setShowFilter]   = useState(false)
  const [modal,        setModal]        = useState(null)
  const [editId,       setEditId]       = useState(null)
  const [form,         setForm]         = useState(emptyForm)
  const [errors,       setErrors]       = useState({})
  const [confirm,      setConfirm]      = useState(null)
  const [selectedIds,  setSelectedIds]  = useState([])
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.name.trim())     e.name     = 'Required'
    if (!form.dateTime)        e.dateTime = 'Required'
    if (!form.venue.trim())    e.venue    = 'Required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return
    if (modal === 'add') addEvent && addEvent(form)
    else updateEvent && updateEvent(editId, form)
    setModal(null); setErrors({})
  }

  const openAdd  = ()  => { setForm(emptyForm); setModal('add'); setErrors({}) }
  const openEdit = (e) => { setForm({ ...emptyForm, ...e }); setEditId(e.id); setModal('edit'); setErrors({}) }

  const list = events || []

  const filtered = list.filter(e => {
    if (statusFilter !== 'All' && e.status !== statusFilter) return false
    const q = search.toLowerCase()
    if (q && !`${e.name} ${e.department} ${e.venue} ${e.groups}`.toLowerCase().includes(q)) return false
    return true
  })

  React.useEffect(() => {
    setSelectedIds([])
  }, [search, statusFilter])

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filtered.map(e => e.id))
    }
  }

  const handleBulkDelete = async () => {
    if (deleteEvent) {
      for (const id of selectedIds) {
        await deleteEvent(id)
      }
    }
    setSelectedIds([])
    setBulkDeleteConfirm(false)
  }

  const ErrMsg = ({ k }) =>
    errors[k] ? <span style={{ color: '#e74c3c', fontSize: 11 }}>{errors[k]}</span> : null

  return (
    <div className="ev-root">
      <Header title="Events Management" />
      <div className="ev-body">

        <div className="ev-card">

          {/* ── Card header — matches StudentList ── */}
          <div className="ev-card-head">
            <div className="ev-head-top">
              <h2 className="ev-title">Events</h2>
              {isAdmin && (
                <div className="ev-head-actions">
                  {selectedIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(230, 126, 34, 0.1)', padding: '4px 12px', borderRadius: 20, marginRight: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange)' }}>{selectedIds.length} selected</span>
                      <button className="ev-btn-outline danger" style={{ height: 28, padding: '0 10px', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => setBulkDeleteConfirm(true)}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                  <button
                    className={`ev-btn-outline${showFilter ? ' active' : ''}`}
                    onClick={() => setShowFilter(!showFilter)}
                  >
                    <Filter size={13} /> Filter
                  </button>
                  <button className="ev-btn-primary" onClick={openAdd}>
                    <Plus size={13} /> Add Event
                  </button>
                </div>
              )}
            </div>

            {/* Filter row */}
            <div className="ev-filter-row">
              <div className="ev-filter-tabs">
                {STATUS_FILTERS.map(s => (
                  <button
                    key={s}
                    className={`ev-ftab${statusFilter === s ? ' active' : ''}`}
                    onClick={() => setStatusFilter(s)}
                  >{s}</button>
                ))}
              </div>
              <div className="ev-filter-right">
                <div className="ev-search-wrap">
                  <Search size={13} className="ev-search-icon" />
                  <input
                    className="ev-search-input"
                    placeholder="Search events..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Expanded filter panel ── */}
          {showFilter && (
            <div style={{
              padding: '12px 20px',
              background: 'var(--bg)',
              borderBottom: '0.5px solid var(--border)',
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
              fontSize: 12
            }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                Showing {filtered.length} of {list.length} event{list.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* ── Table ── */}
          <table className="ev-table">
            <thead>
              <tr>
                {isAdmin && (
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <button className="sl-check-btn" onClick={handleSelectAll}>
                      {selectedIds.length > 0 && selectedIds.length === filtered.length ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                    </button>
                  </th>
                )}
                <th>Event Name</th>
                <th>Department/Program/Org.</th>
                <th>Date/Time</th>
                <th>Venue</th>
                <th>Participants</th>
                <th>Groups</th>
                <th>Status</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8}>
                    <div className="ev-empty">No events found</div>
                  </td>
                </tr>
              ) : (
                filtered.map(e => (
                  <tr
                    key={e.id}
                    onDoubleClick={() => navigate(`/events/${e.id}`)}
                    className={selectedIds.includes(e.id) ? 'selected' : ''}
                  >
                    {isAdmin && (
                      <td style={{ textAlign: 'center' }}>
                        <button className="sl-check-btn" onClick={(event) => { event.stopPropagation(); setSelectedIds(prev => prev.includes(e.id) ? prev.filter(x => x !== e.id) : [...prev, e.id]) }}>
                          {selectedIds.includes(e.id) ? <CheckSquare size={16} color="var(--orange)" /> : <Square size={16} />}
                        </button>
                      </td>
                    )}
                    <td>
                      <span
                        className="ev-name-link"
                        onClick={() => navigate(`/events/${e.id}`)}
                      >{e.name}</span>
                    </td>
                    <td>{e.department}</td>
                    <td>
                      <div className="ev-date-line">{formatDate(e.dateTime)}</div>
                      <div className="ev-time-line">
                        {formatTime(e.dateTime)}{e.endTime ? ` – ${e.endTime}` : ''}
                      </div>
                    </td>
                    <td>{e.venue}</td>
                    <td>
                      <span className="ev-participants">{e.participants || 0}</span>
                    </td>
                    <td><span className="ev-groups">{e.groups}</span></td>
                    <td>
                      <span className={getStatusClass(e.status)}>
                        <span className="ev-status-dot" />
                        {e.status}
                      </span>
                    </td>
                    <td>
                      <div className="ev-row-actions">
                        <button
                          className="ev-action-btn"
                          title="View"
                          onClick={() => navigate(`/events/${e.id}`)}
                        >
                          <Eye size={13} />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              className="ev-action-btn"
                              title="Edit"
                              onClick={() => openEdit(e)}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="ev-action-btn danger"
                              title="Delete"
                              onClick={() => setConfirm(e.id)}
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
              <div key={i} className="ev-filler" />
            ))
          }

          {/* ── Table footer ── */}
          <div className="ev-table-footer">
            <span className="ev-count">
              Showing <strong>{filtered.length}</strong> of <strong>{list.length}</strong> event{list.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add New Event' : 'Edit Event'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {modal === 'add' ? 'Add Event' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Event Details */}
          <div>
            <div className="ev-section-header">Event Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Event Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={e => f('name', e.target.value)}
                  placeholder="Event name"
                />
                <ErrMsg k="name" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Department / Program / Org.</label>
                <input
                  className="form-input"
                  value={form.department}
                  onChange={e => f('department', e.target.value)}
                  placeholder="e.g. CCS/BSIT/SITeS"
                />
              </div>
              <div className="form-group">
                <label>Date & Start Time *</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={form.dateTime}
                  onChange={e => f('dateTime', e.target.value)}
                />
                <ErrMsg k="dateTime" />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  className="form-input"
                  type="time"
                  value={form.endTime}
                  onChange={e => f('endTime', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Venue *</label>
                <input
                  className="form-input"
                  value={form.venue}
                  onChange={e => f('venue', e.target.value)}
                  placeholder="e.g. Main Building ComLab 2"
                />
                <ErrMsg k="venue" />
              </div>
              <div className="form-group">
                <label>No. of Participants</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={form.participants}
                  onChange={e => f('participants', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-input" value={form.status} onChange={e => f('status', e.target.value)}>
                  {['Upcoming', 'Ongoing', 'Completed', 'Cancelled'].map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Target Groups</label>
                <input
                  className="form-input"
                  value={form.groups}
                  onChange={e => f('groups', e.target.value)}
                  placeholder="e.g. BSIT/BSCS/BSIS"
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.description}
                  onChange={e => f('description', e.target.value)}
                  placeholder="Event description..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

        </div>
      </Modal>

      {/* ── Confirm delete ── */}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { deleteEvent && deleteEvent(confirm); setConfirm(null) }}
        title="Delete Event"
        message="Delete this event? This cannot be undone."
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.length} Events`}
        message={`Are you sure you want to delete ${selectedIds.length} events? This cannot be undone.`}
        confirmText="Delete Events"
        isDanger={true}
        requireTypedConfirmation={true}
        typedConfirmationWord="DELETE"
      />
    </div>
  )
}