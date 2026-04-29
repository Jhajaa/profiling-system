import React, { useState, useEffect, useMemo } from 'react'
import { useApp, getStudentAcademicInfo, normalizeCourseCode, getYearLevelNumber } from '../../context/AppContext'
import Header from '../../components/Header'
import { ClipboardCheck, Check, X, Users, CalendarDays, PieChart } from 'lucide-react'

export default function FacultyAttendance() {
  const { user, schedules, faculty, students } = useApp()

  const myFacultyRecord = useMemo(() => {
    if (!user || user.role !== 'faculty') return null
    const norm = (user.userNumber || '').trim().replace('#', '')
    return (faculty || []).find(f => {
      const fNum = (String(f.facultyNumber || '') || String(f.dynamic_data?.['Faculty Number'] || '')).trim().replace('#', '')
      return fNum === norm
    })
  }, [faculty, user])

  const mySchedule = useMemo(() => {
    if (!myFacultyRecord) return []
    return (schedules || []).filter(s => s.facultyId === myFacultyRecord.id)
  }, [schedules, myFacultyRecord])

  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  
  const [classData, setClassData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('facultyClassData')) || {} } catch { return {} }
  })

  useEffect(() => { localStorage.setItem('facultyClassData', JSON.stringify(classData)) }, [classData])

  const selectedClass = mySchedule.find(s => s.id === Number(selectedClassId))

  const classStudents = useMemo(() => {
    if (!selectedClass) return []
    return (students || []).filter(s => {
      const info = getStudentAcademicInfo(s)
      return (
        getYearLevelNumber(info.yearLevel) === getYearLevelNumber(selectedClass.yearLevel) &&
        normalizeCourseCode(info.course) === normalizeCourseCode(selectedClass.program) &&
        String(info.section).toUpperCase() === String(selectedClass.section || '').toUpperCase()
      )
    })
  }, [selectedClass, students])

  const toggleAttendance = (studentId) => {
    if (!selectedClass) return
    const id = selectedClass.id
    const prevData = classData[id] || { announcements: [], attendance: {}, grades: {} }
    const currentAtt = prevData.attendance[studentId]?.[selectedDate] || 'Absent'
    const newAtt = currentAtt === 'Present' ? 'Absent' : 'Present'
    
    const updated = {
      ...classData,
      [id]: {
        ...prevData,
        attendance: {
          ...(prevData.attendance || {}),
          [studentId]: { ...((prevData.attendance || {})[studentId] || {}), [selectedDate]: newAtt }
        }
      }
    }
    setClassData(updated)
  }

  // Calculate stats
  const stats = useMemo(() => {
    if (!selectedClass || classStudents.length === 0) return { present: 0, absent: 0 }
    let present = 0; let absent = 0
    classStudents.forEach(s => {
      const status = classData[selectedClass.id]?.attendance?.[s.id]?.[selectedDate] || 'Absent'
      if (status === 'Present') present++
      else absent++
    })
    return { present, absent }
  }, [classStudents, classData, selectedClass, selectedDate])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 60 }}>
      <Header title="Attendance Tracking" subtitle="Monitor and record student attendance for your classes" />
      
      <div style={{ padding: '24px', maxWidth: '100%' }}>
        <div className="card animate-in" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'var(--orange)', padding: 10, borderRadius: 12, color: '#fff', display: 'flex' }}>
              <ClipboardCheck size={22} /> 
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Session Details</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Choose class and date to manage attendance</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label>Select Class</label>
              <select 
                className="form-input" 
                value={selectedClassId} 
                onChange={e => setSelectedClassId(e.target.value)}
              >
                <option value="">-- Choose a Class --</option>
                {mySchedule.map(s => (
                  <option value={s.id} key={s.id}>{s.subject} ({s.program} {s.yearLevel} - Sec {s.section})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Select Date</label>
              <input 
                type="date" 
                className="form-input" 
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {selectedClass && (
          <div className="animate-in">
            {classStudents.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
                <div className="panel" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(52, 152, 219, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3498db' }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{classStudents.length}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Enrolled</div>
                  </div>
                </div>

                <div className="panel" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(46, 204, 113, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ecc71' }}>
                    <Check size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{stats.present}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Present</div>
                  </div>
                </div>

                <div className="panel" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(231, 76, 60, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c' }}>
                    <X size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{stats.absent}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Absent</div>
                  </div>
                </div>
              </div>
            )}

            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.01)' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={18} color="var(--orange)" /> Attendance Roster
                </h3>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {classStudents.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg)' }}>
                  <Users size={40} opacity={0.1} style={{ marginBottom: 16 }} />
                  <p style={{ fontSize: 15, margin: 0 }}>No students match this section's criteria.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="student-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', background: 'rgba(0,0,0,0.02)' }}>
                        <th style={{ padding: '14px 24px', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Name</th>
                        <th style={{ padding: '14px 24px', width: 180, textAlign: 'center', fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((s, idx) => {
                        const status = classData[selectedClass.id]?.attendance?.[s.id]?.[selectedDate] || 'Absent'
                        const isPres = status === 'Present'
                        return (
                          <tr key={s.id} style={{ 
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s ease'
                          }}>
                            <td style={{ padding: '14px 24px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{s.dynamic_data?.['First Name']} {s.dynamic_data?.['Last Name']}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>{s.studentNumber || s.dynamic_data?.['Student Number']}</div>
                            </td>
                            <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                              <button 
                                onClick={() => toggleAttendance(s.id)} 
                                style={{ 
                                  padding: '8px 16px', 
                                  borderRadius: 8, 
                                  border: 'none', 
                                  fontSize: 13, 
                                  fontWeight: 700, 
                                  cursor: 'pointer', 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: 6, 
                                  background: isPres ? '#2ecc71' : 'var(--bg)', 
                                  color: isPres ? '#fff' : 'var(--text-muted)',
                                  width: '100%',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease',
                                  border: isPres ? 'none' : '1px solid var(--border)'
                                }}
                              >
                                {isPres ? <Check size={14}/> : <X size={14}/>} {status.toUpperCase()}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
