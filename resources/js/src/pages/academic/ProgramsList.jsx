import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, normalizeCourseCode } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import { Plus, ChevronLeft, Trash2 } from 'lucide-react'
import '../../../../css/StudentList.css'

export default function ProgramsList() {
   const { students, academicSections, addAcademicSection, deleteProgram } = useApp()
   const navigate = useNavigate()

   const [addProgramModal, setAddProgramModal] = useState(false)
   const [newProgName, setNewProgName] = useState('')

   // Get all active students
   const activeStudents = useMemo(() => students.filter(s => !s.is_archived && s.status !== 'archived'), [students])

   const programsArr = useMemo(() => {
      const list = new Set(['CS', 'IT'])
      ;(academicSections || []).forEach(s => {
         if (s.program) {
            list.add(normalizeCourseCode(s.program))
         }
      })
      return Array.from(list).sort()
   }, [academicSections])

   // formatting helper to display program nicely
   const displayProgram = p => {
      if (!p) return ''
      if (p === 'All') return 'All Programs'
      const upper = p.toUpperCase()
      return upper.startsWith('BS') ? upper : `BS${upper}`
   }

   return (
      <div className="sl-root">
         <Header title="Academic Programs" subtitle="Overview of all academic programs and their designated sections." />

         <div className="sl-body">
            <div className="sl-card" style={{ padding: '24px 28px' }}>
               <div className="sl-head-top" style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '6px 12px', height: 32, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, width: 'fit-content' }}>
                        <ChevronLeft size={14} /> Back
                     </button>
                     <h2 className="sl-title">Programs Overview</h2>
                  </div>
                  <div className="sl-head-actions">
                     <button className="sl-btn-primary" onClick={() => setAddProgramModal(true)} style={{ padding: '0 16px', height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Plus size={14} /> Add Program
                     </button>
                  </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  <div 
                     className="sl-card animate-in"
                     onClick={() => navigate('/sections?program=All')}
                     style={{ 
                        padding: '24px', 
                        cursor: 'pointer', 
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        borderRadius: 12,
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'flex-start'
                     }}
                  >
                     <h3 style={{ margin: 0, fontSize: 20, color: 'var(--text)' }}>All Programs</h3>
                     <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-muted)' }}>View all sections across all programs.</p>
                  </div>
                  {programsArr.map(p => {
                     const progSectionsCount = (academicSections || []).filter(s => normalizeCourseCode(s.program) === p).length
                     const progStudentsCount = activeStudents.filter(s => {
                        const c = s.dynamic_data?.['Course'] || s.dynamic_data?.['course'] || s.course
                        return normalizeCourseCode(c) === normalizeCourseCode(p)
                     }).length

                     return (
                        <div
                           key={p}
                           className="sl-card animate-in"
                           onClick={() => navigate(`/sections?program=${p}`)}
                           style={{ 
                              padding: '24px', 
                              cursor: 'pointer',
                              border: '1px solid var(--border)',
                              background: 'var(--card-bg)',
                              borderRadius: 12,
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'flex-start'
                           }}
                        >
                           <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h3 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--orange)' }}>{displayProgram(p)}</h3>
                              <button 
                                 className="sl-action-btn danger" 
                                 title="Delete Program"
                                 style={{ width: 32, height: 32, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}
                                 onClick={(e) => {
                                    e.stopPropagation()
                                    if (window.confirm(`Are you sure you want to delete the ${displayProgram(p)} program and all its sections?`)) {
                                       deleteProgram(p)
                                    }
                                 }}
                              >
                                 <Trash2 size={16} />
                              </button>
                           </div>
                           <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}><strong>{progSectionsCount}</strong> Sections</span>
                              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}><strong>{progStudentsCount}</strong> Students</span>
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>
         </div>

         <Modal
            open={addProgramModal}
            onClose={() => setAddProgramModal(false)}
            title="Add New Program"
         >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 0' }}>
               <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Program Abbreviation</label>
                  <input
                     type="text"
                     className="sl-search-input"
                     placeholder="e.g. CpE, BA, EE"
                     style={{ paddingLeft: 12, height: 'auto', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                     value={newProgName}
                     onChange={e => setNewProgName(e.target.value)}
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>We will automatically prepend "BS" where appropriate and build 20 default sections (Years 1-4, Sections A-E) for this program.</p>
               </div>

               <div style={{ display: 'flex', gap: 12, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button className="sl-btn-outline" onClick={() => setAddProgramModal(false)}>Cancel</button>
                  <button className="sl-btn-primary" onClick={() => {
                     const trimmed = newProgName.trim().toUpperCase()
                     if (!trimmed) return alert('Program name is required')
                     const rawProg = trimmed.replace(/^BS/, '') // Store internally without BS if they added it
                     
                     // auto generate sections
                     const letters = ['A', 'B', 'C', 'D', 'E']
                     const years = [1, 2, 3, 4]
                     
                     years.forEach(year => {
                         letters.forEach(letter => {
                             const sectName = `${year}BS${rawProg}-${letter}`
                             addAcademicSection(rawProg, sectName)
                         })
                     })

                     setAddProgramModal(false)
                     setNewProgName('')
                     navigate(`/sections?program=${rawProg}`)
                  }}>Add Program & Generate Sections</button>
               </div>
            </div>
         </Modal>
      </div>
   )
}
