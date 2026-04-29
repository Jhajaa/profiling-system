import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Login from './pages/Login'
import Layout from './components/Layout'
import Home from './pages/Home'
import StudentList from './pages/students/StudentList'
import ArchivedStudents from './pages/students/ArchivedStudents'
import RecycleBin from './pages/admin/RecycleBin'
import StudentProfile from './pages/students/StudentProfile'
import MedicalRecords from './pages/students/MedicalRecords'
import MedicalRecordsList from './pages/students/MedicalRecordsList'
import FacultyList from './pages/faculty/FacultyList'
import FacultyProfile from './pages/faculty/FacultyProfile'
import Curriculum from './pages/instructional/Curriculum'
import Syllabus from './pages/instructional/Syllabus'
import Lesson from './pages/instructional/Lesson'
import Scheduling from './pages/Scheduling'
import FacultySchedule from './pages/faculty/FacultySchedule'
import FacultyAnnouncements from './pages/faculty/FacultyAnnouncements'
import FacultyAttendance from './pages/faculty/FacultyAttendance'
import FacultyGrades from './pages/faculty/FacultyGrades'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import ThemeSettings from './pages/ThemeSettings'
import AccountManagement from './pages/admin/AccountManagement'
import DynamicFields from './pages/admin/DynamicFields'
import AdvancedSearch from './pages/academic/AdvancedSearch'
import ViolationsList from './pages/academic/ViolationsList'
import SectionsList from './pages/academic/SectionsList'
import ProgramsList from './pages/academic/ProgramsList'
import StudentPortal from './pages/students/StudentPortal'
import NewEnrollment from './pages/admin/NewEnrollment'
import Reports from './pages/admin/Reports'
import EnrollmentPortal from './pages/students/EnrollmentPortal'
import EnrollmentForm from './pages/students/EnrollmentForm'
import ForcePasswordChange from './pages/ForcePasswordChange'
import ChangePassword from './pages/ChangePassword'
function ProtectedRoute({ children }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  if (user.must_change_password && window.location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />
  }
  return children
}
function RoleRoute({ children, allow }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  if (user.must_change_password && window.location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />
  }
  return allow.includes(user.role)
  ? children
  : <Navigate to={user.role === 'student' ? '/student/dashboard' : '/dashboard'} replace />
}
function AppRoutes() {
 const { user } = useApp()
 return (
 <Routes>
 <Route path="/login" element={user ? <Navigate to={user?.role === 'student' ? '/student/dashboard' :
 '/dashboard'} replace /> : <Login />} />
 <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
 <Route index element={<Navigate to="/login" replace />} />
 <Route path="dashboard" element={<Home />} />
 <Route path="student" element={<Navigate to="/student/dashboard" replace />} />
 <Route path="student/dashboard" element={<RoleRoute allow={['student']}><StudentPortal active="dashboard"
 /></RoleRoute>} />
 <Route path="student/profile" element={<RoleRoute allow={['student']}><StudentPortal active="profile"
 /></RoleRoute>} />
 <Route path="student/violations" element={<RoleRoute allow={['student']}><StudentPortal active="violations"
 /></RoleRoute>} />
 <Route path="student/schedule" element={<RoleRoute allow={['student']}><StudentPortal active="schedule"
 /></RoleRoute>} />
 <Route path="student/announcements" element={<RoleRoute allow={['student']}><StudentPortal
 active="announcements" /></RoleRoute>} />
 <Route path="student/events" element={<RoleRoute allow={['student']}><StudentPortal active="events"
 /></RoleRoute>} />
 <Route path="student/medical" element={<RoleRoute allow={['student']}><StudentPortal active="medical"
 /></RoleRoute>} />
 <Route path="programs" element={<RoleRoute allow={['admin', 'faculty']}><ProgramsList /></RoleRoute>} />
 <Route path="sections" element={<RoleRoute allow={['admin', 'faculty']}><SectionsList /></RoleRoute>} />
 <Route path="students" element={<RoleRoute allow={['admin', 'faculty']}><StudentList /></RoleRoute>} />
 <Route path="students/archived" element={<RoleRoute allow={['admin']}><ArchivedStudents /></RoleRoute>} />
 <Route path="settings/recycle-bin" element={<RoleRoute allow={['admin']}><RecycleBin /></RoleRoute>} />
 <Route path="students/:id" element={<RoleRoute allow={['admin', 'faculty']}><StudentProfile /></RoleRoute>} />
 <Route path="students/:id/medical" element={<RoleRoute allow={['admin', 'faculty']}><MedicalRecords
 /></RoleRoute>} />
 <Route path="medical-records" element={<RoleRoute allow={['admin', 'faculty']}><MedicalRecordsList
 /></RoleRoute>} />
 <Route path="faculty" element={<RoleRoute allow={['admin']}><FacultyList /></RoleRoute>} />
 <Route path="faculty/profile" element={<RoleRoute allow={['faculty', 'admin']}><FacultyProfile /></RoleRoute>}
 />
 <Route path="faculty/schedule" element={<RoleRoute allow={['faculty', 'admin']}><FacultySchedule /></RoleRoute>} />
 <Route path="faculty/announcements" element={<RoleRoute allow={['faculty', 'admin']}><FacultyAnnouncements /></RoleRoute>} />
 <Route path="faculty/attendance" element={<RoleRoute allow={['faculty', 'admin']}><FacultyAttendance /></RoleRoute>} />
 <Route path="faculty/grades" element={<RoleRoute allow={['faculty', 'admin']}><FacultyGrades /></RoleRoute>} />
 <Route path="faculty/:id" element={<RoleRoute allow={['admin']}><FacultyProfile /></RoleRoute>} />
 <Route path="instructional/curriculum" element={<RoleRoute allow={['admin', 'faculty']}><Curriculum
 /></RoleRoute>} />
 <Route path="instructional/curriculum/:id" element={<RoleRoute allow={['admin', 'faculty']}><Syllabus
 /></RoleRoute>} />
 <Route path="instructional/syllabus" element={<RoleRoute allow={['admin', 'faculty']}><Syllabus
 /></RoleRoute>} />
 <Route path="instructional/syllabus/:id" element={<RoleRoute allow={['admin', 'faculty']}><Lesson
 /></RoleRoute>} />
 <Route path="scheduling" element={<RoleRoute allow={['admin', 'faculty']}><Scheduling /></RoleRoute>} />
 <Route path="events" element={<RoleRoute allow={['admin', 'faculty', 'student']}><Events /></RoleRoute>} />
 <Route path="events/:id" element={<RoleRoute allow={['admin', 'faculty', 'student']}><EventDetail
 /></RoleRoute>} />
 <Route path="academic/search" element={<RoleRoute allow={['admin', 'faculty']}><AdvancedSearch /></RoleRoute>}
 />
 <Route path="academic/violations" element={<RoleRoute allow={['admin', 'faculty']}><ViolationsList
 /></RoleRoute>} />
 <Route path="theme-settings" element={<RoleRoute allow={['admin']}><ThemeSettings /></RoleRoute>} />
 <Route path="settings/dynamic-fields" element={<RoleRoute allow={['admin']}><DynamicFields /></RoleRoute>} />
 <Route path="settings/account-management" element={<RoleRoute allow={['admin']}><AccountManagement
 /></RoleRoute>} />
 <Route path="settings/new-enrollment" element={<RoleRoute allow={['admin']}><NewEnrollment /></RoleRoute>} />
 <Route path="reports" element={<RoleRoute allow={['admin']}><Reports /></RoleRoute>} />
 <Route path="force-password-change" element={<ForcePasswordChange />} />
 <Route path="change-password" element={<ChangePassword />} />
 </Route>
 <Route path="/enrollment-portal" element={<EnrollmentPortal />} />
 <Route path="/enrollment-form/:code" element={<EnrollmentForm />} />
 <Route path="*" element={<Navigate to="/login" replace />} />
 </Routes>
 )
}
export default function App() {
 return (
 <AppProvider>
 <AppRoutes />
 </AppProvider>
 )
}
