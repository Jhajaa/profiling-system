import React, { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import { MessageSquare, Plus, Clock, Megaphone, Send } from 'lucide-react'

export default function FacultyAnnouncements() {
  const { user, schedules, faculty } = useApp()

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
  const [newAnnounce, setNewAnnounce] = useState('')
  
  const [classData, setClassData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('facultyClassData')) || {} } catch { return {} }
  })

  useEffect(() => { localStorage.setItem('facultyClassData', JSON.stringify(classData)) }, [classData])

  const handlePost = () => {
    if (!newAnnounce.trim() || !selectedClassId) return
    const prevData = classData[selectedClassId] || { announcements: [], attendance: {}, grades: {} }
    const updated = {
      ...classData,
      [selectedClassId]: {
        ...prevData,
        announcements: [{ text: newAnnounce, date: new Date().toISOString() }, ...(prevData.announcements || [])]
      }
    }
    setClassData(updated)
    setNewAnnounce('')
  }

  const selectedClass = mySchedule.find(s => s.id === Number(selectedClassId))
  const announcements = selectedClass ? (classData[selectedClass.id]?.announcements || []) : []

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 60 }}>
      <Header title="Class Announcements" subtitle="Post updates and communicate with your classes" />
      
      <div style={{ padding: '24px', maxWidth: '100%' }}>
        <div className="card animate-in" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'var(--orange)', padding: 10, borderRadius: 12, color: '#fff', display: 'flex' }}>
              <Megaphone size={22} /> 
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Create Announcement</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Select a class to broadcast a message</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <select 
              className="form-input" 
              style={{ flex: 1, minWidth: 300 }}
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

        {selectedClass && (
          <div className="animate-in">
            <div className="panel" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  background: 'var(--orange)', 
                  borderRadius: 12, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 20,
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(230, 126, 34, 0.3)'
                }}>
                  {myFacultyRecord?.name ? myFacultyRecord.name[0] : 'F'}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea 
                    className="form-input" 
                    placeholder={`Write an announcement for ${selectedClass.subject}...`} 
                    value={newAnnounce} 
                    onChange={e => setNewAnnounce(e.target.value)} 
                    rows={4} 
                    style={{ 
                      width: '100%', 
                      marginBottom: 16, 
                      padding: 16,
                      fontSize: 15,
                      borderRadius: 12,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)'
                    }} 
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={handlePost} 
                      disabled={!newAnnounce.trim()}
                      style={{ 
                        display: 'flex', gap: 8, alignItems: 'center',
                        padding: '10px 24px', borderRadius: 30
                      }}
                    >
                      <Send size={16}/> Post to Class
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 24px 0', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                <MessageSquare size={18} color="var(--orange)" /> Recent Announcements
              </h3>
              
              {announcements.length === 0 ? (
                <div className="home-empty" style={{ padding: '60px 0', background: 'var(--bg)', borderRadius: 12 }}>
                  <Megaphone size={48} opacity={0.1} />
                  <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>No announcements yet for this class.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {announcements.map((a, i) => (
                    <div key={i} className="card" style={{ 
                      padding: 20, 
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <div style={{ width: 36, height: 36, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', fontWeight: 700, border: '1px solid var(--border)' }}>
                          {myFacultyRecord?.name ? myFacultyRecord.name[0] : 'F'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{myFacultyRecord?.name || user?.name || 'Faculty Member'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                            <Clock size={11} />
                            {new Date(a.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{a.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
