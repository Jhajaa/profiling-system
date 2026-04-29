import React, { useState, useEffect, useRef } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { Bell, LogOut, ChevronDown, User, Info, CheckCircle, AlertCircle, Trash2, Shield } from 'lucide-react'
import { useApp } from '../context/AppContext'
import '../../../css/header.css'

// Map paths → readable breadcrumb labels
const pathLabels = {
  '/':                            'Home',
  '/students':                    'Student Information',
  '/faculty':                     'Faculty Information',
  '/instructional/curriculum':    'Curriculum',
  '/instructional/syllabus':      'Syllabus',
  '/scheduling':                  'Scheduling',
  '/events':                      'Events Management',
  '/student/dashboard':           'Dashboard',
  '/student/profile':             'My Profile',
  '/student/violations':          'Violations',
  '/student/announcements':       'Announcements',
  '/student/events':              'Upcoming Events',
  '/faculty/profile':             'My Profile',
}

function getBreadcrumb(pathname) {
  if (pathname === '/') return { parent: 'Dashboard', current: 'Home' }
  const label = pathLabels[pathname] || 'Page'

  // Instructional sub-pages get a two-level crumb
  if (pathname.startsWith('/instructional')) {
    return { parent: 'Instructional Content', current: label }
  }
  // Use trailing slash to distinguish portal sub-paths from '/students' (admin)
  if (pathname.startsWith('/student/')) {
    return { parent: 'Student Portal', current: label }
  }
  return { parent: 'Admin Portal', current: label }
}

export default function Header({ title }) {
  const { user: currentUser, logout, students, notifications, markNotificationRead, markNotifsRead, clearNotifs } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [dropOpen, setDropOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  
  const dropRef = useRef(null)
  const notifRef = useRef(null)

  const { parent, current } = getBreadcrumb(location.pathname)

  // Link the current session to a detailed information record (Student or Faculty)
  const studentRecord = React.useMemo(() => {
    if (!currentUser) return null
    const studentNum = currentUser.userNumber || ''
    const studentName = currentUser.name || ''
    
    return (students || []).find(s => {
      const recNum = s.dynamic_data?.['Student Number'] || ''
      const recFirst = s.dynamic_data?.['First Name'] || ''
      const recLast = s.dynamic_data?.['Last Name'] || ''
      const recFull = `${recFirst} ${recLast}`.trim()
      
      return (
        (recNum && (recNum === studentNum || recNum === studentNum.replace('#', ''))) ||
        (studentName && recFull.toLowerCase() === studentName.toLowerCase())
      )
    })
  }, [students, currentUser])

  const visibleNotifications = React.useMemo(() => {
    const normalize = value => String(value || '').trim().replace('#', '').toLowerCase()
    const currentRole = currentUser?.role
    const currentStudentNumber = normalize(currentUser?.userNumber || studentRecord?.dynamic_data?.['Student Number'] || studentRecord?.studentNumber)
    const currentStudentId = normalize(studentRecord?.id)

    return (notifications || []).filter(n => {
      const audience = n.audience || n.targetRole
      if (audience && audience !== 'all' && audience !== currentRole) return false

      if (currentRole === 'student') {
        const targetStudentId = normalize(n.targetStudentId)
        const targetStudentNumber = normalize(n.targetStudentNumber)
        if (targetStudentId && targetStudentId !== currentStudentId) return false
        if (targetStudentNumber && targetStudentNumber !== currentStudentNumber) return false
      }

      return true
    })
  }, [notifications, currentUser, studentRecord])

  const unreadCount = visibleNotifications.filter(n => !n.read).length

  const resolveImageUrl = (val) => {
    if (!val) return null
    if (typeof val === 'object' && val.dataUrl) return val.dataUrl
    if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:'))) return val
    if (typeof val === 'string' && val.includes('.')) {
      return val.startsWith('/storage/') ? val : `/storage/${val}`
    }
    return null
  }

  const avatarUrl = React.useMemo(() => {
    const dynamicData = studentRecord?.dynamic_data
    if (!dynamicData) return null

    const knownKeys = ['Profile Picture', 'Photo', 'Student Photo', 'Student Picture', 'Profile Pic', 'Image', 'Avatar', 'profile_image']
    for (const key of knownKeys) {
      const url = resolveImageUrl(dynamicData[key])
      if (url) return url
    }

    const anyPhotoKey = Object.keys(dynamicData).find(key => {
      const lower = key.toLowerCase()
      return lower.includes('photo') || lower.includes('picture') || lower.includes('image') || lower.includes('avatar') || lower.includes('profile') || lower.includes('pic')
    })

    return anyPhotoKey ? resolveImageUrl(dynamicData[anyPhotoKey]) : null
  }, [studentRecord])

  const getNotificationPath = (notification) => {
    if (notification.path) return notification.path
    const text = `${notification.title || ''} ${notification.msg || ''}`.toLowerCase()
    if (text.includes('medical')) return currentUser?.role === 'student' ? '/student/medical' : '/medical-records'
    if (text.includes('announcement')) return '/student/announcements'
    if (text.includes('event')) return currentUser?.role === 'student' ? '/student/events' : '/events'
    if (text.includes('violation')) return currentUser?.role === 'student' ? '/student/violations' : '/academic/violations'
    if (text.includes('profile')) return currentUser?.role === 'student' ? '/student/profile' : '/students'
    return currentUser?.role === 'student' ? '/student/dashboard' : '/dashboard'
  }

  const handleNotificationPress = (notification) => {
    markNotificationRead?.(notification.id)
    setNotifOpen(false)
    const targetPath = getNotificationPath(notification)
    if (targetPath && targetPath !== location.pathname) navigate(targetPath)
  }

  // Derive initials and display name dynamically
  const initials = React.useMemo(() => {
    if (!currentUser) return 'AU'
    
    if (studentRecord) {
      const f = studentRecord.dynamic_data?.['First Name'] || ''
      const l = studentRecord.dynamic_data?.['Last Name'] || ''
      return `${f[0] || ''}${l[0] || ''}`.toUpperCase()
    }
    
    // Fallback for Admin/Faculty or records not found
    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase()
    }
    const parts = currentUser.name?.split(' ') || ['Admin', 'User']
    return `${parts[0][0]}${(parts[1]?.[0] || parts[0][1] || '')}`.toUpperCase()
  }, [currentUser, studentRecord])

  const displayName = React.useMemo(() => {
    if (!currentUser) return 'Admin User'
    
    if (studentRecord) {
      const f = studentRecord.dynamic_data?.['First Name'] || ''
      const l = studentRecord.dynamic_data?.['Last Name'] || ''
      return `${f} ${l}`.trim() || currentUser.name
    }
    
    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`
    }
    return currentUser.name || 'Admin User'
  }, [currentUser, studentRecord])

  const roleName =
    currentUser?.role === 'admin'   ? 'System Administrator' :
    currentUser?.role === 'faculty' ? 'Faculty Member'        :
    currentUser?.role === 'student' ? 'Student'               :
    'System Administrator'
  const roleLabel =
    currentUser?.role === 'admin'   ? 'ADMIN'   :
    currentUser?.role === 'faculty' ? 'FACULTY' :
    currentUser?.role === 'student' ? 'STUDENT' :
    'ADMIN'

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    if (dropOpen || notifOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropOpen, notifOpen])

  return (
    <header className="header">

      {/* Left — breadcrumb + page title */}
      <div className="header-left">
        <div className="header-breadcrumb">
          {parent}
          <span className="sep">/</span>
          <span className="current">{current}</span>
        </div>
        <h1 className="header-title">{title || current}</h1>
      </div>

      {/* Right — notification + user chip */}
      <div className="header-right">

        {/* Notification bell */}
        <div className="header-notif-wrap" ref={notifRef}>
          <button 
            className={`header-notif-btn${notifOpen ? ' active' : ''}`} 
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Notifications"
          >
            <Bell size={15} />
            {unreadCount > 0 && <span className="header-notif-dot">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="header-notif-dropdown">
              <div className="header-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="header-dropdown-role">Notifications</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="notif-action-btn" title="Mark all as read" onClick={() => markNotifsRead(visibleNotifications.map(n => n.id))}>
                    <CheckCircle size={14} />
                  </button>
                  <button className="notif-action-btn" title="Clear all" onClick={() => clearNotifs(visibleNotifications.map(n => n.id))}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <div className="header-notif-list">
                {visibleNotifications.length === 0 ? (
                  <div className="notif-empty">No new notifications</div>
                ) : (
                  visibleNotifications.map(n => (
                    <button
                      key={n.id}
                      type="button"
                      className={`notif-item${n.read ? ' read' : ''}`}
                      onClick={() => handleNotificationPress(n)}
                    >
                      <div className={`notif-icon-wrap ${n.type}`}>
                        {n.type === 'success' && <CheckCircle size={14} />}
                        {n.type === 'warning' && <AlertCircle size={14} />}
                        {n.type === 'info' && <Info size={14} />}
                      </div>
                      <div className="notif-content">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-msg">{n.msg}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>



        {/* User chip + dropdown */}
        <div
          ref={dropRef}
          className={`header-user-chip${dropOpen ? ' open' : ''}`}
          onClick={() => setDropOpen(!dropOpen)}
        >
          <div className="header-user-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initials}
          </div>
          <div className="header-user-info">
            <span className="header-user-name">{displayName}</span>
            <span className="header-user-role">{roleName}</span>
          </div>
          <ChevronDown size={13} className="header-chevron" />

          {/* User Dropdown */}
          {dropOpen && (
            <div className="header-dropdown" onClick={e => e.stopPropagation()}>
              <div className="header-dropdown-header">
                <div className="header-dropdown-tag">Logged in as</div>
                <div className="header-dropdown-role">{roleLabel}</div>
              </div>
              {(currentUser?.role === 'student' || currentUser?.role === 'faculty') && (
                <Link
                  to={currentUser.role === 'student' ? "/student/profile" : "/faculty/profile"}
                  className="header-dropdown-item"
                  onClick={() => setDropOpen(false)}
                >
                  <User size={13} />
                  View Profile
                </Link>
              )}
              <Link
                to="/change-password"
                className="header-dropdown-item"
                onClick={() => setDropOpen(false)}
              >
                <Shield size={13} />
                Change Password
              </Link>
              <button
                className="header-dropdown-item"
                onClick={() => { setDropOpen(false); logout && logout() }}
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
