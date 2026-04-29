import React, { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp, normalizeCourseCode, getAcademicSectionInfo, getStudentAcademicInfo, studentMatchesSection, buildCanonicalSectionName } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import { Search, ChevronRight, ChevronLeft, Layers, Plus, Eye, Trash2, Edit2 } from 'lucide-react'
import '../../../../css/StudentList.css'

export default function SectionsList() {
   const { students, academicSections, addAcademicSection, updateAcademicSection, deleteAcademicSection, updateStudent, PROGRAMS } = useApp()
   const navigate = useNavigate()
   const location = useLocation()
   
   const urlProgram = new URLSearchParams(location.search).get('program')
   const [selectedProgram, setSelectedProgram] = useState(urlProgram || 'All')

   React.useEffect(() => {
      if (urlProgram) {
         setSelectedProgram(urlProgram)
      }
   }, [urlProgram])

   const [search, setSearch] = useState('')
   const [activeSectionKey, setActiveSectionKey] = useState(null)

   const [addModal, setAddModal] = useState(false)
   const [newSect, setNewSect] = useState({ name: '', program: 'IT', capacity: 50 })

   const [editSectModal, setEditSectModal] = useState(false)
   const [editingSection, setEditingSection] = useState(null)

   const [addStudentModal, setAddStudentModal] = useState(false)
   const [selectedStudents, setSelectedStudents] = useState([])
   const [modalSearch, setModalSearch] = useState('')

   const [editStudent, setEditStudent] = useState(null)
   const [editTargetSection, setEditTargetSection] = useState('')

   // 1. Get all active students
   const activeStudents = useMemo(() => students.filter(s => !s.is_archived && s.status !== 'archived'), [students])

   // Auto-generate sections on first load
   React.useEffect(() => {
       const programs = ['CS', 'IT']
       const letters = ['A', 'B', 'C', 'D', 'E']
       const years = [1, 2, 3, 4]

       if (!academicSections) return

       programs.forEach(prog => {
           years.forEach(year => {
               letters.forEach(letter => {
                   const sectName = `${year}BS${prog}-${letter}`
                   const exists = academicSections.some(s => s.name === sectName && s.program === prog)
                   if (!exists) {
                       addAcademicSection(prog, sectName)
                   }
               })
           })
       })
   }, [academicSections])

   // 2. Dynamic programs based on base programs + whatever is in academicSections
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

   const managedSectionsList = academicSections || []
   const getSectionKey = React.useCallback((section) => {
      const info = getAcademicSectionInfo(section)
      return `${normalizeCourseCode(info.program)}::${info.canonicalName || info.name}`
   }, [])

   // 3. Group students by Section using managed list
   const groupedSections = useMemo(() => {
      // Filter students based on program tab
      const studentsInScope = activeStudents.filter(s => {
         if (selectedProgram !== 'All') {
            const c = s.dynamic_data?.['Course'] || s.dynamic_data?.['course']
            return normalizeCourseCode(c) === normalizeCourseCode(selectedProgram)
         }
         return true
      })

      // Base display on managed sections
      let displayList = managedSectionsList
         .filter(ms => selectedProgram === 'All' || normalizeCourseCode(ms.program) === normalizeCourseCode(selectedProgram))
         .map(ms => ({
            ...ms,
            ...getAcademicSectionInfo(ms),
            students: studentsInScope.filter(s => studentMatchesSection(s, ms)),
            capacity: ms.capacity || 50,
            isManaged: true
         }))

      // Add "Auto-detected" sections for students not in any managed section
      const unmanagedStudents = studentsInScope.filter(s => !managedSectionsList.some(ms => studentMatchesSection(s, ms)))

      const unmanagedGroups = {}
      unmanagedStudents.forEach(s => {
         const info = getStudentAcademicInfo(s)
         const key = `${info.course || 'UNKNOWN'}-${info.canonicalSection || info.section || 'NO SECTION'}`
         if (!unmanagedGroups[key]) unmanagedGroups[key] = []
         unmanagedGroups[key].push(s)
      })

      Object.keys(unmanagedGroups).forEach(key => {
         const students = unmanagedGroups[key]
         const info = getStudentAcademicInfo(students[0])
         displayList.push({
            name: info.canonicalSection || info.section || 'No Section',
            program: info.course || 'Unknown',
            yearLevel: info.yearLevel || '',
            yearNumber: info.yearNumber || '',
            section: info.section || '',
            canonicalName: info.canonicalSection || info.section || 'No Section',
            students,
            capacity: 50,
            isManaged: false
         })
      })

      // Filter results if search is active
      if (search.trim()) {
         const q = search.toLowerCase()
         displayList = displayList.map(sec => ({
            ...sec,
            students: sec.students.filter(s => {
               const sData = Object.values(s.dynamic_data || {}).join(' ').toLowerCase()
               return sData.includes(q)
            })
         })).filter(sec => sec.students.length > 0)
      }

      return displayList.sort((a, b) => {
         if (a.program !== b.program) return a.program.localeCompare(b.program)
         if (String(a.yearNumber) !== String(b.yearNumber)) return String(a.yearNumber).localeCompare(String(b.yearNumber), undefined, { numeric: true })
         return String(a.section || a.name).localeCompare(String(b.section || b.name))
      })
   }, [activeStudents, managedSectionsList, selectedProgram, search])

   const getInitials = (s) => {
      const f = s.dynamic_data?.['First Name'] || ''
      const l = s.dynamic_data?.['Last Name'] || ''
      return `${f[0] || ''}${l[0] || ''}`.toUpperCase() || 'ST'
   }

   const formatSectionName = (program, section, yearLevel = '') =>
      buildCanonicalSectionName(program, yearLevel, section || '') || String(section || '').trim().toUpperCase()

   return (
      <div className="sl-root">
         <Header title="Academic Sections" subtitle="Organize and monitor students by their academic programs and sections." />

         <div className="sl-body">
            <div className="sl-card">
               <div className="sl-card-head">
                  <div className="sl-head-top">
                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '6px 12px', height: 32, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, width: 'fit-content' }}>
                           <ChevronLeft size={14} /> Back
                        </button>
                        <h2 className="sl-title">Academic Sections</h2>
                     </div>
                     <div className="sl-head-actions" style={{ display: 'flex', gap: 10 }}>
                        <button className="sl-btn-primary" onClick={() => setAddModal(true)} style={{ padding: '0 16px', height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                           <Plus size={14} /> Add Section
                        </button>
                     </div>
                  </div>

                  <div className="sl-filter-row" style={{ paddingTop: 20 }}>
                     <div className="sl-filter-tabs">
                        <button
                           className={`sl-ftab ${selectedProgram === 'All' ? 'active' : ''}`}
                           onClick={() => { setSelectedProgram('All'); setActiveSectionKey(null); }}
                        >
                           All Programs
                        </button>
                        {programsArr.map(p => (
                           <button
                              key={p}
                              className={`sl-ftab ${selectedProgram === p ? 'active' : ''}`}
                              onClick={() => { setSelectedProgram(p); setActiveSectionKey(null); }}
                           >
                              {displayProgram(p)}
                           </button>
                        ))}
                     </div>

                     <div className="sl-filter-right">
                        <div className="sl-search-wrap" style={{ minWidth: 260 }}>
                           <Search size={13} className="sl-search-icon" />
                           <input
                              type="text"
                              placeholder={activeSectionKey ? "Search in section..." : "Search students..."}
                              className="sl-search-input"
                              value={search}
                              onChange={e => setSearch(e.target.value)}
                           />
                        </div>
                     </div>
                  </div>
               </div>

               <div style={{ padding: '24px 28px' }}>
                  {groupedSections.length === 0 ? (
                     <div className="sl-empty">
                        <Layers size={32} color="var(--border)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                        <p>No sections or students found matching your filters.</p>
                     </div>
                  ) : (
                     <div>
                        {!activeSectionKey ? (
                           <div>
                              {(() => {
                                 // 1. Group by Program first
                                 const groupedByProg = groupedSections.reduce((acc, sec) => {
                                    const p = sec.program || 'Other'
                                    if (!acc[p]) acc[p] = []
                                    acc[p].push(sec)
                                    return acc
                                 }, {})

                                 const sortedProgs = Object.keys(groupedByProg).sort((a, b) => a.localeCompare(b))

                                 return sortedProgs.map(prog => {
                                    const pSections = groupedByProg[prog]
                                    
                                    // 2. Group by Year inside the Program
                                    const groupedByYear = pSections.reduce((acc, sec) => {
                                       const yearStr = sec.yearNumber ? `${sec.yearNumber} Year` : 'Other'
                                       if (!acc[yearStr]) acc[yearStr] = []
                                       acc[yearStr].push(sec)
                                       return acc
                                    }, {})

                                    const yearOrder = ['1 Year', '2 Year', '3 Year', '4 Year', 'Other']
                                    const sortedYears = Object.keys(groupedByYear).sort((a, b) => {
                                       const idxA = yearOrder.indexOf(a) !== -1 ? yearOrder.indexOf(a) : 99
                                       const idxB = yearOrder.indexOf(b) !== -1 ? yearOrder.indexOf(b) : 99
                                       return idxA - idxB
                                    })

                                    return (
                                       <div key={prog} style={{ marginBottom: 40 }}>
                                          {selectedProgram === 'All' && (
                                             <div style={{ marginBottom: 24, paddingBottom: 12, borderBottom: '2px solid var(--border)' }}>
                                                <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--orange)', margin: 0, display: 'inline-flex', alignItems: 'center' }}>
                                                   {displayProgram(prog)}
                                                   <span style={{ fontSize: 13, background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 12, marginLeft: 12, color: 'var(--text-muted)' }}>{pSections.length} Sections</span>
                                                </h2>
                                             </div>
                                          )}
                                          
                                          {sortedYears.map(year => (
                                             <div key={year} style={{ marginBottom: 32 }}>
                                                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                   {year === 'Other' ? 'Other Sections' : `${year.charAt(0)}st/nd/rd/th Year`.replace(/1st\/nd\/rd\/th/, '1st').replace(/2st\/nd\/rd\/th/, '2nd').replace(/3st\/nd\/rd\/th/, '3rd').replace(/4st\/nd\/rd\/th/, '4th')}
                                                </h3>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                                                   {groupedByYear[year].map((sec, idx) => (
                                                      <div key={getSectionKey(sec)} className="animate-in" onClick={() => setActiveSectionKey(getSectionKey(sec))} style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(230, 126, 34, 0.1)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                                                 <Layers size={20} />
                                                                 {sec.students.length >= (sec.capacity || 50) && (
                                                                    <div style={{ position: 'absolute', top: -8, right: -8, background: 'var(--danger)', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 700, border: '2px solid var(--card-bg)' }}>FULL</div>
                                                                 )}
                                                              </div>
                                                              <div>
                                                                 <div className="sl-stud-name" style={{ fontSize: 16, marginBottom: 2 }}>{formatSectionName(sec.program, sec.section || sec.name, sec.yearLevel)}</div>
                                                                 <div className="sl-count" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <span style={{ fontWeight: 600 }}>{sec.students.length} / {sec.capacity || 50} Students</span>
                                                                    <span style={{ fontSize: 11, opacity: 0.8 }}>·</span>
                                                                    <span style={{ 
                                                                       fontSize: 12, 
                                                                       fontWeight: 500,
                                                              color: ((sec.capacity || 50) - sec.students.length) > 10 ? '#10b981' : 
                                                                     ((sec.capacity || 50) - sec.students.length) > 0 ? '#f59e0b' : '#ef4444' 
                                                           }}>
                                                              {(sec.capacity || 50) - sec.students.length <= 0 ? 'Full capacity' : `${(sec.capacity || 50) - sec.students.length} slots left`}
                                                           </span>
                                                        </div>
                                                     </div>
                                                  </div>
                                                  <ChevronRight size={18} color="var(--border)" />
                                              </div>
                                             ))} 
                                          </div>
                                       </div>
                                      ))}
                                  </div>
                                  )
                               })
                              })()}
                           </div>

                        ) : (
                           <div>
                              {(() => {
                                 const sec = groupedSections.find(s => getSectionKey(s) === activeSectionKey)
                                 if (!sec) return <div className="sl-empty"><p>Section hidden by search results.</p></div>

                                 return (
                                    <div>
                                       <button className="btn btn-outline" onClick={() => setActiveSectionKey(null)} style={{ padding: '6px 12px', height: 32, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16 }}>
                                          <ChevronLeft size={14} /> Back to Sections
                                       </button>
                                       <div style={{ marginTop: 0, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                                          <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{formatSectionName(sec.program, sec.section || sec.name, sec.yearLevel)}</h3>
                                          <span className="sl-badge sl-badge-default" style={{ background: 'var(--bg)', fontWeight: 600 }}>{sec.program}</span>
                                          {!sec.isManaged && <span className="sl-badge" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fef3c7' }}>Auto-detected</span>}
                                          <div style={{ flex: 1 }}></div>

                                          <div className="sl-count"><strong>{sec.students.length}</strong> / {sec.capacity || 50} Student{sec.students.length !== 1 ? 's' : ''}</div>

                                          <button 
                                             className="sl-btn-primary" 
                                             style={{ marginLeft: 16, height: 32, fontSize: 13, padding: '0 15px' }}
                                             onClick={() => {
                                                setSelectedStudents([])
                                                setModalSearch('')
                                                setAddStudentModal(true)
                                             }}
                                          >
                                             <Plus size={14} style={{ marginRight: 6 }} /> Add Student
                                          </button>

                                          {sec.isManaged && (
                                             <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
                                                <button
                                                   className="sl-action-btn"
                                                   title="Edit Section"
                                                   style={{ width: 32, height: 32, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                   onClick={() => {
                                                      setEditingSection(sec)
                                                      setEditSectModal(true)
                                                   }}
                                                >
                                                   <Edit2 size={15} />
                                                </button>
                                                <button
                                                   className="sl-action-btn danger"
                                                   title="Delete Section"
                                                   style={{ width: 32, height: 32, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                   onClick={() => {
                                                      if (window.confirm('Are you sure you want to delete this section? Students inside will remain, but the section will no longer be managed.')) {
                                                         deleteAcademicSection(sec.id)
                                                         setActiveSectionKey(null)
                                                      }
                                                   }}
                                                >
                                                   <Trash2 size={15} />
                                                </button>
                                             </div>
                                          )}
                                       </div>

                                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 15 }}>
                                          {sec.students.map(student => (
                                             <div key={student.id} className="animate-in" onClick={() => navigate(`/students/${student.id}`)} style={{ padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                                                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                                   <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                      {student.profile_image ? (
                                                         <img src={student.profile_image} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                      ) : (
                                                         <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{getInitials(student)}</span>
                                                      )}
                                                   </div>
                                                   <div>
                                                      <div className="sl-stud-name" style={{ fontSize: 15 }}>{student.dynamic_data?.['First Name']} {student.dynamic_data?.['Last Name']}</div>
                                                      <div className="sl-stud-num" style={{ fontSize: 11 }}>{student.dynamic_data?.['Student Number']}</div>
                                                   </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                   <button 
                                                      className="sl-action-btn"
                                                      title="Remove from section"
                                                      onClick={async (e) => {
                                                         e.stopPropagation()
                                                         if (window.confirm('Remove student from this section?')) {
                                                         await updateStudent(student.id, {
                                                            ...student,
                                                            section: '',
                                                            dynamic_data: {
                                                               ...(student.dynamic_data || {}),
                                                               'Section': '',
                                                               'section': ''
                                                            }
                                                         })
                                                      }
                                                   }}
                                                   >
                                                      <Trash2 size={14} />
                                                   </button>
                                                   <button 
                                                      className="sl-action-btn"
                                                      title="Change Section"
                                                      onClick={(e) => {
                                                         e.stopPropagation()
                                                         setEditStudent(student)
                                                         setEditTargetSection(getSectionKey(sec))
                                                      }}
                                                   >
                                                      <Edit2 size={14} />
                                                   </button>
                                                   <button className="sl-action-btn" title="View Profile" onClick={(e) => { e.stopPropagation(); navigate(`/students/${student.id}`) }}>
                                                      <Eye size={14} />
                                                   </button>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 )
                              })()}
                           </div>
                        )}
                     </div>
                  )}
               </div>
            </div>
         </div>


         <Modal
            open={addModal}
            onClose={() => setAddModal(false)}
            title="Create New Section"
         >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 0' }}>
               <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Program / Course</label>
                     <select
                        className="sl-search-input"
                        style={{ width: '100%', padding: '10px 12px', height: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}
                        value={newSect.program}
                        onChange={e => setNewSect(p => ({ ...p, program: e.target.value }))}
                     >
                        {(programsArr.length > 0 ? programsArr : ['IT', 'CS']).map(p => <option key={p} value={p}>{displayProgram(p)}</option>)}
                     </select>
               </div>
               <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Section Name</label>
                  <input
                     type="text"
                     className="sl-search-input"
                     placeholder="e.g. 1A, 2B, 3-Special"
                     style={{ paddingLeft: 12, height: 'auto', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                     value={newSect.name}
                     onChange={e => setNewSect(p => ({ ...p, name: e.target.value }))}
                  />
               </div>
               <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Capacity (Total Slots)</label>
                  <input
                     type="number"
                     className="sl-search-input"
                     placeholder="50"
                     style={{ paddingLeft: 12, height: 'auto', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                     value={newSect.capacity}
                     onChange={e => setNewSect(p => ({ ...p, capacity: e.target.value }))}
                  />
               </div>

               <div style={{ display: 'flex', gap: 12, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button className="sl-btn-outline" onClick={() => setAddModal(false)}>Cancel</button>
                  <button className="sl-btn-primary" onClick={() => {
                     if (!newSect.name) return alert('Section name is required')
                     addAcademicSection(newSect.program, newSect.name, newSect.capacity)
                     setAddModal(false)
                     setNewSect({ name: '', program: 'IT', capacity: 50 })
                  }}>Create Section</button>
               </div>
            </div>
         </Modal>

         <Modal
            open={addStudentModal}
            onClose={() => setAddStudentModal(false)}
            title={`Add Student to ${(() => {
               const currentSec = groupedSections.find(s => getSectionKey(s) === activeSectionKey)
               return currentSec ? formatSectionName(currentSec.program, currentSec.section || currentSec.name, currentSec.yearLevel) : ''
            })()}`}
         >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 400 }}>
               <div className="sl-search-wrap" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                  <Search size={14} className="sl-search-icon" style={{ left: 12 }} />
                  <input
                     type="text"
                     placeholder="Search students by name or ID..."
                     className="sl-search-input"
                     style={{ flex: 1, paddingLeft: 34, height: 40, borderRadius: 8 }}
                     value={modalSearch}
                     onChange={e => setModalSearch(e.target.value)}
                  />
               </div>

               <div style={{ flex: 1, overflowY: 'auto', maxHeight: 350, border: '1px solid var(--border)', borderRadius: 8 }}>
                  {(() => {
                     const currentSec = groupedSections.find(s => getSectionKey(s) === activeSectionKey)
                     const availableStudents = activeStudents.filter(s => {
                        if (currentSec && studentMatchesSection(s, currentSec)) return false

                        const studentInfo = getStudentAcademicInfo(s)
                        const hasAssignedSection = Boolean(
                           String(studentInfo.section || '').trim() ||
                           String(studentInfo.canonicalSection || '').trim()
                        )

                        if (hasAssignedSection) return false

                        if (modalSearch.trim()) {
                           const q = modalSearch.toLowerCase()
                           const sData = Object.values(s.dynamic_data || {}).join(' ').toLowerCase()
                           return sData.includes(q)
                        }
                        return true
                     })

                     if (availableStudents.length === 0) {
                        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No available students found.</div>
                     }

                     const capacity = currentSec?.capacity || 50
                     const slotsLeft = capacity - (currentSec?.students.length || 0)

                     return (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           {availableStudents.map(student => {
                              const isSelected = selectedStudents.includes(student.id)
                              const isDisabled = !isSelected && selectedStudents.length >= slotsLeft

                              return (
                                 <div 
                                    key={student.id} 
                                    style={{ 
                                       display: 'flex', 
                                       alignItems: 'center', 
                                       gap: 12, 
                                       padding: '12px 16px', 
                                       borderBottom: '1px solid var(--border)', 
                                       cursor: isDisabled ? 'not-allowed' : 'pointer',
                                       opacity: isDisabled ? 0.5 : 1,
                                       background: isSelected ? 'rgba(232, 119, 34, 0.05)' : 'transparent'
                                    }}
                                    onClick={() => {
                                       if (isDisabled) return
                                       setSelectedStudents(prev => 
                                          prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id]
                                       )
                                    }}
                                 >
                                    <input 
                                       type="checkbox" 
                                       checked={isSelected}
                                       disabled={isDisabled}
                                       onChange={() => {}} // Handled by div onClick
                                       style={{ width: 16, height: 16, cursor: 'pointer' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                       <div style={{ fontSize: 14, fontWeight: 600 }}>{student.dynamic_data?.['First Name']} {student.dynamic_data?.['Last Name']}</div>
                                       <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student.dynamic_data?.['Student Number']} • {student.dynamic_data?.['Course']} {student.dynamic_data?.['Section']}</div>
                                    </div>
                                 </div>
                              )
                           })}
                        </div>
                     )
                  })()}
               </div>

               {(() => {
                  const currentSec = groupedSections.find(s => getSectionKey(s) === activeSectionKey)
                  const capacity = currentSec?.capacity || 50
                  const slotsLeft = capacity - (currentSec?.students.length || 0)
                  
                  return (
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                           <strong>{selectedStudents.length}</strong> students selected 
                           {slotsLeft < capacity && <span> ({slotsLeft} slots remaining)</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                           <button className="sl-btn-outline" onClick={() => setAddStudentModal(false)}>Cancel</button>
                           <button 
                              className="sl-btn-primary" 
                              disabled={selectedStudents.length === 0}
                              onClick={async () => {
                                 const currentSec = groupedSections.find(s => getSectionKey(s) === activeSectionKey)
                                 for (const studentId of selectedStudents) {
                                    const student = activeStudents.find(s => s.id === studentId)
                                    if (student) {
                                       await updateStudent(studentId, {
                                          ...student,
                                          section: currentSec.section || currentSec.name,
                                          course: currentSec.program,
                                          ...(currentSec.yearLevel ? { yearLevel: currentSec.yearLevel } : {}),
                                          dynamic_data: {
                                             ...(student.dynamic_data || {}),
                                             'Section': currentSec.section || currentSec.name,
                                             'section': currentSec.section || currentSec.name,
                                             'Course': currentSec.program,
                                             'course': currentSec.program,
                                             ...(currentSec.yearLevel ? { 'Year Level': currentSec.yearLevel } : {})
                                          }
                                       })
                                    }
                                 }
                                 setAddStudentModal(false)
                                 setSelectedStudents([])
                              }}
                           >
                              Add Selected Students
                           </button>
                        </div>
                     </div>
                  )
               })()}
            </div>
         </Modal>

         <Modal
            open={!!editStudent}
            onClose={() => setEditStudent(null)}
            title="Change Student Section"
         >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 0' }}>
               <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Target Section</label>
                     <select
                        className="sl-search-input"
                        style={{ width: '100%', padding: '10px 12px', height: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}
                        value={editTargetSection}
                        onChange={e => setEditTargetSection(e.target.value)}
                     >
                        <option value="">-- No Section --</option>
                        {groupedSections.map(s => (
                           <option key={getSectionKey(s)} value={getSectionKey(s)} disabled={s.students.length >= (s.capacity || 50) && !studentMatchesSection(editStudent, s)}>
                              {formatSectionName(s.program, s.section || s.name, s.yearLevel)} {s.students.length >= (s.capacity || 50) && !studentMatchesSection(editStudent, s) ? '(FULL)' : ''}
                           </option>
                        ))}
                     </select>
               </div>
               <div style={{ display: 'flex', gap: 12, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button className="sl-btn-outline" onClick={() => setEditStudent(null)}>Cancel</button>
                  <button className="sl-btn-primary" onClick={async () => {
                     const targetObj = groupedSections.find(s => getSectionKey(s) === editTargetSection)
                     const newProgram = targetObj ? targetObj.program : editStudent.dynamic_data?.['Course']

                     await updateStudent(editStudent.id, {
                        ...editStudent,
                        section: targetObj?.section || '',
                        course: newProgram,
                        ...(targetObj?.yearLevel ? { yearLevel: targetObj.yearLevel } : {}),
                        dynamic_data: {
                           ...(editStudent.dynamic_data || {}),
                           'Section': targetObj?.section || '',
                           'section': targetObj?.section || '',
                           'Course': newProgram,
                           'course': newProgram,
                           ...(targetObj?.yearLevel ? { 'Year Level': targetObj.yearLevel } : {})
                        }
                     })
                     
                     setEditStudent(null)
                  }}>Move Student</button>
               </div>
            </div>
         </Modal>

         <Modal
            open={editSectModal}
            onClose={() => { setEditSectModal(false); setEditingSection(null); }}
            title="Edit Section Settings"
         >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '10px 0' }}>
               <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Section Name</label>
                  <input
                     type="text"
                     className="sl-search-input"
                     style={{ paddingLeft: 12, height: 'auto', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                     value={editingSection?.name || ''}
                     onChange={e => setEditingSection(p => ({ ...p, name: e.target.value }))}
                  />
               </div>
               <div className="form-group">
                  <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Capacity (Total Slots)</label>
                  <input
                     type="number"
                     className="sl-search-input"
                     style={{ paddingLeft: 12, height: 'auto', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
                     value={editingSection?.capacity || 50}
                     onChange={e => setEditingSection(p => ({ ...p, capacity: e.target.value }))}
                  />
               </div>

               <div style={{ display: 'flex', gap: 12, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button className="sl-btn-outline" onClick={() => setEditSectModal(false)}>Cancel</button>
                  <button className="sl-btn-primary" onClick={() => {
                     if (!editingSection?.name) return alert('Section name is required')
                     updateAcademicSection(editingSection.id, { 
                        name: editingSection.name, 
                        capacity: Number(editingSection.capacity) 
                     })
                     setEditSectModal(false)
                     setEditingSection(null)
                     setActiveSectionKey(getSectionKey(editingSection))
                  }}>Save Changes</button>
               </div>
            </div>
         </Modal>
      </div>
   )
}
