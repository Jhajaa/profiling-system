import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { BookOpen, Bell, AlertTriangle, User, ChevronDown, ChevronUp, Shield, Phone, Home, Calendar, GraduationCap, LayoutDashboard, Activity, Clock, MapPin, Plus, Search, SlidersHorizontal, CalendarDays, Megaphone, Send, Trash2, FileText, Upload, Pencil } from 'lucide-react';
import Header from '../../components/Header';
import '../../../../css/StudentPortal.css';
import '../../../../css/home.css';
const MetricCard = ({
  label,
  value,
  variant,
  icon: Icon,
  sub
}) => <div className={`home-metric ${variant}`}>
 <div className="home-metric-ring" />
 <div className="home-metric-icon"><Icon size={14} /></div>
 <div className="home-metric-lbl">{label}</div>
 <div className="home-metric-val">{value}</div>
 <div className="home-metric-sub">{sub}</div>
 </div>;
const MEDICAL_RECORD_TYPE_OPTIONS = ['Medical Certificate', 'Vaccination Record', 'Laboratory Result', 'Prescription', 'Physical Examination Result', 'X-Ray Result', 'Dental Record', 'Consultation Summary', 'Immunization Record', 'Clinic Clearance', 'Fit-to-Study Certificate', 'Other'];
export default function StudentPortal({
  active = 'dashboard'
}) {
  console.log('--- StudentPortal Loaded (v2) ---');
  const {
    user,
    students,
    updateStudent,
    showToast,
    violations,
    events,
    announcements,
    dynamicFields,
    syllabi,
    schedules,
    faculty,
    medicalRequests,
    uploadStudentMedicalDocument,
    replaceStudentMedicalDocument,
    fulfillMedicalRequest,
    markMedicalRequestViewed,
    deleteMedicalRequest
  } = useApp();
  const [activeProfileSection, setActiveProfileSection] = useState('Basic Information');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [studentUploadForm, setStudentUploadForm] = useState({
    recordType: '',
    customRecordType: '',
    notes: ''
  });
  const [studentUploadFile, setStudentUploadFile] = useState(null);
  const [studentUploadError, setStudentUploadError] = useState('');
  const [studentUploadBusy, setStudentUploadBusy] = useState(false);
  const [recentMedicalUploads, setRecentMedicalUploads] = useState([]);
  const [deletingMedicalDocId, setDeletingMedicalDocId] = useState(null);
  const [updatingMedicalDocId, setUpdatingMedicalDocId] = useState(null);
  const [deleteMedicalDocError, setDeleteMedicalDocError] = useState('');
  const [fulfillmentFiles, setFulfillmentFiles] = useState({});
  const [fulfillmentNotes, setFulfillmentNotes] = useState({});
  const [fulfillmentErrors, setFulfillmentErrors] = useState({});
  const [fulfillmentBusyId, setFulfillmentBusyId] = useState(null);
  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const studentRecord = useMemo(() => {
    if (!user) return null;

    // Normalize user identifiers
    const studentNum = String(user.userNumber || '').trim().replace('#', '').toLowerCase();
    const studentName = String(user.name || '').trim().toLowerCase();
    return (students || []).find(s => {
      // Normalize record identifiers
      const recNum = String(s.dynamic_data?.['Student Number'] || s.studentNumber || '').trim().replace('#', '').toLowerCase();
      const f = String(s.dynamic_data?.['First Name'] || s.firstName || s.first_name || '').trim().toLowerCase();
      const m = String(s.dynamic_data?.['Middle Name'] || s.middleName || s.middle_name || '').trim().toLowerCase();
      const l = String(s.dynamic_data?.['Last Name'] || s.lastName || s.last_name || '').trim().toLowerCase();

      // Construct full name for matching
      const recFull = `${f} ${m} ${l}`.replace(/\s+/g, ' ').trim();
      const recFullShort = `${f} ${l}`.replace(/\s+/g, ' ').trim();

      // Attempt match on number, full name (with middle), or short name (no middle)
      return studentNum && recNum === studentNum || studentName && (recFull === studentName || recFullShort === studentName);
    });
  }, [students, user]);
  const [expandedSection, setExpandedSection] = useState(null);
  const toggle = key => setExpandedSection(prev => prev === key ? null : key);
  const myViolations = useMemo(() => Array.isArray(violations) ? violations.filter(v => v.studentId === studentRecord?.id) : [], [violations, studentRecord]);
  const mySchedule = useMemo(() => {
    if (!studentRecord) return [];
    const course = studentRecord.dynamic_data?.['Course'];
    const sec = studentRecord.dynamic_data?.['Section'];
    const yl = studentRecord.dynamic_data?.['Year Level'];

    // Normalize year level: "1st year" => "1", "1st yr" => "1"
    const normalizeYear = (y) => {
      if (!y) return '';
      const m = String(y).match(/[1-4]/);
      return m ? m[0] : '';
    };
    // Normalize program: "IT" and "BSIT" are same, "CS" and "BSCS" are same
    const normalizeProg = (p) => {
      if (!p) return '';
      return String(p).toUpperCase().replace(/^BS/i, '');
    };
    // Normalize section: "1BSIT-A" => "A", "A" => "A"
    const normalizeSec = (s) => {
      if (!s) return '';
      const raw = String(s).trim().toUpperCase();
      return raw.includes('-') ? raw.split('-').pop() : raw;
    };

    const studentYear = normalizeYear(yl);
    const studentProg = normalizeProg(course);
    const studentSec = normalizeSec(sec);

    return (schedules || []).filter(s => {
      const schedYear = normalizeYear(s.yearLevel);
      const schedProg = normalizeProg(s.program);
      const schedSec = normalizeSec(s.section);
      return schedProg === studentProg && schedSec === studentSec && schedYear === studentYear;
    }).sort((a, b) => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }, [schedules, studentRecord]);
  const sameStudentId = (value) => String(value ?? '').trim() === String(studentRecord?.id ?? '').trim();
  const myMedicalRequests = useMemo(() => (medicalRequests || []).filter(r => r.request_type === 'admin_request' && sameStudentId(r.studentId)), [medicalRequests, studentRecord]);
  const myMedicalUploads = useMemo(() => {
    const contextUploads = (medicalRequests || []).filter(r => r.request_type === 'student_upload' && sameStudentId(r.studentId));
    const combined = [...recentMedicalUploads.filter(r => sameStudentId(r.studentId)), ...contextUploads];
    const seen = new Set();
    return combined.filter(doc => {
      const key = doc.id ? `id:${doc.id}` : `local:${doc.localUploadKey || doc.fileName || doc.file_name || doc.recordType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [medicalRequests, recentMedicalUploads, studentRecord]);
  useEffect(() => {
    if (active !== 'medical' || !myMedicalRequests.length) return;
    const unviewed = myMedicalRequests.filter(r => !r.viewed_at);
    if (unviewed.length > 0) {
      unviewed.forEach(request => {
        markMedicalRequestViewed?.(request.id);
      });
    }
  }, [active, myMedicalRequests.length]); // Use length to avoid deep object comparison loops
  const handleStudentUpload = async () => {
    if (!studentRecord) return;
    const selectedRecordType = studentUploadForm.recordType === 'Other' ? studentUploadForm.customRecordType.trim() : studentUploadForm.recordType.trim();
    const studentNumber = String(studentRecord.dynamic_data?.['Student Number'] || studentRecord.studentNumber || user?.userNumber || '').trim().replace('#', '');
    const studentName = fullName || user?.name || 'Student';
    if (!selectedRecordType) {
      setStudentUploadError('Record type is required.');
      return;
    }
    if (!studentUploadFile) {
      setStudentUploadError('Please choose a PDF file to upload.');
      return;
    }
    const isPdf = studentUploadFile.type === 'application/pdf' || studentUploadFile.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setStudentUploadError('Only PDF documents are accepted.');
      return;
    }
    if (!studentNumber) {
      setStudentUploadError('Student number is missing. Please update your profile before uploading.');
      return;
    }
    const formData = new FormData();
    formData.append('studentId', studentRecord.id);
    formData.append('studentNumber', studentNumber);
    formData.append('studentName', studentName);
    formData.append('recordType', selectedRecordType);
    formData.append('notes', studentUploadForm.notes.trim());
    formData.append('file', studentUploadFile);
    setStudentUploadBusy(true);
    setStudentUploadError('');
    try {
      const result = await uploadStudentMedicalDocument(formData);
      if (!result?.success) {
        setStudentUploadError(result?.message || 'Upload failed.');
        return;
      }
      const uploadedDoc = {
        ...(result.data || {}),
        localUploadKey: `upload-${Date.now()}`,
        request_type: 'student_upload',
        studentId: result.data?.studentId || studentRecord.id,
        recordType: result.data?.recordType || selectedRecordType,
        fileName: result.data?.fileName || result.data?.file_name || studentUploadFile.name,
        file_name: result.data?.file_name || result.data?.fileName || studentUploadFile.name,
        notes: result.data?.notes || studentUploadForm.notes.trim(),
        status: result.data?.status || 'Uploaded',
        submittedAt: result.data?.submittedAt || result.data?.submitted_at || new Date().toISOString(),
        viewUrl: result.data?.viewUrl || (result.data?.id ? `/api/medical-requests/${result.data.id}/view` : null),
        downloadUrl: result.data?.downloadUrl || (result.data?.id ? `/api/medical-requests/${result.data.id}/download` : null)
      };
      setRecentMedicalUploads(prev => [uploadedDoc, ...prev]);
      setStudentUploadForm({
        recordType: '',
        customRecordType: '',
        notes: ''
      });
      setStudentUploadFile(null);
    } finally {
      setStudentUploadBusy(false);
    }
  };
  const handleDeleteUploadedMedicalDoc = async doc => {
    const docId = doc?.id;
    const localKey = doc?.localUploadKey;
    if (!docId && !localKey) return;
    const confirmed = window.confirm('Delete this uploaded medical document?');
    if (!confirmed) return;
    setDeleteMedicalDocError('');
    setDeletingMedicalDocId(docId || localKey);
    try {
      if (docId) await deleteMedicalRequest(docId);
      setRecentMedicalUploads(prev => prev.filter(item => item.id !== docId && item.localUploadKey !== localKey));
    } catch (err) {
      setDeleteMedicalDocError('Unable to delete this document. Please try again.');
    } finally {
      setDeletingMedicalDocId(null);
    }
  };
  const handleReplaceUploadedMedicalDoc = async (doc, file) => {
    if (!doc?.id || !file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setDeleteMedicalDocError('Only PDF documents are accepted.');
      return;
    }
    const formData = new FormData();
    formData.append('recordType', doc.recordType || '');
    formData.append('notes', doc.notes || '');
    formData.append('file', file);
    setDeleteMedicalDocError('');
    setUpdatingMedicalDocId(doc.id);
    try {
      const result = await replaceStudentMedicalDocument(doc.id, formData);
      if (!result?.success) {
        setDeleteMedicalDocError(result?.message || 'Unable to update this document.');
        return;
      }
      setRecentMedicalUploads(prev => prev.map(item => item.id === doc.id ? { ...item, ...result.data } : item));
    } finally {
      setUpdatingMedicalDocId(null);
    }
  };
  const handleFulfillRequest = async requestId => {
    const file = fulfillmentFiles[requestId];
    if (!file) {
      setFulfillmentErrors(prev => ({
        ...prev,
        [requestId]: 'Please choose a PDF file first.'
      }));
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('notes', (fulfillmentNotes[requestId] || '').trim());
    setFulfillmentBusyId(requestId);
    setFulfillmentErrors(prev => ({
      ...prev,
      [requestId]: ''
    }));
    try {
      const result = await fulfillMedicalRequest(requestId, formData);
      if (!result?.success) {
        setFulfillmentErrors(prev => ({
          ...prev,
          [requestId]: result?.message || 'Upload failed.'
        }));
        return;
      }
      setFulfillmentFiles(prev => ({
        ...prev,
        [requestId]: null
      }));
      setFulfillmentNotes(prev => ({
        ...prev,
        [requestId]: ''
      }));
      setFulfillmentErrors(prev => ({
        ...prev,
        [requestId]: ''
      }));
    } finally {
      setFulfillmentBusyId(null);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!studentRecord) {
       console.error("No student record found for current user. Cannot upload.");
       return;
    }

    console.log("Starting photo upload for student:", studentRecord.id, "File:", file.name);
    setPhotoPreview(URL.createObjectURL(file));

    // Try to find an existing key in the student's data that looks like a photo
    const existingKey = studentRecord.dynamic_data ? Object.keys(studentRecord.dynamic_data).find(k => {
      const kl = k.toLowerCase()
      return kl.includes('photo') || kl.includes('picture') || kl.includes('image') || kl.includes('avatar') || kl.includes('profile') || kl.includes('pic')
    }) : null

    // If no existing key, look at dynamicFields definitions
    const fieldDefKey = (dynamicFields || []).find(f => {
      const n = f.name.toLowerCase()
      return f.type === 'file' && (n.includes('photo') || n.includes('picture') || n.includes('image') || n.includes('avatar') || n.includes('profile') || n.includes('pic'))
    })?.name

    const targetKey = existingKey || fieldDefKey || 'Photo'

    const fd = new FormData()
    fd.append(`dynamic_data[${targetKey}]`, file)
    
    // Also include other basic info if needed by backend
    fd.append('studentNumber', studentRecord.dynamic_data?.['Student Number'] || studentRecord.studentNumber || '');

    updateStudent(studentRecord.id, fd)
      .then(() => {
        console.log("Upload request successful. Target key:", targetKey);
        showToast('Profile picture updated!', 'success');
      })
      .catch(err => {
        console.error("Upload request failed:", err);
        showToast('Upload failed. Please check your connection or file size.', 'error');
      });

    e.target.value = '';
  }

  const getInitials = () => {
    const f = studentRecord?.dynamic_data?.['First Name'] || user?.name?.split(' ')[0] || '';
    const l = studentRecord?.dynamic_data?.['Last Name'] || user?.name?.split(' ').slice(-1)[0] || '';
    return `${f[0] || ''}${l[0] || ''}`.toUpperCase() || 'ST';
  };
  const fullName = studentRecord ? `${studentRecord.dynamic_data?.['First Name'] || ''} ${studentRecord.dynamic_data?.['Last Name'] || ''}`.trim() : user?.name || 'Student';
  const program = studentRecord?.dynamic_data?.['Course'] || '—';
  const section = studentRecord?.dynamic_data?.['Section'] || '—';
  const yearLevel = studentRecord?.dynamic_data?.['Year Level'] || '—';
  const infoSections = [{
    key: 'basic',
    label: 'Basic Information',
    icon: User,
    fields: ['First Name', 'Last Name', 'Middle Name', 'Date of Birth', 'Gender', 'Civil Status', 'Nationality', 'Religion']
  }, {
    key: 'academic',
    label: 'Academic Information',
    icon: GraduationCap,
    fields: ['Student Number', 'Course', 'Year Level', 'Section', 'Email Address']
  }, {
    key: 'contact',
    label: 'Contact Information',
    icon: Phone,
    fields: ['Contact Number', 'Home Address', 'Email Address', 'Alternative Contact Number']
  }, {
    key: 'family',
    label: 'Family Background',
    icon: Home,
    fields: ['Father Name', 'Mother Name', 'Guardian Name', 'Guardian Contact', 'Guardian Relation']
  }];
  const upcomingEvents = (events || []).filter(e => new Date(e.dateTime) >= new Date()).slice(0, 5);
  /* ■■ page renderers ■■ */
  const renderDashboard = () => {
    const hours = currentTime.getHours();
    const isPM = hours >= 12;
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(currentTime.getMinutes()).padStart(2, '0');
    const displaySeconds = String(currentTime.getSeconds()).padStart(2, '0');
    const timeStr = `${displayHours}:${displayMinutes}:${displaySeconds} ${isPM ? 'PM' : 'AM'}`;
    const dateStr = currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    const recentActivity = [...(students || []).slice(-3).map(s => ({
      type: 'enroll',
      name: `${s.firstName} ${s.lastName} enrolled`,
      date: s.dateRegistered
    })), ...(events || []).slice(0, 2).map(e => ({
      type: 'event',
      name: `Event: ${e.name}`,
      date: e.dateTime.split('T')[0]
    }))].sort((a, b) => new Date(b.date) - new Date(a.date));
    const metrics = [{
      label: 'Current Program',
      value: program,
      variant: 'mc-light',
      icon: BookOpen,
      sub: 'Enrolled Course'
    }, {
      label: 'Year Level',
      value: yearLevel,
      variant: 'mc-amber',
      icon: GraduationCap,
      sub: 'Current Academic Year'
    }, {
      label: 'My Violations',
      value: myViolations.length,
      variant: 'mc-light',
      icon: Shield,
      sub: 'Recorded violations'
    }, {
      label: 'Uploaded Files',
      value: myMedicalUploads.length,
      variant: 'mc-amber',
      icon: Upload,
      sub: 'Medical PDFs submitted'
    }, {
      label: 'Upcoming Events',
      value: upcomingEvents.length,
      variant: 'mc-light',
      icon: CalendarDays,
      sub: 'Scheduled events'
    }];
    return <div className="home-root sp-dashboard-overview">
 <div className="sp-dashboard-inner" style={{
        padding: '20px 24px'
      }}>
 {/* Metrics */}
 <div className="home-metrics-label">Student Overview</div>
 <div className="home-metrics-grid">
 {metrics.map((m, i) => <MetricCard key={i} {...m} />)}
 </div>
 {/* Main grid */}
 <div className="home-grid">
 {/* Announcements */}
 <div className="hcard">
 <div className="hcard-head">
 <div className="hcard-head-left">
 <div className="hcard-icon"><Send size={13} /></div>
 <span className="hcard-title">Announcements</span>
 </div>
 </div>
 <div className="ann-list">
 {(announcements || []).length === 0 ? <div className="home-empty">
 <Megaphone size={30} strokeWidth={1.5} />
 <span>No announcements yet</span>
 </div> : (announcements || []).map(a => <div key={a.id} className="ann-item">
 <div className="ann-item-body">
 <div className="ann-dot" />
 <div>
 <div className="ann-title">{a.title}</div>
 <div className="ann-body">{a.body}</div>
 <div className="ann-date">{a.date}</div>
 </div>
 </div>
 </div>)}
 </div>
 </div>
 {/* Right column */}
 <div className="home-right">
 {/* Clock */}
 <div className="home-clock">
 <div className="home-clock-date">{dateStr}</div>
 <div className="home-clock-time">{timeStr}</div>
 </div>
 {/* Recent Activity */}
 <div className="hcard">
 <div className="hcard-head">
 <div className="hcard-head-left">
 <div className="hcard-icon"><Activity size={13} /></div>
 <span className="hcard-title">Recent Activity</span>
 </div>
 </div>
 <div className="panel-body">
 {recentActivity.length === 0 ? <p className="home-no-data">No recent activity</p> : recentActivity.slice(0, 5).map((act, i) => <div key={i} className="act-row">
 <span className="act-name">{act.name}</span>
 <span className="act-date">{act.date}</span>
 </div>)}
 </div>
 </div>
 {/* Upcoming Events */}
 <div className="hcard">
 <div className="hcard-head">
 <div className="hcard-head-left">
 <div className="hcard-icon"><CalendarDays size={13} /></div>
 <span className="hcard-title">Upcoming Events</span>
 </div>
 </div>
 <div className="panel-body">
 {upcomingEvents.length === 0 ? <p className="home-no-data">No upcoming events</p> : upcomingEvents.slice(0, 3).map(e => <div key={e.id} className="evt-row">
 <div className="evt-name">{e.name}</div>
 <div className="evt-meta">
 {new Date(e.dateTime).toLocaleDateString()} · {e.venue}
 </div>
 </div>)}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>;
  };
  const renderViolationCard = v => <div key={v.id} className="sp-violation-card">
 <div className="sp-violation-top">
 <span className="sp-violation-type">{v.dynamic_data?.['Type of Violation'] || 'Violation'}</span>
 <span className={`sp-severity sp-severity-${(v.dynamic_data?.['Severity Level'] || 'minor').toLowerCase()}`}>
 {v.dynamic_data?.['Severity Level'] || '—'}
 </span>
 </div>
 <div className="sp-violation-meta">
 <span>{v.dynamic_data?.['Date of Occurrence'] || '—'}</span>
 <span className="sp-vio-status">{v.dynamic_data?.['Status'] || '—'}</span>
 </div>
 {v.dynamic_data?.['Description'] && <p className="sp-violation-desc">{v.dynamic_data['Description']}</p>}
 </div>;
  const renderAnnCard = a => <div key={a.id} className="sp-ann-item">
 <div className="sp-ann-title">{a.title}</div>
 <div className="sp-ann-date">{a.date}</div>
 <p className="sp-ann-body">{a.body}</p>
 </div>;
  const renderProfile = () => {
    // Identifiers for profile header
    const getVal = name => {
      if (studentRecord?.dynamic_data?.[name]) return studentRecord.dynamic_data[name];
      const fallbackKey = name.charAt(0).toLowerCase() + name.slice(1).replace(/\s+/g, '');
      return studentRecord?.[name] || studentRecord?.[fallbackKey] || '—';
    };
    const studentNum = getVal('Student Number');
    const dob = getVal('Date of Birth');
    const course = getVal('Course');
    const yearLevel = getVal('Year Level');
    const section = getVal('Section');
    const fullName = `${getVal('First Name')} ${getVal('Middle Name')} ${getVal('Last Name')}`.replace(/\s+/g, ' ').trim();
    // Compute sections from dynamic fields (only for the students module)
    const sectionMap = {};
    (dynamicFields || []).filter(f => (f.module || 'students') === 'students').forEach(f => {
      const s = f.section || 'Basic Information';
      // Exclude administrative/academic sections from the student's personal profile tabs
      if (['Violation Details', 'Academic Details', 'Action Taken'].includes(s)) return;
      if (!sectionMap[s] || f.order_index < sectionMap[s]) sectionMap[s] = f.order_index;
    });
    const orderedSections = Object.keys(sectionMap).sort((a, b) => sectionMap[a] - sectionMap[b]);
    const resolveImageUrl = (val) => {
      if (!val || val === '—') return null
      if (typeof val === 'object' && val.dataUrl) return val.dataUrl
      if (typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:'))) return val
      if (typeof val === 'string' && val.includes('.')) {
          return val.startsWith('/storage/') ? val : `/storage/${val}`
      }
      return null
    }

    const studentPhoto = (() => {
      if (photoPreview) return photoPreview
      if (!studentRecord?.dynamic_data) return null
      const d = studentRecord.dynamic_data

      // 1. Try known explicit keys first
      const knownKeys = ['Profile Picture', 'Photo', 'Student Photo', 'Student Picture', 'Profile Pic', 'Image', 'Avatar', 'profile_image']
      for (const k of knownKeys) {
        const url = resolveImageUrl(d[k])
        if (url) return url
      }

      // 2. Search for ANY key that contains 'photo', 'image', etc.
      const anyPhotoKey = Object.keys(d).find(k => {
        const kl = k.toLowerCase()
        return kl.includes('photo') || kl.includes('picture') || kl.includes('image') || kl.includes('avatar') || kl.includes('profile') || kl.includes('pic')
      })
      if (anyPhotoKey) {
        const url = resolveImageUrl(d[anyPhotoKey])
        if (url) return url
      }

      // 3. Last resort: search for any value that looks like a base64 image
      for (const k in d) {
        if (typeof d[k] === 'string' && d[k].startsWith('data:image')) return d[k]
      }

      return null
    })()

    console.log('[Debug] Resolved Student Photo:', studentPhoto ? 'Image Found' : 'No Image');

    return <div className="sp-page" style={{
      maxWidth: '1400px'
    }}>
 <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}>
 {/* Header row card */}
 <div className="sp-hero animate-in">
 <div className="sp-hero-avatar" style={{
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: 'var(--orange)',
            color: '#fff',
            fontSize: 28,
            fontWeight: 700
          }}>
 {studentPhoto ? <img src={studentPhoto} alt="" style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }} /> : getInitials()}
  
  <button 
    onClick={() => fileInputRef.current?.click()}
    style={{
      position: 'absolute',
      top: 4,
      right: 4,
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.9)',
      color: 'var(--orange)',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      zIndex: 10,
      transition: 'transform 0.2s'
    }}
    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
    title="Change Profile Picture"
  >
    <Pencil size={14} />
  </button>
  <input 
    type="file" 
    ref={fileInputRef} 
    style={{ display: 'none' }} 
    accept="image/*"
    onChange={handlePhotoChange}
  />
 </div>
 <div style={{
            flex: 1
          }}>
 <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
 <div style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginBottom: 4,
                fontWeight: 500
              }}>Student
 Portal / My Profile</div>
 <div style={{
                display: 'flex',
                gap: 10
              }}>
  <Link to="/student/medical" className="sp-btn-outline" style={{
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}>
  Medical Documents
  </Link>
 </div>
 </div>
 <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--heading-color)',
              marginBottom: 12,
              fontFamily: "'Playfair Display', serif"
            }}>{fullName || 'Student Profile'}</h2>
 <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 32
            }}>
 {[['Student Number', studentNum], ['Date of Birth', dob], ['Course Program', `${course} – ${yearLevel} Sec. ${section}`]].map(([l, v], i) => <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
 <div style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700
                }}>{l}</div>
 <div style={{
                  fontWeight: 600,
                  color: 'var(--text)',
                  fontSize: 14
                }}>{v}</div>
 </div>)}
 </div>
 </div>
 </div>
 <div style={{
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start'
        }} className="animate-in">
 {/* Sidebar Tabs */}
 <div className="sp-panel" style={{
            width: 260,
            flexShrink: 0,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
            padding: 0
          }}>
 {[...orderedSections, 'Enrolled Subjects', 'Violations'].map(sectionName => {
              const isActive = activeProfileSection === sectionName;
              return <button key={sectionName} onClick={() => setActiveProfileSection(sectionName)} style={{
                width: '100%',
                textAlign: 'left',
                padding: '16px 20px',
                background: isActive ? 'var(--bg)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                borderLeft: isActive ? '3px solid var(--orange)' : '3px solid transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: isActive ? 800 : 700,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
 {sectionName}
 </button>;
            })}
 </div>
 {/* Content Area */}
 <div className="sp-panel" style={{
            flex: 1,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            minHeight: 450,
            overflow: 'hidden',
            padding: 0
          }}>
 {activeProfileSection === 'Enrolled Subjects' ? (() => {
              const currentCourse = studentRecord?.dynamic_data?.['Course'];
              const currentYear = studentRecord?.dynamic_data?.['Year Level'];
              const enrolledSubjects = (syllabi || []).filter(s => s.program === currentCourse && s.yearLevel === currentYear);
              if (enrolledSubjects.length === 0) {
                return <div className="sp-empty-full" style={{
                  minHeight: 300
                }}><GraduationCap size={40} /><p>No
 course subjects found for {currentCourse || '—'} – {currentYear || '—'}.</p></div>;
              }
              return <div style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
 {enrolledSubjects.map(s => <div key={s.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 1fr',
                  gap: 20,
                  padding: '20px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 10
                }}>
 <div>
 <div style={{
                      fontSize: 11,
                      color: 'var(--orange)',
                      fontWeight: 700,
                      marginBottom: 4,
                      textTransform: 'uppercase'
                    }}>{s.courseCode}</div>
 <div style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: 'var(--text)',
                      marginBottom: 4
                    }}>{s.courseTitle}</div>
 <div style={{
                      fontSize: 12,
                      color: 'var(--text-muted)'
                    }}>{s.units} unit{s.units !== 1 ? 's' : ''} · {s.semester}</div>
 </div>
 <div>
 <div style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                      textTransform: 'uppercase'
                    }}>Schedule</div>
 <div style={{
                      fontSize: 13,
                      color: 'var(--text)',
                      lineHeight: 1.4
                    }}>{s.schedule?.split('|').map((part, pi) => <div key={pi}>{part.trim()}</div>)}</div>
 </div>
 <div>
 <div style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginBottom: 6,
                      textTransform: 'uppercase'
                    }}>Instructor</div>
 <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text)'
                    }}>{s.instructor || '—'}</div>
 {s.instructorEmail && <div style={{
                      fontSize: 12,
                      color: 'var(--text-muted)'
                    }}>{s.instructorEmail}</div>}
 </div>
 </div>)}
 </div>;
            })() : activeProfileSection === 'Violations' ? (() => {
              const myViolations = (violations || []).filter(v => v.studentId === studentRecord?.id);
              const vFields = (dynamicFields || []).filter(f => f.module === 'violations' && f.show_in_table);
              if (myViolations.length === 0) {
                return <div className="sp-empty-full" style={{
                  minHeight: 300
                }}><Shield size={40} /><p>No
 violations on record. Excellent work!</p></div>;
              }
              return <div style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
 {myViolations.map(v => <div key={v.id} style={{
                  padding: '20px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 10
                }}>
 <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 16
                  }}>
 {vFields.map(field => <div key={field.id}>
 <div style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        marginBottom: 4
                      }}>{field.name}</div>
 <div style={{
                        fontSize: 14,
                        fontWeight: 600
                      }}>{v.dynamic_data?.[field.name] || '—'}</div>
 </div>)}
 </div>
 </div>)}
 </div>;
            })() : <div className="fade-in" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 20,
              padding: '32px'
            }}>
              {(dynamicFields || []).filter(f => (f.module || 'students') === 'students' && (f.section || 'Basic Information') === activeProfileSection).sort((a, b) => a.order_index - b.order_index).map(field => {
                if (field.type === 'file') return null
                const val = studentRecord?.dynamic_data?.[field.name] || (() => {
                  const fallbackKey = field.name.charAt(0).toLowerCase() + field.name.slice(1).replace(/\s+/g, '');
                  return studentRecord?.[field.name] || studentRecord?.[fallbackKey];
                })();
                let display = val === null || val === undefined || val === '' ? '—' : String(val);

                return <div key={field.id} style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 'none'
                }}>
 <div style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700
                  }}>{field.name}</div>
 <div style={{
                    fontSize: 15,
                    color: 'var(--text)',
                    fontWeight: 600
                  }}>{display}</div>
 </div>;
              })}
 </div>}
 </div>
 </div>
 </div>
 </div>;
  };
  const renderViolations = () => <div className="sp-page">
 {myViolations.length === 0 ? <div className="sp-empty-full"><Shield size={40} /><p>No violations on record. Keep it up!</p></div> : <div className="sp-panel"><div className="sp-violation-list">{myViolations.map(v => renderViolationCard(v))}</div></div>}
 </div>;
  const renderAnnouncements = () => <div className="sp-page">
 {(announcements || []).length === 0 ? <div className="sp-empty-full"><Bell size={40} /><p>No announcements yet.</p></div> : <div className="sp-panel"><div className="sp-ann-list">{(announcements || []).map(a => renderAnnCard(a))}</div></div>}
 </div>;
  const renderEvents = () => <div className="sp-page">
 {upcomingEvents.length === 0 ? <div className="sp-empty-full"><Calendar size={40} /><p>No upcoming events at this time.</p></div> : <div className="sp-panel">
 <div className="sp-event-list">
 {upcomingEvents.map(e => <div key={e.id} className="sp-event-item">
 <div className="sp-event-dot" />
 <div>
 <div className="sp-event-name">{e.name}</div>
 <div className="sp-event-meta">
 {new Date(e.dateTime).toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
 &middot; {e.venue}
 </div>
 {e.description && <p className="sp-ann-body">{e.description}</p>}
 </div>
 </div>)}
 </div>
 </div>}
 </div>;
  const renderMedicalRecords = () => {
    const pendingCount = myMedicalRequests.filter(request => request.status === 'Pending').length;
    const completedCount = myMedicalRequests.filter(request => ['Fulfilled', 'Reviewed'].includes(request.status)).length;
    return (
      <div className="sp-page sp-medical-page">
        <div className="sp-panel sp-medical-shell">
          <div className="sp-medical-metrics">
            <MetricCard label="Pending Requests" value={pendingCount} variant="mc-light" icon={FileText} sub="Awaiting your upload" />
            <MetricCard label="Uploaded Docs" value={myMedicalUploads.length} variant="mc-dark" icon={Upload} sub="Self-submitted files" />
            <MetricCard label="Completed Requests" value={completedCount} variant="mc-amber" icon={Shield} sub="Already sent" />
          </div>

          <div className="sp-medical-grid">
          <div className="sp-medical-card sp-medical-upload">
            <div className="sp-medical-heading">
              Upload Your Own Medical Document
            </div>
            <select
              className="sp-input"
              value={studentUploadForm.recordType}
              onChange={e => setStudentUploadForm(prev => ({ ...prev, recordType: e.target.value, customRecordType: e.target.value === 'Other' ? prev.customRecordType : '' }))}
            >
              <option value="">Select medical record type</option>
              {MEDICAL_RECORD_TYPE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            {studentUploadForm.recordType === 'Other' ? <input
                className="sp-input"
                type="text"
                placeholder="Enter custom medical record type"
                value={studentUploadForm.customRecordType}
                onChange={e => setStudentUploadForm(prev => ({ ...prev, customRecordType: e.target.value }))}
              /> : null}
            <textarea
              className="sp-input"
              rows={3}
              placeholder="Optional notes"
              value={studentUploadForm.notes}
              onChange={e => setStudentUploadForm(prev => ({ ...prev, notes: e.target.value }))}
              style={{ resize: 'none' }}
            />
            <input
              className="sp-file-input"
              type="file"
              accept="application/pdf,.pdf"
              onChange={e => {
                setStudentUploadFile(e.target.files?.[0] || null);
                setStudentUploadError('');
              }}
            />
            {studentUploadError ? <div style={{ color: '#e74c3c', fontSize: 12, fontWeight: 600 }}>{studentUploadError}</div> : null}
            <div>
              <button className="sp-btn-primary sp-medical-submit" onClick={handleStudentUpload} disabled={studentUploadBusy}>
                {studentUploadBusy ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>

          <div className="sp-medical-lists">
            <div className="sp-medical-card sp-medical-list-card">
              <div className="sp-medical-heading">
                Requests From Clinic / Admin
              </div>
              <div className="sp-medical-scroll">
              {myMedicalRequests.length === 0 ? (
                <div className="sp-empty-full sp-medical-empty">
                  <FileText size={34} />
                  <p>No medical document requests at this time.</p>
                </div>
              ) : (
                myMedicalRequests.map(request => (
                  <div key={request.id} className="sp-medical-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{request.recordType}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: request.status === 'Pending' ? '#e67e22' : '#27ae60' }}>{request.status}</div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{request.reason}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {request.deadline ? `Due ${new Date(request.deadline).toLocaleDateString()}` : 'No deadline set'}
                    </div>
                    {request.status === 'Pending' ? (
                      <div className="sp-medical-request-form">
                        <input
                          className="sp-file-input"
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={e => {
                            setFulfillmentFiles(prev => ({ ...prev, [request.id]: e.target.files?.[0] || null }));
                            setFulfillmentErrors(prev => ({ ...prev, [request.id]: '' }));
                          }}
                        />
                        <textarea
                          className="sp-input"
                          rows={2}
                          placeholder="Optional note for this request"
                          value={fulfillmentNotes[request.id] || ''}
                          onChange={e => setFulfillmentNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                          style={{ resize: 'none' }}
                        />
                        {fulfillmentErrors[request.id] ? <div style={{ color: '#e74c3c', fontSize: 12, fontWeight: 600 }}>{fulfillmentErrors[request.id]}</div> : null}
                        <div>
                          <button
                            className="sp-btn-primary"
                            onClick={() => handleFulfillRequest(request.id)}
                            disabled={!fulfillmentFiles[request.id] || fulfillmentBusyId === request.id}
                          >
                            {fulfillmentBusyId === request.id ? 'Submitting...' : 'Submit Requested File'}
                          </button>
                        </div>
                      </div>
                    ) : request.viewUrl || request.downloadUrl ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {request.viewUrl ? (
                          <a href={request.viewUrl} target="_blank" rel="noreferrer" className="sp-btn-outline">
                            View PDF
                          </a>
                        ) : null}
                        {request.downloadUrl ? (
                          <a href={request.downloadUrl} download={request.fileName || 'medical-document.pdf'} className="sp-btn-outline">
                            Download Submitted File
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              </div>
            </div>

            <div className="sp-medical-card sp-medical-list-card">
              <div className="sp-medical-heading">
                My Uploaded Documents
              </div>
              {deleteMedicalDocError ? <div style={{ color: '#e74c3c', fontSize: 12, fontWeight: 600 }}>{deleteMedicalDocError}</div> : null}
              <div className="sp-medical-scroll">
              {myMedicalUploads.length === 0 ? (
                <div className="sp-empty-full sp-medical-empty">
                  <Upload size={34} />
                  <p>No uploaded medical documents yet.</p>
                </div>
              ) : (
                myMedicalUploads.map(doc => (
                  <div key={doc.id} className="sp-medical-item">
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{doc.recordType || doc.fileName || 'Medical Document'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{doc.fileName || 'PDF file'}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {doc.viewUrl ? (
                        <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="sp-btn-outline">
                          View PDF
                        </a>
                      ) : null}
                      {doc.downloadUrl ? (
                        <a href={doc.downloadUrl} download={doc.fileName || 'medical-document.pdf'} className="sp-btn-outline">
                          Download
                        </a>
                      ) : null}
                      <label className={`sp-btn-outline sp-medical-update-btn ${updatingMedicalDocId === doc.id ? 'disabled' : ''}`}>
                        <Upload size={13} />
                        {updatingMedicalDocId === doc.id ? 'Updating...' : 'Update'}
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          style={{ display: 'none' }}
                          disabled={updatingMedicalDocId === doc.id}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            handleReplaceUploadedMedicalDoc(doc, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="sp-btn-outline sp-medical-delete-btn"
                        onClick={() => handleDeleteUploadedMedicalDoc(doc)}
                        disabled={deletingMedicalDocId === (doc.id || doc.localUploadKey)}
                      >
                        <Trash2 size={13} />
                        {deletingMedicalDocId === (doc.id || doc.localUploadKey) ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  };
  const renderSchedule = () => {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const TIME_SLOTS = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];
    const getTimeIndex = timeStr => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 2 + (m >= 30 ? 1 : 0) - 14; // 7:00 is index 0
    };
    // Format month/year like screenshot (e.g. APRIL 2026)
    const monthYear = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(new Date()).toUpperCase();
    return <div className="sp-page" style={{
      maxWidth: '100%',
      padding: '40px'
    }}>
 {/* TOP BRANDING */}
 <div className="sp-schedule-top-header">
 <div className="sp-schedule-brand">
 <h1>College of Computing Studies</h1>
 <span>{monthYear}</span>
 </div>
 </div>
 <div className="sp-schedule-container animate-in">
 <div className="sp-schedule-grid">
 {/* Top Left Empty Corner */}
 <div className="sp-schedule-header" style={{
            background: 'var(--text)',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>TIME</div>

 {/* Day Headers */}
 {DAYS.map(day => <div key={day} className="sp-schedule-header">{day}</div>)}
 {/* Time Column & Empty Slots Layer */}
 {TIME_SLOTS.map((time, rowIdx) => <React.Fragment key={time}>
 <div className="sp-schedule-time-cell">{time}</div>
 {DAYS.map(day => <div key={`${day}-${time}`} className="sp-schedule-slot" />)}
 </React.Fragment>)}
 {/* Schedule Blocks Overlay */}
 {mySchedule.map(s => {
            const colIdx = DAYS.indexOf(s.day) + 2; // +1 for time col, +1 for 1-based grid
            const rowStart = getTimeIndex(s.startTime) + 2; // +1 for header, +1 for 1-based grid
            const rowEnd = getTimeIndex(s.endTime) + 2;
            const instructor = (faculty || []).find(f => f.id === s.facultyId);
            const instructorName = instructor?.name || instructor?.dynamic_data?.['Full Name'] || 'TBA';
            return <div key={s.id} className="sp-schedule-block" style={{
              gridColumn: colIdx,
              gridRow: `${rowStart} / ${rowEnd}`,
              background: s.color || 'var(--orange)',
              borderLeft: '4px solid rgba(0,0,0,0.1)'
            }}>
 <div className="sp-schedule-block-subject">{s.yearLevel} {s.section} / {s.subject}</div>
 <div className="sp-schedule-block-meta">{s.room}</div>
 <div className="sp-schedule-block-meta">{instructorName}</div>
 <div className="sp-schedule-block-meta" style={{
                marginTop: 'auto',
                fontWeight: 700
              }}>{s.startTime}
 – {s.endTime}</div>
 </div>;
          })}
 </div>
 </div>
 </div>;
  };
const pages = {
  dashboard: renderDashboard,
  profile: renderProfile,
  violations: renderViolations,
  schedule: renderSchedule,
  announcements: renderAnnouncements,
  events: renderEvents,
  medical: renderMedicalRecords, 
}

const titles = {
  dashboard: 'Dashboard',
  profile: 'My Profile',
  violations: 'My Violations',
  schedule: 'My Class Schedule',
  announcements: 'Announcements',
  events: 'Upcoming Events',
  medical: 'Medical Documents',   
}
  return <div className="student-portal-container">
 <Header title={titles[active] || 'Student Portal'} />
 {(pages[active] || renderDashboard)()}
 </div>;
}
