import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import { GraduationCap, Users, Calculator } from 'lucide-react'

export default function FacultyGrades() {
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
  
  const [classData, setClassData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('facultyClassData')) || {} } catch { return {} }
  })

  useEffect(() => { localStorage.setItem('facultyClassData', JSON.stringify(classData)) }, [classData])

  const selectedClass = mySchedule.find(s => s.id === Number(selectedClassId))

  const classStudents = useMemo(() => {
    if (!selectedClass) return []
    return (students || []).filter(s => {
      let sYear = s.dynamic_data?.['Year Level'] || '1st yr'
      if (sYear.toLowerCase().includes('1st')) sYear = '1st yr'
      if (sYear.toLowerCase().includes('2nd')) sYear = '2nd yr'
      if (sYear.toLowerCase().includes('3rd')) sYear = '3rd yr'
      if (sYear.toLowerCase().includes('4th')) sYear = '4th yr'
      
      let sProg = s.dynamic_data?.['Course'] || 'BSIT'
      if (sProg === 'IT') sProg = 'BSIT'
      if (sProg === 'CS') sProg = 'BSCS'
      const sSec = s.dynamic_data?.['Section'] || 'A'
      
      return sYear === selectedClass.yearLevel && sProg === selectedClass.program && sSec === selectedClass.section
    })
  }, [selectedClass, students])

  const updateGrade = (studentId, category, type, val) => {
    if (!selectedClass) return
    const id = selectedClass.id
    const prevData = classData[id] || { announcements: [], attendance: {}, grades: {} }
    
    const studentGrades = prevData.grades?.[studentId] || { lecture: {}, lab: {} }
    const categoryGrades = studentGrades[category] || {}
    
    const updated = {
      ...classData,
      [id]: {
        ...prevData,
        grades: {
          ...(prevData.grades || {}),
          [studentId]: { 
             ...studentGrades,
             [category]: { ...categoryGrades, [type]: val }
          }
        }
      }
    }
    setClassData(updated)
  }

  const calculateStudentGrades = (studentGrades) => {
    if (!studentGrades) return { lec: 0, lab: 0, final: 0, status: '—' }
    
    const lec = studentGrades.lecture || {}
    const lab = studentGrades.lab || {}

    // LECTURE: Quizzes (20%), Recitation (10%), Activities (20%), Midterm (20%), Finals (30%)
    const l_q = Number(lec.quizzes) || 0
    const l_r = Number(lec.recitation) || 0
    const l_a = Number(lec.activities) || 0
    const l_m = Number(lec.midterm) || 0
    const l_f = Number(lec.finals) || 0
    
    const lecTotal = (l_q * 0.2) + (l_r * 0.1) + (l_a * 0.2) + (l_m * 0.2) + (l_f * 0.3)

    // LAB: Activities (40%), Practical (60%)
    const lab_a = Number(lab.activities) || 0
    const lab_p = Number(lab.practical) || 0
    
    const labTotal = (lab_a * 0.4) + (lab_p * 0.6)

    // FINAL: 60% Lec, 40% Lab
    let finalGrade = 0
    
    // Check if lab has any values. If not, maybe it's a lec-only class.
    const hasLab = lab.activities || lab.practical
    if (hasLab) {
      finalGrade = (lecTotal * 0.6) + (labTotal * 0.4)
    } else {
      finalGrade = lecTotal
    }

    const hasData = l_q || l_r || l_a || l_m || l_f || lab_a || lab_p
    
    let status = '—'
    if (hasData) {
      status = finalGrade >= 75 ? <span style={{color: '#2ecc71', fontWeight: 800}}>PASSED</span> : <span style={{color: '#e74c3c', fontWeight: 800}}>FAILED</span>
    }

    return { 
      lec: lecTotal.toFixed(1), 
      lab: labTotal.toFixed(1), 
      final: finalGrade.toFixed(1), 
      status, 
      hasData 
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 60 }}>
      <Header title="Advanced Grades Encoding" subtitle="Manage master grading sheets and student performances" />
      
      <div style={{ padding: '24px', maxWidth: '100%' }}>
        <div className="card animate-in" style={{ padding: 24, marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 400px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <GraduationCap size={22} color="var(--orange)" /> 
              Class Selection
            </h2>
            <div className="form-group">
              <select 
                className="form-input" 
                style={{ width: '100%', padding: '12px 16px' }}
                value={selectedClassId} 
                onChange={e => setSelectedClassId(e.target.value)}
              >
                <option value="">-- Choose a Class --</option>
                {mySchedule.map(s => (
                  <option value={s.id} key={s.id}>{s.subject} ({s.program} {s.yearLevel} - Sec {s.section})</option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ background: 'rgba(0,0,0,0.02)', padding: 20, borderRadius: 12, border: '1px dashed var(--border)', flex: '1 1 500px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><Calculator size={16}/> Grading Computation Policy</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: 13, color: 'var(--text-muted)', gap: 16 }}>
              <div>
                <strong style={{ color: 'var(--text)' }}>Lecture (60%)</strong>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
                  <li>Quizzes: 20%</li>
                  <li>Recitation: 10%</li>
                  <li>Activities: 20%</li>
                  <li>Midterm: 20%</li>
                  <li>Finals: 30%</li>
                </ul>
              </div>
              <div>
                <strong style={{ color: 'var(--text)' }}>Laboratory (40%)</strong>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
                  <li>Lab Activities: 40%</li>
                  <li>Practical Exam: 60%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {selectedClass && (
          <div className="animate-in panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.01)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Master Grading Sheet</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', background: '#fff', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)' }}>
                <Users size={14} color="var(--orange)" /> {classStudents.length} Students Enrolled
              </div>
            </div>

            {classStudents.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={48} opacity={0.1} style={{ marginBottom: 16 }} />
                <p style={{ fontSize: 16 }}>No students match this section's criteria.</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ paddingBottom: 16 }}>
                <table className="student-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', textAlign: 'left', fontSize: 12, textTransform: 'uppercase' }}>Student Name</th>
                      <th colSpan="5" style={{ padding: '10px', background: 'rgba(52, 152, 219, 0.05)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', textAlign: 'center', color: '#2980b9', fontSize: 11, fontWeight: 800 }}>LECTURE (60%)</th>
                      <th colSpan="2" style={{ padding: '10px', background: 'rgba(155, 89, 182, 0.05)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', textAlign: 'center', color: '#8e44ad', fontSize: 11, fontWeight: 800 }}>LABORATORY (40%)</th>
                      <th colSpan="3" style={{ padding: '10px', background: 'rgba(230, 126, 34, 0.05)', borderBottom: '1px solid var(--border)', textAlign: 'center', color: 'var(--orange)', fontSize: 11, fontWeight: 800 }}>COMPUTATION</th>
                    </tr>
                    <tr>
                      {/* Lec */}
                      <th style={{ padding: '8px', background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 10 }}>Quiz<br/><span style={{opacity: 0.6}}>(20%)</span></th>
                      <th style={{ padding: '8px', background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 10 }}>Recit<br/><span style={{opacity: 0.6}}>(10%)</span></th>
                      <th style={{ padding: '8px', background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 10 }}>Acts<br/><span style={{opacity: 0.6}}>(20%)</span></th>
                      <th style={{ padding: '8px', background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 10 }}>Mid<br/><span style={{opacity: 0.6}}>(20%)</span></th>
                      <th style={{ padding: '8px', background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 10 }}>Fin<br/><span style={{opacity: 0.6}}>(30%)</span></th>
                      
                      {/* Lab */}
                      <th style={{ padding: '8px', background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 10 }}>Acts<br/><span style={{opacity: 0.6}}>(40%)</span></th>
                      <th style={{ padding: '8px', background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', textAlign: 'center', fontSize: 10 }}>Prac<br/><span style={{opacity: 0.6}}>(60%)</span></th>
                      
                      {/* Final */}
                      <th style={{ padding: '8px', background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 11 }}>Lec</th>
                      <th style={{ padding: '8px', background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 11 }}>Lab</th>
                      <th style={{ padding: '8px', background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: 11, fontWeight: 800 }}>Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((s, idx) => {
                      const stGrades = classData[selectedClass.id]?.grades?.[s.id] || { lecture: {}, lab: {} }
                      const l = stGrades.lecture || {}
                      const lb = stGrades.lab || {}
                      
                      const computed = calculateStudentGrades(stGrades)

                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 24px', borderRight: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{s.dynamic_data?.['First Name']} {s.dynamic_data?.['Last Name']}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>{s.studentNumber || s.dynamic_data?.['Student Number']}</div>
                          </td>
                          
                          {/* Lecture Inputs */}
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input type="number" className="form-input" style={{ width: 54, textAlign: 'center', padding: '6px 4px', fontSize: 13 }} value={l.quizzes || ''} onChange={e => updateGrade(s.id, 'lecture', 'quizzes', e.target.value)} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input type="number" className="form-input" style={{ width: 54, textAlign: 'center', padding: '6px 4px', fontSize: 13 }} value={l.recitation || ''} onChange={e => updateGrade(s.id, 'lecture', 'recitation', e.target.value)} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input type="number" className="form-input" style={{ width: 54, textAlign: 'center', padding: '6px 4px', fontSize: 13 }} value={l.activities || ''} onChange={e => updateGrade(s.id, 'lecture', 'activities', e.target.value)} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input type="number" className="form-input" style={{ width: 54, textAlign: 'center', padding: '6px 4px', fontSize: 13 }} value={l.midterm || ''} onChange={e => updateGrade(s.id, 'lecture', 'midterm', e.target.value)} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                            <input type="number" className="form-input" style={{ width: 54, textAlign: 'center', padding: '6px 4px', fontSize: 13 }} value={l.finals || ''} onChange={e => updateGrade(s.id, 'lecture', 'finals', e.target.value)} />
                          </td>

                          {/* Lab Inputs */}
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <input type="number" className="form-input" style={{ width: 54, textAlign: 'center', padding: '6px 4px', fontSize: 13 }} value={lb.activities || ''} onChange={e => updateGrade(s.id, 'lab', 'activities', e.target.value)} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                            <input type="number" className="form-input" style={{ width: 54, textAlign: 'center', padding: '6px 4px', fontSize: 13 }} value={lb.practical || ''} onChange={e => updateGrade(s.id, 'lab', 'practical', e.target.value)} />
                          </td>

                          {/* Computed Outputs */}
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#2980b9', fontSize: 14 }}>{computed.hasData ? computed.lec : '—'}</td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: '#8e44ad', fontSize: 14 }}>{computed.hasData ? computed.lab : '—'}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {computed.hasData ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>{computed.final}</div>
                                <div style={{ fontSize: 9 }}>{computed.status}</div>
                              </div>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
