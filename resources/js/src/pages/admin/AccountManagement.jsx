import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Edit2, Trash2, Archive, RotateCcw, Shield, Key, Eye } from 'lucide-react'
import { useApp, ROLES, ROLE_LABELS } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import '../../../../css/StudentList.css'
import '../../../../css/account-management.css'

export const PERMISSION_MODULES = [
  {
    id: 'home',
    label: 'Home Dashboard',
    info: 'Analytics, activity streams, and announcement oversight.',
    actions: { c: 'Post Announcement', d: 'Remove Posts' }
  },
  {
    id: 'sections',
    label: 'Sections & Levels',
    info: 'Departmental organization and year level management.',
    actions: { c: 'Add Section', u: 'Edit Details', d: 'Remove Section' }
  },
  {
    id: 'students',
    label: 'Student Information',
    info: 'Personal, academic, and enrollment data management.',
    actions: { c: 'Register Student', u: 'Update Profile', d: 'Delete Account' }
  },
  {
    id: 'medical_records',
    label: 'Medical Records',
    info: 'Health logs, allergies, and clinical requests.',
    actions: { c: 'Log Consultation', u: 'Update Health' }
  },
  {
    id: 'faculty',
    label: 'Faculty Information',
    info: 'Faculty profiles, contact info, and schedules.',
    actions: { c: 'Add Faculty', u: 'Edit Info', d: 'Remove Staff' }
  },
  {
    id: 'instructional',
    label: 'Instructional Content',
    info: 'Curricula, syllabi, and objective settings.',
    actions: { c: 'Add Curriculum', u: 'Revise Syllabus' }
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    info: 'Timetables, rooms, and instructor loads.',
    actions: { c: 'Set Schedule', u: 'Change Room' }
  },
  {
    id: 'events',
    label: 'Events Management',
    info: 'Campus calendar, venues, and detail management.',
    actions: { c: 'Create Event', u: 'Edit Details', d: 'Cancel Event' }
  },
  {
    id: 'academic_search',
    label: 'Student Search',
    info: 'Professional filtering and profile lookup queries.',
    actions: { x: 'Export Excel' }
  },
  {
    id: 'violations',
    label: 'Student Violations',
    info: 'Disciplinary history and violation logging.',
    actions: { c: 'Log Violation', d: 'Void Record' }
  },
  {
    id: 'theme_settings',
    label: 'Theme Settings',
    info: 'Branding options and UI visual customization.',
    actions: { u: 'Apply Styling' }
  },
  {
    id: 'dynamic_fields',
    label: 'Form Builder',
    info: 'Form configurations and dynamic profile fields.',
    actions: { c: 'Add Field', u: 'Edit Configuration', d: 'Remove Field' }
  },
  {
    id: 'accounts',
    label: 'Account Management',
    info: 'Account oversight, roles, and access controls.',
    actions: { c: 'Create Account', u: 'Update Access', d: 'Delete User', p: 'Reset Password' }
  }
]

const emptyUserForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'faculty',
  userNumber: '',
  group_id: ''
}

const emptyGroupForm = {
  name: '',
  permissions: {}
}

const emptyCustomPermForm = {
  group_id: '',
  custom_permissions: {}
}

const normalizeId = (value) => String(value ?? '').trim()
const normalizeNumber = (value) => String(value ?? '').trim().replace('#', '').toLowerCase()

const countPermissionModules = (permissions) => {
  if (!permissions) return 0
  if (Array.isArray(permissions)) return permissions.length
  return Object.keys(permissions).length
}

export default function AccountManagement() {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    archiveUser,
    restoreUser,
    resetUserPassword,
    isAdmin,
    userGroups,
    addUserGroup,
    updateUserGroup,
    deleteUserGroup,
    students,
    faculty,
    showToast
  } = useApp()

  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)

  const [editingUser, setEditingUser] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)

  const [userFormData, setUserFormData] = useState(emptyUserForm)
  const [userFormErrors, setUserFormErrors] = useState({})

  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)

  const [groupFormData, setGroupFormData] = useState(emptyGroupForm)
  const [customPermFormData, setCustomPermFormData] = useState(emptyCustomPermForm)

  const [resetPasswordData, setResetPasswordData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [resetPasswordErrors, setResetPasswordErrors] = useState({})

  if (!isAdmin) {
    return (
      <div className="sl-root">
        <Header title="System Settings" />
        <div className="sl-body">
          <div className="access-denied" style={{ textAlign: 'center', padding: '100px 0' }}>
            <Shield size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
            <h2>Access Denied</h2>
            <p>You must be an administrator to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return users.filter((u) => {
      const matchesSearch =
        !q ||
        String(u.name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.userNumber || '').toLowerCase().includes(q)

      const matchesRole = roleFilter === 'all' ? u.role !== 'student' : u.role === roleFilter
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus && u.role !== 'student'
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const validateUserForm = () => {
    const errors = {}
    const trimmedName = userFormData.name.trim()
    const trimmedEmail = userFormData.email.trim().toLowerCase()
    const trimmedUserNumber = (userFormData.userNumber || '').trim()

    if (!trimmedName) errors.name = 'Full Name is required'

    if (!trimmedEmail) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Invalid email format'
    }

    if (!trimmedUserNumber) {
      errors.userNumber = 'User number is required'
    } else {
      const duplicateUserNumber = users.some(
        (u) =>
          String(u.userNumber || '').trim().toLowerCase() === trimmedUserNumber.toLowerCase() &&
          u.id !== editingUser?.id
      )
      if (duplicateUserNumber) errors.userNumber = 'User number already exists'
    }

    const duplicateEmail = users.some(
      (u) =>
        String(u.email || '').trim().toLowerCase() === trimmedEmail &&
        u.id !== editingUser?.id
    )
    if (duplicateEmail) errors.email = 'Email already exists'

    if (!editingUser) {
      if (!userFormData.password) {
        errors.password = 'Password is required'
      } else if (userFormData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters'
      }

      if (!userFormData.confirmPassword) {
        errors.confirmPassword = 'Please confirm password'
      } else if (userFormData.password !== userFormData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
      }
    } else if (userFormData.password) {
      if (userFormData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters'
      }
      if (userFormData.password !== userFormData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
      }
    }

    setUserFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateResetPassword = () => {
    const errors = {}

    if (!resetPasswordData.password) {
      errors.password = 'Password is required'
    } else if (resetPasswordData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    if (!resetPasswordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm password'
    } else if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setResetPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleOpenUserModal = (user = null) => {
    setEditingUser(user)
    setUserFormData({
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      confirmPassword: '',
      role: user?.role || 'faculty',
      userNumber: user?.userNumber || '',
      group_id: user?.group_id || ''
    })
    setUserFormErrors({})
    setShowModal(true)
  }

  const handleUserSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault()
    if (!validateUserForm()) return

    const payload = {
      name: userFormData.name.trim(),
      email: userFormData.email.trim().toLowerCase(),
      role: userFormData.role,
      userNumber: userFormData.userNumber.trim(),
      group_id: userFormData.group_id || null
    }

    if (userFormData.password) {
      payload.password = userFormData.password
    }

    if (editingUser) {
      updateUser(editingUser.id, payload)
    } else {
      addUser(payload)
    }

    setShowModal(false)
    setEditingUser(null)
    setUserFormData(emptyUserForm)
    setUserFormErrors({})
  }

  const handleOpenGroupModal = (group = null) => {
    setEditingGroup(group)
    setGroupFormData({
      name: group?.name || '',
      permissions: Array.isArray(group?.permissions)
        ? group.permissions.reduce((acc, modId) => {
            acc[modId] = { r: true, c: true, u: true, d: true }
            return acc
          }, {})
        : group?.permissions || {}
    })
    setShowGroupModal(true)
  }

  const handleGroupSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault()
    if (!groupFormData.name.trim()) return

    const payload = {
      name: groupFormData.name.trim(),
      permissions: groupFormData.permissions || {}
    }

    if (editingGroup) {
      updateUserGroup(editingGroup.id, payload)
    } else {
      addUserGroup(payload)
    }

    setShowGroupModal(false)
    setEditingGroup(null)
    setGroupFormData(emptyGroupForm)
  }

  const toggleGroupPermission = (moduleId, action = 'r') => {
    setGroupFormData((prev) => {
      const perms = { ...(prev.permissions || {}) }
      const modPerms = { ...(perms[moduleId] || {}) }

      if (action === 'r') {
        if (modPerms.r) {
          delete perms[moduleId]
        } else {
          perms[moduleId] = { ...modPerms, r: true }
        }
        return { ...prev, permissions: perms }
      }

      if (!modPerms.r) {
        modPerms.r = true
      }

      modPerms[action] = !modPerms[action]

      if (!modPerms[action]) {
        delete modPerms[action]
      }

      if (Object.keys(modPerms).length === 0 || !modPerms.r) {
        delete perms[moduleId]
      } else {
        perms[moduleId] = modPerms
      }

      return { ...prev, permissions: perms }
    })
  }

  const handleOpenPermissionsModal = (user) => {
    setSelectedUser(user)
    setCustomPermFormData({
      group_id: user?.group_id || '',
      custom_permissions: user?.custom_permissions || {}
    })
    setShowPermissionsModal(true)
  }

  const toggleCustomPermission = (moduleId, action = 'r') => {
    setCustomPermFormData((prev) => {
      const perms = { ...(prev.custom_permissions || {}) }
      const modPerms = { ...(perms[moduleId] || {}) }

      if (action === 'r') {
        if (modPerms.r) {
          delete perms[moduleId]
        } else {
          perms[moduleId] = { ...modPerms, r: true }
        }
        return { ...prev, custom_permissions: perms }
      }

      if (!modPerms.r) {
        modPerms.r = true
      }

      modPerms[action] = !modPerms[action]

      if (!modPerms[action]) {
        delete modPerms[action]
      }

      if (Object.keys(modPerms).length === 0 || !modPerms.r) {
        delete perms[moduleId]
      } else {
        perms[moduleId] = modPerms
      }

      return { ...prev, custom_permissions: perms }
    })
  }

  const submitCustomPermissions = (e) => {
    if (e?.preventDefault) e.preventDefault()
    if (!selectedUser) return

    updateUser(selectedUser.id, {
      group_id: customPermFormData.group_id || null,
      custom_permissions: customPermFormData.custom_permissions || {}
    })

    setShowPermissionsModal(false)
    setSelectedUser(null)
    setCustomPermFormData(emptyCustomPermForm)
  }

  const handleOpenResetPasswordModal = (user) => {
    setSelectedUser(user)
    setResetPasswordData({ password: '', confirmPassword: '' })
    setResetPasswordErrors({})
    setShowResetPasswordModal(true)
  }

  const handleResetPassword = () => {
    if (!selectedUser) return
    if (!validateResetPassword()) return

    resetUserPassword(selectedUser.id, resetPasswordData.password)
    setShowResetPasswordModal(false)
    setSelectedUser(null)
    setResetPasswordData({ password: '', confirmPassword: '' })
    setResetPasswordErrors({})
  }

  const handleViewProfile = (u) => {
    const norm = normalizeNumber(u.userNumber)
    if (!norm) {
      showToast('User number is missing.', 'error')
      return
    }

    if (u.role === 'student') {
      const student = (students || []).find((s) => {
        const sNum = normalizeNumber(s.dynamic_data?.['Student Number'] || s.studentNumber)
        return sNum === norm
      })

      if (student) navigate(`/students/${student.id}`)
      else showToast('Corresponding student record not found.', 'error')
      return
    }

    if (u.role === 'faculty') {
      const staff = (faculty || []).find((f) => {
        const fNum = normalizeNumber(f.facultyNumber || f.dynamic_data?.['Faculty Number'])
        return fNum === norm
      })

      if (staff) navigate(`/faculty/${staff.id}`)
      else showToast('Corresponding faculty record not found.', 'error')
      return
    }

    showToast('Profile view not available for this role.', 'default')
  }

  const getStatusBadge = (status) =>
    status === 'active' ? (
      <span className="am-badge am-badge-active">Active</span>
    ) : (
      <span className="am-badge am-badge-archived">Archived</span>
    )

  const getRoleBadge = (role) => (
    <span className={`am-badge am-badge-${role}`}>{ROLE_LABELS[role] || role}</span>
  )

  return (
    <div className="sl-root">
      <Header title="Account Management" />

      <div className="sl-body">
        <div className="sl-card">
          <div className="sl-card-head" style={{ paddingBottom: 6 }}>
            <div className="sl-head-top">
              <div>
                <h2 className="sl-title">Account & Access Management</h2>
                <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
                  Manage user accounts and role-based access permissions
                </p>
              </div>

              <div className="sl-head-actions">
                {activeTab === 'users' ? (
                  <button className="sl-btn-primary" onClick={() => handleOpenUserModal()}>
                    <Plus size={13} /> Create Account
                  </button>
                ) : (
                  <button className="sl-btn-primary" onClick={() => handleOpenGroupModal()}>
                    <Plus size={13} /> Create Permission Group
                  </button>
                )}
              </div>
            </div>

            <div className="sl-filter-row" style={{ marginTop: 16 }}>
              <div className="sl-filter-tabs">
                <button
                  className={`sl-ftab ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveTab('users')}
                >
                  <Shield size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                  User Accounts
                </button>

                <button
                  className={`sl-ftab ${activeTab === 'groups' ? 'active' : ''}`}
                  onClick={() => setActiveTab('groups')}
                >
                  <Key size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }} />
                  Permission Groups
                </button>
              </div>

              {activeTab === 'users' && (
                <div className="sl-filter-right" style={{ flexWrap: 'wrap', marginLeft: 'auto' }}>
                  <div className="sl-search-wrap" style={{ maxWidth: 300, minWidth: 250 }}>
                    <Search size={13} className="sl-search-icon" />
                    <input
                      className="sl-search-input"
                      placeholder="Search by name, email, or user #..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <select
                    className="sl-filter-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    {ROLES.filter((r) => r !== 'student').map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>

                  <select
                    className="sl-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'users' && (
            <>
              <div style={{ overflowX: 'auto', padding: 0 }}>
                <table className="sl-table">
                  <thead>
                    <tr>
                      <th>User #</th>
                      <th>Full Name</th>
                      <th>Email Address</th>
                      <th>Role</th>
                      <th>Group</th>
                      <th>Status</th>
                      <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7">
                          <div className="sl-empty">No users found</div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const group = userGroups.find((g) => normalizeId(g.id) === normalizeId(u.group_id))

                        return (
                          <tr key={u.id} style={{ opacity: u.status === 'archived' ? 0.6 : 1 }}>
                            <td className="sl-stud-num">{u.userNumber}</td>
                            <td className="sl-stud-name">{u.name}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                            <td>{getRoleBadge(u.role)}</td>
                            <td>
                              {group ? (
                                <span className="am-badge" style={{ background: '#e0e0e0', color: '#333' }}>
                                  {group.name}
                                </span>
                              ) : (
                                <em style={{ color: '#999' }}>None</em>
                              )}
                            </td>
                            <td>{getStatusBadge(u.status)}</td>
                            <td>
                              <div className="sl-row-actions">
                                <button
                                  className="sl-action-btn"
                                  title="View Profile"
                                  onClick={() => handleViewProfile(u)}
                                  style={{ color: 'var(--orange)' }}
                                >
                                  <Eye size={13} />
                                </button>

                                <button
                                  className="sl-action-btn"
                                  title="Permissions..."
                                  onClick={() => handleOpenPermissionsModal(u)}
                                  style={{ color: 'var(--orange)' }}
                                >
                                  <Shield size={13} />
                                </button>

                                <button
                                  className="sl-action-btn"
                                  title="Edit"
                                  onClick={() => handleOpenUserModal(u)}
                                >
                                  <Edit2 size={13} />
                                </button>

                                <button
                                  className="sl-action-btn"
                                  title="Reset Password"
                                  onClick={() => handleOpenResetPasswordModal(u)}
                                >
                                  <RotateCcw size={13} />
                                </button>

                                <button
                                  className="sl-action-btn danger"
                                  title={u.status === 'archived' ? 'Restore' : 'Archive'}
                                  onClick={() => {
                                    setSelectedUser(u)
                                    setShowArchiveModal(true)
                                  }}
                                >
                                  {u.status === 'archived' ? <RotateCcw size={13} /> : <Archive size={13} />}
                                </button>

                                <button
                                  className="sl-action-btn danger"
                                  title="Delete"
                                  onClick={() => {
                                    setSelectedUser(u)
                                    setShowDeleteModal(true)
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="sl-table-footer">
                <span className="sl-count">
                  Showing <strong>{filteredUsers.length}</strong> user{filteredUsers.length !== 1 ? 's' : ''}
                </span>
              </div>
            </>
          )}

          {activeTab === 'groups' && (
            <div style={{ overflowX: 'auto', padding: 0 }}>
              <table className="sl-table">
                <thead>
                  <tr>
                    <th>Group Name</th>
                    <th>Permitted Modules Count</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userGroups.length === 0 ? (
                    <tr>
                      <td colSpan="3">
                        <div className="sl-empty">No groups created yet.</div>
                      </td>
                    </tr>
                  ) : (
                    userGroups.map((g) => (
                      <tr key={g.id}>
                        <td className="sl-stud-name">{g.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {countPermissionModules(g.permissions)} modules assigned
                        </td>
                        <td style={{ position: 'sticky', right: 0, background: '#fff' }}>
                          <div className="sl-row-actions">
                            <button
                              className="sl-action-btn"
                              title="Edit Group"
                              onClick={() => handleOpenGroupModal(g)}
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              className="sl-action-btn danger"
                              title="Delete Group"
                              onClick={() => {
                                setSelectedGroup(g)
                                setShowDeleteGroupModal(true)
                              }}
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
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit Account' : 'Create New Account'}
        size="large"
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" onClick={handleUserSubmit}>
              {editingUser ? 'Update Account' : 'Create Account'}
            </button>
          </>
        }
      >
        <form onSubmit={handleUserSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div className="sl-section-header">Account Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className={`form-input ${userFormErrors.name ? 'input-error' : ''}`}
                    value={userFormData.name}
                    onChange={(e) => setUserFormData((f) => ({ ...f, name: e.target.value }))}
                  />
                  {userFormErrors.name && <small className="error-text">{userFormErrors.name}</small>}
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    className={`form-input ${userFormErrors.email ? 'input-error' : ''}`}
                    value={userFormData.email}
                    onChange={(e) => setUserFormData((f) => ({ ...f, email: e.target.value }))}
                  />
                  {userFormErrors.email && <small className="error-text">{userFormErrors.email}</small>}
                </div>

                <div className="form-group">
                  <label>Role *</label>
                  <select
                    className="form-input"
                    value={userFormData.role}
                    onChange={(e) => setUserFormData((f) => ({ ...f, role: e.target.value }))}
                  >
                    {ROLES.filter((r) => r !== 'student').map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Auto-Assign Group (Optional)</label>
                  <select
                    className="form-input"
                    value={userFormData.group_id}
                    onChange={(e) => setUserFormData((f) => ({ ...f, group_id: e.target.value }))}
                  >
                    <option value="">-- No Group assigned --</option>
                    {userGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {(userFormData.role === 'faculty' || userFormData.role === 'admin') && (
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label>
                      {userFormData.role === 'faculty'
                        ? 'Faculty Number / Username *'
                        : 'Admin Username *'}
                    </label>
                    <input
                      type="text"
                      className={`form-input ${userFormErrors.userNumber ? 'input-error' : ''}`}
                      placeholder={userFormData.role === 'faculty' ? 'e.g. FAC-001' : 'e.g. ADMIN-001'}
                      value={userFormData.userNumber}
                      onChange={(e) => setUserFormData((f) => ({ ...f, userNumber: e.target.value }))}
                    />
                    {userFormErrors.userNumber && (
                      <small className="error-text">{userFormErrors.userNumber}</small>
                    )}
                    <small
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: 11,
                        marginTop: 4,
                        display: 'block'
                      }}
                    >
                      This will be used as the <strong>primary login credential</strong> for system access.
                    </small>
                  </div>
                )}

                <div className="form-group">
                  <label>{editingUser ? 'New Password' : 'Password *'}</label>
                  <input
                    type="password"
                    className={`form-input ${userFormErrors.password ? 'input-error' : ''}`}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                  />
                  {userFormErrors.password && <small className="error-text">{userFormErrors.password}</small>}
                </div>

                <div className="form-group">
                  <label>{editingUser ? 'Confirm New Password' : 'Confirm Password *'}</label>
                  <input
                    type="password"
                    className={`form-input ${userFormErrors.confirmPassword ? 'input-error' : ''}`}
                    value={userFormData.confirmPassword}
                    onChange={(e) => setUserFormData((f) => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                  {userFormErrors.confirmPassword && (
                    <small className="error-text">{userFormErrors.confirmPassword}</small>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title={editingGroup ? 'Edit Group' : 'Create Group'}
        size="large"
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowGroupModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" onClick={handleGroupSubmit}>
              Save Group
            </button>
          </>
        }
      >
        <form onSubmit={handleGroupSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div className="sl-section-header">Group Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Group Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData((f) => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. Encoders, Viewers"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="sl-section-header" style={{ marginTop: 0 }}>
                Allowed Modules
              </div>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 4, marginBottom: '10px' }}>
                Select which modules members of this group can access in the sidebar.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  maxHeight: '500px',
                  overflowY: 'auto',
                  padding: '4px'
                }}
              >
                {PERMISSION_MODULES.map((mod) => {
                  const modPerms = groupFormData.permissions?.[mod.id] || {}
                  const isModuleOn = !!modPerms.r

                  return (
                    <div key={mod.id} className="am-module-item">
                      <div className="am-module-head" style={{ marginBottom: isModuleOn ? 10 : 0 }}>
                        <div>
                          <span className="am-module-label">{mod.label}</span>
                          <div className="am-module-info" style={{ marginTop: 2 }}>
                            {mod.info}
                          </div>
                        </div>
                        <label className="am-switch">
                          <input
                            type="checkbox"
                            checked={isModuleOn}
                            onChange={() => toggleGroupPermission(mod.id, 'r')}
                          />
                          <span className="am-slider"></span>
                        </label>
                      </div>

                      {isModuleOn && mod.actions && (
                        <div
                          className="am-crud-grid"
                          style={{
                            gridTemplateColumns:
                              Object.keys(mod.actions).length > 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'
                          }}
                        >
                          {Object.entries(mod.actions).map(([act, label]) => (
                            <div key={act} className="am-crud-item">
                              <span className="am-crud-label">{label}</span>
                              <label className="am-switch">
                                <input
                                  type="checkbox"
                                  checked={!!modPerms[act]}
                                  onChange={() => toggleGroupPermission(mod.id, act)}
                                />
                                <span className="am-slider"></span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        title={`Permissions: ${selectedUser?.name || ''}`}
        size="large"
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setShowPermissionsModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" onClick={submitCustomPermissions}>
              Save Access
            </button>
          </>
        }
      >
        <form onSubmit={submitCustomPermissions}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div className="sl-section-header">Custom Access Configuration</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Assigned Permission Group</label>
                  <select
                    className="form-input"
                    value={customPermFormData.group_id}
                    onChange={(e) => setCustomPermFormData((f) => ({ ...f, group_id: e.target.value }))}
                  >
                    <option value="">-- No Group assigned --</option>
                    {userGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <div className="sl-section-header" style={{ marginTop: 0 }}>
                Custom Module Overrides
              </div>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 4, marginBottom: '10px' }}>
                Tick modules below to grant this user explicit access, overriding their group restrictions.
              </p>

              {selectedUser?.role === 'admin' ? (
                <div className="am-admin-override">
                  <div className="am-admin-override-icon">
                    <Shield size={20} />
                  </div>
                  <div className="am-admin-override-text">
                    <h4>Administrative Override</h4>
                    <p>
                      Administrators have full system access by default. Manual permission configuration is not
                      required.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    maxHeight: '500px',
                    overflowY: 'auto',
                    padding: '4px'
                  }}
                >
                  {PERMISSION_MODULES.map((mod) => {
                    const assignedGroup = userGroups.find(
                      (g) => normalizeId(g.id) === normalizeId(customPermFormData.group_id)
                    )

                    const groupPermsRaw = assignedGroup?.permissions || {}
                    let groupModPerms = {}

                    if (Array.isArray(groupPermsRaw)) {
                      if (groupPermsRaw.includes(mod.id)) {
                        groupModPerms = { r: true, c: true, u: true, d: true, p: true, x: true }
                      }
                    } else {
                      groupModPerms = groupPermsRaw[mod.id] || {}
                    }

                    const customModPerms = customPermFormData.custom_permissions?.[mod.id] || {}

                    const getAct = (act) => !!(groupModPerms[act] || customModPerms[act])
                    const isInherited = (act) => !!groupModPerms[act]
                    const isModuleActive = getAct('r')

                    return (
                      <div key={mod.id} className="am-module-item" style={{ opacity: isModuleActive ? 1 : 0.8 }}>
                        <div className="am-module-head" style={{ marginBottom: isModuleActive ? 10 : 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="am-module-label">{mod.label}</span>
                              {isInherited('r') && (
                                <span
                                  style={{
                                    fontSize: '7px',
                                    background: '#e0e0e0',
                                    color: '#666',
                                    padding: '1px 4px',
                                    borderRadius: '4px',
                                    fontWeight: 900
                                  }}
                                >
                                  GROUP
                                </span>
                              )}
                            </div>
                            <div className="am-module-info" style={{ marginTop: 2 }}>
                              {mod.info}
                            </div>
                          </div>

                          <label className="am-switch" style={{ cursor: isInherited('r') ? 'not-allowed' : 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isModuleActive}
                              onChange={() => {
                                if (!isInherited('r')) toggleCustomPermission(mod.id, 'r')
                              }}
                              disabled={isInherited('r')}
                            />
                            <span className="am-slider"></span>
                          </label>
                        </div>

                        {isModuleActive && mod.actions && (
                          <div
                            className="am-crud-grid"
                            style={{
                              gridTemplateColumns:
                                Object.keys(mod.actions).length > 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'
                            }}
                          >
                            {Object.entries(mod.actions).map(([act, label]) => {
                              const inherited = isInherited(act)

                              return (
                                <div key={act} className="am-crud-item" style={{ opacity: inherited ? 0.6 : 1 }}>
                                  <span className="am-crud-label" style={{ fontSize: '8px' }}>
                                    {label}
                                    {inherited && <span style={{ marginLeft: 3 }}>*</span>}
                                  </span>
                                  <label
                                    className="am-switch"
                                    style={{ cursor: inherited ? 'not-allowed' : 'pointer' }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={getAct(act)}
                                      onChange={() => {
                                        if (!inherited) toggleCustomPermission(mod.id, act)
                                      }}
                                      disabled={inherited}
                                    />
                                    <span className="am-slider"></span>
                                  </label>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (!selectedUser) return
                deleteUser(selectedUser.id)
                setShowDeleteModal(false)
                setSelectedUser(null)
              }}
            >
              Delete Account
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            Are you sure you want to delete {selectedUser?.name}? This will move the account to the Recycle Bin.
          </p>
        </div>
      </Modal>

      <Modal
        open={showDeleteGroupModal}
        onClose={() => setShowDeleteGroupModal(false)}
        title="Delete Group"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowDeleteGroupModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (!selectedGroup) return
                deleteUserGroup(selectedGroup.id)
                setShowDeleteGroupModal(false)
                setSelectedGroup(null)
              }}
            >
              Delete Group
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            Are you sure you want to delete group: {selectedGroup?.name}?
          </p>
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            Users assigned to this group will lose access to its mapped modules.
          </p>
        </div>
      </Modal>

      <Modal
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archive Account"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowArchiveModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!selectedUser) return
                if (selectedUser.status === 'archived') restoreUser(selectedUser.id)
                else archiveUser(selectedUser.id)
                setShowArchiveModal(false)
                setSelectedUser(null)
              }}
            >
              {selectedUser?.status === 'archived' ? 'Restore' : 'Archive'}
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            Are you sure you want to {selectedUser?.status === 'archived' ? 'restore' : 'archive'}{' '}
            {selectedUser?.name}?
          </p>
        </div>
      </Modal>

      <Modal
        open={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        title="Reset Password"
        size="large"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowResetPasswordModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleResetPassword}>
              Reset
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="sl-section-header">Password Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  className={`form-input ${resetPasswordErrors.password ? 'input-error' : ''}`}
                  value={resetPasswordData.password}
                  onChange={(e) => setResetPasswordData((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Enter new password"
                />
                {resetPasswordErrors.password && (
                  <small className="error-text">{resetPasswordErrors.password}</small>
                )}
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  className={`form-input ${resetPasswordErrors.confirmPassword ? 'input-error' : ''}`}
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                />
                {resetPasswordErrors.confirmPassword && (
                  <small className="error-text">{resetPasswordErrors.confirmPassword}</small>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
