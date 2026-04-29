import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import { Search, X, Users, AlertTriangle, Eye, ChevronLeft, Download } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import '../../../../css/StudentList.css'

export default function AdvancedSearch() {
  const { students } = useApp()
  const navigate = useNavigate()
  
  const [query, setQuery] = useState('')

  // Build an advanced search logic allowing multi-keyword search
  // e.g. "baseball journalism" will look for students matching BOTH somewhere
  const results = useMemo(() => {
    if (!query.trim()) return null 
    
    const keywords = query.split(/\s+/).filter(k => k.trim().length > 0).map(k => k.toLowerCase())
    
    return (students || []).filter(student => {
      const data = student.dynamic_data || {}
      
      // 1. Collect all searchable strings
      const searchableStrings = []
      
      // Add all field names AND values from dynamic_data
      Object.entries(data).forEach(([key, val]) => {
         searchableStrings.push(key.toLowerCase())
         if (val) {
            if (Array.isArray(val)) searchableStrings.push(val.join(' ').toLowerCase())
            else if (typeof val === 'object') searchableStrings.push(JSON.stringify(val).toLowerCase())
            else searchableStrings.push(String(val).toLowerCase())
         }
      })

      // 2. Add top-level metadata
      if (student.studentNumber) searchableStrings.push(student.studentNumber.toLowerCase())
      if (student.course) searchableStrings.push(student.course.toLowerCase())
      if (student.profileStatus) searchableStrings.push(student.profileStatus.toLowerCase())
      if (student.accessCode) searchableStrings.push(student.accessCode.toLowerCase())
      
      const allText = searchableStrings.join(' ')
      
      // Student matches if EVERY keyword is found somewhere in their combined data/field names
      return keywords.every(kw => allText.includes(kw))
    })
  }, [students, query])

  // Export Helpers
  const exportCSV = () => {
    if (!results || results.length === 0) return
    const data = results.map(s => ({
      'Student Number': s.dynamic_data?.['Student Number'] || '—',
      'Name': `${s.dynamic_data?.['First Name'] || ''} ${s.dynamic_data?.['Last Name'] || ''}`,
      'Course': s.dynamic_data?.['Course'] || '—',
      'Matching Details': Object.entries(s.dynamic_data || {})
        .filter(([k, v]) => query.toLowerCase().split(/\s+/).some(kw => `${k} ${v}`.toLowerCase().includes(kw)))
        .map(([k, v]) => `${k}: ${v}`).join('; ')
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Search Results")
    XLSX.writeFile(wb, `Search_Results_${query.replace(/\s+/g, '_')}.csv`)
  }

  const exportPDF = () => {
    if (!results || results.length === 0) return
    console.log('Starting Search Result PDF Export...')
    try {
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text('Advanced Search Results', 14, 22)
      doc.setFontSize(11)
      doc.setTextColor(100)
      doc.text(`Query: "${query}"`, 14, 30)
      doc.text(`Found ${results.length} matches. Generated on: ${new Date().toLocaleString()}`, 14, 37)
      
      const data = results.map(s => [
        s.dynamic_data?.['Student Number'] || '—',
        `${s.dynamic_data?.['First Name'] || ''} ${s.dynamic_data?.['Last Name'] || ''}`,
        s.dynamic_data?.['Course'] || '—',
        Object.entries(s.dynamic_data || {})
          .filter(([k, v]) => query.toLowerCase().split(/\s+/).some(kw => `${k} ${v}`.toLowerCase().includes(kw)))
          .map(([k, v]) => `${k}: ${v}`).join(', ').substring(0, 50) + '...'
      ])

      autoTable(doc, {
        startY: 45,
        head: [['ID', 'Name', 'Course', 'Matches']],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: [232, 119, 34] }
      })
      
      doc.save(`Search_Results_${query.replace(/\s+/g, '_')}.pdf`)
      console.log('Search PDF Saved Successfully')
    } catch (err) {
      console.error('Search PDF Export Error:', err)
      showToast('Error generating PDF. Check console.', 'error')
    }
  }

  return (
    <div className="sl-root">
      <Header title="Advanced Student Search" subtitle="Query students by specific skills, affiliations, or any profile attributes." />
      
      <div className="sl-body">
        <div className="sl-card">
          <div className="sl-card-head">
            <div className="sl-head-top">
              <div>
                <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ padding: '6px 12px', height: 32, display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12 }}>
                  <ChevronLeft size={14} /> Back
                </button>
                <h2 className="sl-title">Search Criteria</h2>
              </div>
              <div className="sl-head-actions">
                <button className="sl-btn-outline" onClick={() => setQuery('')}>
                  <X size={14} /> Clear Search
                </button>
              </div>
            </div>
          </div>
          
          <div style={{ padding: '24px 28px' }}>
            {/* Main Search Interface */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div className="sl-search-wrap" style={{ flex: 1, maxWidth: 'none' }}>
                  <Search size={14} className="sl-search-icon" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="e.g. baseball journalism, or search specific skills..." 
                    className="sl-search-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    style={{ height: 48, fontSize: 14, paddingLeft: 40 }}
                  />
                  {query && (
                    <button 
                      onClick={() => setQuery('')}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button className="sl-btn-primary" style={{ height: 48, padding: '0 24px' }}>
                  <Search size={16} /> Search
                </button>
              </div>
              
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={12} />
                <span>Type multiple keywords separated by spaces to require all exactly. (e.g., <strong style={{color: 'var(--text)'}}>baseball journalism IT</strong>)</span>
              </div>
            </div>

            <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 32 }} />

            {/* Results Area */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="sl-drawer-section-title" style={{ margin: 0, background: 'rgba(230, 126, 34, 0.1)', color: 'var(--orange)' }}>
                  {results === null ? 'Results' : `${results.length} Matching Student${results.length !== 1 ? 's' : ''}`}
                </h3>
                {results && results.length > 0 && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="sl-btn-outline" onClick={exportPDF} style={{ padding: '6px 12px', fontSize: 12 }}>
                       <Download size={13} /> Export PDF
                    </button>
                    <button className="sl-btn-outline" onClick={exportCSV} style={{ padding: '6px 12px', fontSize: 12 }}>
                       <Download size={13} /> Export CSV
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results === null ? (
                  <div className="sl-empty" style={{ border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
                    <Search size={40} color="var(--border)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Ready to Search</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 300, margin: '0 auto' }}>Type keywords in the search bar above to query across all student records instantly.</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="sl-empty" style={{ border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
                    <Users size={32} color="var(--border)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No students match the selected criteria.</p>
                  </div>
                ) : (
                  results.map(s => {
                    const getVal = (name) => s.dynamic_data?.[name] || '—'
                    const studentNum = getVal('Student Number') || getVal('studentNumber') || '—'
                    const course = getVal('Course') || getVal('course')
                    const section = getVal('Section') || getVal('section')
                    const photoUrl = getVal('Photo URL') || getVal('photoURL') || '—'
                    const fullName = `${getVal('First Name')} ${getVal('Middle Name')} ${getVal('Last Name')}`.replace(/\s+/g, ' ').trim() || 'Unknown Student'
                    
                    return (
                      <div key={s.id} className="animate-in" style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16, transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                              {photoUrl !== '—' ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users size={22} color="var(--text-muted)" />}
                            </div>
                            
                            <div>
                              <div className="sl-stud-name" style={{ fontSize: 18, marginBottom: 2 }}>{fullName}</div>
                              <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                                <span className="sl-stud-num">ID: {studentNum}</span>
                                <span style={{ opacity: 0.5 }}>&middot;</span>
                                <span><strong>Section:</strong> {course} {section !== '—' && section !== undefined ? `Sec. ${section}` : ''}</span>
                              </div>
                            </div>
                          </div>

                          <button className="sl-btn-outline" onClick={() => navigate(`/students/${s.id}`)} style={{ padding: '8px 16px', borderRadius: 8 }}>
                            <Eye size={14} /> View Profile
                          </button>
                        </div>

                        {/* Matching Details Snippet */}
                        {query.trim() && (
                           <div style={{ 
                              padding: '12px 16px', 
                              background: 'rgba(232, 119, 34, 0.03)', 
                              borderRadius: 8, 
                              border: '1px solid rgba(232, 119, 34, 0.1)',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '8px 16px'
                           }}>
                              {(() => {
                                 const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 0)
                                 const matches = []
                                 
                                 Object.entries(s.dynamic_data || {}).forEach(([key, val]) => {
                                    const combined = `${key} ${val}`.toLowerCase()
                                    if (keywords.some(kw => combined.includes(kw))) {
                                       matches.push({ key, val })
                                    }
                                 })

                                 if (matches.length === 0) return <span style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>Matches metadata (ID/Course/Status)</span>

                                 return matches.slice(0, 5).map((m, idx) => (
                                    <div key={idx} style={{ fontSize: 12 }}>
                                       <strong style={{ color: 'var(--orange)', fontWeight: 600 }}>{m.key}:</strong> 
                                       <span style={{ marginLeft: 4, color: 'var(--text)' }}>
                                          {Array.isArray(m.val) ? m.val.join(', ') : String(m.val)}
                                       </span>
                                    </div>
                                 ))
                              })()}
                              {Object.keys(s.dynamic_data || {}).length > 5 && <span style={{ fontSize: 12, color: '#888' }}>+ more matches</span>}
                           </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  )
}
