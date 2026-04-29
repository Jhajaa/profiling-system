import React, { useState, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal, { ConfirmDialog } from '../../components/Modal'
import { Plus, Pencil, Trash2, GripVertical, FileText, ChevronDown } from 'lucide-react'
import '../../../../css/theme-settings.css'
import '../../../../css/dynamic-fields.css'
import '../../../../css/StudentList.css'

export default function DynamicFields() {
  const { dynamicFields, addDynamicField, updateDynamicField, deleteDynamicField, reorderDynamicFields, isAdmin } = useApp()
  
  const [modal, setModal] = useState(null)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'short_text', is_required: false, show_in_table: false, options: '', section: 'Basic Information' })
  const [confirm, setConfirm] = useState(null)
  const [activeModule, setActiveModule] = useState('students')
  const [newSectionModal, setNewSectionModal] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  
  const [localFields, setLocalFields] = useState([])
  const [draggedItem, setDraggedItem] = useState(null)
  const [customSections, setCustomSections] = useState([])
  const [editingSection, setEditingSection] = useState(null)
  const [editingSectionName, setEditingSectionName] = useState('')
  const [previewStep, setPreviewStep] = useState(0)
  const [collapsedSections, setCollapsedSections] = useState({})

  // When sections change, collapse all except the first
  useEffect(() => {
    setCollapsedSections(
      allSections.reduce((acc, name, i) => {
        if (i > 0) acc[name] = true
        return acc
      }, {})
    )
  }, [activeModule])

  useEffect(() => {
    if (dynamicFields) {
        setLocalFields([...dynamicFields].filter(f => (f.module || 'students') === activeModule).sort((a,b) => a.order_index - b.order_index))
    }
  }, [dynamicFields, activeModule])

  const sectionsInUse = Array.from(new Set(localFields.map(f => f.section).filter(Boolean)))
  const allSections = Array.from(new Set([...sectionsInUse, ...customSections]))
  if (allSections.length === 0) allSections.push('Basic Information')

  const safePreviewStep = previewStep >= allSections.length ? Math.max(0, allSections.length - 1) : previewStep;

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) return alert('Name is required')
    
    const payload = { ...form, is_required: Boolean(form.is_required), show_in_table: Boolean(form.show_in_table), module: activeModule }
    if (['select', 'checkbox', 'radio'].includes(form.type) && typeof form.options === 'string') {
        payload.options = form.options.split(',').map(o => o.trim()).filter(Boolean)
    } else if (typeof form.options === 'string') {
        payload.options = null
    }

    if (modal === 'add') {
      addDynamicField({...payload, order_index: localFields.length + 1})
    } else {
      updateDynamicField(editId, payload)
    }
    setModal(null)
  }

  const openAdd = (targetSection = 'Basic Information') => {
    setForm({ name: '', type: 'short_text', is_required: false, show_in_table: false, options: '', section: targetSection })
    setEditId(null)
    setModal('add')
  }

  const openEdit = (field) => {
    setForm({
      name: field.name,
      type: field.type,
      is_required: field.is_required ? true : false,
      show_in_table: field.show_in_table ? true : false,
      options: Array.isArray(field.options) ? field.options.join(', ') : '',
      section: field.section || 'Basic Information'
    })
    setEditId(field.id)
    setModal('edit')
  }

  const onDragStart = (e, field) => {
    setDraggedItem(field)
    e.dataTransfer.effectAllowed = "move"
  }
  
  const onDragOverItem = (e, index) => {
    e.preventDefault()
    if (!draggedItem) return
    const draggedOverItem = localFields[index]
    if (draggedItem.id === draggedOverItem.id) return
    
    let newFields = localFields.filter(item => item.id !== draggedItem.id)
    const overItemIndex = newFields.findIndex(i => i.id === draggedOverItem.id)
    
    const targetSection = draggedOverItem.section || 'Basic Information'
    const itemToInsert = { ...draggedItem, section: targetSection }

    newFields.splice(overItemIndex, 0, itemToInsert)
    setLocalFields(newFields)
    setDraggedItem(itemToInsert)
  }

  const onDragOverSection = (e, section) => {
      e.preventDefault()
      if (!draggedItem) return
      if (draggedItem.section !== section) {
          const sectionItems = localFields.filter(f => f.section === section)
          if (sectionItems.length === 0) {
              const itemToInsert = { ...draggedItem, section }
              let newFields = localFields.filter(item => item.id !== draggedItem.id)
              newFields.push(itemToInsert)
              setLocalFields(newFields)
              setDraggedItem(itemToInsert)
          } else {
              const lastItem = sectionItems[sectionItems.length - 1]
              const lastItemIndex = localFields.findIndex(f => f.id === lastItem.id)
              const itemToInsert = { ...draggedItem, section }
              let newFields = localFields.filter(item => item.id !== draggedItem.id)
              newFields.splice(lastItemIndex + 1, 0, itemToInsert)
              setLocalFields(newFields)
              setDraggedItem(itemToInsert)
          }
      }
  }

  const onDragEnd = () => {
    setDraggedItem(null)
    reorderDynamicFields(localFields)
  }

  const handleAddSection = () => {
      if (newSectionName.trim()) {
          if (!customSections.includes(newSectionName.trim())) {
              setCustomSections(p => [...p, newSectionName.trim()])
          }
          setNewSectionModal(false)
          setNewSectionName('')
      }
  }

  const handleRenameSection = (oldName, newName) => {
      if (!newName.trim() || oldName === newName) return;
      const trimmedNew = newName.trim();
      if (customSections.includes(oldName)) {
          setCustomSections(prev => prev.map(s => s === oldName ? trimmedNew : s))
      }
      const affectedFields = localFields.filter(f => (f.section || 'Basic Information') === oldName);
      if (affectedFields.length > 0) {
          const updatedFields = localFields.map(f => {
              if ((f.section || 'Basic Information') === oldName) return { ...f, section: trimmedNew };
              return f;
          });
          setLocalFields(updatedFields);
          reorderDynamicFields(updatedFields);
      }
  }

  if (!isAdmin) return <div style={{padding: 20}}>Access Denied. Admins only.</div>

  const TYPE_LABELS = {
    short_text: 'Short Text', long_text: 'Long Text', paragraph: 'Paragraph Text',
    radio: 'Multiple Choice', checkbox: 'Checkboxes', select: 'Dropdown',
    number: 'Number', date: 'Date', time: 'Time', file: 'File Upload', email: 'Email',
    sections: 'Academic Sections (Auto-fill)',
  }

  return (
    <div className="df-page-root">
      <Header title="Dynamic Form Builder" />

      {/* ── Top bar: title + module tabs + Add Section button ── */}
      <div className="df-topbar">
        <div className="df-topbar-left">
          <h1 className="df-topbar-title">Unified Form Layout Builder</h1>
          <p className="df-topbar-desc">
            Drag and drop fields to reorder them or move them between sections. Every field is fully editable — rename, retype, or delete at any time.
          </p>
        </div>

        <div className="df-topbar-right">
          {/* Module tabs */}
          <div className="df-module-tabs">
            {[
              { key: 'students',   label: 'Student Profile' },
              { key: 'violations', label: 'Violations' },
              { key: 'enrollment', label: 'Enrollment' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`df-module-tab ${activeModule === key ? 'active' : ''}`}
                onClick={() => { setActiveModule(key); setPreviewStep(0); setCustomSections([]); }}
              >
                {label}
              </button>
            ))}
          </div>

          <button className="btn-reset df-add-section-btn" onClick={() => setNewSectionModal(true)}>
            <Plus size={13} /> Add Section
          </button>
        </div>
      </div>

      {/* ── Main split layout — both panels scroll independently ── */}
      <div className="df-workspace">
        {/* LEFT: Builder canvas */}
        <div className="df-builder-scroll">
          {allSections.map((sectionName) => {
            const sectionFields = localFields.filter(f => (f.section || 'Basic Information') === sectionName);
            const isCollapsed = !!collapsedSections[sectionName];
            const toggleCollapse = () => setCollapsedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));

            return (
              <div
                key={sectionName}
                className={`df-section-card ${isCollapsed ? 'is-collapsed' : ''}`}
                onDragOver={(e) => !isCollapsed && onDragOverSection(e, sectionName)}
              >
                {/* ── Section header row (always visible) ── */}
                <div className="df-section-header">
                  {/* Left: chevron + name/rename */}
                  <div className="df-section-header-left">
                    <button
                      className="df-collapse-btn"
                      onClick={toggleCollapse}
                      title={isCollapsed ? 'Expand section' : 'Collapse section'}
                    >
                      <ChevronDown
                        size={16}
                        className={`df-chevron ${isCollapsed ? 'rotated' : ''}`}
                      />
                    </button>

                    {editingSection === sectionName ? (
                      <div className="df-section-title">
                        <input
                          autoFocus
                          value={editingSectionName}
                          onChange={e => setEditingSectionName(e.target.value)}
                          onBlur={() => { handleRenameSection(sectionName, editingSectionName); setEditingSection(null); }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { handleRenameSection(sectionName, editingSectionName); setEditingSection(null); }
                            else if (e.key === 'Escape') setEditingSection(null);
                          }}
                        />
                      </div>
                    ) : (
                      <h3 className="df-section-title">
                        {sectionName}
                        <button
                          className="btn-reset"
                          style={{ padding: '4px 8px' }}
                          onClick={() => { setEditingSection(sectionName); setEditingSectionName(sectionName); }}
                          title="Rename Section"
                        >
                          <Pencil size={13} />
                        </button>
                      </h3>
                    )}

                    {/* Field count badge */}
                    <span className="df-section-count">
                      {sectionFields.length} field{sectionFields.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Right: Add Field button */}
                  <button className="df-add-field-btn" onClick={() => openAdd(sectionName)}>
                    <Plus size={14} /> Add Field
                  </button>
                </div>

                {/* ── Collapsible body ── */}
                {!isCollapsed && (
                  <div className="df-section-body">
                    <div className="df-fields-grid">
                      {sectionFields.length === 0 ? (
                        <div className="df-empty-zone">
                          Drag and drop fields here or create a new field
                        </div>
                      ) : sectionFields.map((field) => {
                        const globalIndex = localFields.findIndex(f => f.id === field.id)
                        return (
                          <div
                            key={field.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, field)}
                            onDragOver={(e) => onDragOverItem(e, globalIndex)}
                            onDragEnd={onDragEnd}
                            className={`df-field-card ${draggedItem?.id === field.id ? 'is-dragged' : ''}`}
                          >
                            <div className="df-field-header">
                              <div className="df-field-title-wrap">
                                <div className="df-drag-handle"><GripVertical size={18} /></div>
                                <div className="df-field-name">
                                  {field.name} {field.is_required && <span className="df-field-required-star">*</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn-reset" style={{ padding: '6px' }} title="Edit" onClick={() => openEdit(field)}><Pencil size={13} /></button>
                                <button className="btn-reset" style={{ padding: '6px', color: '#e74c3c' }} title="Delete" onClick={() => setConfirm(field.id)}><Trash2 size={13} /></button>
                              </div>
                            </div>
                            <div className="df-field-meta">
                              <div className="df-tags-row">
                                <span className="df-tag-type">{TYPE_LABELS[field.type] || field.type}</span>
                                {field.is_required && <span className="df-tag-required">Required</span>}
                              </div>
                              {field.options && field.options.length > 0 && (
                                <div className="df-options-text" title={field.options.join(', ')}>
                                  Options: {field.options.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* RIGHT: Preview pane */}
        <div className="df-preview-pane">
          <div className="df-preview-header">
            <h2 className="df-preview-title">
              <FileText size={18} /> Live Form Preview
            </h2>
          </div>

          <div className="df-preview-body">
            {(() => {
              const currentSectionName = allSections[safePreviewStep];
              const sectionFields = localFields.filter(f => (f.section || 'Basic Information') === currentSectionName);
              return (
                <div key={`preview-sec-${currentSectionName}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 className="df-preview-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>{currentSectionName}</h3>
                    <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 500 }}>Step {safePreviewStep + 1} of {allSections.length}</span>
                  </div>
                  <div style={{ height: 1, background: '#f0f0f0', marginBottom: 24 }}></div>

                  {sectionFields.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: '#a1a1aa', fontSize: 13, background: '#fafafa', borderRadius: 8, border: '1px dashed #e4e4e7' }}>
                      No fields added to this section yet.
                    </div>
                  ) : sectionFields.map(field => (
                    <div key={`preview-field-${field.id}`} className="df-preview-form-group">
                      <label className="df-preview-label">
                        {field.name} {field.is_required && <span className="df-field-required-star">*</span>}
                      </label>

                      {['short_text', 'email', 'number', 'date', 'time', 'file'].includes(field.type) && (
                        <input type={field.type === 'short_text' ? 'text' : field.type} className="df-preview-input" placeholder={`Enter ${field.name.toLowerCase()}...`} readOnly />
                      )}
                      {(field.type === 'long_text' || field.type === 'paragraph') && (
                        <textarea className="df-preview-input" rows={3} placeholder={`Enter ${field.name.toLowerCase()}...`} readOnly />
                      )}
                      {field.type === 'select' && (
                        <select className="df-preview-select" disabled>
                          <option>Select an option</option>
                          {field.options?.map((opt, i) => <option key={i}>{opt}</option>)}
                        </select>
                      )}
                      {field.type === 'radio' && (
                        <div className="df-preview-radio-group">
                          {field.options?.map((opt, i) => (
                            <label key={i} className="df-preview-radio-item">
                              <input type="radio" name={`preview-radio-${field.id}`} disabled /> {opt}
                            </label>
                          ))}
                        </div>
                      )}
                      {field.type === 'checkbox' && (
                        <div className="df-preview-checkbox-group">
                          {field.options?.map((opt, i) => (
                            <label key={i} className="df-preview-checkbox-item">
                              <input type="checkbox" disabled /> {opt}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {allSections.length > 1 && (
            <div className="df-preview-footer">
              <button
                className="btn-reset"
                disabled={safePreviewStep === 0}
                onClick={() => setPreviewStep(p => Math.max(0, p - 1))}
              >
                Previous
              </button>
              {safePreviewStep < allSections.length - 1 ? (
                <button className="btn-save" onClick={() => setPreviewStep(p => Math.min(allSections.length - 1, p + 1))}>
                  Next
                </button>
              ) : (
                <button className="btn-save">Submit</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Form Field' : 'Edit Field Properties'}
        size="large"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{modal === 'add' ? 'Add Field' : 'Save Changes'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="sl-section-header">Field Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
              <div className="form-group">
                <label>Field Name *</label>
                <input className="form-input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Current Skills" />
              </div>
              <div className="form-group">
                <label>Field Type</label>
                <select className="form-input" value={form.type} onChange={e => f('type', e.target.value)}>
                  <option value="short_text">Short Text</option>
                  <option value="long_text">Long Text</option>
                  <option value="paragraph">Paragraph Text</option>
                  <option value="radio">Multiple Choice (Radio)</option>
                  <option value="checkbox">Checkboxes (Multi-select)</option>
                  <option value="select">Dropdown</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="date">Date</option>
                  <option value="time">Time</option>
                  <option value="file">File Upload</option>
                  <option value="sections">Academic Sections (Auto-fill)</option>
                </select>
              </div>
              {['select', 'checkbox', 'radio'].includes(form.type) && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Options (Comma separated)</label>
                  <input className="form-input" value={form.options} onChange={e => f('options', e.target.value)} placeholder="e.g. React, Vue, Angular" />
                </div>
              )}
              <div className="form-group">
                <label>Belongs to Section</label>
                <select className="form-input" value={form.section} onChange={e => f('section', e.target.value)}>
                  {allSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10, gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="req" checked={form.is_required} onChange={e => f('is_required', e.target.checked)} />
                  <label htmlFor="req" style={{ margin: 0, fontWeight: 500 }}>Mark as Required</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="sit" checked={form.show_in_table} onChange={e => f('show_in_table', e.target.checked)} />
                  <label htmlFor="sit" style={{ margin: 0, fontWeight: 500 }}>Show as Table Column</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={newSectionModal}
        onClose={() => setNewSectionModal(false)}
        title="Add Page Section"
        size="large"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setNewSectionModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddSection}>Add Section</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="sl-section-header">Section Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Section Title</label>
                <input className="form-input" value={newSectionName} onChange={e => setNewSectionName(e.target.value)} placeholder="e.g. Emergency Contact" />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { deleteDynamicField(confirm); setConfirm(null); }}
        title="Delete Custom Field"
        message="Are you sure you want to delete this custom field? Existing student data under this field will no longer be mapped correctly."
      />
    </div>
  )
}