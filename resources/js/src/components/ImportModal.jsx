import React, { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, FileText, X, CheckCircle, AlertCircle, Download } from 'lucide-react'

/**
 * ImportModal — handles Excel (.xlsx/.xls/.csv) and PDF import.
 *
 * Props:
 *   open         – boolean
 *   onClose      – fn
 *   onImport     – fn(rows: object[])  called with array of mapped objects ready to save
 *   type         – 'student' | 'faculty'
 */

// ── Column mappings ───────────────────────────────────────────────────────────
const STUDENT_MAP = {
  'student number': 'studentNumber', 'studentnumber': 'studentNumber',
  'last name': 'lastName', 'lastname': 'lastName', 'surname': 'lastName',
  'first name': 'firstName', 'firstname': 'firstName', 'given name': 'firstName',
  'middle name': 'middleName', 'middlename': 'middleName', 'middle initial': 'middleName',
  'course': 'course', 'program': 'course',
  'year level': 'yearLevel', 'yearlevel': 'yearLevel', 'year': 'yearLevel',
  'section': 'section',
  'gender': 'gender', 'sex': 'gender', 'sex at birth': 'gender',
  'date of birth': 'dateOfBirth', 'dob': 'dateOfBirth', 'birthday': 'dateOfBirth',
  'civil status': 'civilStatus', 'civilstatus': 'civilStatus',
  'nationality': 'nationality',
  'religion': 'religion',
  'residency': 'residency',
  'home address': 'homeAddress', 'address': 'homeAddress',
  'contact number': 'contactNumber', 'contact': 'contactNumber', 'mobile': 'contactNumber',
  'alt contact': 'altContactNumber', 'alternate contact': 'altContactNumber',
  'email': 'emailAddress', 'email address': 'emailAddress', 'emailaddress': 'emailAddress',
  'last school': 'lastSchool', 'school': 'lastSchool',
  'last year attended': 'lastYearAttended', 'graduation year': 'lastYearAttended',
  'honors': 'honors', 'awards': 'honors',
  'lrn': 'lrn', 'learner reference number': 'lrn',
  'father name': 'fatherName', 'father': 'fatherName',
  'mother name': 'motherName', 'mother': 'motherName',
  'guardian': 'guardianName', 'guardian name': 'guardianName',
}

const FACULTY_MAP = {
  'faculty number': 'facultyNumber', 'facultynumber': 'facultyNumber', 'id': 'facultyNumber',
  'last name': 'lastName', 'lastname': 'lastName', 'surname': 'lastName',
  'first name': 'firstName', 'firstname': 'firstName',
  'middle name': 'middleName', 'middlename': 'middleName',
  'position': 'position', 'designation': 'position',
  'gender': 'gender', 'sex': 'gender',
  'status': 'status',
  'date of birth': 'dateOfBirth', 'dob': 'dateOfBirth',
  'specialization': 'specialization', 'expertise': 'specialization',
  'highest degree': 'highestDegree', 'degree': 'highestDegree',
  'year completed': 'yearCompleted',
  'contact number': 'contactNumber', 'contact': 'contactNumber',
  'email': 'emailAddress', 'email address': 'emailAddress',
  'home address': 'homeAddress', 'address': 'homeAddress',
}

// ── PDF text pattern extractors ───────────────────────────────────────────────
function extractStudentsFromText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const students = []
  // Try to find rows that look like student data
  // Pattern: student number followed by name
  const snPattern = /#?\d{7}/
  let current = null
  for (const line of lines) {
    if (snPattern.test(line)) {
      if (current) students.push(current)
      const parts = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(Boolean)
      current = {
        studentNumber: parts.find(p => snPattern.test(p)) || '',
        lastName: '', firstName: '', middleName: '',
        course: '', yearLevel: '', section: '', gender: '',
        emailAddress: '', contactNumber: ''
      }
      // Try to parse remaining parts
      const nameParts = parts.filter(p => !snPattern.test(p))
      if (nameParts.length > 0) {
        const nameStr = nameParts[0]
        const nameArr = nameStr.split(',').map(s => s.trim())
        if (nameArr.length >= 2) {
          current.lastName = nameArr[0]
          const fnParts = nameArr[1].split(' ')
          current.firstName = fnParts[0] || ''
          current.middleName = fnParts.slice(1).join(' ') || ''
        } else {
          current.firstName = nameStr
        }
      }
    } else if (current) {
      // Try to extract course/year from line
      const courseMatch = line.match(/\b(IT|CS|IS|BSIT|BSCS|BSIS)\b/)
      if (courseMatch && !current.course) {
        current.course = courseMatch[1].replace('BS', '')
      }
      const yearMatch = line.match(/(\d)(st|nd|rd|th)\s+year/i)
      if (yearMatch && !current.yearLevel) {
        current.yearLevel = `${yearMatch[1]}${yearMatch[2]} year`
      }
      const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/)
      if (emailMatch && !current.emailAddress) {
        current.emailAddress = emailMatch[0]
      }
      const phoneMatch = line.match(/\+?63\s?9\d{2}\s?\d{3}\s?\d{4}/)
      if (phoneMatch && !current.contactNumber) {
        current.contactNumber = phoneMatch[0]
      }
    }
  }
  if (current) students.push(current)
  return students
}

function extractFacultyFromText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const members = []
  const fnPattern = /#?\d{7}/
  let current = null
  for (const line of lines) {
    if (fnPattern.test(line)) {
      if (current) members.push(current)
      const parts = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(Boolean)
      current = {
        facultyNumber: parts.find(p => fnPattern.test(p)) || '',
        lastName: '', firstName: '', middleName: '',
        position: '', gender: '', status: 'F',
        emailAddress: '', contactNumber: '', specialization: ''
      }
      const nameParts = parts.filter(p => !fnPattern.test(p))
      if (nameParts.length > 0) {
        const nameStr = nameParts[0]
        const nameArr = nameStr.split(',').map(s => s.trim())
        if (nameArr.length >= 2) {
          current.lastName = nameArr[0]
          const fnParts = nameArr[1].split(' ')
          current.firstName = fnParts[0] || ''
          current.middleName = fnParts.slice(1).join(' ') || ''
        }
      }
    } else if (current) {
      const posKeywords = ['Professor', 'Instructor', 'Secretary', 'Dean', 'Chair', 'Assistant', 'Associate']
      for (const kw of posKeywords) {
        if (line.includes(kw) && !current.position) {
          current.position = line
          break
        }
      }
      const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/)
      if (emailMatch && !current.emailAddress) current.emailAddress = emailMatch[0]
    }
  }
  if (current) members.push(current)
  return members
}

// ── Template generators ───────────────────────────────────────────────────────
function downloadTemplate(type) {
  let headers, sample
  if (type === 'student') {
    headers = ['Student Number','Last Name','First Name','Middle Name','Course','Year Level','Section','Gender','Date of Birth','Civil Status','Nationality','Religion','Residency','Home Address','Contact Number','Alt Contact','Email Address','Last School','Last Year Attended','Honors','LRN']
    sample = ['#2200001','Dela Cruz','Juan','M.','IT','1st year','A','Male','2004-01-15','Single','Filipino','Catholic','Resident','123 Sample St., Calamba','09123456789','','juan@email.com','Sample NHS','2022','','123456789012']
  } else {
    headers = ['Faculty Number','Last Name','First Name','Middle Name','Position','Gender','Status','Date of Birth','Specialization','Highest Degree','Year Completed','Contact Number','Email Address','Home Address']
    sample = ['#0000010','Santos','Maria','C.','Associate Professor','Female','F','1985-05-10','Software Engineering','Master of Science in CS','2010','09987654321','maria@pnc.edu.ph','45 Sample Ave., Los Baños']
  }
  const csv = [headers.join(','), sample.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${type}_import_template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ImportModal({ open, onClose, onImport, type = 'student' }) {
  const [step, setStep] = useState('upload') // 'upload' | 'preview' | 'done'
  const [parsedRows, setParsedRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  if (!open) return null

  const reset = () => {
    setStep('upload'); setParsedRows([]); setFileName(''); setError(''); setLoading(false)
  }
  const handleClose = () => { reset(); onClose() }

  const mapRow = (rawRow, colMap) => {
    const mapped = {}
    for (const [rawKey, value] of Object.entries(rawRow)) {
      const normalKey = String(rawKey).toLowerCase().trim()
      const field = colMap[normalKey]
      if (field) mapped[field] = String(value ?? '').trim()
    }
    return mapped
  }

  const parseExcel = async (file) => {
    setLoading(true); setError('')
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const colMap = type === 'student' ? STUDENT_MAP : FACULTY_MAP
      const mapped = rawRows.map(r => mapRow(r, colMap)).filter(r =>
        type === 'student' ? (r.lastName || r.studentNumber) : (r.lastName || r.facultyNumber)
      )
      if (mapped.length === 0) {
        setError('No recognizable data found. Please check that column headers match the template.')
        setLoading(false); return
      }
      setParsedRows(mapped); setStep('preview')
    } catch (e) {
      setError('Failed to parse file: ' + e.message)
    }
    setLoading(false)
  }

  const parsePdf = async (file) => {
    setLoading(true); setError('')
    try {
      // Try to extract text from PDF using pdfjs
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        fullText += content.items.map(item => item.str).join(' ') + '\n'
      }
      const extracted = type === 'student'
        ? extractStudentsFromText(fullText)
        : extractFacultyFromText(fullText)
      if (extracted.length === 0) {
        // Fallback: show empty template rows for manual entry
        const emptyRow = type === 'student'
          ? { studentNumber: '', lastName: '', firstName: '', middleName: '', course: 'IT', yearLevel: '1st year', section: 'A', gender: 'Male', emailAddress: '', contactNumber: '' }
          : { facultyNumber: '', lastName: '', firstName: '', middleName: '', position: 'Instructor', gender: 'Female', status: 'F', emailAddress: '', contactNumber: '' }
        setParsedRows([emptyRow])
        setError('PDF text extraction found limited data. Please fill in the fields below manually.')
      } else {
        setParsedRows(extracted)
      }
      setStep('preview')
    } catch (e) {
      // Fallback to manual entry
      const emptyRow = type === 'student'
        ? { studentNumber: '', lastName: '', firstName: '', middleName: '', course: 'IT', yearLevel: '1st year', section: 'A', gender: 'Male', emailAddress: '', contactNumber: '' }
        : { facultyNumber: '', lastName: '', firstName: '', middleName: '', position: 'Instructor', gender: 'Female', status: 'F', emailAddress: '', contactNumber: '' }
      setParsedRows([emptyRow])
      setError('Could not auto-extract PDF data. Please fill in the fields manually.')
      setStep('preview')
    }
    setLoading(false)
  }

  const handleFile = async (file) => {
    if (!file) return
    setFileName(file.name)
    const ext = file.name.split('.').pop().toLowerCase()
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      await parseExcel(file)
    } else if (ext === 'pdf') {
      await parsePdf(file)
    } else {
      setError('Unsupported file type. Please use .xlsx, .xls, .csv, or .pdf')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const updateCell = (rowIdx, field, value) => {
    setParsedRows(prev => {
      const next = [...prev]
      next[rowIdx] = { ...next[rowIdx], [field]: value }
      return next
    })
  }

  const addEmptyRow = () => {
    const emptyRow = type === 'student'
      ? { studentNumber: '', lastName: '', firstName: '', middleName: '', course: 'IT', yearLevel: '1st year', section: 'A', gender: 'Male', emailAddress: '', contactNumber: '' }
      : { facultyNumber: '', lastName: '', firstName: '', middleName: '', position: 'Instructor', gender: 'Female', status: 'F', emailAddress: '', contactNumber: '' }
    setParsedRows(prev => [...prev, emptyRow])
  }

  const removeRow = (i) => setParsedRows(prev => prev.filter((_, idx) => idx !== i))

  const handleConfirmImport = () => {
    const valid = parsedRows.filter(r =>
      type === 'student' ? r.lastName?.trim() : r.lastName?.trim()
    )
    onImport(valid)
    setStep('done')
    setTimeout(() => { handleClose() }, 1500)
  }

  // Preview columns
  const studentCols = [
    { key: type === 'student' ? 'studentNumber' : 'facultyNumber', label: type === 'student' ? 'Student #' : 'Faculty #' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'firstName', label: 'First Name' },
    { key: 'middleName', label: 'M.I.' },
    { key: type === 'student' ? 'course' : 'position', label: type === 'student' ? 'Course' : 'Position' },
    ...(type === 'student' ? [{ key: 'yearLevel', label: 'Year' }, { key: 'section', label: 'Sec.' }] : [{ key: 'status', label: 'Status' }]),
    { key: 'gender', label: 'Gender' },
    { key: 'emailAddress', label: 'Email' },
    { key: 'contactNumber', label: 'Contact' },
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div style={{ background: 'var(--card-bg)', borderRadius: 14, width: '100%', maxWidth: step === 'preview' ? 900 : 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>Import {type === 'student' ? 'Students' : 'Faculty'}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Supports Excel (.xlsx, .xls, .csv) and PDF files</p>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: 'var(--card-bg)' }}>
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Template download */}
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Don't have a file yet?</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Download the template and fill it in.</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => downloadTemplate(type)}><Download size={13} /> Download Template</button>
              </div>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .2s, background .2s', color: 'var(--text)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.background = 'var(--bg)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                {loading ? (
                  <div style={{ color: 'var(--orange)', fontWeight: 700 }}>Parsing file…</div>
                ) : (
                  <>
                    <Upload size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Drop your file here, or click to browse</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Accepts .xlsx, .xls, .csv, .pdf</div>
                  </>
                )}
              </div>

              {/* Format cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--card-bg)' }}>
                  <FileSpreadsheet size={28} color="#2e7d32" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>Excel / CSV</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Columns are auto-mapped from headers. Download the template for the correct format.</div>
                  </div>
                </div>
                <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--card-bg)' }}>
                  <FileText size={28} color="#c62828" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: 'var(--text)' }}>PDF</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>System scans and extracts data automatically. Review before importing.</div>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ display: 'flex', gap: 8, background: '#fce4ec', padding: '10px 14px', borderRadius: 8, color: '#c62828', fontSize: 13, alignItems: 'center' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview & edit */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Review imported data — {parsedRows.length} record{parsedRows.length !== 1 ? 's' : ''} found</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>From: {fileName} · You can edit cells before importing</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={addEmptyRow}><span style={{ fontSize: 16 }}>+</span> Add Row</button>
              </div>

              {error && (
                <div style={{ display: 'flex', gap: 8, background: '#fff3e0', padding: '8px 12px', borderRadius: 8, color: '#e65100', fontSize: 12, alignItems: 'center' }}>
                  <AlertCircle size={13} /> {error}
                </div>
              )}

              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table style={{ fontSize: 12, minWidth: 700 }}>
                  <thead>
                    <tr>
                      {studentCols.map(c => <th key={c.key} style={{ fontSize: 11, padding: '8px 10px' }}>{c.label}</th>)}
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i}>
                        {studentCols.map(col => (
                          <td key={col.key} style={{ padding: '4px 6px', color: 'var(--text)' }}>
                            {['course', 'yearLevel', 'section', 'gender', 'status', 'position'].includes(col.key) ? (
                              <select
                                value={row[col.key] || ''}
                                onChange={e => updateCell(i, col.key, e.target.value)}
                                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', fontSize: 12, fontFamily: 'Nunito, sans-serif', background: 'var(--card-bg)', color: 'var(--text)' }}
                              >
                                {col.key === 'course' && ['IT', 'CS', 'IS'].map(v => <option key={v}>{v}</option>)}
                                {col.key === 'yearLevel' && ['1st year','2nd year','3rd year','4th year'].map(v => <option key={v}>{v}</option>)}
                                {col.key === 'section' && ['A','B','C','D'].map(v => <option key={v}>{v}</option>)}
                                {col.key === 'gender' && ['Male','Female','Other'].map(v => <option key={v}>{v}</option>)}
                                {col.key === 'status' && ['F','P','COS'].map(v => <option key={v}>{v}</option>)}
                                {col.key === 'position' && ['Professor','Associate Professor','Assistant Professor','Instructor','Secretary','Dean','Program Chair'].map(v => <option key={v}>{v}</option>)}
                              </select>
                            ) : (
                              <input
                                value={row[col.key] || ''}
                                onChange={e => updateCell(i, col.key, e.target.value)}
                                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 6px', fontSize: 12, fontFamily: 'Nunito, sans-serif', minWidth: col.key === 'emailAddress' ? 160 : 80, background: 'var(--card-bg)', color: 'var(--text)' }}
                              />
                            )}
                          </td>
                        ))}
                        <td style={{ padding: '4px 6px' }}>
                          <button onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
                            <X size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckCircle size={52} color="#2e7d32" style={{ marginBottom: 12 }} />
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6, color: 'var(--text)' }}>Import Successful!</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{parsedRows.length} record{parsedRows.length !== 1 ? 's' : ''} imported.</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'done' && (
          <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {step === 'preview' ? `${parsedRows.length} row${parsedRows.length !== 1 ? 's' : ''} ready to import` : 'Supported: .xlsx .xls .csv .pdf'}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {step === 'preview' && (
                <button className="btn btn-outline" onClick={() => { setStep('upload'); setError('') }}>← Back</button>
              )}
              <button className="btn btn-outline" onClick={handleClose}>Cancel</button>
              {step === 'preview' && parsedRows.length > 0 && (
                <button className="btn btn-primary" onClick={handleConfirmImport}>
                  Import {parsedRows.length} Record{parsedRows.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
