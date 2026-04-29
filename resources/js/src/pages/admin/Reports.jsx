import React, { useState, useMemo, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import { 
  Users, UserCheck, Activity, FileText, Download, TrendingUp, PieChart as PieIcon, 
  BarChart as BarIcon, Search, Filter, Save, Calendar, ArrowRight, Eye, ChevronRight,
  Target, Zap, Clock, Bookmark, X, Check
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line 
} from 'recharts'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import '../../../../css/StudentList.css'

const COLORS = ['#E87722', '#2d2d2d', '#3498db', '#2ecc71', '#9b59b6', '#f1c40f', '#e74c3c']

export default function Reports() {
  const { students, enrollees, medicalRequests, dynamicFields, showToast, savedReports, setSavedReports } = useApp()

  // --- 1. STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, builder, saved
  const [drillDown, setDrillDown] = useState(null) // { type, filter, data }
  
  // Builder State
  const [builderConfig, setBuilderConfig] = useState({
    title: 'Custom Student Report',
    source: 'students',
    filters: {},
    displayType: 'table', // table, bar, pie
  })
  const [reportSearch, setReportSearch] = useState('')

  // --- 2. ANALYTICS LOGIC ---
  const stats = useMemo(() => {
    const total = students.length
    const active = students.filter(s => s.status !== 'archived').length
    const pending = students.filter(s => s.profileStatus === 'pending_form').length
    const forReview = students.filter(s => s.profileStatus === 'submitted_for_review').length
    
    // Trend logic (mocked for now as we don't have historical snapshots)
    return {
       total, active, pending, forReview,
       completionRate: total > 0 ? Math.round(((total - pending) / total) * 100) : 0
    }
  }, [students])

  const courseData = useMemo(() => {
    const dist = {}
    students.forEach(s => {
      const course = s.dynamic_data?.['Course'] || s.dynamic_data?.['course']
      if (course && course !== 'Other') {
        dist[course] = (dist[course] || 0) + 1
      }
    })
    return Object.entries(dist).map(([name, value]) => ({ name, value }))
  }, [students])

  const registrationTimeline = useMemo(() => {
    // Group by date for the last 14 days
    const days = {}
    for (let i = 13; i >= 0; i--) {
       const d = new Date()
       d.setDate(d.getDate() - i)
       const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
       days[label] = 0
    }
    
    students.forEach(s => {
       const d = new Date(s.dateRegistered || Date.now())
       const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
       if (days[label] !== undefined) days[label]++
    })
    
    return Object.entries(days).map(([name, count]) => ({ name, count }))
  }, [students])

  const skillDistribution = useMemo(() => {
     const skills = {}
     students.forEach(s => {
        const sValue = s.dynamic_data?.['Skills'] || s.dynamic_data?.['skills'] || ''
        const list = typeof sValue === 'string' ? sValue.split(/[,;]+/) : Array.isArray(sValue) ? sValue : []
        list.forEach(skill => {
           const cleaned = skill.trim().toLowerCase()
           if (cleaned) skills[cleaned] = (skills[cleaned] || 0) + 1
        })
     })
     return Object.entries(skills)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
  }, [students])

  const funnelData = useMemo(() => {
     const totalCodes = enrollees.length + students.filter(s => s.accessCode).length
     const started = enrollees.filter(e => e.status === 'submitted' || e.status === 'enrolled').length + students.filter(s => s.profileStatus === 'submitted_for_review' || s.profileStatus === 'Enrolled').length
     const completed = students.filter(s => s.profileStatus === 'Enrolled').length
     
     return [
        { name: 'Codes Generated', value: totalCodes, fill: '#3498db' },
        { name: 'Forms Submitted', value: started, fill: '#E87722' },
        { name: 'Fully Enrolled', value: completed, fill: '#2ecc71' }
     ]
  }, [students, enrollees])

  // --- 3. BUILDER LOGIC ---
  const availableFields = useMemo(() => {
     const fields = ['Course', 'Year Level', 'Gender', 'Status']
     dynamicFields.forEach(f => {
        if (f.module === 'violations' || f.type === 'file') return;
        if (!fields.includes(f.name)) fields.push(f.name)
     })
     return fields
  }, [dynamicFields])

  const filteredReportData = useMemo(() => {
     return students.filter(s => {
        // 1. NLP/Search Filter
        if (reportSearch) {
           const query = reportSearch.toLowerCase()
           const allText = JSON.stringify(s).toLowerCase()
           if (!allText.includes(query)) return false
        }
        
        // 2. Config Filters
        for (const [key, val] of Object.entries(builderConfig.filters)) {
           if (val === 'All' || !val) continue
           const sVal = s.dynamic_data?.[key] || s[key] || '—'
           if (String(sVal) !== String(val)) return false
        }
        
        return true
     })
  }, [students, builderConfig.filters, reportSearch])

  // --- 4. EXPORT LOGIC ---
  const exportPDF = () => {
    console.log('Insight Hub: Starting PDF Export...', { 
      title: builderConfig.title, 
      count: filteredReportData.length 
    })

    try {
      const doc = new jsPDF()
      
      // Header branding
      doc.setFillColor(45, 45, 45) // CCS Dark Gray
      doc.rect(0, 0, 210, 40, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.text('INSIGHT HUB: INSTITUTIONAL REPORT', 14, 25)
      
      doc.setTextColor(150, 150, 150)
      doc.setFontSize(10)
      doc.text(`Generated on ${new Date().toLocaleString()} · CCS Profiling System`, 14, 34)

      // Summary Stats
      doc.setTextColor(45, 45, 45)
      doc.setFontSize(14)
      doc.text('Summary Metrics', 14, 55)
      
      const summaryData = [
         ['Metric', 'Value'],
         ['Total Students', stats.total.toString()],
         ['Active Students', stats.active.toString()],
         ['Completion Rate', `${stats.completionRate}%`],
         ['Report Filter Count', filteredReportData.length.toString()]
      ]
      
      console.log('Generating Summary Table...')
      autoTable(doc, {
         startY: 60,
         head: [summaryData[0]],
         body: summaryData.slice(1),
         theme: 'grid',
         headStyles: { fillColor: [232, 119, 34] }
      })

      // Data Table
      doc.text('Student Data Detail', 14, doc.lastAutoTable?.finalY + 15 || 100)
      
      const tableData = filteredReportData.map(s => [
         s.dynamic_data?.['Student Number'] || '—',
         `${s.dynamic_data?.['First Name'] || ''} ${s.dynamic_data?.['Last Name'] || ''}`,
         s.dynamic_data?.['Course'] || '—',
         s.profileStatus || 'Enrolled'
      ])

      console.log('Generating Detail Table...')
      autoTable(doc, {
         startY: doc.lastAutoTable?.finalY + 20 || 120,
         head: [['ID', 'Name', 'Course', 'Status']],
         body: tableData,
         theme: 'striped',
         headStyles: { fillColor: [45, 45, 45] }
      })

      console.log('Saving Insight Hub PDF...')
      doc.save(`${builderConfig.title.replace(/\s+/g, '_')}.pdf`)
      showToast('Report exported successfully!', 'success')
    } catch (err) {
      console.error('Insight Hub PDF Export Error:', err)
      showToast('Error generating PDF report. Check console.', 'error')
    }
  }

  const exportExcel = () => {
    console.log('Insight Hub: Starting Excel Export...')
    try {
      const data = filteredReportData.map(s => {
        const row = {
          'Student Number': s.dynamic_data?.['Student Number'] || '—',
          'First Name': s.dynamic_data?.['First Name'] || '—',
          'Last Name': s.dynamic_data?.['Last Name'] || '—',
          'Course': s.dynamic_data?.['Course'] || '—',
          'Year Level': s.dynamic_data?.['Year Level'] || '—',
          'Gender': s.dynamic_data?.['Gender'] || '—',
          'Status': s.profileStatus || 'Enrolled'
        }
        
        // Add dynamic fields
        dynamicFields.forEach(f => {
           if (f.module === 'violations' || f.type === 'file') return;
           if (!row[f.name]) {
              row[f.name] = s.dynamic_data?.[f.name] || '—'
           }
        })
        
        return row
      })

      const ws = XLSX.utils.json_to_sheet(data)
      
      // Auto-size columns
      const colWidths = Object.keys(data[0] || {}).map(key => {
         const headerLen = key.length
         const maxContentLen = Math.max(...data.map(row => String(row[key] || '').length))
         return { wch: Math.min(Math.max(headerLen, maxContentLen) + 2, 50) }
      })
      ws['!cols'] = colWidths

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Institutional Report")
      XLSX.writeFile(wb, `${builderConfig.title.replace(/\s+/g, '_')}.xlsx`)
      showToast('Professional Excel report exported!', 'success')
    } catch (err) {
      console.error('Excel Export Error:', err)
      showToast('Error generating Excel file.', 'error')
    }
  }

  // --- 5. RENDER HELPERS ---
  const renderDashboard = () => (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Bar Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        <ReportCard label="Total Students" value={stats.total} icon={<Users />} trend="+4% from last month" color="#E87722" />
        <ReportCard label="Completion Rate" value={`${stats.completionRate}%`} icon={<Target />} trend="Improving" color="#2ecc71" />
        <ReportCard label="Pending Review" value={stats.forReview} icon={<Clock />} trend="Action needed" color="#3498db" />
        <ReportCard label="Active Alerts" value={medicalRequests.length} icon={<Activity />} trend="Medical alerts" color="#e74c3c" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Main Timeline Chart */}
        <div className="sl-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
             <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d2d2d' }}>Registration Velocity</h3>
             <div style={{ fontSize: 12, color: '#888' }}>Last 14 Days</div>
          </div>
          <div style={{ height: 300 }}>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrationTimeline}>
                   <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#E87722" stopOpacity={0.1}/>
                         <stop offset="95%" stopColor="#E87722" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: 11 }} />
                   <YAxis axisLine={false} tickLine={false} style={{ fontSize: 11 }} />
                   <Tooltip 
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#E87722', fontWeight: 600 }}
                   />
                   <Area type="monotone" dataKey="count" stroke="#E87722" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Course Pie Chart */}
        <div className="sl-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d2d2d', marginBottom: 24 }}>Course Distribution</h3>
          <div style={{ height: 300 }}>
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                   <Pie
                      data={courseData}
                      cx="50%"
                      cy="40%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      onClick={(data) => setDrillDown({ type: 'Course', filter: data.name, data: students.filter(s => (s.dynamic_data?.['Course'] || s.dynamic_data?.['course']) === data.name) })}
                   >
                      {courseData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cursor="pointer" />
                      ))}
                   </Pie>
                   <Tooltip />
                   <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 11, paddingTop: 20 }} />
                </PieChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {/* Skill Rankings */}
          <div className="sl-card" style={{ padding: 24 }}>
             <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2d2d2d', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} color="#E87722" /> Top Student Skills
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {skillDistribution.map((s, idx) => (
                   <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', width: 20 }}>{idx + 1}</div>
                      <div style={{ flex: 1 }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span>{s.name}</span>
                            <span style={{ fontWeight: 600 }}>{s.count}</span>
                         </div>
                         <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2 }}>
                            <div style={{ height: '100%', background: '#E87722', width: `${(s.count / skillDistribution[0].count) * 100}%`, borderRadius: 2 }}></div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Registration Funnel */}
          <div className="sl-card" style={{ padding: 24, gridColumn: 'span 2' }}>
             <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2d2d2d', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={16} color="#E87722" /> Enrollment Funnel Analysis
             </h3>
             <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={funnelData} layout="vertical" margin={{ left: 100 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: 12, fontWeight: 600 }} />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={30}>
                         {funnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                         ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
                <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Conversion</div>
                   <div style={{ fontSize: 18, fontWeight: 800, color: '#2ecc71' }}>
                      {funnelData[0].value > 0 ? Math.round((funnelData[2].value / funnelData[0].value) * 100) : 0}%
                   </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                   <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Dropout</div>
                   <div style={{ fontSize: 18, fontWeight: 800, color: '#e74c3c' }}>
                      {funnelData[0].value > 0 ? 100 - Math.round((funnelData[2].value / funnelData[0].value) * 100) : 0}%
                   </div>
                </div>
             </div>
          </div>
      </div>
    </div>
  )

  const renderBuilder = () => (
     <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        {/* Left Control Panel */}
        <div className="sl-card" style={{ padding: 24, height: 'fit-content' }}>
           <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={18} color="#E87722" /> Query Builder
           </h3>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                 <label>Report Title</label>
                 <input 
                    type="text" 
                    className="form-input" 
                    value={builderConfig.title} 
                    onChange={e => setBuilderConfig(p => ({ ...p, title: e.target.value }))} 
                 />
              </div>

              <div className="form-group">
                 <label>Data Source</label>
                 <select 
                    className="form-input" 
                    value={builderConfig.source} 
                    onChange={e => setBuilderConfig(p => ({ ...p, source: e.target.value }))}
                 >
                    <option value="students">Student Profiles</option>
                    <option value="medical">Medical Records</option>
                    <option value="academic">Academic Records</option>
                 </select>
              </div>

              <div style={{ borderTop: '1px solid #eee', pt: 20 }}>
                 <label style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 12, display: 'block' }}>Dynamic Filters</label>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {availableFields.slice(0, 6).map(field => (
                       <div key={field}>
                          <label style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>{field}</label>
                          <input 
                             placeholder="Search value..." 
                             className="form-input" 
                             style={{ height: 32, fontSize: 12 }}
                             value={builderConfig.filters[field] || ''}
                             onChange={e => setBuilderConfig(p => ({ ...p, filters: { ...p.filters, [field]: e.target.value } }))}
                          />
                       </div>
                    ))}
                 </div>
              </div>

              <button className="sl-btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={() => {
                 const id = Date.now()
                 setSavedReports(prev => [...prev, { ...builderConfig, id, createdAt: new Date().toISOString() }])
                 showToast('Report configuration saved!', 'success')
              }}>
                 <Save size={16} /> Save Config
              </button>
           </div>
        </div>

        {/* Right Data Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
           <div className="sl-card" style={{ padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className="sl-search-wrap" style={{ flex: 1 }}>
                 <Search size={16} className="sl-search-icon" />
                 <input 
                    placeholder="Natural language search: e.g. '3rd year IT students with Java'..." 
                    className="sl-search-input"
                    value={reportSearch}
                    onChange={e => setReportSearch(e.target.value)}
                 />
              </div>
              <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 4 }}>
                 <button 
                    onClick={() => setBuilderConfig(p => ({ ...p, displayType: 'table' }))}
                    style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: builderConfig.displayType === 'table' ? '#fff' : 'transparent', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, boxShadow: builderConfig.displayType === 'table' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                    <BarIcon size={12} /> Table
                 </button>
                 <button 
                    onClick={() => setBuilderConfig(p => ({ ...p, displayType: 'chart' }))}
                    style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: builderConfig.displayType === 'chart' ? '#fff' : 'transparent', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, boxShadow: builderConfig.displayType === 'chart' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                    <PieIcon size={12} /> Chart
                 </button>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                 <button className="sl-btn-outline" onClick={exportPDF}>
                    <Download size={16} /> Export PDF
                 </button>
                 <button className="sl-btn-outline" onClick={exportExcel}>
                    <FileText size={16} /> Export Excel
                 </button>
              </div>
           </div>

           <div className="sl-card" style={{ padding: 24, minHeight: 400 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                 <h2 style={{ fontSize: 20, fontWeight: 800 }}>{builderConfig.title}</h2>
                 <div style={{ fontSize: 13, color: '#888' }}>{filteredReportData.length} Results Found</div>
              </div>

              {builderConfig.displayType === 'table' ? (
                 <div style={{ overflowX: 'auto' }}>
                    <table className="sl-table">
                       <thead>
                          <tr>
                             <th>Student</th>
                             <th>Course</th>
                             <th>Year Level</th>
                             <th>Status</th>
                             <th>Match Snippet</th>
                          </tr>
                       </thead>
                       <tbody>
                          {filteredReportData.slice(0, 10).map(s => (
                             <tr key={s.id}>
                                <td>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                                         {s.dynamic_data?.['First Name']?.[0]}{s.dynamic_data?.['Last Name']?.[0]}
                                      </div>
                                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                                         {s.dynamic_data?.['First Name']} {s.dynamic_data?.['Last Name']}
                                      </div>
                                   </div>
                                </td>
                                <td>{s.dynamic_data?.['Course'] || '—'}</td>
                                <td>{s.dynamic_data?.['Year Level'] || '—'}</td>
                                <td>
                                   <span className={`am-badge`} style={{ 
                                      background: s.profileStatus === 'Enrolled' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(232, 119, 34, 0.1)',
                                      color: s.profileStatus === 'Enrolled' ? '#2ecc71' : '#E87722'
                                   }}>{s.profileStatus || 'Enrolled'}</span>
                                </td>
                                <td style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>
                                   {reportSearch ? 'Matching keywords found' : '—'}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              ) : (
                 <div style={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={courseData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(232, 119, 34, 0.05)' }} />
                          <Bar dataKey="value" fill="#E87722" radius={[6, 6, 0, 0]} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              )}
           </div>
        </div>
     </div>
  )

  return (
    <div className="sl-root">
      <Header 
        title="Insight Hub" 
        subtitle="Transform institutional data into strategic student registration insights." 
      />
      
      <div className="sl-body">
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid #e0d8d0', marginBottom: 32 }}>
           <TabItem label="Intelligence Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={16} />} />
           <TabItem label="Custom Report Builder" active={activeTab === 'builder'} onClick={() => setActiveTab('builder')} icon={<BarIcon size={16} />} />
           <TabItem label="Saved Configurations" active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} icon={<Bookmark size={16} />} />
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'builder' && renderBuilder()}
        
        {activeTab === 'saved' && (
           <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {savedReports.length === 0 ? (
                 <div className="sl-empty" style={{ gridColumn: '1/-1' }}>
                    <Bookmark size={40} color="#ccc" style={{ marginBottom: 16 }} />
                    <h3>No Saved Reports</h3>
                    <p>Create a custom report in the Builder tab and save it for quick access.</p>
                 </div>
              ) : (
                 savedReports.map(report => (
                    <div key={report.id} className="sl-card" style={{ padding: 24, cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => {
                       setBuilderConfig(report)
                       setActiveTab('builder')
                    }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <Bookmark size={18} color="#E87722" />
                          <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ccc' }} onClick={(e) => {
                             e.stopPropagation()
                             setSavedReports(prev => prev.filter(r => r.id !== report.id))
                          }}>
                             <X size={14} />
                          </button>
                       </div>
                       <h4 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{report.title}</h4>
                       <div style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={12} /> Saved {new Date(report.createdAt).toLocaleDateString()}
                       </div>
                       <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                          <ChevronRight size={16} color="#E87722" />
                       </div>
                    </div>
                 ))
              )}
           </div>
        )}

        {/* Drill Down Modal */}
        {drillDown && (
           <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div className="sl-card" style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                 <div style={{ padding: '24px 32px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                       <div style={{ fontSize: 11, color: '#E87722', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Drill Down Insight</div>
                       <h3 style={{ fontSize: 20, fontWeight: 800 }}>{drillDown.type}: {drillDown.filter}</h3>
                    </div>
                    <button onClick={() => setDrillDown(null)} style={{ border: 'none', background: '#f5f5f5', width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                       <X size={18} />
                    </button>
                 </div>
                 <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                       {drillDown.data.map(s => (
                          <div key={s.id} style={{ padding: 16, border: '1px solid #eee', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                   <Users size={18} color="#888" />
                                </div>
                                <div>
                                   <div style={{ fontWeight: 700 }}>{s.dynamic_data?.['First Name']} {s.dynamic_data?.['Last Name']}</div>
                                   <div style={{ fontSize: 12, color: '#888' }}>ID: {s.dynamic_data?.['Student Number'] || '—'}</div>
                                </div>
                             </div>
                             <button className="sl-btn-outline" style={{ fontSize: 12 }}>View Profile</button>
                          </div>
                       ))}
                    </div>
                 </div>
                 <div style={{ padding: 20, borderTop: '1px solid #eee', textAlign: 'right' }}>
                    <button className="sl-btn-primary" onClick={() => setDrillDown(null)}>Close View</button>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  )
}

function TabItem({ label, active, onClick, icon }) {
   return (
      <button 
         onClick={onClick}
         style={{ 
            padding: '16px 0', 
            border: 'none', 
            background: 'transparent', 
            borderBottom: active ? '3px solid #E87722' : '3px solid transparent',
            color: active ? '#2d2d2d' : '#888',
            fontWeight: active ? 700 : 500,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            transition: 'all 0.2s'
         }}
      >
         {icon}
         {label}
      </button>
   )
}

function ReportCard({ label, value, icon, trend, color }) {
  return (
    <div className="sl-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -10, top: -10, opacity: 0.05 }}>
         {React.cloneElement(icon, { size: 100, color })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
         <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}10`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {React.cloneElement(icon, { size: 20 })}
         </div>
         <div style={{ fontSize: 11, fontWeight: 700, color: color === '#2ecc71' ? '#2ecc71' : color === '#e74c3c' ? '#e74c3c' : '#888' }}>{trend}</div>
      </div>
      <div style={{ marginTop: 16 }}>
         <div style={{ fontSize: 28, fontWeight: 900, color: '#2d2d2d' }}>{value}</div>
         <div style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

function LayoutDashboard({ size }) { return <BarIcon size={size} /> }
