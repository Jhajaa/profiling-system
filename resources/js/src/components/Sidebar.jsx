import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Users, UserCheck, BookOpen, Calendar, Star, ChevronDown, Palette, Shield, Activity, Archive, Search, AlertTriangle, Layers, Bell, Trash2, BarChart3, ClipboardCheck, GraduationCap, MessageSquare } from 'lucide-react'
import { useApp } from '../context/AppContext'
import '../../../css/sidebar.css'

const logoImage = '/build/img/viber_image_2026-03-20_09-10-24-069.jpg'

const navItems = [
  {
    section: 'Main',
    items: [
      { label: 'Home', path: '/dashboard', icon: Home, moduleId: 'home' },
      { label: 'Programs', path: '/programs', icon: Layers, moduleId: 'sections' },
    ]
  },
  {
    section: 'People',
    items: [
      { label: 'Student Information', path: '/students', icon: Users, pill: true, moduleId: 'students' },
      { label: 'Archived Students', path: '/students/archived', icon: Archive, pill: true, moduleId: 'students' },
      { label: 'Medical Records', path: '/medical-records', icon: Activity, pill: true, moduleId: 'medical_records' },
      { label: 'Faculty Information', path: '/faculty', icon: UserCheck, pill: true, moduleId: 'faculty' },
      { label: 'Comprehensive Reports', path: '/reports', icon: BarChart3, pill: true, adminOnly: true, moduleId: 'reports' },
      { label: 'New Students', path: '/settings/new-enrollment', icon: UserCheck, pill: true, adminOnly: true, moduleId: 'accounts' },
    ]
  },
  {
    section: 'Academic',
    items: [
      {
        label: 'Instructional Content', icon: BookOpen,
        children: [
          { label: 'Curriculum', path: '/instructional/curriculum' },
          { label: 'Syllabus',   path: '/instructional/syllabus' },
        ],
        moduleId: 'instructional'
      },
      { label: 'Scheduling',        path: '/scheduling', icon: Calendar, moduleId: 'scheduling' },
      { label: 'Events Management', path: '/events',     icon: Star, moduleId: 'events' },
      { label: 'Student Search',    path: '/academic/search', icon: Search, moduleId: 'academic_search' },
      { label: 'Violations',        path: '/academic/violations', icon: AlertTriangle, moduleId: 'violations' },
    ]
  },
  {
    section: 'Settings',
    items: [
      { label: 'Theme Settings', path: '/theme-settings', icon: Palette, moduleId: 'theme_settings' },
      { label: 'Dynamic Form Builder', path: '/settings/dynamic-fields', icon: Palette, adminOnly: true, moduleId: 'dynamic_fields' },
      { label: 'Account Management', path: '/settings/account-management', icon: Shield, adminOnly: true, moduleId: 'accounts' },
      { label: 'Recycle Bin', path: '/settings/recycle-bin', icon: Trash2, adminOnly: true, moduleId: 'accounts' },
    ]
  }
]

const studentNavItems = [
  {
    section: 'Portal',
    items: [
      { label: 'Dashboard', path: '/student/dashboard', icon: Home, studentOnly: true, moduleId: 'student_portal' },
      { label: 'Violations', path: '/student/violations', icon: AlertTriangle, studentOnly: true, moduleId: 'student_portal' },
      { label: 'Medical Documents', path: '/student/medical', icon: Activity, studentOnly: true, moduleId: 'student_portal' },
      { label: 'My Schedule', path: '/student/schedule', icon: Calendar, forceShow: true, studentOnly: true, moduleId: 'student_portal' },
      { label: 'Announcements', path: '/student/announcements', icon: Bell, studentOnly: true, moduleId: 'student_portal' },
      { label: 'Upcoming Events', path: '/student/events', icon: Calendar, studentOnly: true, moduleId: 'student_portal' },
    ]
  }
]

const facultyNavItems = [
  {
    section: 'Class Management',
    items: [
      { label: 'My Schedule & Classes', path: '/faculty/schedule', icon: Calendar, facultyOnly: true, forceShow: true, moduleId: 'faculty_portal' },
      { label: 'Class Announcements', path: '/faculty/announcements', icon: MessageSquare, facultyOnly: true, forceShow: true, moduleId: 'faculty_portal' },
      { label: 'Attendance Tracking', path: '/faculty/attendance', icon: ClipboardCheck, facultyOnly: true, forceShow: true, moduleId: 'faculty_portal' },
      { label: 'Grades Encoding', path: '/faculty/grades', icon: GraduationCap, facultyOnly: true, forceShow: true, moduleId: 'faculty_portal' },
    ]
  }
]

export default function Sidebar({ currentUser: propUser }) {
  const { user: contextUser, hasPermission, theme, students } = useApp()
  const currentUser = propUser || contextUser
  const location = useLocation()
  const [icOpen, setIcOpen] = useState(location.pathname.startsWith('/instructional'))
  
  const isAdmin = currentUser?.role === 'admin'
  const isStudent = currentUser?.role === 'student'
  const isFaculty = currentUser?.role === 'faculty'

  const studentRecord = React.useMemo(() => {
    if (!currentUser || currentUser.role !== 'student') return null
    const studentNum = String(currentUser.userNumber || '').trim().replace('#', '').toLowerCase()
    const studentName = String(currentUser.name || '').trim().toLowerCase()

    return (students || []).find(s => {
      const recNum = String(s.dynamic_data?.['Student Number'] || s.studentNumber || '').trim().replace('#', '').toLowerCase()
      const first = String(s.dynamic_data?.['First Name'] || '').trim().toLowerCase()
      const last = String(s.dynamic_data?.['Last Name'] || '').trim().toLowerCase()
      const full = `${first} ${last}`.trim()

      return (studentNum && recNum === studentNum) || (studentName && full === studentName)
    })
  }, [currentUser, students])

  const resolveImageUrl = (val) => {
    if (!val) return null
    if (typeof val === 'object' && val.dataUrl) return val.dataUrl
    if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:'))) return val
    if (typeof val === 'string' && val.includes('.')) return val.startsWith('/storage/') ? val : `/storage/${val}`
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

  // Derive initials and role label from currentUser prop (or fallback)
  const initials = currentUser
    ? `${(currentUser.firstName || '')[0] || ''}${(currentUser.lastName || '')[0] || ''}`.toUpperCase()
    : 'AU'
  const displayName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
    : 'Admin User'
  const roleName = currentUser?.role === 'admin'
    ? 'System Administrator'
    : currentUser?.role === 'faculty'
    ? 'Faculty Member'
    : currentUser?.role === 'student'
    ? 'Student'
    : 'System Administrator'

  const activeNavItems = [...navItems, ...facultyNavItems, ...studentNavItems]

  // Filter nav items based on admin status AND permission checks
  const filteredNavItems = activeNavItems.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.facultyOnly && !isFaculty) return false;
      if (item.studentOnly && !isStudent) return false;
      if (item.forceShow) return true;
      // Admins should not see student portal items
      if (isAdmin && item.moduleId === 'student_portal') return false;
      return hasPermission(item.moduleId, 'r');
    })
  })).filter(group => group.items.length > 0)



  return (
    <aside className="sidebar">

      {/* Logo */}
      <div className="sidebar-logo" style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="sidebar-logo-badge" style={{ 
          width: 44, height: 44, background: 'var(--orange)', borderRadius: 12, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0,
          boxShadow: '0 4px 12px rgba(230, 126, 34, 0.2)'
        }}>{theme?.systemShortName || 'CCS'}</div>
        <div className="sidebar-logo-text">
          <div className="name">{theme?.systemName || 'College of Computing Studies'}</div>
          <div className="sub">
            University of Cabuyao · {isStudent ? 'Student Portal' : 'Admin Panel'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {filteredNavItems.map(group => (
          <React.Fragment key={group.section}>
            <div className="sidebar-section">{group.section}</div>

            {group.items.map(item => {

              /* ── Submenu item ── */
              if (item.children) {
                const isGroupActive = location.pathname.startsWith('/instructional')
                return (
                  <div key={item.label}>
                    <button
                      className={`sidebar-submenu-btn${icOpen ? ' open' : ''}`}
                      onClick={() => setIcOpen(!icOpen)}
                    >
                      <item.icon size={15} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      <ChevronDown size={13} className="chevron" />
                    </button>

                    {icOpen && (
                      <div className="sidebar-children">
                        {item.children.map(child => (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            className={({ isActive }) =>
                              `sidebar-child${isActive ? ' active' : ''}`
                            }
                          >
                            <span className="sidebar-child-dot" />
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              /* ── Regular item ── */
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) => {
                    // Custom logic to prevent '/students' from being active when on '/students/archived'
                    let actualActive = isActive;
                    if (item.path === '/students' && location.pathname.startsWith('/students/archived')) {
                      actualActive = false;
                    }
                    return `sidebar-item${actualActive ? ' active' : ''}`;
                  }}
                >
                  <item.icon size={15} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </NavLink>
              )
            })}
          </React.Fragment>
        ))}
      </nav>

      {/* User chip */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : initials}
        </div>
        <div>
          <div className="sidebar-user-name">{displayName}</div>
          <div className="sidebar-user-role">{roleName}</div>
        </div>
      </div>
    </aside>
  )
}
