import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import Header from '../../components/Header'
import Modal from '../../components/Modal'
import {
  ChevronRight,
  FileText,
  Download,
  Send,
} from 'lucide-react'

// Helpers
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

const fmtSize = (bytes) => {
  if (!bytes) return '—'
  const kb = bytes / 1024
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`
}

const statusBadge = (status) => {
  const map = {
    Pending: { bg: 'rgba(230,126,34,.15)', color: '#e67e22' },
    Fulfilled: { bg: 'rgba(39,174,96,.15)', color: '#27ae60' },
    Reviewed: { bg: 'rgba(52,152,219,.15)', color: '#3498db' },
    Rejected: { bg: 'rgba(231,76,60,.15)', color: '#e74c3c' },
    Cancelled: { bg: 'rgba(149,165,166,.15)', color: '#95a5a6' },
    Uploaded: { bg: 'rgba(52,152,219,.15)', color: '#3498db' },
  }

  const s = map[status] || map.Pending

  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  )
}

const MEDICAL_RECORD_TYPE_OPTIONS = [
  'Medical Certificate',
  'Vaccination Record',
  'Laboratory Result',
  'Prescription',
  'Physical Examination Result',
  'X-Ray Result',
  'Dental Record',
  'Consultation Summary',
  'Immunization Record',
  'Clinic Clearance',
  'Fit-to-Study Certificate',
  'Other',
]

const formatDateInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDeadlineFromUrgency = (urgency) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const deadline = new Date(today)

  if (urgency === 'Routine (5-7 days)') deadline.setDate(deadline.getDate() + 7)
  if (urgency === 'Urgent (2-3 days)') deadline.setDate(deadline.getDate() + 3)
  if (urgency === 'Emergency (Same day)') deadline.setDate(deadline.getDate())

  return formatDateInput(deadline)
}

export default function MedicalRecords() {
  const { id } = useParams()

  const {
  students,
  archivedStudents,
  submitMedicalRequest,
  isAdmin,
  updateStudent,
  medicalRequests,
  adminMedicalRequests,
  studentMedicalDocs,
  requestMedicalRecord,
  updateMedicalRequestStatus,
  deleteMedicalRequest,
  addNotification, 
  user,
} = useApp()

  const student =
    students.find((s) => s.id === Number(id)) ||
    (archivedStudents || []).find((s) => s.id === Number(id))

  const [requestOpen, setRequestOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const [reqForm, setReqForm] = useState({
    recordType: '',
    customRecordType: '',
    reason: '',
    urgency: '',
    notes: '',
  })

  const [medForm, setMedForm] = useState({})
  const [reqErrors, setReqErrors] = useState({})
  const [medErrors, setMedErrors] = useState({})

  const [sendReqOpen, setSendReqOpen] = useState(false)
  const [sendForm, setSendForm] = useState({
    recordType: '',
    customRecordType: '',
    reason: '',
    urgency: '',
    notes: '',
    deadline: '',
  })
  const [sendErrors, setSendErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [statusTab, setStatusTab] = useState('requests')

  if (!student) {
    return (
      <div>
        <Header
          title="Student Information"
          subtitle="Manage student profiles and medical records"
        />
        <div style={{ padding: 24 }}>
          <p style={{ color: 'var(--text)' }}>Student not found.</p>
          <Link to="/students" style={{ color: 'var(--orange)' }}>
            Back
          </Link>
        </div>
      </div>
    )
  }

  const rf = (k, v) => setReqForm((p) => ({ ...p, [k]: v }))
  const mf = (k, v) => setMedForm((p) => ({ ...p, [k]: v }))
  const sf = (k, v) => setSendForm((p) => ({ ...p, [k]: v }))
  const handleSendUrgencyChange = (urgency) =>
    setSendForm((p) => ({
      ...p,
      urgency,
      deadline: urgency ? getDeadlineFromUrgency(urgency) : '',
    }))

  const validateReq = () => {
    const e = {}
    const selectedRecordType =
      reqForm.recordType === 'Other'
        ? reqForm.customRecordType.trim()
        : reqForm.recordType.trim()
    if (!selectedRecordType) e.recordType = 'Record type is required'
    if (!reqForm.reason) e.reason = 'Reason is required'
    if (!reqForm.urgency) e.urgency = 'Urgency level is required'
    setReqErrors(e)
    return !Object.keys(e).length
  }

  const validateMed = () => {
    const e = {}
    if (medForm.notes && medForm.notes.length > 1000) {
      e.notes = 'Notes must be 1000 characters or less.'
    }
    setMedErrors(e)
    return !Object.keys(e).length
  }

  const validateSend = () => {
    const e = {}
    const selectedRecordType =
      sendForm.recordType === 'Other'
        ? sendForm.customRecordType.trim()
        : sendForm.recordType.trim()

    if (!selectedRecordType) {
      e.recordType = 'Record type is required.'
    } else if (selectedRecordType.length > 255) {
      e.recordType = 'Too long (max 255 characters).'
    }

    if (!sendForm.reason.trim()) e.reason = 'Reason is required.'
    if (!sendForm.urgency) e.urgency = 'Urgency level is required.'
    if (sendForm.notes.length > 1000) e.notes = 'Notes too long (max 1000 characters).'

    if (sendForm.deadline) {
      const dl = new Date(sendForm.deadline)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (dl < today) e.deadline = 'Deadline must be today or in the future.'
    }

    setSendErrors(e)
    return !Object.keys(e).length
  }

  const handleRequest = () => {
    if (!validateReq()) return
    const selectedRecordType =
      reqForm.recordType === 'Other'
        ? reqForm.customRecordType.trim()
        : reqForm.recordType.trim()

    submitMedicalRequest({
      ...reqForm,
      recordType: selectedRecordType,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      studentNumber: student.studentNumber,
      email: student.emailAddress,
      contact: student.contactNumber,
    })

    setReqForm({
      recordType: '',
      customRecordType: '',
      reason: '',
      urgency: '',
      notes: '',
    })
    setRequestOpen(false)
  }

  const openEditMed = () => {
    setMedForm({
      allergies: '',
      conditions: '',
      surgeries: '',
      medications: '',
      familyHistory: '',
      notes: '',
      ...(student.medicalRecord || {}),
    })
    setMedErrors({})
    setEditOpen(true)
  }

  const handleSaveMed = () => {
    if (!validateMed()) return
    updateStudent(student.id, { medicalRecord: { ...medForm } })
    setEditOpen(false)
  }

 const handleSendRequest = async () => {
  if (!validateSend()) return
  const selectedRecordType =
    sendForm.recordType === 'Other'
      ? sendForm.customRecordType.trim()
      : sendForm.recordType.trim()

  setSending(true)
  try {
    await requestMedicalRecord({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      studentNumber: student.studentNumber,
      email: student.emailAddress,
      contact: student.contactNumber,
      recordType: selectedRecordType,
      reason: sendForm.reason.trim(),
      urgency: sendForm.urgency,
      notes: sendForm.notes.trim(),
      deadline: sendForm.deadline || null,
      requestedByName: user?.name || 'Admin',
    })

    // ✅ Add this — push a notification visible to the student
    addNotification(
      'warning',
      'Medical Document Requested',
      `Admin has requested your "${selectedRecordType}" — Reason: ${sendForm.reason.trim()} · Urgency: ${sendForm.urgency}${sendForm.deadline ? ` · Due: ${sendForm.deadline}` : ''}`
    )

    setSendForm({ recordType: '', customRecordType: '', reason: '', urgency: '', notes: '', deadline: '' })
    setSendErrors({})
    setSendReqOpen(false)
  } finally {
    setSending(false)
  }
}
const renderMedicalRecords = () => {
  const [uploadingId, setUploadingId] = useState(null)
  const [uploadError, setUploadError] = useState('')

  const handleFulfill = async (reqId, file) => {
    if (!file) return
    setUploadingId(reqId)
    setUploadError('')
    const formData = new FormData()
    formData.append('file', file)
    const result = await fulfillMedicalRequest(reqId, formData)
    if (!result.success) setUploadError(result.message || 'Upload failed.')
    setUploadingId(null)
  }

  return (
    <div className="sp-page">
      <div className="sp-panel" style={{ padding: 24 }}>
        <h3 style={{ fontWeight: 800, fontSize: 15, color: 'var(--heading-color)', marginBottom: 4 }}>
          Medical Document Requests
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          The admin has requested the following documents from you. Please upload the required PDF.
        </p>

        {myMedicalRequests.length === 0 ? (
          <div className="sp-empty-full" style={{ minHeight: 200 }}>
            <Shield size={36} />
            <p>No medical document requests at this time.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {myMedicalRequests.map(req => (
              <div key={req.id} style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '16px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{req.recordType}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {req.reason} · {req.urgency}
                      {req.deadline && ` · Due: ${new Date(req.deadline).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                    </div>
                    {req.notes && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                        Note: {req.notes}
                      </div>
                    )}
                  </div>
                  <span style={{
                    background: req.status === 'Fulfilled' ? 'rgba(39,174,96,.15)' : req.status === 'Reviewed' ? 'rgba(52,152,219,.15)' : 'rgba(230,126,34,.15)',
                    color: req.status === 'Fulfilled' ? '#27ae60' : req.status === 'Reviewed' ? '#3498db' : '#e67e22',
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  }}>
                    {req.status}
                  </span>
                </div>

                {req.status === 'Pending' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: 'var(--orange)', color: '#fff',
                      padding: '8px 16px', borderRadius: 8,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      <Send size={13} />
                      {uploadingId === req.id ? 'Uploading…' : 'Upload PDF'}
                      <input
                        type="file" accept=".pdf" style={{ display: 'none' }}
                        disabled={uploadingId === req.id}
                        onChange={e => handleFulfill(req.id, e.target.files[0])}
                      />
                    </label>
                    {uploadError && uploadingId === null && (
                      <span style={{ fontSize: 11, color: '#e74c3c', marginLeft: 10 }}>{uploadError}</span>
                    )}
                  </div>
                )}

                {req.status === 'Fulfilled' && (
                  <div style={{ fontSize: 12, color: '#27ae60', fontWeight: 600, marginTop: 8 }}>
                    ✓ Document submitted successfully.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
  const mr = {
    allergies: '',
    conditions: '',
    surgeries: '',
    medications: '',
    familyHistory: '',
    notes: '',
    ...(student.medicalRecord || {}),
  }

  const getStudentNumber = (source = {}) =>
    String(source.studentNumber || source.student_number || source.dynamic_data?.['Student Number'] || source.dynamicData?.['Student Number'] || '').trim().replace('#', '').toLowerCase()
  const getStudentName = (source = {}) => {
    const data = source.dynamic_data || source.dynamicData || {}
    const explicit = source.studentName || source.student_name || source.name || data['Student Full Name'] || data['Full Name']
    if (explicit) return String(explicit).replace(/\s+/g, ' ').trim().toLowerCase()
    return `${source.firstName || source.first_name || data['First Name'] || ''} ${source.middleName || source.middle_name || data['Middle Name'] || ''} ${source.lastName || source.last_name || data['Last Name'] || ''}`.replace(/\s+/g, ' ').trim().toLowerCase()
  }
  const studentNumber = getStudentNumber(student)
  const studentFullName = getStudentName(student)
  const studentShortName = `${student.firstName || student.first_name || student.dynamic_data?.['First Name'] || student.dynamicData?.['First Name'] || ''} ${student.lastName || student.last_name || student.dynamic_data?.['Last Name'] || student.dynamicData?.['Last Name'] || ''}`.replace(/\s+/g, ' ').trim().toLowerCase()
  const sameStudent = (record) => {
    const recordStudentId = String(record?.studentId ?? '').trim()
    const recordStudentNumber = getStudentNumber(record)
    const recordStudentName = getStudentName(record)
    return (
      recordStudentId === String(student.id ?? '').trim() ||
      (studentNumber && recordStudentNumber === studentNumber) ||
      (studentFullName && recordStudentName === studentFullName) ||
      (studentShortName && recordStudentName === studentShortName)
    )
  }

  const myReqs = (adminMedicalRequests || []).filter(
    (r) => sameStudent(r) && r.request_type === 'admin_request'
  )

  const uploadSource = [
    ...(studentMedicalDocs || []),
    ...(medicalRequests || []).filter((r) => (r.request_type || r.requestType) === 'student_upload' || r.status === 'Uploaded' || r.fileName || r.file_name || r.filePath || r.file_path),
  ]
  const seenUploads = new Set()
  const myUploads = uploadSource.filter((d) => {
    if (!sameStudent(d)) return false
    const key = d.id ? `id:${d.id}` : `${d.studentId || d.studentNumber || d.studentName}-${d.fileName || d.file_name || d.recordType}`
    if (seenUploads.has(key)) return false
    seenUploads.add(key)
    return true
  })

  const pendingCount = myReqs.filter((r) => r.status === 'Pending').length

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <Header
        title="Student Information"
        subtitle="Manage student profiles and medical records"
      />

      <div style={{ padding: 24 }}>
        <div className="breadcrumb">
          <Link to="/students" style={{ color: 'var(--text-muted)' }}>
            Student List
          </Link>
          <ChevronRight size={12} color="var(--text-muted)" />
          <Link to={`/students/${id}`} style={{ color: 'var(--text-muted)' }}>
            Student Profile
          </Link>
          <ChevronRight size={12} color="var(--text-muted)" />
          <span style={{ color: 'var(--text)' }}>Medical Records</span>
        </div>

        <div
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            position: 'relative',
            minHeight: 280,
            background:
              'linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 60%, var(--black) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
            padding: 40,
          }}
        >
          <p
            style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: 15,
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            All medical records must be requested directly from the clinic and
            require the patient&apos;s authorization, as they are strictly
            confidential.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >

            {isAdmin && (
              <button
                className="btn"
                onClick={() => setStatusTab('uploads')}
                style={{
                  background: 'rgba(255,255,255,.2)',
                  color: '#fff',
                  border: '2px solid rgba(255,255,255,.6)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <FileText size={14} /> See Student Uploaded Medical Records
              </button>
            )}

            {isAdmin && (
              <button
                className="btn"
                onClick={() => setSendReqOpen(true)}
                style={{
                  background: 'rgba(255,255,255,.15)',
                  color: '#fff',
                  border: '2px solid rgba(255,255,255,.4)',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Send size={14} /> Request Document from Student
              </button>
            )}
          </div>
        </div>

        {isAdmin && (
          <div
            style={{
              marginTop: 24,
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  color: 'var(--heading-color)',
                }}
              >
                Document Requests & Uploads
              </h3>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 999,
                    padding: '6px 10px',
                  }}
                >
                  Uploaded Files: {myUploads.length}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => setSendReqOpen(true)}
                  style={{
                    fontSize: 12,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Send size={12} /> New Request
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--border)',
                padding: '0 20px',
              }}
            >
              {[
                {
                  key: 'requests',
                  label: 'Requests Sent',
                  count: myReqs.length,
                  badge: pendingCount,
                },
                {
                  key: 'uploads',
                  label: 'Student Uploads',
                  count: myUploads.length,
                  badge: 0,
                },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setStatusTab(t.key)}
                  style={{
                    padding: '12px 0',
                    marginRight: 20,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    color:
                      statusTab === t.key
                        ? 'var(--orange)'
                        : 'var(--text-muted)',
                    borderBottom:
                      statusTab === t.key
                        ? '2px solid var(--orange)'
                        : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span
                      style={{
                        background:
                          t.badge > 0
                            ? 'rgba(230,126,34,.15)'
                            : 'var(--border)',
                        color: t.badge > 0 ? '#e67e22' : 'var(--text-muted)',
                        borderRadius: 20,
                        padding: '1px 7px',
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minHeight: 120,
              }}
            >
              {statusTab === 'requests' &&
                (myReqs.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '24px 0',
                      color: 'var(--text-muted)',
                      fontSize: 13,
                    }}
                  >
                    No requests sent yet. Use "New Request" to ask the student
                    for a document.
                  </div>
                ) : (
                  myReqs.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: 'var(--text)',
                            marginBottom: 2,
                          }}
                        >
                          {req.recordType}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {req.reason} · {req.urgency}
                          {req.deadline && ` · Due: ${fmtDate(req.deadline)}`}
                          {req.fulfilledAt &&
                            ` · Fulfilled: ${fmtDate(req.fulfilledAt)}`}
                        </div>
                      </div>

                      {statusBadge(req.status)}

                      {req.status === 'Fulfilled' && req.viewUrl && (
                        <a
                          title="View submitted document"
                          href={req.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: 'none',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            textDecoration: 'none',
                          }}
                        >
                          <FileText size={12} /> View PDF
                        </a>
                      )}
                      {req.status === 'Fulfilled' && req.downloadUrl && (
                        <button
                          title="Download submitted document"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = req.downloadUrl
                            link.download =
                              req.fulfillmentFileName || req.fileName || 'document.pdf'
                            link.click()
                          }}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                          }}
                        >
                          <Download size={12} /> Download
                        </button>
                      )}

                      {req.status === 'Fulfilled' && (
                        <button
                          onClick={() =>
                            updateMedicalRequestStatus(req.id, 'Reviewed')
                          }
                          style={{
                            background: 'none',
                            border: '1px solid rgba(52,152,219,.3)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: '#3498db',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          Mark Reviewed
                        </button>
                      )}

                      <button
                        onClick={() => deleteMedicalRequest(req.id)}
                        title="Delete request"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#e74c3c',
                          padding: 4,
                        }}
                      >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>×</span>
                      </button>
                    </div>
                  ))
                ))}

              {statusTab === 'uploads' &&
                (myUploads.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '24px 0',
                      color: 'var(--text-muted)',
                      fontSize: 13,
                    }}
                  >
                    This student has not uploaded any medical documents yet.
                  </div>
                ) : (
                  myUploads.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <FileText
                        size={16}
                        color="var(--orange)"
                        style={{ flexShrink: 0 }}
                      />

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: 'var(--text)',
                            marginBottom: 2,
                          }}
                        >
                          {doc.recordType || doc.record_type}
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {doc.fileName || doc.file_name} ·{' '}
                          {fmtSize(doc.fileSize || doc.file_size)} · Uploaded{' '}
                          {fmtDate(doc.uploadedAt || doc.submittedAt)}
                        </div>

                        {doc.notes && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                              marginTop: 2,
                            }}
                          >
                            {doc.notes}
                          </div>
                        )}
                      </div>

                      {statusBadge(doc.status || 'Uploaded')}

                      {doc.viewUrl && (
                        <a
                          title="View PDF"
                          href={doc.viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: 'none',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            textDecoration: 'none',
                          }}
                        >
                          <FileText size={12} /> View PDF
                        </a>
                      )}
                      {doc.downloadUrl && (
                        <button
                          title="Download"
                          onClick={() => {
                            const l = document.createElement('a')
                            l.href = doc.downloadUrl
                            l.download = doc.fileName || doc.file_name || 'document.pdf'
                            l.click()
                          }}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                          }}
                        >
                          <Download size={12} /> Download
                        </button>
                      )}
                    </div>
                  ))
                ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Medical Records Request Form"
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => setRequestOpen(false)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleRequest}>
              Submit
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--orange)',
              fontWeight: 600,
            }}
          >
            Fields marked with * are pre-filled and cannot be edited.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div className="form-group">
              <label>Patient Name *</label>
              <input
                className="form-input readonly"
                value={`${student.firstName} ${student.lastName}`}
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Student Number *</label>
              <input
                className="form-input readonly"
                value={student.studentNumber}
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                className="form-input readonly"
                value={student.emailAddress}
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Contact Number *</label>
              <input
                className="form-input readonly"
                value={student.contactNumber}
                readOnly
              />
            </div>
          </div>

          <div className="form-group">
            <label>Record Type *</label>
            <select
              className="form-input"
              value={reqForm.recordType}
              onChange={(e) => rf('recordType', e.target.value)}
            >
              <option value="">Select medical record type...</option>
              {MEDICAL_RECORD_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {reqForm.recordType === 'Other' && (
              <input
                className="form-input"
                value={reqForm.customRecordType}
                onChange={(e) => rf('customRecordType', e.target.value)}
                placeholder="Enter custom medical record type..."
                style={{ marginTop: 8 }}
              />
            )}
            {reqErrors.recordType && (
              <span style={{ color: '#e74c3c', fontSize: 11 }}>
                {reqErrors.recordType}
              </span>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div className="form-group">
              <label>Reason for Request *</label>
              <select
                className="form-input"
                value={reqForm.reason}
                onChange={(e) => rf('reason', e.target.value)}
              >
                <option value="">Select reason...</option>
                {[
                  'School Requirement',
                  'Personal Reference',
                  'Employment',
                  'Scholarship Application',
                  'Medical Consultation',
                  'Other',
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              {reqErrors.reason && (
                <span style={{ color: '#e74c3c', fontSize: 11 }}>
                  {reqErrors.reason}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Urgency Level *</label>
              <select
                className="form-input"
                value={reqForm.urgency}
                onChange={(e) => rf('urgency', e.target.value)}
              >
                <option value="">Select urgency...</option>
                {[
                  'Routine (5-7 days)',
                  'Urgent (2-3 days)',
                  'Emergency (Same day)',
                ].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              {reqErrors.urgency && (
                <span style={{ color: '#e74c3c', fontSize: 11 }}>
                  {reqErrors.urgency}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Additional Notes</label>
            <textarea
              className="form-input"
              rows={4}
              value={reqForm.notes}
              onChange={(e) => rf('notes', e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Medical Records Summary"
      >
        <div style={{ color: 'var(--text)' }}>
          <p
            style={{
              fontSize: 12,
              color: 'var(--orange)',
              textAlign: 'right',
              marginBottom: 12,
            }}
          >
            Note: This is only a summary view
          </p>

          <h3
            style={{
              textAlign: 'center',
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 20,
            }}
          >
            Medical Records Summary
          </h3>

          <h4
            style={{
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Patient Information
          </h4>

          <table style={{ marginBottom: 20 }}>
            <thead>
              <tr>
                <th>Field</th>
                <th>Information</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Name', `${student.firstName} ${student.lastName}`],
                ['Date of Birth', student.dateOfBirth],
                ['Gender', student.gender],
                ['Address', student.homeAddress],
                ['Contact Number', student.contactNumber],
                ['Email', student.emailAddress],
              ].map(([f, v]) => (
                <tr key={f}>
                  <td style={{ fontWeight: 600 }}>{f}</td>
                  <td>{v || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4
            style={{
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Medical History
          </h4>

          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Allergies', mr.allergies],
                ['Conditions', mr.conditions],
                ['Surgeries', mr.surgeries],
                ['Medications', mr.medications],
                ['Family History', mr.familyHistory],
                ['Notes', mr.notes],
              ].map(([c, d]) => (
                <tr key={c}>
                  <td style={{ fontWeight: 600 }}>{c}</td>
                  <td>{d || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Medical Record"
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveMed}>
              Save Medical Record
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            Editing medical record for: <strong>{student.firstName} {student.lastName}</strong> (
            {student.studentNumber})
          </div>

          {[
            ['allergies', 'Allergies'],
            ['conditions', 'Conditions'],
            ['surgeries', 'Surgeries'],
            ['medications', 'Current Medications'],
            ['familyHistory', 'Family History'],
            ['notes', 'Notes'],
          ].map(([key, label]) => (
            <div key={key} className="form-group">
              <label>{label}</label>
              <input
                className="form-input"
                value={medForm[key] || ''}
                onChange={(e) => mf(key, e.target.value)}
                placeholder={key === 'allergies' ? 'e.g. Penicillin, None' : ''}
              />
              {medErrors[key] && (
                <span style={{ color: '#e74c3c', fontSize: 11 }}>
                  {medErrors[key]}
                </span>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={sendReqOpen}
        onClose={() => {
          setSendReqOpen(false)
          setSendErrors({})
        }}
        title="Request Document from Student"
        footer={
          <>
            <button
              className="btn btn-outline"
              onClick={() => {
                setSendReqOpen(false)
                setSendErrors({})
              }}
              disabled={sending}
            >
              Cancel
            </button>

            <button
              className="btn btn-primary"
              onClick={handleSendRequest}
              disabled={sending}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Send size={13} /> {sending ? 'Sending…' : 'Send Request'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: 'rgba(var(--orange-rgb),.08)',
              border: '1px solid rgba(var(--orange-rgb),.25)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--text)',
            }}
          >
            The student will receive a notification in their portal and will be
            able to upload the requested PDF document.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div className="form-group">
              <label>Student Name *</label>
              <input
                className="form-input readonly"
                value={`${student.firstName} ${student.lastName}`}
                readOnly
              />
            </div>

            <div className="form-group">
              <label>Student Number *</label>
              <input
                className="form-input readonly"
                value={student.studentNumber}
                readOnly
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              Document / Record Type <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <select
              className="form-input"
              value={sendForm.recordType}
              onChange={(e) => sf('recordType', e.target.value)}
            >
              <option value="">Select medical record type...</option>
              {MEDICAL_RECORD_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {sendForm.recordType === 'Other' && (
              <input
                className="form-input"
                value={sendForm.customRecordType}
                onChange={(e) => sf('customRecordType', e.target.value)}
                maxLength={255}
                placeholder="Enter custom medical record type..."
                style={{ marginTop: 8 }}
              />
            )}
            {sendErrors.recordType && (
              <span style={{ color: '#e74c3c', fontSize: 11 }}>
                {sendErrors.recordType}
              </span>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div className="form-group">
              <label>
                Reason <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                className="form-input"
                value={sendForm.reason}
                onChange={(e) => sf('reason', e.target.value)}
              >
                <option value="">Select reason...</option>
                {[
                  'School Requirement',
                  'Clinic Assessment',
                  'Scholarship Application',
                  'Employment Clearance',
                  'Medical Consultation',
                  'Health Compliance',
                  'Other',
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              {sendErrors.reason && (
                <span style={{ color: '#e74c3c', fontSize: 11 }}>
                  {sendErrors.reason}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>
                Urgency Level <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <select
                className="form-input"
                value={sendForm.urgency}
                onChange={(e) => handleSendUrgencyChange(e.target.value)}
              >
                <option value="">Select urgency...</option>
                {[
                  'Routine (5-7 days)',
                  'Urgent (2-3 days)',
                  'Emergency (Same day)',
                ].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              {sendErrors.urgency && (
                <span style={{ color: '#e74c3c', fontSize: 11 }}>
                  {sendErrors.urgency}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>
              Submission Deadline{' '}
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontWeight: 400,
                }}
              >
                (optional)
              </span>
            </label>
            <input
              type="date"
              className="form-input"
              value={sendForm.deadline}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => sf('deadline', e.target.value)}
            />
            {sendErrors.deadline && (
              <span style={{ color: '#e74c3c', fontSize: 11 }}>
                {sendErrors.deadline}
              </span>
            )}
          </div>

          <div className="form-group">
            <label>
              Additional Notes{' '}
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontWeight: 400,
                }}
              >
                (optional)
              </span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              maxLength={1000}
              value={sendForm.notes}
              onChange={(e) => sf('notes', e.target.value)}
              placeholder="Any instructions or context for the student..."
              style={{ resize: 'vertical' }}
            />
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                textAlign: 'right', 
                display: 'block',
              }}
            >
              {sendForm.notes.length}/1000
            </span>
            {sendErrors.notes && (
              <span style={{ color: '#e74c3c', fontSize: 11 }}>
                {sendErrors.notes}
              </span>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
