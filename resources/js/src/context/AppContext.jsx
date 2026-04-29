import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import axios from 'axios'

const AppContext = createContext(null)

const DEFAULT_THEME = {
  primaryColor: '#c95614',
  primaryDark: '#7f350f',
  primaryLight: '#f0a35d',
  backgroundColor: '#f7f2ec',
  cardBackground: '#ffffff',
  textColor: '#25211d',
  textMuted: '#6f6257',
  headingColor: '#c95614',
  sidebarBackground: '#ffffff',
  sidebarActive: '#1a1a1a',
  sidebarTextColor: '#5f554d',
  borderColor: '#d8cabe',
  systemName: 'College of Computing Studies',
  systemShortName: 'CCS',
}

const getThemeStorageKey = (account) => {
  if (!account) return null
  const identifier = account.id || account.userNumber || account.email || account.name || 'user'
  return `appTheme:${account.role || 'user'}:${String(identifier).trim().replace(/\s+/g, '_')}`
}

const normalizeTheme = (theme = {}) => {
  return { ...DEFAULT_THEME, ...theme }
}

// ── INDEXEDDB UTILITY ──
const DB_NAME = 'ProfilingSystemDB'
const STORE_NAME = 'students'

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

const saveToDB = async (key, data) => {
  console.log(`--- DB: Saving ${key} ---`);
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(data, key)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log(`--- DB: Save Success [${key}] ---`);
        resolve()
      }
      tx.onerror = (e) => {
        console.error(`--- DB: Save Error [${key}] ---`, e.target.error);
        reject(e.target.error)
      }
    })
  } catch (err) {
    console.error('IndexedDB Save Catch Error:', err)
  }
}

const loadFromDB = async (key) => {
  console.log(`--- DB: Loading ${key} ---`);
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`--- DB: Load Success [${key}] ---`, request.result ? 'Data Found' : 'Empty');
        resolve(request.result)
      }
      request.onerror = (e) => {
        console.error(`--- DB: Load Error [${key}] ---`, e.target.error);
        reject(e.target.error)
      }
    })
  } catch (err) {
    console.error('IndexedDB Load Catch Error:', err)
    return null
  }
}

const forceClearStorage = async () => {
  localStorage.clear()
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).clear()
  window.location.reload()
}

const loadTheme = (account = null) => {
  // We handle the global theme loading via a useEffect in the provider
  // for the initial sync, but loadTheme provides a quick synchronous start
  try {
    // Priority: Try loading from v2 key (legacy check)
    const v2 = localStorage.getItem('appTheme:global_v2')
    if (v2) return normalizeTheme(JSON.parse(v2))

    // Check User-specific theme
    const key = getThemeStorageKey(account)
    const saved = key ? localStorage.getItem(key) : null
    if (saved) return normalizeTheme(JSON.parse(saved))

    return DEFAULT_THEME
  } catch (err) {
    return DEFAULT_THEME
  }
}

const loadState = (key, fallback = []) => {
  try {
    const saved = localStorage.getItem(key)
    if (saved === null || saved === 'undefined' || saved === 'null') return fallback
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback
  } catch {
    return fallback
  }
}

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onload = () => resolve(reader.result)
  reader.onerror = error => reject(error)
})

const DEFAULT_MEDICAL_RECORD = {
  allergies: '',
  conditions: '',
  surgeries: '',
  medications: '',
  familyHistory: '',
  notes: ''
}

const normalizeMedicalRecord = (record = {}) => {
  if (!record || typeof record !== 'object') return { ...DEFAULT_MEDICAL_RECORD }
  const clean = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).join(', ')
    const normalized = String(value || '').trim()
    return /^(none|none known|null|undefined|n\/a)$/i.test(normalized) ? '' : normalized
  }
  return {
    allergies: clean(record.allergies),
    conditions: clean(record.conditions ?? record.chronicConditions),
    surgeries: clean(record.surgeries ?? record.pastSurgeries),
    medications: clean(record.medications),
    familyHistory: clean(record.familyHistory ?? record.familyMedicalHistory),
    notes: clean(record.notes)
  }
}

const normalizeMedicalRequest = (item = {}) => {
  if (!item || typeof item !== 'object') return item

  const filePath = item.file_path || item.filePath || null
  const fileName = item.file_name || item.fileName || null
  const fileSize = item.file_size ?? item.fileSize ?? null
  const fileMime = item.file_mime || item.fileMime || null
  const requestType = item.request_type || item.requestType || (fileName || filePath || item.status === 'Uploaded' ? 'student_upload' : 'admin_request')
  const studentId = item.studentId ?? item.student_id ?? item.studentID ?? null
  const studentNumber = item.studentNumber || item.student_number || null
  const studentName = item.studentName || item.student_name || null
  const submittedAt = item.submittedAt || item.submitted_at || null
  const fulfilledAt = item.fulfilledAt || item.fulfilled_at || null
  const viewedAt = item.viewedAt || item.viewed_at || null
  const requestedByName = item.requestedByName || item.requested_by_name || null
  const requestedByUserId = item.requestedByUserId || item.requested_by_user_id || null

  return {
    ...item,
    request_type: requestType,
    requestType,
    studentId,
    student_id: studentId,
    studentNumber,
    student_number: studentNumber,
    studentName,
    student_name: studentName,
    file_path: filePath,
    filePath,
    file_name: fileName,
    fileName,
    file_size: fileSize,
    fileSize,
    file_mime: fileMime,
    fileMime,
    submittedAt,
    fulfilled_at: fulfilledAt,
    fulfilledAt,
    viewed_at: viewedAt,
    viewedAt,
    requested_by_name: requestedByName,
    requestedByName,
    requested_by_user_id: requestedByUserId,
    requestedByUserId,
    downloadUrl: item.downloadUrl || (item.id ? `/api/medical-requests/${item.id}/download` : null),
    viewUrl: item.viewUrl || (item.id ? `/api/medical-requests/${item.id}/view` : null),
    fulfillmentFileName: fileName,
  }
}

const createDefaultAcademicSections = () => {
  const programs = ['CS', 'IT']
  const years = [1, 2, 3, 4]
  const letters = ['A', 'B', 'C', 'D', 'E']
  let nextId = 1

  return programs.flatMap(program =>
    years.flatMap(year =>
      letters.map(letter => ({
        id: nextId++,
        program,
        name: `${year}BS${program}-${letter}`,
        capacity: 50
      }))
    )
  )
}

export const normalizeCourseCode = (code) => {
  if (!code) return ''
  return String(code).toUpperCase().trim().replace(/^BS/i, '')
}

export const getYearLevelNumber = (value) => {
  if (!value) return ''
  const raw = String(value).trim()
  const digitMatch = raw.match(/[1-4]/)
  if (digitMatch) return digitMatch[0]

  const lower = raw.toLowerCase()
  if (lower.includes('first')) return '1'
  if (lower.includes('second')) return '2'
  if (lower.includes('third')) return '3'
  if (lower.includes('fourth')) return '4'
  return ''
}

export const normalizeYearLevel = (value) => {
  const yearNumber = getYearLevelNumber(value)
  if (!yearNumber) return ''

  const labels = {
    '1': '1st year',
    '2': '2nd year',
    '3': '3rd year',
    '4': '4th year',
  }
  return labels[yearNumber] || ''
}

export const parseSectionName = (name, fallbackProgram = '') => {
  const rawName = String(name || '').trim()
  const normalizedName = rawName.toUpperCase()
  const fullMatch = normalizedName.match(/^([1-4])\s*BS([A-Z]+)\s*-\s*([A-Z0-9]+)$/)

  if (fullMatch) {
    const [, yearNumber, program, section] = fullMatch
    return {
      rawName,
      normalizedName,
      program: normalizeCourseCode(program),
      yearLevel: normalizeYearLevel(yearNumber),
      yearNumber,
      section: section.toUpperCase(),
      canonicalName: `${yearNumber}BS${normalizeCourseCode(program)}-${section.toUpperCase()}`
    }
  }

  return {
    rawName,
    normalizedName,
    program: normalizeCourseCode(fallbackProgram),
    yearLevel: '',
    yearNumber: '',
    section: normalizedName,
    canonicalName: normalizedName
  }
}

export const buildCanonicalSectionName = (program, yearLevel, section) => {
  const normalizedProgram = normalizeCourseCode(program)
  const yearNumber = getYearLevelNumber(yearLevel)
  const normalizedSection = String(section || '').trim().toUpperCase()

  if (normalizedProgram && yearNumber && normalizedSection) {
    return `${yearNumber}BS${normalizedProgram}-${normalizedSection}`
  }

  return normalizedSection
}

export const getStudentAcademicInfo = (student) => {
  const dynamic = student?.dynamic_data || {}
  let course = normalizeCourseCode(dynamic['Course'] || dynamic['course'] || student?.course || '')
  let yearLevel = normalizeYearLevel(dynamic['Year Level'] || dynamic['yearLevel'] || dynamic['year level'] || student?.yearLevel || '')
  let section = String(dynamic['Section'] || dynamic['section'] || student?.section || '').trim().toUpperCase()

  const parsedSection = parseSectionName(section, course)

  if (!course && parsedSection.program) course = parsedSection.program
  if (!yearLevel && parsedSection.yearLevel) yearLevel = parsedSection.yearLevel
  if (parsedSection.yearLevel && parsedSection.section) section = parsedSection.section

  return {
    course,
    yearLevel,
    yearNumber: getYearLevelNumber(yearLevel),
    section,
    canonicalSection: buildCanonicalSectionName(course, yearLevel, section)
  }
}

export const getAcademicSectionInfo = (sectionRecord) => {
  const parsed = parseSectionName(sectionRecord?.name, sectionRecord?.program)
  const program = normalizeCourseCode(sectionRecord?.program || parsed.program)
  const yearLevel = sectionRecord?.yearLevel || parsed.yearLevel
  const section = sectionRecord?.section || parsed.section

  return {
    ...sectionRecord,
    program,
    yearLevel,
    yearNumber: getYearLevelNumber(yearLevel),
    section,
    canonicalName: buildCanonicalSectionName(program, yearLevel, section) || sectionRecord?.name || parsed.normalizedName
  }
}

export const studentMatchesSection = (student, sectionRecord) => {
  const studentInfo = getStudentAcademicInfo(student)
  const sectionInfo = getAcademicSectionInfo(sectionRecord)

  if (normalizeCourseCode(studentInfo.course) !== normalizeCourseCode(sectionInfo.program)) return false

  if (sectionInfo.yearNumber) {
    return studentInfo.yearNumber === sectionInfo.yearNumber &&
      String(studentInfo.section).toUpperCase() === String(sectionInfo.section).toUpperCase()
  }

  return String(studentInfo.section).toUpperCase() === String(sectionInfo.section).toUpperCase()
}

const mergeData = (prev, incoming, idProp = 'id') => {
  if (!incoming) return prev
  const items = Array.isArray(incoming) ? incoming : [incoming]
  const merged = [...prev]
  items.forEach(item => {
    if (!item || typeof item !== 'object') return
    const exists = merged.findIndex(m => {
      // Prioritize ID matching if both exist
      if (item.id && m.id && String(m.id) === String(item.id)) return true
      // Handle specific identifiers like studentNumber
      if (idProp) {
        const getItemVal = (obj) => {
          if (obj[idProp]) return obj[idProp]
          if (idProp === 'studentNumber') {
            return obj.dynamic_data?.['Student Number'] || obj.dynamic_data?.['studentNumber']
          }
          return null
        }
        const mVal = getItemVal(m)
        const iVal = getItemVal(item)
        if (mVal && iVal && String(mVal) === String(iVal)) return true
      }
      return false
    })
    if (exists !== -1) {
      merged[exists] = { ...merged[exists], ...item }
    } else {
      merged.push(item)
    }
  })
  return merged
}

export const applyTheme = (theme) => {
  const root = document.documentElement
  const hexToRgb = (hex) => {
    const clean = String(hex || '').replace('#', '')
    if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return '201, 86, 20'
    return `${parseInt(clean.slice(0, 2), 16)}, ${parseInt(clean.slice(2, 4), 16)}, ${parseInt(clean.slice(4, 6), 16)}`
  }
  root.style.setProperty('--orange', theme.primaryColor)
  root.style.setProperty('--orange-dark', theme.primaryDark)
  root.style.setProperty('--orange-light', theme.primaryLight)
  root.style.setProperty('--orange-rgb', hexToRgb(theme.primaryColor))
  root.style.setProperty('--orange-dark-rgb', hexToRgb(theme.primaryDark))
  root.style.setProperty('--bg', theme.backgroundColor)
  root.style.setProperty('--card-bg', theme.cardBackground)
  root.style.setProperty('--text', theme.textColor)
  root.style.setProperty('--text-muted', theme.textMuted)
  root.style.setProperty('--heading-color', theme.headingColor || theme.primaryColor)
  root.style.setProperty('--sidebar-bg', theme.sidebarBackground)
  root.style.setProperty('--sidebar-active', theme.sidebarActive)
  root.style.setProperty('--sidebar-text', theme.sidebarTextColor || theme.textMuted)
  root.style.setProperty('--border', theme.borderColor)

  console.log('--- Theme: Applied CSS Variables ---', theme.primaryColor)
}

export const PROGRAMS = ['IT', 'CS']
export const PROGRAM_LABELS = { IT: 'BSIT', CS: 'BSCS' }
export const PROGRAM_FULL = {
  IT: 'Bachelor of Science in Information Technology',
  CS: 'Bachelor of Science in Computer Science',
}
export const YEAR_LEVELS = ['1st year', '2nd year', '3rd year', '4th year']
export const SECTIONS = [
  '1BSIT-A', '1BSIT-B', '1BSIT-C', '1BSIT-D',
  '2BSIT-A', '2BSIT-B', '2BSIT-C', '2BSIT-D',
  '3BSIT-A', '3BSIT-B', '3BSIT-C', '3BSIT-D',
  '4BSIT-A', '4BSIT-B', '4BSIT-C', '4BSIT-D',
  '1BSCS-A', '1BSCS-B', '1BSCS-C',
  '2BSCS-A', '2BSCS-B', '2BSCS-C',
  '3BSCS-A', '3BSCS-B', '3BSCS-C',
  '4BSCS-A', '4BSCS-B', '4BSCS-C',
  'A', 'B', 'C', 'D'
]
export const GENDERS = ['Male', 'Female', 'Other']
export const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']
export const POSITIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Instructor', 'Secretary', 'Dean', 'Program Chair']
export const FACULTY_STATUSES = ['F', 'P', 'COS']

const seedStudents = []

const seedFaculty = [
  {
    id: 1, facultyNumber: '#0000001', lastName: 'Jagorin', firstName: 'Bea', middleName: 'L.',
    position: 'Associate Professor', gender: 'Female', status: 'F', dateRegistered: '01/15/25',
    dateOfBirth: '1985-02-20', civilStatus: 'Married', nationality: 'Filipino', religion: 'Catholic',
    residency: 'Resident', specialization: 'Software Engineering',
    homeAddress: '78 Molave St., Los Banos, Laguna', contactNumber: '+63 917 222 3333',
    altContactNumber: '', emailAddress: 'bea.jagorin@pnc.edu.ph', lastSchool: 'UPLB',
    lastYearAttended: '2008', honors: 'Cum Laude',
    highestDegree: 'Master of Science in Computer Science', yearCompleted: '2012',
    fatherName: '', fatherOccupation: '', fatherDob: '', fatherContact: '',
    motherName: '', motherOccupation: '', motherDob: '', motherContact: '',
    siblings: 1, annualIncome: '600000', guardianName: '', guardianContact: '', guardianRelation: '',
    photo: null,
    medicalRecord: { allergies: 'None', chronicConditions: 'None', pastSurgeries: 'None', medications: 'None', familyMedicalHistory: 'None' }
  },
  {
    id: 2, facultyNumber: '#0000002', lastName: 'Hilaga', firstName: 'Jhanes Jade', middleName: 'G.',
    position: 'Secretary', gender: 'Female', status: 'P', dateRegistered: '01/15/25',
    dateOfBirth: '1992-11-30', civilStatus: 'Single', nationality: 'Filipino', religion: 'Catholic',
    residency: 'Non-Resident', specialization: 'Office Administration',
    homeAddress: '22 Acacia Rd., Binan, Laguna', contactNumber: '+63 918 444 5555',
    altContactNumber: '', emailAddress: 'jhanes.hilaga@pnc.edu.ph', lastSchool: 'PNC',
    lastYearAttended: '2014', honors: 'None',
    highestDegree: 'Bachelor of Science in Office Administration', yearCompleted: '2014',
    fatherName: '', fatherOccupation: '', fatherDob: '', fatherContact: '',
    motherName: '', motherOccupation: '', motherDob: '', motherContact: '',
    siblings: 4, annualIncome: '180000', guardianName: '', guardianContact: '', guardianRelation: '',
    photo: null,
    medicalRecord: { allergies: 'None', chronicConditions: 'None', pastSurgeries: 'None', medications: 'None', familyMedicalHistory: 'None' }
  }
]

const seedCurricula = [
  { id: 1, program: 'IT', programName: 'Bachelor of Science in Information Technology', totalUnits: 120, duration: '4 years', version: '2024', status: 'Active', dateUploaded: '01/15/24' },
  { id: 2, program: 'CS', programName: 'Bachelor of Science in Computer Science', totalUnits: 120, duration: '4 years', version: '2024 (Revised)', status: 'Active', dateUploaded: '01/15/24' },
]

const seedSyllabi = [
  {
    id: 1,
    courseTitle: 'Web Development Fundamentals',
    courseCode: 'WDF101',
    units: 3,
    program: 'IT',
    yearLevel: '1st year',
    semester: '1st Semester',
    dateUploaded: '01/15/24',
    description: 'A foundational course covering HTML, CSS, and JavaScript for building modern web pages.',
    objectives: [
      'Understand basic web technologies',
      'Develop structured web pages using HTML',
      'Apply styling using CSS',
      'Implement simple interactivity using JavaScript'
    ],
    instructor: 'Asst. Prof. Bea Santos',
    instructorEmail: 'bea.santos@pnc.edu.ph',
    schedule: 'Days: Tues & Thu | Time: 9:00 AM - 11:30 AM | Room: Computer Lab 2',
    gradingSystem: 'Prelim 30% | Midterm 30% | Finals 40%',
    weeklyPlan: [
      { week: 1, topic: 'Introduction to Web Development', activities: 'Orientation', assessment: '' },
      { week: 2, topic: 'HTML Basics', activities: 'Coding Exercise', assessment: 'Activity 1' },
      { week: 3, topic: 'Forms and Tables', activities: 'Lab Work', assessment: '' },
      { week: 4, topic: 'CSS Fundamentals', activities: 'Styling Exercise', assessment: 'Activity 2' },
      { week: 5, topic: 'Layout (Flexbox)', activities: 'Project Work', assessment: '' },
      { week: 6, topic: 'Responsive Design', activities: 'Lab Work', assessment: 'Quiz 1' },
      { week: 7, topic: 'Javascript Basics', activities: 'Coding Exercise', assessment: '' },
      { week: 8, topic: 'DOM Manipulation', activities: 'Project Work', assessment: 'Midterm' }
    ],
    lessons: [
      { id: 101, title: 'Introduction to Web Development', content: 'Overview of web technologies and browser basics.', week: 1, order: 1 },
      { id: 102, title: 'HTML Basics', content: 'Structure of HTML documents, headings, paragraphs, and links.', week: 2, order: 2 }
    ],
    files: []
  },
  {
    id: 2,
    courseTitle: 'Object Oriented Programming',
    courseCode: 'OOP201',
    units: 3,
    program: 'CS',
    yearLevel: '1st year',
    semester: '1st Semester',
    dateUploaded: '01/15/24',
    description: 'Covers fundamental concepts of object-oriented programming using Java.',
    objectives: [
      'Understand OOP principles',
      'Implement classes and objects',
      'Apply inheritance and polymorphism'
    ],
    instructor: 'Prof. Mark Dela Cruz',
    instructorEmail: 'mark.delacruz@pnc.edu.ph',
    schedule: 'Days: Mon & Wed | Time: 1:00 PM - 3:30 PM | Room: Computer Lab 3',
    gradingSystem: 'Prelim 30% | Midterm 30% | Finals 40%',
    weeklyPlan: [
      { week: 1, topic: 'Intro to OOP', activities: 'Lecture', assessment: '' },
      { week: 2, topic: 'Classes & Objects', activities: 'Coding', assessment: 'Activity 1' },
      { week: 3, topic: 'Encapsulation', activities: 'Lab Work', assessment: '' },
      { week: 4, topic: 'Inheritance', activities: 'Coding', assessment: 'Activity 2' }
    ],
    lessons: [],
    files: []
  }
]

const seedSchedules = [
  { id: 1, subject: 'CSS101', yearLevel: '1st yr', program: 'CS', section: 'A', facultyId: 1, room: 'Comlab 1', day: 'Tuesday', startTime: '07:00', endTime: '08:30', color: 'var(--orange)' },
  { id: 2, subject: 'ITP101', yearLevel: '2nd yr', program: 'IT', section: 'B', facultyId: 1, room: 'Comlab 2', day: 'Tuesday', startTime: '09:00', endTime: '10:30', color: 'var(--orange-dark)' },
  { id: 4, subject: 'WDF101', yearLevel: '1st yr', program: 'IT', section: 'A', facultyId: 1, room: 'Comlab 1', day: 'Thursday', startTime: '09:00', endTime: '11:30', color: 'var(--orange)' },
  { id: 5, subject: 'OOP201', yearLevel: '1st yr', program: 'CS', section: 'B', facultyId: null, room: 'Comlab 2', day: 'Monday', startTime: '13:00', endTime: '15:30', color: 'var(--orange-dark)' }
]

const seedEvents = [
  {
    id: 1, name: 'Web Development Bootcamp', department: 'CCS/BSIT/SITeS',
    dateTime: '2026-04-15T09:00', endTime: '2026-04-15T15:00', venue: 'Main Building ComLab 2',
    participants: 30, participantGroups: 'BSIT/BSCS', category: 'Academic', mode: 'Face-to-Face',
    registrationDeadline: '2026-04-10',
    description: 'A hands-on workshop focused on building responsive websites using HTML, CSS, and JavaScript.',
    objectives: [
      'Enhance practical web development skills',
      'Apply concepts learned in class',
      'Encourage collaboration among students'
    ],
    status: 'Upcoming'
  },
  {
    id: 2, name: 'Mobile Blood Donation', department: 'Red Cross Youth',
    dateTime: '2026-04-20T07:00', endTime: '2026-04-20T20:00', venue: 'Main Building Gym 1',
    participants: 5, participantGroups: 'BSIT/BSCS', category: 'Community Service', mode: 'Face-to-Face',
    registrationDeadline: '2026-04-18',
    description: 'Annual blood donation drive organized by Red Cross Youth chapter.',
    objectives: [
      'Support community health',
      'Promote volunteerism among students'
    ],
    status: 'Upcoming'
  }
]

const seedAnnouncements = [
  { id: 1, title: 'Enrollment for 2nd Semester Now Open', body: 'All students are advised to enroll for the 2nd semester from January 20-31, 2026.', date: '2026-01-15' },
  { id: 2, title: 'Mid-Year Academic Excellence Awards', body: 'Nominations for the Academic Excellence Awards are now being accepted until February 28, 2026.', date: '2026-01-18' }
]

const seedAccounts = [
  { id: 1, userNumber: 'ADMIN001', password: 'admin123', name: 'Admin User', role: 'admin', position: 'System Administrator' },
  { id: 2, userNumber: '#2203343', password: 'student123', name: 'Ayumi Angel Hara', role: 'student', position: 'Student - 1st Year IT' },
  { id: 3, userNumber: '#0000001', password: 'faculty123', name: 'Bea L. Jagorin', role: 'faculty', position: 'Associate Professor' }
]

export const ROLES = ['admin', 'student', 'faculty']
export const ROLE_LABELS = {
  admin: 'Admin',
  student: 'Student',
  faculty: 'Faculty'
}
export const USER_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived'
}

const seedUsers = [
  { id: 1, userNumber: 'ADMIN001', name: 'Admin User', email: 'admin@pnc.edu.ph', role: 'admin', status: 'active', createdAt: '2025-01-15', password: 'admin123' },
  { id: 2, userNumber: '#2203343', name: 'Ayumi Angel Hara', email: 'ayumi.hara@student.edu.ph', role: 'student', status: 'active', createdAt: '2025-01-15', password: 'student123' },
  { id: 3, userNumber: '#0000001', name: 'Bea L. Jagorin', email: 'bea.jagorin@pnc.edu.ph', role: 'faculty', status: 'active', createdAt: '2025-01-15', password: 'faculty123' },
  { id: 4, userNumber: '#2203345', name: 'Jayson Rodriguez', email: 'jayson.rodriguez@student.edu.ph', role: 'student', status: 'active', createdAt: '2025-01-16', password: 'student123' },
  { id: 5, userNumber: '#0000002', name: 'Jhanes Jade Hilaga', email: 'jhanes.hilaga@pnc.edu.ph', role: 'faculty', status: 'archived', createdAt: '2025-01-16', password: 'faculty123' },
  { id: 6, userNumber: '2203317', name: 'Bea Jagorin', email: 'bea.jagorin@student.edu.ph', role: 'student', status: 'active', createdAt: '2025-01-20', password: 'student123' }
]

const normalizeSyllabus = (data) => {
  const semesterValue = data?.semester || ''
  const extractedYear =
    data?.yearLevel ||
    (semesterValue.includes(' - ') ? semesterValue.split(' - ')[0] : '1st year')
  const extractedSemester =
    semesterValue.includes(' - ') ? semesterValue.split(' - ')[1] : (semesterValue || '1st Semester')
  return {
    ...data,
    yearLevel: extractedYear,
    semester: extractedSemester,
    objectives: data?.objectives || [],
    weeklyPlan: data?.weeklyPlan || [],
    lessons: data?.lessons || [],
    files: data?.files || []
  }
}

const seedViolations = [
  {
    id: 1,
    studentId: 1,
    dynamic_data: {
      'Type of Violation': 'Attendance Issues',
      'Description': 'Missed 3 consecutive lab sessions without prior notice.',
      'Date of Occurrence': '2026-03-10',
      'Severity Level': 'Minor',
      'Status': 'Resolved',
      'Assigned Disciplinary Measure': 'Verbal Warning'
    }
  }
]

const defaultViolationFields = [
  { id: 10001, module: 'violations', name: 'Type of Violation', type: 'select', options: ['Misconduct', 'Academic Dishonesty', 'Attendance Issues', 'Other'], section: 'Violation Details', is_required: true, show_in_table: true, order_index: 1 },
  { id: 10002, module: 'violations', name: 'Description', type: 'paragraph', section: 'Violation Details', is_required: true, show_in_table: false, order_index: 2 },
  { id: 10003, module: 'violations', name: 'Date of Occurrence', type: 'date', section: 'Violation Details', is_required: true, show_in_table: true, order_index: 3 },
  { id: 10004, module: 'violations', name: 'Severity Level', type: 'radio', options: ['Minor', 'Major', 'Critical'], section: 'Violation Details', is_required: true, show_in_table: true, order_index: 4 },
  { id: 10005, module: 'violations', name: 'Status', type: 'select', options: ['Pending', 'Under Review', 'Resolved'], section: 'Action Taken', is_required: true, show_in_table: true, order_index: 5 },
  { id: 10006, module: 'violations', name: 'Assigned Disciplinary Measure', type: 'short_text', section: 'Action Taken', is_required: false, show_in_table: true, order_index: 6 },
]

const defaultEnrollmentFields = [
  { id: 20001, module: 'enrollment', name: 'Student Full Name', type: 'short_text', section: 'Basic Information', is_required: true, show_in_table: true, order_index: 1 },
  { id: 20002, module: 'enrollment', name: 'Personal Email Address', type: 'short_text', section: 'Basic Information', is_required: true, show_in_table: true, order_index: 2 },
  { id: 20003, module: 'enrollment', name: 'Student Number', type: 'short_text', section: 'Basic Information', is_required: true, show_in_table: true, order_index: 3 },
  { id: 20004, module: 'enrollment', name: 'Expected Course', type: 'select', options: ['BSIT', 'BSCS', 'BSHM', 'BSBA'], section: 'Academic Details', is_required: true, show_in_table: true, order_index: 4 },
]

const defaultStudentFields = [
  { id: 30001, module: 'students', name: 'Photo', type: 'file', section: 'Basic Information', is_required: false, show_in_table: false, order_index: 0 },
]

const seedNotifications = [
  { id: 1, type: 'info', title: 'Welcome to the Portal', msg: 'You can now manage your schedule and professional profile directly from the dashboard.', time: '1h ago', read: false },
  { id: 2, type: 'success', title: 'Data Synchronized', msg: 'Your faculty records have been successfully unified across the system.', time: '3h ago', read: false }
]

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('currentUser')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [archivedSeedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('archivedSeedIds')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [students, setStudents] = useState([])
  const [isStudentsLoaded, setIsStudentsLoaded] = useState(false)

  useEffect(() => {
    const initializeData = async () => {
      const cachedStudents = await loadFromDB('students_list')
      if (cachedStudents && Array.isArray(cachedStudents)) {
        console.log('--- Students: Loaded from IndexedDB ---', cachedStudents.length)
        setStudents(cachedStudents)
      } else {
        // Fallback to localStorage/seeds if migrating or first load
        const filteredSeeds = seedStudents.filter(s => !archivedSeedIds.includes(s.id))
        const local = localStorage.getItem('students')
        if (local) {
          try {
            const parsed = JSON.parse(local).map(s => ({ ...s, medicalRecord: normalizeMedicalRecord(s.medicalRecord) }))
            setStudents(parsed)
            await saveToDB('students_list', parsed) // Move to IndexedDB
            localStorage.removeItem('students') // Cleanup localStorage to free 5MB
          } catch (e) {
            setStudents(filteredSeeds.map(s => ({ ...s, medicalRecord: normalizeMedicalRecord(s.medicalRecord) })))
          }
        } else {
          setStudents(filteredSeeds.map(s => ({ ...s, medicalRecord: normalizeMedicalRecord(s.medicalRecord) })))
        }
      }
      setIsStudentsLoaded(true)
    }
    initializeData()
  }, [archivedSeedIds])
  const [archivedStudents, setArchivedStudents] = useState(() => {
    // Reconstruct archived list from seed data using tracked IDs (avoids heavy localStorage)
    const archivedFromSeeds = seedStudents.filter(s => archivedSeedIds.includes(s.id))
      .map(s => ({ ...s, medicalRecord: normalizeMedicalRecord(s.medicalRecord) }))
    return archivedFromSeeds
  })
  const [deletedItems, setDeletedItems] = useState(() => loadState('deletedItems', []))
  const [faculty, setFaculty] = useState(() =>
    loadState('faculty', seedFaculty).map(f => ({ ...f, medicalRecord: normalizeMedicalRecord(f.medicalRecord) }))
  )
  const [curricula, setCurricula] = useState(seedCurricula)
  const [syllabi, setSyllabi] = useState(seedSyllabi.map(normalizeSyllabus))
  const [schedules, setSchedules] = useState(() => loadState('schedules', seedSchedules))
  const [events, setEvents] = useState(seedEvents)
  const [announcements, setAnnouncements] = useState(seedAnnouncements)
  const [toasts, setToasts] = useState([])
  const showToast = useCallback((msg, type = 'default') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])
  const [medicalRequests, setMedicalRequests] = useState(() => loadState('medicalRequests', []).map(normalizeMedicalRequest))

  const adminMedicalRequests = medicalRequests.filter(r => normalizeMedicalRequest(r).request_type === 'admin_request')
  const studentMedicalDocs = medicalRequests.filter(r => normalizeMedicalRequest(r).request_type === 'student_upload')

  const [theme, setThemeState] = useState(() => loadTheme(user))
  const [users, setUsers] = useState(() => loadState('users', seedUsers))
  const [userGroups, setUserGroups] = useState(() => loadState('userGroups', [
    { id: 1, name: 'Full Administrator Access', permissions: ['home', 'students', 'medical_records', 'faculty', 'instructional', 'scheduling', 'events', 'theme_settings', 'accounts'] },
    { id: 2, name: 'Standard Staff / Encoder', permissions: ['home', 'students', 'medical_records', 'faculty', 'scheduling'] },
    { id: 3, name: 'Academic Viewers', permissions: ['home', 'instructional', 'scheduling', 'events'] }
  ]))

  const [dynamicFields, setDynamicFields] = useState(() => {
    const fallback = [...defaultViolationFields, ...defaultEnrollmentFields, ...defaultStudentFields]
    const saved = loadState('dynamicFields', fallback)
    const hasEnrollment = saved.some(f => f.module === 'enrollment')
    if (!hasEnrollment) return [...saved, ...defaultEnrollmentFields]
    return saved
  })

  const [violations, setViolations] = useState(() => loadState('violations', seedViolations))
  const [enrollees, setEnrollees] = useState(() => loadState('enrollees', []))
  const [notifications, setNotifications] = useState(() => loadState('notifications', seedNotifications))
  const pushNotification = useCallback((type, title, msg, meta = {}) => {
    const newNotif = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      msg,
      time: 'Just now',
      read: false,
      ...meta
    }
    setNotifications(prev => [newNotif, ...prev])
  }, [])
  const getStudentNumber = (student) =>
    student?.studentNumber ||
    student?.dynamic_data?.['Student Number'] ||
    student?.student_number ||
    ''
  const getStudentDisplayName = (student) => {
    const first = student?.firstName || student?.dynamic_data?.['First Name'] || ''
    const middle = student?.middleName || student?.dynamic_data?.['Middle Name'] || ''
    const last = student?.lastName || student?.dynamic_data?.['Last Name'] || ''
    return `${first} ${middle} ${last}`.replace(/\s+/g, ' ').trim() || student?.studentName || student?.name || 'Student'
  }
  const [academicSections, setAcademicSections] = useState(() => loadState('academicSections', createDefaultAcademicSections()))

  const isSectionFull = useCallback((program, name, yearLevelOrExcludeStudentId = null, excludeStudentId = null) => {
    const explicitYearLevel = typeof yearLevelOrExcludeStudentId === 'string' ? yearLevelOrExcludeStudentId : null
    const resolvedExcludeStudentId = explicitYearLevel ? excludeStudentId : yearLevelOrExcludeStudentId

    const sec = academicSections.find(s =>
      String(s.name).toLowerCase() === String(name).toLowerCase() &&
      normalizeCourseCode(s.program) === normalizeCourseCode(program) &&
      (!explicitYearLevel || getAcademicSectionInfo(s).yearNumber === getYearLevelNumber(explicitYearLevel))
    )
    if (!sec) return false

    const targetSection = explicitYearLevel
      ? { ...sec, yearLevel: normalizeYearLevel(explicitYearLevel) }
      : sec

    const count = students.filter(s => {
      if (resolvedExcludeStudentId && s.id === resolvedExcludeStudentId) return false
      return studentMatchesSection(s, targetSection)
    }).length

    return count >= (sec.capacity || 50)
  }, [students, academicSections])

  const findNextAvailableSection = useCallback((program, yearLevel = null) => {
    const normProg = normalizeCourseCode(program)
    const targetYearNumber = getYearLevelNumber(yearLevel)

    const sortedSections = [...academicSections]
      .filter(s => {
        if (normalizeCourseCode(s.program) !== normProg) return false
        if (!targetYearNumber) return true
        return getAcademicSectionInfo(s).yearNumber === targetYearNumber
      })
      .sort((a, b) => {
        const aInfo = getAcademicSectionInfo(a)
        const bInfo = getAcademicSectionInfo(b)

        if (aInfo.yearNumber !== bInfo.yearNumber) {
          return String(aInfo.yearNumber).localeCompare(String(bInfo.yearNumber), undefined, { numeric: true })
        }

        return String(aInfo.section).localeCompare(String(bInfo.section))
      })

    for (const sec of sortedSections) {
      const count = students.filter(s => studentMatchesSection(s, sec)).length

      if (count < (sec.capacity || 50)) {
        return sec.name
      }
    }
    return null
  }, [students, academicSections])

  // Migration: Shift any IS/BSIS students to BSIT
  useEffect(() => {
    if (students.length > 0) {
      const hasIS = students.some(s => {
        const c = s.dynamic_data?.['Course'] || s.dynamic_data?.['course'] || s.course
        return c === 'IS' || c === 'BSIS' || c === 'Bachelor of Science in Information Systems'
      })
      if (hasIS) {
        console.log('Migrating IS students to BSIT...')
        const migrated = students.map(s => {
          const c = s.dynamic_data?.['Course'] || s.dynamic_data?.['course'] || s.course
          if (c === 'IS' || c === 'BSIS' || c === 'Bachelor of Science in Information Systems') {
            const updatedData = { ...(s.dynamic_data || {}) }
            if (updatedData['Course']) updatedData['Course'] = 'IT'
            if (updatedData['course']) updatedData['course'] = 'IT'
            return { ...s, course: 'IT', dynamic_data: updatedData }
          }
          return s
        })
        setStudents(migrated)
      }

    }

    // Migration: Remove IS from academicSections
    if (academicSections && academicSections.length > 0) {
      const hasIS = academicSections.some(s => s.program === 'IS' || s.program === 'BSIS')
      if (hasIS) {
        console.log('Removing IS sections...')
        const filtered = academicSections.filter(s => s.program !== 'IS' && s.program !== 'BSIS')
        setAcademicSections(filtered)
      }
    }

    if (academicSections && academicSections.length > 0) {
      const normalizedSections = academicSections
        .map(section => {
          const info = getAcademicSectionInfo(section)
          return {
            ...section,
            program: info.program || section.program,
            name: info.canonicalName || section.name,
            yearLevel: info.yearLevel || section.yearLevel,
            section: info.section || section.section,
            capacity: Number(section.capacity) || 50
          }
        })

      const hasLegacyFlatSections = normalizedSections.some(section => !getAcademicSectionInfo(section).yearNumber)
      if (hasLegacyFlatSections) {
        const canonicalSections = normalizedSections.filter(section => getAcademicSectionInfo(section).yearNumber)
        const baseSections = canonicalSections.length ? canonicalSections : createDefaultAcademicSections()
        const deduped = []
        const seen = new Set()

        baseSections.forEach(section => {
          const info = getAcademicSectionInfo(section)
          const key = `${normalizeCourseCode(info.program)}::${info.canonicalName}`
          if (seen.has(key)) return
          seen.add(key)
          deduped.push({
            ...section,
            program: info.program,
            name: info.canonicalName,
            yearLevel: info.yearLevel,
            section: info.section,
            capacity: Number(section.capacity) || 50
          })
        })

        console.log('Migrating legacy flat sections to canonical year-based sections...')
        setAcademicSections(deduped)
      }
    }
  }, [students, academicSections])

  useEffect(() => {
    if (!students.length || !academicSections.length) return

    const managedSections = academicSections
      .map(section => getAcademicSectionInfo(section))
      .filter(section => section.program && section.yearNumber && section.section)

    if (!managedSections.length) return

    const nextStudents = [...students]
    let changed = false
    const fullBuckets = []

    const bucketMap = managedSections.reduce((acc, section) => {
      const key = `${section.program}::${section.yearNumber}`
      if (!acc[key]) acc[key] = []
      acc[key].push(section)
      return acc
    }, {})

    Object.values(bucketMap).forEach(bucketSections => {
      const sortedSections = [...bucketSections].sort((a, b) => String(a.section).localeCompare(String(b.section)))
      const counts = new Map(sortedSections.map(section => [section.canonicalName, 0]))
      const assigned = new Map(sortedSections.map(section => [section.canonicalName, []]))

      nextStudents.forEach((student, index) => {
        const info = getStudentAcademicInfo(student)
        if (info.course !== sortedSections[0].program || info.yearNumber !== sortedSections[0].yearNumber) return

        const matchedSection = sortedSections.find(section => String(section.section).toUpperCase() === String(info.section).toUpperCase())
        if (!matchedSection) return

        counts.set(matchedSection.canonicalName, (counts.get(matchedSection.canonicalName) || 0) + 1)
        assigned.get(matchedSection.canonicalName).push(index)
      })

      sortedSections.forEach(section => {
        const sectionKey = section.canonicalName
        const capacity = Number(section.capacity) || 50
        const sectionAssignments = assigned.get(sectionKey) || []

        if (sectionAssignments.length <= capacity) return

        const overflowIndexes = sectionAssignments.slice(capacity)

        overflowIndexes.forEach(studentIndex => {
          const targetSection = sortedSections.find(candidate => (counts.get(candidate.canonicalName) || 0) < (Number(candidate.capacity) || 50))
          
          if (!targetSection || targetSection.canonicalName === sectionKey) {
            if (!fullBuckets.includes(sectionKey)) fullBuckets.push(sectionKey)
            return
          }

          const student = nextStudents[studentIndex]
          nextStudents[studentIndex] = {
            ...student,
            course: targetSection.program,
            yearLevel: targetSection.yearLevel,
            section: targetSection.section,
            dynamic_data: {
              ...(student.dynamic_data || {}),
              'Course': targetSection.program,
              'course': targetSection.program,
              'Year Level': targetSection.yearLevel,
              'yearLevel': targetSection.yearLevel,
              'Section': targetSection.section,
              'section': targetSection.section
            }
          }

          counts.set(sectionKey, Math.max(0, (counts.get(sectionKey) || 0) - 1))
          counts.set(targetSection.canonicalName, (counts.get(targetSection.canonicalName) || 0) + 1)
          changed = true
        })
      })
    })

    if (changed) {
      setStudents(nextStudents)
      showToast('Sections were rebalanced to match their capacity limits.', 'info')
    }

    if (fullBuckets.length > 0) {
      console.warn('Some sections are still over capacity:', fullBuckets)
      // Only show warning if rebalancing didn't just happen to avoid spam
      if (!changed) {
        showToast(`Warning: Some sections (${fullBuckets.slice(0,2).join(', ')}${fullBuckets.length > 2 ? '...' : ''}) are over capacity.`, 'error')
      }
    }
  }, [students, academicSections, showToast])

  // Persistence: Sync students to IndexedDB (much larger quota than localStorage)
  useEffect(() => {
    if (!students || students.length === 0) return

    const timer = setTimeout(async () => {
      // Still strip extremely large data for performance
      const optimized = students.map(s => {
        if (!s.dynamic_data) return s
        const d = { ...s.dynamic_data }
        let changed = false
        Object.keys(d).forEach(k => {
          const val = d[k]
          if (typeof val === 'string' && val.startsWith('data:') && val.length > 500000) { // 0.5MB+ only
            d[k] = '[IMAGE_TOO_LARGE]'
            changed = true
          }
        })
        return changed ? { ...s, dynamic_data: d } : s
      })
      
      await saveToDB('students_list', optimized)
      console.log('--- Students: Saved to IndexedDB ---')
    }, 2000)

    return () => clearTimeout(timer)
  }, [students])

  // Initialize theme on mount from both storages
  useEffect(() => {
    console.log('--- Startup: Initializing Theme Sync ---');
    const initializeTheme = async () => {
      // 1. Try IndexedDB (Primary for global sync now)
      const globalIDB = await loadFromDB('global_system_theme')
      if (globalIDB) {
        console.log('--- Startup: Theme Found in IDB ---', globalIDB.primaryColor)
        const t = normalizeTheme(globalIDB)
        setThemeState(t)
        applyTheme(t)
        return
      }

      // 2. Try LocalStorage fallback
      console.log('--- Startup: Theme Not in IDB, checking LocalStorage ---');
      const t = loadTheme(user)
      setThemeState(t)
      applyTheme(t)
    }
    initializeTheme()
  }, [user])

  // Sync theme across tabs using BroadcastChannel (more reliable than 'storage' event)
  useEffect(() => {
    const channel = new BroadcastChannel('app_theme_sync')
    channel.onmessage = (event) => {
      if (event.data?.type === 'THEME_UPDATE') {
        const newTheme = normalizeTheme(event.data.theme)
        setThemeState(newTheme)
        applyTheme(newTheme)
      }
    }

    const handleStorage = (e) => {
      if ((e.key === 'appTheme:global_v2' || e.key === 'appTheme:global') && e.newValue) {
        try {
          const newTheme = normalizeTheme(JSON.parse(e.newValue))
          setThemeState(newTheme)
          applyTheme(newTheme)
        } catch (e) {}
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      channel.close()
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const setTheme = (newTheme) => {
    console.log('--- setTheme called ---', newTheme.primaryColor);
    try {
      const key = getThemeStorageKey(user)
      setThemeState(newTheme)
      
      if (key) {
        try { localStorage.setItem(key, JSON.stringify(newTheme)); } catch (e) {}
      }
      
      // Save to Global Persistent Storage
      try {
        localStorage.setItem('appTheme:global_v2', JSON.stringify(newTheme))
        // Backup to IndexedDB for maximum reliability
        saveToDB('global_system_theme', newTheme)
        console.log('--- setTheme: Saved Global (LocalStorage + IDB) ---', newTheme.primaryColor)
      } catch (e) {
        console.warn('LocalStorage save failed, using IndexedDB fallback only.')
        saveToDB('global_system_theme', newTheme)
      }

      applyTheme(newTheme)

      // Broadcast to other tabs
      const channel = new BroadcastChannel('app_theme_sync')
      channel.postMessage({ type: 'THEME_UPDATE', theme: newTheme })
      channel.close()
    } catch (err) {
      console.error('Theme Save Fail:', err)
      applyTheme(newTheme)
    }
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Persistence Effects
  const [savedReports, setSavedReports] = useState(() => loadState('savedReports'))

  // Save light config only
  useEffect(() => { localStorage.setItem('dynamicFields', JSON.stringify(dynamicFields)) }, [dynamicFields])
  useEffect(() => { localStorage.setItem('userGroups', JSON.stringify(userGroups)) }, [userGroups])
  useEffect(() => { localStorage.setItem('violations', JSON.stringify(violations)) }, [violations])
  


  // Persist deletedItems (recycle bin) — strip heavy data to avoid quota issues
  useEffect(() => {
    try {
      const lightweight = deletedItems.map(item => {
        if (!item.data) return item
        const { photo, medicalRecord, ...lightData } = item.data
        // Also strip any base64 strings from dynamic_data
        if (lightData.dynamic_data) {
          const cleanDynamic = { ...lightData.dynamic_data }
          for (const key of Object.keys(cleanDynamic)) {
            if (typeof cleanDynamic[key] === 'string' && cleanDynamic[key].length > 500) {
              cleanDynamic[key] = '[file]'
            }
          }
          lightData.dynamic_data = cleanDynamic
        }
        return { ...item, data: lightData }
      })
      localStorage.setItem('deletedItems', JSON.stringify(lightweight))
    } catch(e) {
      console.warn('Could not persist recycle bin — storage quota may be full.')
    }
  }, [deletedItems])

  // Cleanup heavy items from localStorage once to free space
  useEffect(() => {
    const heavyKeys = ['students', 'archivedStudents', 'faculty', 'medicalRequests', 'users', 'enrollees'];
    heavyKeys.forEach(k => {
      try { localStorage.removeItem(k); } catch(e) {}
    });
  }, []);
  useEffect(() => {
    if (!user) return
    const fetchEnrollees = async () => {
      try {
        const res = await axios.get('/api/enrollees')
        setEnrollees(res.data)
      } catch (err) {
        console.warn('Failed to fetch enrollees from server.')
      }
    }
    fetchEnrollees()
  }, [user])
  useEffect(() => { localStorage.setItem('academicSections', JSON.stringify(academicSections)) }, [academicSections])
  useEffect(() => { 
    try {
      localStorage.setItem('notifications', JSON.stringify(notifications)) 
    } catch(e) {}
  }, [notifications])
  useEffect(() => { localStorage.setItem('savedReports', JSON.stringify(savedReports)) }, [savedReports])
  useEffect(() => { localStorage.setItem('schedules', JSON.stringify(schedules)) }, [schedules])

  // Cross-tab synchronization for notifications
  useEffect(() => {
    const handleSync = (e) => {
      if (e.key === 'notifications' && e.newValue) {
        try {
          setNotifications(JSON.parse(e.newValue))
        } catch (err) {}
      }
    }
    window.addEventListener('storage', handleSync)
    return () => window.removeEventListener('storage', handleSync)
  }, [])

  // Data Cleanup: Prevent duplicate student IDs
  useEffect(() => {
    setStudents(prev => {
      const unique = []
      const seen = new Set()
      prev.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          unique.push(item)
        }
      })
      if (unique.length !== prev.length) return unique
      return prev
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const fetchAll = async () => {
      try {
        const [s, f, m, u, ug, v, df, sch] = await Promise.all([
          axios.get('/api/students'),
          axios.get('/api/faculty'),
          axios.get('/api/medical-requests'),
          axios.get('/api/users'),
          axios.get('/api/user-groups'),
          axios.get('/api/violations'),
          axios.get('/api/dynamic-fields'),
          axios.get('/api/schedules')
        ])
        setStudents(prev => mergeData(prev, s.data, 'studentNumber'))
        setFaculty(prev => mergeData(prev, f.data, 'facultyNumber'))
        setMedicalRequests(prev => mergeData(prev.map(normalizeMedicalRequest), (m.data || []).map(normalizeMedicalRequest), 'id'))
        setUsers(prev => mergeData(prev, u.data, 'userNumber'))
        setUserGroups(prev => mergeData(prev, ug.data, 'id'))
        setViolations(prev => mergeData(prev, v.data, 'id'))
        let fields = df.data.map(field => ({ ...field, module: field.module || 'students' }))
        if (!fields.some(f => f.module === 'violations')) fields = [...fields, ...defaultViolationFields]
        setDynamicFields(prev => mergeData(prev, fields, 'id'))
        // Normalize schedule fields (DB uses snake_case, frontend uses camelCase)
        if (Array.isArray(sch.data) && sch.data.length > 0) {
          const normalizedSchedules = sch.data.map(s => ({
            ...s,
            facultyId: s.facultyId ?? s.faculty_id,
            yearLevel: s.yearLevel ?? s.year_level,
            startTime: s.startTime ?? s.start_time,
            endTime: s.endTime ?? s.end_time,
          }))
          setSchedules(prev => mergeData(prev, normalizedSchedules, 'id'))
        }
      } catch (err) {
        console.warn('API sync paused: working in local-only mode.')
      }
    }
    fetchAll()
  }, [user])


  const login = async (userNumber, password) => {
    try {
      const res = await axios.post('/api/login', { userNumber, password })
      if (res.data && res.data.user) {
        const acc = res.data.user
        setUser(acc)
        sessionStorage.setItem('currentUser', JSON.stringify(acc))
        return { success: true, role: acc.role }
      }
    } catch (err) {
      const apiMsg = err.response?.data?.message
      const searchNum = (userNumber || '').trim().replace('#', '')
      const localUser = users.find(u => {
        const uNum = (u.userNumber || '').trim().replace('#', '')
        return uNum === searchNum && u.password === password && u.status !== 'archived'
      })
      if (localUser) {
        setUser(localUser)
        sessionStorage.setItem('currentUser', JSON.stringify(localUser))
        return { success: true, role: localUser.role }
      }
      return { success: false, message: apiMsg || 'Invalid user number or password.' }
    }
    return { success: false, message: 'Invalid user number or password.' }
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('currentUser')
  }

  const isAdmin = user?.role === 'admin'

  const hasPermission = useCallback((moduleId, action = 'r') => {
    if (!user) return false
    if (user.role === 'admin') return true
    if (moduleId === 'student_portal' && user.role === 'student') return true
    const check = (perms) => {
      if (!perms) return false
      if (typeof perms === 'object' && !Array.isArray(perms)) {
        return !!perms[moduleId]?.[action]
      }
      if (Array.isArray(perms)) {
        return perms.includes(moduleId)
      }
      return false
    }
    if (user.custom_permissions && check(user.custom_permissions)) return true
    if (user.group_id) {
      const group = userGroups.find(g => String(g.id) === String(user.group_id))
      if (group && check(group.permissions)) return true
    }
    return false
  }, [user, userGroups])

  const genDate = () =>
    new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })

  const softDelete = (type, data) => {
    const binItem = { binId: Date.now() + Math.random(), type, data, deletedAt: new Date().toISOString() }
    setDeletedItems(prev => [binItem, ...prev])
  }

  const restoreFromBin = (binId) => {
    const item = deletedItems.find(i => i.binId === binId)
    if (!item) return
    if (item.type === 'student') setStudents(prev => [...prev, item.data])
    else if (item.type === 'faculty') setFaculty(prev => [...prev, item.data])
    else if (item.type === 'curriculum') setCurricula(prev => [...prev, item.data])
    else if (item.type === 'syllabus') setSyllabi(prev => [...prev, item.data])
    else if (item.type === 'event') setEvents(prev => [...prev, item.data])
    else if (item.type === 'announcement') setAnnouncements(prev => [...prev, item.data])
    else if (item.type === 'violation') setViolations(prev => [...prev, item.data])
    else if (item.type === 'user') setUsers(prev => [...prev, item.data])
    else if (item.type === 'enrollee') setEnrollees(prev => [...prev, item.data])
    setDeletedItems(prev => prev.filter(i => i.binId !== binId))
    showToast(`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} restored!`, 'success')
  }

  const permanentDelete = (binId) => {
    setDeletedItems(prev => prev.filter(i => i.binId !== binId))
    showToast('Item permanently deleted.', 'info')
  }

  const createFileItem = (file) => ({
    id: Date.now() + Math.random(),
    name: file.name,
    size: file.size,
    type: file.type,
    url: URL.createObjectURL(file),
    dateUploaded: genDate()
  })

  const fetchArchivedStudents = async () => {
    try {
      const res = await axios.get('/api/students?archived=1')
      setArchivedStudents(res.data)
    } catch (err) { console.error(err) }
  }

  const archiveStudent = async (id) => {
    try {
      await axios.post(`/api/students/${id}/archive`)
    } catch (err) {
      console.error(err)
    }
    const student = students.find(s => s.id === id)
    if (student) {
      setStudents(prev => prev.filter(s => s.id !== id))
      setArchivedStudents(prev => [student, ...prev])
      // Track archived seed IDs so they don't reappear on refresh
      if (seedStudents.some(s => s.id === id)) {
        try {
          const existing = JSON.parse(localStorage.getItem('archivedSeedIds') || '[]')
          if (!existing.includes(id)) {
            localStorage.setItem('archivedSeedIds', JSON.stringify([...existing, id]))
          }
        } catch(e) {}
      }
    }
    showToast('Student archived successfully!', 'success')
  }

  const restoreStudent = async (id) => {
    try {
      await axios.post(`/api/students/${id}/restore`)
    } catch (err) {
      console.error(err)
    }
    const student = archivedStudents.find(s => s.id === id)
    if (student) {
      setArchivedStudents(prev => prev.filter(s => s.id !== id))
      setStudents(prev => [student, ...prev])
      // Remove from archived seed IDs tracking if it was a seed
      if (seedStudents.some(s => s.id === id)) {
        try {
          const existing = JSON.parse(localStorage.getItem('archivedSeedIds') || '[]')
          localStorage.setItem('archivedSeedIds', JSON.stringify(existing.filter(x => x !== id)))
        } catch(e) {}
      }
    }
    showToast('Student restored successfully!', 'success')
  }

  const bulkArchiveStudents = async (ids) => {
    try {
      await axios.post('/api/students/bulk-archive', { ids })
    } catch (err) {
      console.error(err)
    }
    const archivedBatch = students.filter(s => ids.includes(s.id))
    setStudents(prev => prev.filter(s => !ids.includes(s.id)))
    setArchivedStudents(prev => [...archivedBatch, ...prev])
    // Track archived seed IDs so they don't reappear on refresh
    const seedIds = seedStudents.map(s => s.id)
    const newArchivedSeedIds = ids.filter(id => seedIds.includes(id))
    if (newArchivedSeedIds.length > 0) {
      try {
        const existing = JSON.parse(localStorage.getItem('archivedSeedIds') || '[]')
        const merged = [...new Set([...existing, ...newArchivedSeedIds])]
        localStorage.setItem('archivedSeedIds', JSON.stringify(merged))
      } catch(e) {}
    }
    showToast(`${ids.length} students archived successfully!`, 'success')
  }

  const addStudent = async (data) => {
    let payload = data
    if (data instanceof FormData) {
      payload.append('dateRegistered', genDate())
    } else {
      payload = {
        ...data,
        dateRegistered: genDate(),
        photo: null,
        medicalRecord: normalizeMedicalRecord(data.medicalRecord)
      }
    }
    const dynamicData = data instanceof FormData ? Object.fromEntries(data.entries()) : (data.dynamic_data || {})
    const localDynamicData = { ...dynamicData }
    for (const key of Object.keys(localDynamicData)) {
      if (localDynamicData[key] instanceof File && localDynamicData[key].type.startsWith('image/')) {
        try {
          localDynamicData[key] = await fileToBase64(localDynamicData[key])
        } catch (e) {
          console.error('File conversion failed', e)
        }
      }
    }
    const targetSection = localDynamicData['Section'] || localDynamicData['section'] || data.section
    const targetProgram = localDynamicData['Course'] || localDynamicData['course'] || data.course
    if (targetSection && targetProgram && isSectionFull(targetProgram, targetSection)) {
      showToast(`Warning: Section ${targetSection} is already at full capacity.`, 'error')
    }

    try {
      const res = await axios.post('/api/students', payload)
      const savedStudent = res.data
      setStudents(prev => [...prev, savedStudent])
      const fullName = `${savedStudent.firstName || ''} ${savedStudent.middleName || ''} ${savedStudent.lastName || ''}`.replace(/\s+/g, ' ').trim()
      const newUser = {
        id: Date.now() + 1,
        userNumber: savedStudent.studentNumber,
        name: fullName,
        email: savedStudent.emailAddress || '',
        role: 'student',
        status: 'active',
        createdAt: new Date().toISOString().slice(0, 10),
        password: 'student123'
      }
      setUsers(prev => [...prev, newUser])
      showToast('Student added successfully!', 'success')
    } catch (err) {
      console.error('■ ADD STUDENT ERROR:', err.response?.data || err.message)
      const localStudent = {
        id: Date.now(),
        dateRegistered: genDate(),
        dynamic_data: localDynamicData,
        medicalRecord: normalizeMedicalRecord()
      }
      setStudents(prev => [...prev, localStudent])
      const fullName = `${localStudent.dynamic_data?.['First Name'] || ''} ${localStudent.dynamic_data?.['Middle Name'] || ''} ${localStudent.dynamic_data?.['Last Name'] || ''}`.replace(/\s+/g, ' ').trim()
      const newUser = {
        id: Date.now() + 1,
        userNumber: localStudent.dynamic_data?.['Student Number'] || `S${Date.now()}`,
        name: fullName || 'New Student',
        email: localStudent.dynamic_data?.['Email Address'] || '',
        role: 'student',
        status: 'active',
        createdAt: new Date().toISOString().slice(0, 10),
        password: 'student123'
      }
      setUsers(prev => {
        const updated = [...prev, newUser]
        localStorage.setItem('users', JSON.stringify(updated))
        return updated
      })
      showToast('Student added successfully (Local)!', 'success')
    }
  }

  const addStudentsBulk = (rows) => {
    const newStudents = rows.map((r, i) => ({
      ...r,
      id: Date.now() + i,
      dateRegistered: genDate(),
      photo: null,
      medicalRecord: { allergies: 'None', chronicConditions: 'None', pastSurgeries: 'None', medications: 'None', familyMedicalHistory: 'None' }
    }))
    setStudents(prev => [...prev, ...newStudents])
    const newUsers = newStudents.map((student, i) => ({
      id: Date.now() + 1000 + i,
      userNumber: student.studentNumber,
      name: `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim(),
      email: student.emailAddress || '',
      role: 'student',
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      password: 'student123'
    }))
    setUsers(prev => [...prev, ...newUsers])
    showToast(`${rows.length} student(s) imported!`, 'success')
  }

  const updateStudent = async (id, data) => {
    const targetSection = (data instanceof FormData ? data.get('dynamic_data[Section]') || data.get('section') : (data.dynamic_data?.['Section'] || data.section))
    const targetProgram = (data instanceof FormData ? data.get('dynamic_data[Course]') || data.get('course') : (data.dynamic_data?.['Course'] || data.course))
    
    if (targetSection && targetProgram && isSectionFull(targetProgram, targetSection, id)) {
      showToast(`Warning: Target section ${targetSection} is at full capacity.`, 'error')
    }

    // Check if it's a seeded student (local-only)
    const isSeeded = String(id).startsWith('seed_') || isNaN(id)

    const extractSubmittedDynamicData = async (payload) => {
      if (payload instanceof FormData) {
        const result = {}
        for (const [key, value] of payload.entries()) {
          if (key === '_method') continue

          const match = key.match(/dynamic_data\[(.*)\](\[\])?/)
          if (!match) continue

          const fieldName = match[1]
          const isArrayField = Boolean(match[2])

          if (value instanceof File && value.type.startsWith('image/')) {
            try {
              const converted = await fileToBase64(value)
              result[fieldName] = converted
            } catch (err) {
              console.error('File conversion failed', err)
              result[fieldName] = value
            }
            continue
          }

          if (isArrayField) {
            if (!Array.isArray(result[fieldName])) result[fieldName] = []
            result[fieldName].push(value)
          } else {
            result[fieldName] = value
          }
        }
        return result
      }

      return { ...(payload?.dynamic_data || {}) }
    }

    if (!isSeeded) {
      try {
        const isFormData = data instanceof FormData
        const submittedDynamicData = await extractSubmittedDynamicData(data)
        if (isFormData) data.append('_method', 'PUT')
        const res = await axios(isFormData
          ? { method: 'post', url: `/api/students/${id}`, data }
          : { method: 'put', url: `/api/students/${id}`, data }
        )
        setStudents(prev => {
          const updated = prev.map(s => s.id === id
            ? {
                ...s,
                ...res.data,
                dynamic_data: {
                  ...(s.dynamic_data || {}),
                  ...(res.data?.dynamic_data || {}),
                  ...submittedDynamicData
                }
              }
            : s)
          return updated
        })
        showToast('Profile picture updated!', 'success')
        
        // Notifications...
        if (user?.role === 'student') {
          pushNotification('info', 'Student Profile Updated', `${user?.name || 'A student'} updated their profile.`, { audience: 'admin', path: '/students' })
        } else {
          const updatedStudent = res.data || students.find(s => s.id === id)
          pushNotification('info', 'Profile Updated', 'Your student profile was updated by the admin.', {
            audience: 'student',
            targetStudentId: id,
            targetStudentNumber: getStudentNumber(updatedStudent),
            path: '/student/profile'
          })
        }
        return // Success, exit
      } catch (e) {
        console.error('Server update failed, falling back to local:', e)
      }
    }

    // Fallback or Seeded student logic
    const processLocalData = async () => {
      let localDynamicData = {}
      let localTopLevelData = {}
      if (data instanceof FormData) {
        for (const [key, value] of data.entries()) {
          if (key === '_method') continue
          
          // Handle dynamic_data[Key] format
          const match = key.match(/dynamic_data\[(.*)\]/)
          const fieldName = match ? match[1] : key

          if (value instanceof File && value.type.startsWith('image/')) {
            try {
              localDynamicData[fieldName] = await fileToBase64(value)
            } catch (err) {
              console.error('File conversion failed', err)
              localDynamicData[fieldName] = value
            }
          } else {
            localDynamicData[fieldName] = value
          }
        }
      } else {
        localDynamicData = { ...(data.dynamic_data || data) }
        localTopLevelData = { ...data }
        delete localTopLevelData.dynamic_data
      }

      setStudents(prev => prev.map(s => s.id === id ? {
        ...s,
        ...localTopLevelData,
        dynamic_data: { ...(s.dynamic_data || {}), ...localDynamicData }
      } : s))
      showToast('Changes saved locally!', 'success')
    }
    processLocalData()
    
    if (user?.role === 'student') {
      pushNotification('info', 'Student Profile Updated', `${user?.name || 'A student'} updated their profile.`, { audience: 'admin', path: '/students' })
    } else {
      const updatedStudent = students.find(s => s.id === id)
      pushNotification('info', 'Profile Updated', 'Your student profile was updated by the admin.', {
        audience: 'student',
        targetStudentId: id,
        targetStudentNumber: getStudentNumber(updatedStudent),
        path: '/student/profile'
      })
    }
  }

  const deleteStudent = async (id) => {
    // Delete from backend API
    try {
      if (String(id).indexOf('seed_') === -1) {
        await axios.delete(`/api/students/${id}`)
      }
    } catch (err) {
      console.error('Failed to delete student from backend:', err)
    }

    // Check active students first
    let target = students.find(s => s.id === id)
    if (target) {
      softDelete('student', target)
      setStudents(prev => prev.filter(s => s.id !== id))
      showToast('Student moved to Recycle Bin.', 'info')
      return;
    }
    
    // Check archived students
    target = archivedStudents.find(s => s.id === id)
    if (target) {
      softDelete('student', target)
      setArchivedStudents(prev => prev.filter(s => s.id !== id))
      showToast('Archived student moved to Recycle Bin.', 'info')
    }
  }

  const addFaculty = async (data) => {
    try {
      const payload = { ...data, dateRegistered: genDate(), photo: null, medicalRecord: normalizeMedicalRecord(data.medicalRecord) }
      const res = await axios.post('/api/faculty', payload)
      const updated = [...faculty, res.data]
      setFaculty(updated)
      localStorage.setItem('faculty', JSON.stringify(updated))
      showToast('Faculty added!', 'success')
    } catch (err) {
      const localFaculty = { ...data, id: Date.now(), dateRegistered: genDate(), photo: null, medicalRecord: normalizeMedicalRecord(data.medicalRecord) }
      const updated = [...faculty, localFaculty]
      setFaculty(updated)
      localStorage.setItem('faculty', JSON.stringify(updated))
      showToast('Faculty added!', 'success')
    }
  }

  const addFacultyBulk = (rows) => {
    setFaculty(prev => [
      ...prev,
      ...rows.map((r, i) => ({ ...r, id: Date.now() + i, dateRegistered: genDate(), photo: null, medicalRecord: normalizeMedicalRecord() }))
    ])
    showToast(`${rows.length} faculty record(s) imported!`, 'success')
  }

  const updateFaculty = (id, data) => {
    const target = faculty.find(f => f.id === id)
    const fNum = data.facultyNumber || target?.facultyNumber
    const updated = faculty.map(f => {
      const matchId = f.id === id
      const matchNum = fNum && (f.facultyNumber === fNum || f.dynamic_data?.['Faculty Number'] === fNum)
      if (matchId || matchNum) return { ...f, ...data }
      return f
    })
    setFaculty(updated)
    localStorage.setItem('faculty', JSON.stringify(updated))
    showToast('Faculty records synchronized!', 'success')
  }

  const deleteFaculty = (id) => {
    const target = faculty.find(f => f.id === id)
    if (target) {
      softDelete('faculty', target)
      const updated = faculty.filter(f => f.id !== id)
      setFaculty(updated)
      showToast('Faculty record moved to Recycle Bin.')
    }
  }

  const addCurriculum = (data) => {
    setCurricula(prev => [...prev, { ...data, id: Date.now(), dateUploaded: genDate() }])
    showToast('Curriculum added!', 'success')
  }

  const addCurriculaBulk = (rows) => {
    setCurricula(prev => [
      ...prev,
      ...rows.map((r, i) => ({ ...r, id: Date.now() + i, dateUploaded: r.dateUploaded || genDate() }))
    ])
    showToast(`${rows.length} curriculum record(s) imported!`, 'success')
  }

  const updateCurriculum = (id, data) => {
    setCurricula(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    showToast('Curriculum updated!', 'success')
  }

  const deleteCurriculum = (id) => {
    const selectedCurriculum = curricula.find(c => c.id === id)
    if (selectedCurriculum) {
      softDelete('curriculum', selectedCurriculum)
      setCurricula(prev => prev.filter(c => c.id !== id))
      setSyllabi(prev => prev.filter(s => s.program !== selectedCurriculum.program))
      showToast('Curriculum moved to Recycle Bin.')
    }
  }

  const addSyllabus = (data) => {
    const syllabusData = normalizeSyllabus({ ...data, id: Date.now(), dateUploaded: genDate() })
    setSyllabi(prev => [...prev, syllabusData])
    showToast('Syllabus added!', 'success')
  }

  const addSyllabiBulk = (rows) => {
    setSyllabi(prev => [
      ...prev,
      ...rows.map((r, i) => normalizeSyllabus({ ...r, id: Date.now() + i, dateUploaded: r.dateUploaded || genDate() }))
    ])
    showToast(`${rows.length} syllabus record(s) imported!`, 'success')
  }

  const updateSyllabus = (id, data) => {
    setSyllabi(prev => prev.map(s => s.id === id ? normalizeSyllabus({ ...s, ...data }) : s))
    showToast('Syllabus updated!', 'success')
  }

  const deleteSyllabus = (id) => {
    const target = syllabi.find(s => s.id === id)
    if (target) {
      softDelete('syllabus', target)
      setSyllabi(prev => prev.filter(s => s.id !== id))
      showToast('Syllabus moved to Recycle Bin.')
    }
  }

  const addSyllabusFiles = (syllabusId, files) => {
    const newFiles = (files || []).map(createFileItem)
    setSyllabi(prev => prev.map(s => s.id === syllabusId ? { ...s, files: [...(s.files || []), ...newFiles] } : s))
    showToast('File(s) uploaded!', 'success')
  }

  const deleteSyllabusFile = (syllabusId, fileId) => {
    setSyllabi(prev => prev.map(s => s.id === syllabusId ? { ...s, files: (s.files || []).filter(file => file.id !== fileId) } : s))
    showToast('File deleted.')
  }

  const addLesson = (syllabusId, data) => {
    setSyllabi(prev => prev.map(s => s.id === syllabusId
      ? { ...s, lessons: [...(s.lessons || []), { ...data, id: Date.now() + Math.random() }] }
      : s
    ))
    showToast('Lesson added!', 'success')
  }

  const updateLesson = (syllabusId, lessonId, data) => {
    setSyllabi(prev => prev.map(s => s.id === syllabusId
      ? { ...s, lessons: (s.lessons || []).map(lesson => lesson.id === lessonId ? { ...lesson, ...data } : lesson) }
      : s
    ))
    showToast('Lesson updated!', 'success')
  }

  const deleteLesson = (syllabusId, lessonId) => {
    setSyllabi(prev => prev.map(s => s.id === syllabusId
      ? { ...s, lessons: (s.lessons || []).filter(lesson => lesson.id !== lessonId) }
      : s
    ))
    showToast('Lesson deleted.')
  }

  const addSchedule = async (data) => {
    try {
      const res = await axios.post('/api/schedules', data)
      const saved = res.data
      // Merge camelCase aliases returned by the model
      const normalized = {
        ...saved,
        facultyId: saved.facultyId ?? saved.faculty_id,
        yearLevel: saved.yearLevel ?? saved.year_level,
        startTime: saved.startTime ?? saved.start_time,
        endTime: saved.endTime ?? saved.end_time,
      }
      setSchedules(prev => [...prev, normalized])
      showToast('Schedule added!', 'success')
    } catch (err) {
      // Fallback to local-only if API unavailable
      setSchedules(prev => [...prev, { ...data, id: Date.now() }])
      showToast('Schedule added (local)!', 'success')
    }
  }

  const updateSchedule = async (id, data) => {
    try {
      const res = await axios.put(`/api/schedules/${id}`, data)
      const saved = res.data
      const normalized = {
        ...saved,
        facultyId: saved.facultyId ?? saved.faculty_id,
        yearLevel: saved.yearLevel ?? saved.year_level,
        startTime: saved.startTime ?? saved.start_time,
        endTime: saved.endTime ?? saved.end_time,
      }
      setSchedules(prev => prev.map(s => s.id === id ? normalized : s))
      showToast('Schedule updated!', 'success')
    } catch (err) {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
      showToast('Schedule updated (local)!', 'success')
    }
  }

  const deleteSchedule = async (id) => {
    try {
      await axios.delete(`/api/schedules/${id}`)
    } catch (err) {
      console.warn('Schedule delete fell back to local.')
    }
    setSchedules(prev => prev.filter(s => s.id !== id))
    showToast('Schedule deleted.')
  }

  const addEvent = (data) => {
    setEvents(prev => [...prev, { ...data, id: Date.now() }])
    showToast('Event added!', 'success')
    pushNotification('info', 'New Event Posted', `${data.name || data.title || 'A new event'} has been added.`, { audience: 'student', path: '/student/events' })
  }

  const updateEvent = (id, data) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
    showToast('Event updated!', 'success')
    pushNotification('info', 'Event Updated', `${data.name || data.title || 'An event'} was updated.`, { audience: 'student', path: '/student/events' })
  }

  const deleteEvent = (id) => {
    const target = events.find(e => e.id === id)
    if (target) {
      softDelete('event', target)
      setEvents(prev => prev.filter(e => e.id !== id))
      showToast('Event moved to Recycle Bin.')
    }
  }

  const addAnnouncement = (data) => {
    setAnnouncements(prev => [...prev, { ...data, id: Date.now() }])
    showToast('Announcement posted!', 'success')
    pushNotification('info', 'New Announcement', data.title || 'A new announcement was posted.', { audience: 'student', path: '/student/announcements' })
  }

  const deleteAnnouncement = (id) => {
    const target = announcements.find(a => a.id === id)
    if (target) {
      softDelete('announcement', target)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      showToast('Announcement moved to Recycle Bin.')
    }
  }

  const submitMedicalRequest = async (data) => {
    try {
      const payload = { ...data, status: 'Pending', submittedAt: new Date().toISOString() }
      const res = await axios.post('/api/medical-requests', payload)
      const updated = [...medicalRequests, normalizeMedicalRequest(res.data)]
      setMedicalRequests(updated)
      localStorage.setItem('medicalRequests', JSON.stringify(updated))
      showToast('Medical records request submitted!', 'success')
      return { success: true, data: res.data }
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to save medical request.'
      showToast(message, 'error')
      return { success: false, message }
    }
  }

  const requestMedicalRecord = async (data) => {
    try {
      const payload = { ...data, requested_by_name: data.requestedByName || data.requested_by_name || user?.name || 'Admin' }
      const res = await axios.post('/api/medical-requests', payload)
      setMedicalRequests(prev => [normalizeMedicalRequest(res.data), ...prev])
      showToast('Medical document request sent to student.', 'success')
      pushNotification('info', 'Medical Document Requested', `${data.recordType || 'A medical document'} was requested by the admin.`, {
        audience: 'student',
        targetStudentId: data.studentId,
        targetStudentNumber: data.studentNumber,
        path: '/student/medical'
      })
      return { success: true, data: res.data }
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to send medical document request.'
      showToast(message, 'error')
      return { success: false, message }
    }
  }

  const updateMedicalRequestStatus = async (id, status, extra = {}) => {
    try {
      const res = await axios.put(`/api/medical-requests/${id}`, { status, ...extra })
      setMedicalRequests(prev => prev.map(r => r.id === id ? normalizeMedicalRequest(res.data) : r))
      showToast('Medical request updated.', 'success')
      pushNotification('info', 'Medical Request Updated', `Your medical request status is now ${status}.`, {
        audience: 'student',
        targetStudentId: res.data?.studentId || extra.studentId,
        targetStudentNumber: res.data?.studentNumber || extra.studentNumber,
        path: '/student/medical'
      })
      return res.data
    } catch (err) {
      setMedicalRequests(prev => prev.map(r => r.id === id ? { ...r, status, ...extra } : r))
      showToast('Medical request updated locally.', 'success')
      const request = medicalRequests.find(r => r.id === id)
      pushNotification('info', 'Medical Request Updated', `Your medical request status is now ${status}.`, {
        audience: 'student',
        targetStudentId: request?.studentId || extra.studentId,
        targetStudentNumber: request?.studentNumber || extra.studentNumber,
        path: '/student/medical'
      })
      return null
    }
  }

  const deleteMedicalRequest = async (id) => {
    try {
      await axios.delete(`/api/medical-requests/${id}`)
    } catch (err) {
      console.warn('Delete request fell back to local mode.')
    }
    setMedicalRequests(prev => prev.filter(r => r.id !== id))
    showToast('Medical request deleted.', 'success')
  }

  const uploadStudentMedicalDocument = async (formData) => {
    try {
      const res = await axios.post('/api/medical-requests/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMedicalRequests(prev => [normalizeMedicalRequest(res.data), ...prev])
      showToast('Medical document uploaded.', 'success')
      pushNotification('success', 'Student Uploaded Medical Document', `${formData.get('studentName') || 'A student'} uploaded ${formData.get('recordType') || 'a medical document'}.`, { audience: 'admin', path: '/medical-records' })
      return { success: true, data: res.data }
    } catch (err) {
      if (err.response) {
        const message = err.response?.data?.message || 'Upload failed.'
        showToast(message, 'error')
        return { success: false, message }
      }

      const file = formData.get('file')
      const localFileUrl = file && typeof URL !== 'undefined' ? URL.createObjectURL(file) : null
      const localRecord = normalizeMedicalRequest({
        id: Date.now(),
        studentId: formData.get('studentId'),
        studentNumber: formData.get('studentNumber'),
        studentName: formData.get('studentName'),
        recordType: formData.get('recordType'),
        notes: formData.get('notes') || '',
        file_name: file?.name || 'medical-document.pdf',
        file_size: file?.size || null,
        file_mime: file?.type || 'application/pdf',
        request_type: 'student_upload',
        status: 'Uploaded',
        submittedAt: new Date().toISOString(),
        viewUrl: localFileUrl,
        downloadUrl: localFileUrl,
      })
      setMedicalRequests(prev => [localRecord, ...prev])
      showToast('Medical document uploaded locally.', 'success')
      pushNotification('success', 'Student Uploaded Medical Document', `${formData.get('studentName') || 'A student'} uploaded ${formData.get('recordType') || 'a medical document'}.`, { audience: 'admin', path: '/medical-records' })
      return { success: true, data: localRecord }
    }
  }

  const replaceStudentMedicalDocument = async (id, formData) => {
    try {
      const res = await axios.post(`/api/medical-requests/${id}/replace-upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const updated = normalizeMedicalRequest(res.data)
      setMedicalRequests(prev => prev.map(r => r.id === id ? updated : r))
      showToast('Medical document updated.', 'success')
      pushNotification('info', 'Student Updated Medical Document', `${updated.studentName || 'A student'} updated ${updated.recordType || 'a medical document'}.`, { audience: 'admin', path: '/medical-records' })
      return { success: true, data: updated }
    } catch (err) {
      if (err.response) {
        const message = err.response?.data?.message || 'Update failed.'
        showToast(message, 'error')
        return { success: false, message }
      }

      const file = formData.get('file')
      const localFileUrl = file && typeof URL !== 'undefined' ? URL.createObjectURL(file) : null
      const updated = normalizeMedicalRequest({
        id,
        recordType: formData.get('recordType'),
        notes: formData.get('notes') || '',
        file_name: file?.name || 'medical-document.pdf',
        file_size: file?.size || null,
        file_mime: file?.type || 'application/pdf',
        request_type: 'student_upload',
        status: 'Uploaded',
        submittedAt: new Date().toISOString(),
        viewUrl: localFileUrl,
        downloadUrl: localFileUrl,
      })
      setMedicalRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r))
      showToast('Medical document updated locally.', 'success')
      const request = medicalRequests.find(r => r.id === id)
      pushNotification('info', 'Student Updated Medical Document', `${request?.studentName || 'A student'} updated ${updated.recordType || 'a medical document'}.`, { audience: 'admin', path: '/medical-records' })
      return { success: true, data: updated }
    }
  }

  const fulfillMedicalRequest = async (id, formData) => {
    try {
      const res = await axios.post(`/api/medical-requests/${id}/fulfill`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMedicalRequests(prev => prev.map(r => r.id === id ? normalizeMedicalRequest(res.data) : r))
      showToast('Requested document uploaded.', 'success')
      const request = normalizeMedicalRequest(res.data)
      pushNotification('success', 'Requested Medical Document Submitted', `${request.studentName || 'A student'} submitted ${request.recordType || 'a requested document'}.`, { audience: 'admin', path: '/medical-records' })
      return { success: true, data: res.data }
    } catch (err) {
      const message = err.response?.status === 404 ? 'This request is no longer available. Please refresh the page and ask the admin to resend it if needed.' : err.response?.data?.message || 'Upload failed.'
      showToast(message, 'error')
      return { success: false, message }
    }
  }

  const markMedicalRequestViewed = async (id) => {
    try {
      const res = await axios.patch(`/api/medical-requests/${id}/viewed`)
      setMedicalRequests(prev => prev.map(r => r.id === id ? normalizeMedicalRequest(res.data) : r))
    } catch (err) {
      setMedicalRequests(prev => prev.map(r => r.id === id ? { ...r, viewed_at: new Date().toISOString() } : r))
    }
  }

  const addUser = async (data) => {
    try {
      const payload = { ...data, status: 'active' }
      if (!payload.userNumber) payload.userNumber = `USER${String(users.length + 1).padStart(4, '0')}`
      const norm = (payload.userNumber || '').trim().replace('#', '')
      if (payload.role === 'student') {
        const student = (students || []).find(s => {
          const sNum = (s.dynamic_data?.['Student Number'] || s.studentNumber || '').trim().replace('#', '')
          return sNum === norm
        })
        if (!student) {
          const newStudent = {
            id: Date.now(),
            firstName: payload.name.split(' ')[0] || 'Unknown',
            lastName: payload.name.split(' ').slice(1).join(' ') || 'Student',
            studentNumber: norm,
            dynamic_data: { 'Student Number': norm, 'First Name': payload.name.split(' ')[0] || 'Unknown', 'Last Name': payload.name.split(' ').slice(1).join(' ') || 'Student', 'Email Address': payload.email || '' }
          }
          setStudents(prev => [...prev, newStudent])
        }
      } else if (payload.role === 'faculty') {
        const staff = (faculty || []).find(f => {
          const fNum = (String(f.facultyNumber || '') || String(f.dynamic_data?.['Faculty Number'] || '')).trim().replace('#', '')
          return fNum === norm
        })
        if (!staff) {
          const newFaculty = {
            id: Date.now() + 500,
            name: payload.name,
            facultyNumber: norm,
            dynamic_data: { 'Faculty Number': norm, 'Full Name': payload.name, 'Email Address': payload.email || '' }
          }
          setFaculty(prev => [...prev, newFaculty])
        }
      }
      const res = await axios.post('/api/users', payload)
      const updated = [...users, res.data]
      setUsers(updated)
      localStorage.setItem('users', JSON.stringify(updated))
      showToast('User account created successfully!', 'success')
    } catch (err) {
      console.error(err)
      const payload = { ...data, status: 'active' }
      const rawNum = data.userNumber || `USER${String(users.length + 1).padStart(4, '0')}`
      const norm = (rawNum || '').trim().replace('#', '')
      const localUser = { ...payload, id: Date.now(), userNumber: norm, status: 'active', createdAt: new Date().toISOString().slice(0, 10) }
      const updatedUsers = [...users, localUser]
      setUsers(updatedUsers)
      localStorage.setItem('users', JSON.stringify(updatedUsers))
      showToast('User account created successfully!', 'success')
      if (localUser.role === 'student') {
        const student = (students || []).find(s => {
          const sNum = (s.dynamic_data?.['Student Number'] || s.studentNumber || '').trim().replace('#', '')
          return sNum === norm
        })
        if (!student) {
          const newStudent = {
            id: Date.now() + 1,
            firstName: localUser.name.split(' ')[0] || 'Unknown',
            lastName: localUser.name.split(' ').slice(1).join(' ') || 'Student',
            studentNumber: norm,
            dynamic_data: { 'Student Number': norm, 'First Name': localUser.name.split(' ')[0] || 'Unknown', 'Last Name': localUser.name.split(' ').slice(1).join(' ') || 'Student', 'Email Address': localUser.email || '' }
          }
          setStudents(prev => [...prev, newStudent])
        }
      } else if (localUser.role === 'faculty') {
        const staff = (faculty || []).find(f => {
          const fNum = (String(f.facultyNumber || '') || String(f.dynamic_data?.['Faculty Number'] || '')).trim().replace('#', '')
          return fNum === norm
        })
        if (!staff) {
          const newFaculty = {
            id: Date.now() + 600,
            name: localUser.name,
            facultyNumber: norm,
            dynamic_data: { 'Faculty Number': norm, 'Full Name': localUser.name, 'Email Address': localUser.email || '' }
          }
          setFaculty(prev => [...prev, newFaculty])
        }
      }
    }
  }

  const updateUser = async (id, data) => {
    try {
      const res = await axios.put(`/api/users/${id}`, data)
      const updated = users.map(u => u.id === id ? res.data : u)
      setUsers(updated)
      localStorage.setItem('users', JSON.stringify(updated))
      showToast('User account updated successfully!', 'success')
    } catch (err) {
      const updated = users.map(u => u.id === id ? { ...u, ...data } : u)
      setUsers(updated)
      localStorage.setItem('users', JSON.stringify(updated))
      showToast('User account updated successfully!', 'success')
    }
  }

  const deleteUser = async (id) => {
    const target = users.find(u => u.id === id)
    if (target) {
      softDelete('user', target)
      const updated = users.filter(u => u.id !== id)
      setUsers(updated)
      localStorage.setItem('users', JSON.stringify(updated))
      showToast('User account moved to Recycle Bin.', 'success')
    }
  }

  const archiveUser = async (id) => {
    try {
      const res = await axios.put(`/api/users/${id}`, { status: 'archived' })
      setUsers(prev => prev.map(u => u.id === id ? res.data : u))
      showToast('User account archived!', 'success')
    } catch (err) {
      console.error(err)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'archived' } : u))
      showToast('User account archived!', 'success')
    }
  }

  const restoreUser = async (id) => {
    try {
      const res = await axios.put(`/api/users/${id}`, { status: 'active' })
      setUsers(prev => prev.map(u => u.id === id ? res.data : u))
      showToast('User account restored!', 'success')
    } catch (err) {
      console.error(err)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'active' } : u))
      showToast('User account restored!', 'success')
    }
  }

  const resetUserPassword = async (id, newPassword) => {
    try {
      const res = await axios.put(`/api/users/${id}`, { password: newPassword })
      setUsers(prev => prev.map(u => u.id === id ? res.data : u))
      showToast('Password reset successfully!', 'success')
    } catch (err) {
      console.error(err)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, password: newPassword } : u))
      showToast('Password reset successfully!', 'success')
    }
  }

  const addUserGroup = async (data) => {
    try {
      const res = await axios.post('/api/user-groups', data)
      setUserGroups(prev => [...prev, res.data])
      showToast('Group created!', 'success')
    } catch (err) {
      console.error(err)
      const localGroup = { ...data, id: Date.now() }
      setUserGroups(prev => [...prev, localGroup])
      showToast('Group created!', 'success')
    }
  }

  const updateUserGroup = async (id, data) => {
    try {
      const res = await axios.put(`/api/user-groups/${id}`, data)
      setUserGroups(prev => prev.map(g => g.id === id ? res.data : g))
      showToast('Group updated!', 'success')
    } catch (err) {
      console.error(err)
      setUserGroups(prev => prev.map(g => g.id === id ? { ...g, ...data } : g))
      showToast('Group updated!', 'success')
    }
  }

  const deleteUserGroup = async (id) => {
    try {
      await axios.delete(`/api/user-groups/${id}`)
      setUserGroups(prev => prev.filter(g => g.id !== id))
      showToast('Group deleted', 'success')
    } catch (err) {
      console.error(err)
      setUserGroups(prev => prev.filter(g => g.id !== id))
      showToast('Group deleted', 'success')
    }
  }

  const addDynamicField = async (data) => {
    try {
      const res = await axios.post('/api/dynamic-fields', data)
      setDynamicFields(prev => [...prev, res.data].sort((a, b) => a.order_index - b.order_index))
      showToast('Field added!', 'success')
    } catch (err) {
      showToast('Error adding field', 'error')
    }
  }

  const updateDynamicField = async (id, data) => {
    try {
      const res = await axios.put(`/api/dynamic-fields/${id}`, data)
      setDynamicFields(prev => prev.map(f => f.id === id ? res.data : f).sort((a, b) => a.order_index - b.order_index))
      showToast('Field updated!', 'success')
    } catch (err) {
      showToast('Error updating field', 'error')
    }
  }

  const deleteDynamicField = async (id) => {
    try {
      await axios.delete(`/api/dynamic-fields/${id}`)
      setDynamicFields(prev => prev.filter(f => f.id !== id))
      showToast('Field deleted.', 'success')
    } catch (err) {
      setDynamicFields(prev => prev.filter(f => f.id !== id))
      showToast('Field deleted.', 'success')
    }
  }

  const reorderDynamicFields = async (fields) => {
    try {
      const payload = fields.map((f, i) => ({ id: f.id, order_index: i + 1, section: f.section || 'Basic Information' }))
      await axios.post('/api/dynamic-fields/reorder', { fields: payload })
      setDynamicFields(prev => {
        const fieldMap = new Map(fields.map((f, i) => [f.id, { ...f, order_index: i + 1 }]))
        return prev.map(f => fieldMap.get(f.id) || f).sort((a, b) => a.order_index - b.order_index)
      })
      showToast('Form structure saved!', 'success')
    } catch (err) {
      setDynamicFields(prev => {
        const fieldMap = new Map(fields.map((f, i) => [f.id, { ...f, order_index: i + 1 }]))
        return prev.map(f => fieldMap.get(f.id) || f).sort((a, b) => a.order_index - b.order_index)
      })
      showToast('Form structure saved!', 'success')
    }
  }

  const createLessonSource = (payload) => {
    if (payload?.type === 'drive') {
      return { id: Date.now() + Math.random(), name: payload.url, size: 0, type: 'link', url: payload.url, source: 'drive', dateUploaded: genDate() }
    }
    return { id: Date.now() + Math.random(), name: payload.file.name, size: payload.file.size, type: payload.file.type, url: URL.createObjectURL(payload.file), source: 'file', dateUploaded: genDate() }
  }

  const uploadLessonFile = (syllabusId, payload, week) => {
    setSyllabi(prev => prev.map(s => {
      if (s.id !== syllabusId) return s
      const nextOrder = (s.lessons || []).length + 1
      const lessonSource = createLessonSource(payload)
      return {
        ...s,
        lessons: [
          ...(s.lessons || []),
          {
            id: Date.now() + Math.random(),
            title: payload?.type === 'drive' ? 'Google Drive Lesson' : payload?.file?.name?.replace(/\.[^/.]+$/, '') || `Lesson ${nextOrder}`,
            content: '',
            week: Number(week),
            order: nextOrder,
            file: lessonSource
          }
        ]
      }
    }))
    showToast('Lesson file uploaded!', 'success')
  }

  const updateLessonFile = (syllabusId, lessonId, payload, week) => {
    setSyllabi(prev => prev.map(s => {
      if (s.id !== syllabusId) return s
      return {
        ...s,
        lessons: (s.lessons || []).map(lesson => lesson.id === lessonId ? {
          ...lesson,
          week: Number(week),
          title: payload?.type === 'drive' ? 'Google Drive Lesson' : payload?.file?.name?.replace(/\.[^/.]+$/, '') || lesson.title,
          file: createLessonSource(payload)
        } : lesson)
      }
    }))
    showToast('Lesson file updated!', 'success')
  }

  const deleteLessonFile = (syllabusId, lessonId) => {
    setSyllabi(prev => prev.map(s => {
      if (s.id !== syllabusId) return s
      return { ...s, lessons: (s.lessons || []).filter(lesson => lesson.id !== lessonId) }
    }))
    showToast('Lesson file deleted.', 'success')
  }

  const addViolation = async (data) => {
    try {
      const res = await axios.post('/api/violations', data)
      const updated = [res.data, ...violations]
      setViolations(updated)
      localStorage.setItem('violations', JSON.stringify(updated))
      showToast('Violation recorded successfully!', 'success')
      pushNotification('warning', 'Violation Recorded', 'A violation record was added to your profile.', {
        audience: 'student',
        targetStudentId: res.data?.studentId || data.studentId,
        targetStudentNumber: res.data?.studentNumber || data.studentNumber,
        path: '/student/violations'
      })
    } catch (err) {
      const localViolation = { ...data, id: Date.now() }
      const updated = [localViolation, ...violations]
      setViolations(updated)
      localStorage.setItem('violations', JSON.stringify(updated))
      showToast('Violation recorded successfully!', 'success')
      pushNotification('warning', 'Violation Recorded', 'A violation record was added to your profile.', {
        audience: 'student',
        targetStudentId: data.studentId,
        targetStudentNumber: data.studentNumber,
        path: '/student/violations'
      })
    }
  }

  const updateViolation = async (id, data) => {
    try {
      const res = await axios.put(`/api/violations/${id}`, data)
      const updated = violations.map(v => v.id === id ? res.data : v)
      setViolations(updated)
      localStorage.setItem('violations', JSON.stringify(updated))
      showToast('Violation updated successfully!', 'success')
      pushNotification('info', 'Violation Updated', 'A violation record on your profile was updated.', {
        audience: 'student',
        targetStudentId: res.data?.studentId || data.studentId,
        targetStudentNumber: res.data?.studentNumber || data.studentNumber,
        path: '/student/violations'
      })
    } catch (err) {
      const existing = violations.find(v => v.id === id)
      const updated = violations.map(v => v.id === id ? { ...v, ...data } : v)
      setViolations(updated)
      localStorage.setItem('violations', JSON.stringify(updated))
      showToast('Violation updated successfully!', 'success')
      pushNotification('info', 'Violation Updated', 'A violation record on your profile was updated.', {
        audience: 'student',
        targetStudentId: data.studentId || existing?.studentId,
        targetStudentNumber: data.studentNumber || existing?.studentNumber,
        path: '/student/violations'
      })
    }
  }

  const deleteViolation = async (id) => {
    const target = violations.find(v => v.id === id)
    if (target) {
      softDelete('violation', target)
      const updated = violations.filter(v => v.id !== id)
      setViolations(updated)
      localStorage.setItem('violations', JSON.stringify(updated))
      showToast('Violation moved to Recycle Bin.', 'success')
    }
  }

  const generateEnrollmentCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const addEnrollee = useCallback(async (data) => {
    const code = generateEnrollmentCode()
    const name = data['Student Full Name'] || data['First Name'] || 'New Enrollee'
    
    try {
      const res = await axios.post('/api/enrollees', {
        name,
        code,
        dynamic_data: data,
        status: 'pending'
      });
      const newEnrollee = res.data;
      setEnrollees(prev => [newEnrollee, ...prev])
      showToast('Enrollee added! Access code generated.', 'success')

      const emailField = dynamicFields.find(f => f.type === 'email' && (f.module || 'enrollment') === 'enrollment')
      const email = (emailField ? data[emailField.name] : null) || data['Personal Email Address'] || data['Email Address'] || data['Email'] || data['email']
      
      if (email) {
        try {
          await axios.post('/api/send-enrollee-email', {
            email: email,
            name: name,
            code: code
          });
          showToast('Access code sent to student email!', 'success');
        } catch (e) {
          console.error('Failed to send email:', e);
          showToast('Failed to send email to student.', 'error');
        }
      }
    } catch (err) {
      showToast('Failed to save enrollee to database.', 'error');
    }
  }, [showToast, dynamicFields])

  const verifyEnrollmentCode = useCallback(async (code) => {
    if (!code) return null
    try {
      const res = await axios.get(`/api/enrollees/verify/${code}`)
      if (res.data) {
        return { type: 'enrollee', data: res.data }
      }
    } catch (err) {
      // If not en enrollee, check if it's a student (re-login or update)
      const studentFound = students.find(s => s.accessCode?.toUpperCase() === code.toUpperCase())
      if (studentFound) return { type: 'student', data: studentFound }
    }
    return null
  }, [students])

  const finalizeEnrollment = useCallback(async (enrolleeId, data, type = 'enrollee', code = null) => {
    // Convert files to Base64 (images/docs) so they survive JSON transmission
    const studentData = { ...data };
    const dynamicData = studentData.dynamic_data || studentData;
    
    for (const key of Object.keys(dynamicData)) {
      if (dynamicData[key] instanceof File) {
          try {
              // Convert to Base64 for persistence
              const b64 = await fileToBase64(dynamicData[key]);
              dynamicData[key] = {
                  name: dynamicData[key].name,
                  type: dynamicData[key].type,
                  size: dynamicData[key].size,
                  dataUrl: b64
              };
          } catch (e) {
              console.error('File conversion failed', e);
          }
      }
    }
    
    try {
      if (type === 'enrollee' && code) {
        await axios.post('/api/enrollees/submit', { code, submission: studentData })
        setEnrollees(prev => prev.map(e => e.id === enrolleeId ? { ...e, status: 'submitted', submission: studentData, submitted_at: new Date().toISOString() } : e))
      } else {
        await axios.post('/api/enrollment/submit', { enrolleeId, studentData, type })
        setStudents(prev => prev.map(s => s.id === enrolleeId ? { ...s, dynamic_data: studentData, accessCode: null, profileStatus: 'submitted_for_review', lastSubmission: studentData, submitted_at: new Date().toISOString() } : s))
      }
      showToast('Enrollment application submitted for review!', 'success')
      return { success: true }
    } catch (err) {
      showToast('Error submitting enrollment. Please try again.', 'error')
      return { success: false }
    }
  }, [showToast])

  const approveEnrollment = useCallback(async (enrolleeId, overrideData = null) => {
    try {
      const res = await axios.patch(`/api/enrollees/${enrolleeId}/status`, { 
        status: 'approved',
        overrideData
      })
      const { enrollee, student } = res.data
      
      if (student) {
        setStudents(prev => {
          const filtered = prev.filter(s => s.id !== student.id)
          return [...filtered, student]
        })
      }
      
      setEnrollees(prev => prev.map(e => e.id === enrolleeId ? enrollee : e))
      showToast('Enrollment approved successfully!', 'success')
      return { success: true }
    } catch (err) {
      showToast('Failed to approve enrollment.', 'error')
      console.error('Approve Error:', err)
      return { success: false }
    }
  }, [setStudents, setEnrollees, showToast])

  const rejectEnrollment = useCallback(async (enrolleeId, reason) => {
    try {
      const res = await axios.post(`/api/enrollees/${enrolleeId}/reject`, { reason })
      const { enrollee, student } = res.data
      setEnrollees(prev => prev.map(e => e.id === enrolleeId ? enrollee : e))
      if (student) {
        setStudents(prev => prev.map(s => s.id === student.id ? student : s))
      }
      showToast('Enrollment application returned for corrections.', 'info')
      return { success: true }
    } catch (err) {
      showToast('Failed to return application.', 'error')
      return { success: false }
    }
  }, [setStudents, setEnrollees, showToast])

  const regenerateEnrolleeCode = useCallback(async (id) => {
    try {
      const res = await axios.post(`/api/enrollees/${id}/regenerate-code`)
      const { enrollee, student } = res.data
      setEnrollees(prev => prev.map(e => e.id === id ? enrollee : e))
      if (student) {
        setStudents(prev => prev.map(s => s.id === student.id ? student : s))
      }
      showToast('New access code generated and sent to student.', 'success')
      return { success: true, code: enrollee.code }
    } catch (err) {
      showToast('Failed to regenerate code.', 'error')
      return { success: false }
    }
  }, [setStudents, setEnrollees, showToast])

  const deleteEnrollee = useCallback(async (id) => {
    const target = enrollees.find(e => e.id === id)
    if (target) {
      try {
        await axios.delete(`/api/enrollees/${id}`)
        softDelete('enrollee', target)
        setEnrollees(prev => prev.filter(e => e.id !== id))
        showToast('Enrollee moved to Recycle Bin.', 'info')
      } catch (err) {
        // Fallback for local
        softDelete('enrollee', target)
        setEnrollees(prev => prev.filter(e => e.id !== id))
        showToast('Enrollee moved to Recycle Bin (Local).', 'info')
      }
    }
  }, [enrollees, showToast])

  const addNotification = (type, title, msg, meta = {}) => {
    pushNotification(type, title, msg, meta)
  }

  const markNotifsRead = (ids = null) => {
    const visibleIds = Array.isArray(ids) ? new Set(ids) : null
    setNotifications(prev => prev.map(n => !visibleIds || visibleIds.has(n.id) ? { ...n, read: true } : n))
  }

  const markNotificationRead = (id) => {
    if (!id) return
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const clearNotifs = (ids = null) => {
    const visibleIds = Array.isArray(ids) ? new Set(ids) : null
    setNotifications(prev => visibleIds ? prev.filter(n => !visibleIds.has(n.id)) : [])
  }

  const addAcademicSection = (program, name, capacity = 50) => {
    const newSection = { id: Date.now(), program, name, capacity: Number(capacity) }
    setAcademicSections(prev => [...prev, newSection])
    showToast(`Section ${name} added to ${program}`, 'success')
    return newSection
  }

  const updateAcademicSection = (id, data) => {
    setAcademicSections(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
    showToast('Section updated successfully!', 'success')
  }

  const deleteAcademicSection = (id) => {
    setAcademicSections(prev => prev.filter(s => s.id !== id))
    showToast('Section removed', 'info')
  }

  const deleteProgram = (program) => {
    setAcademicSections(prev => prev.filter(s => s.program !== program))
    showToast(`Program ${program} and its sections removed`, 'info')
  }


  const generateStudentAccessCode = async (studentId) => {
    try {
      const resp = await axios.post(`/api/students/${studentId}/generate-code`)
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...resp.data.student } : s))
      
      if (resp.data.email_sent) {
        showToast('Access code generated and sent to student email!', 'success')
      } else {
        showToast('Access code generated! (No email address found to send to)', 'info')
      }
      return resp.data.code
    } catch (err) {
      console.error('Error generating student code:', err)
      showToast('Failed to generate access code.', 'error')
      return null
    }
  }

  return (
    <AppContext.Provider value={{
      user, setUser, login, logout, isAdmin,
      students, archivedStudents, deletedItems, softDelete, restoreFromBin, permanentDelete,
      addStudent, addStudentsBulk, updateStudent, deleteStudent, archiveStudent, restoreStudent,
      bulkArchiveStudents, fetchArchivedStudents,
      faculty, addFaculty, addFacultyBulk, updateFaculty, deleteFaculty,
      curricula, addCurriculum, addCurriculaBulk, updateCurriculum, deleteCurriculum,
      syllabi, addSyllabus, addSyllabiBulk, updateSyllabus, deleteSyllabus,
      addSyllabusFiles, deleteSyllabusFile,
      addLesson, updateLesson, deleteLesson,
      uploadLessonFile, updateLessonFile, deleteLessonFile,
      schedules, addSchedule, updateSchedule, deleteSchedule,
      events, addEvent, updateEvent, deleteEvent,
      announcements, addAnnouncement, deleteAnnouncement,
      medicalRequests, adminMedicalRequests, studentMedicalDocs,
      submitMedicalRequest, requestMedicalRecord, updateMedicalRequestStatus, deleteMedicalRequest,
      uploadStudentMedicalDocument, replaceStudentMedicalDocument, fulfillMedicalRequest, markMedicalRequestViewed,
      toasts, showToast,
      theme, setTheme,
      users, addUser, updateUser, deleteUser, archiveUser, restoreUser, resetUserPassword,
      userGroups, addUserGroup, updateUserGroup, deleteUserGroup,
      dynamicFields, addDynamicField, updateDynamicField, deleteDynamicField, reorderDynamicFields,
      violations, addViolation, updateViolation, deleteViolation,
      enrollees, addEnrollee, verifyEnrollmentCode, finalizeEnrollment, approveEnrollment, rejectEnrollment, deleteEnrollee, regenerateEnrolleeCode,
      notifications, addNotification, markNotificationRead, markNotifsRead, clearNotifs,
      academicSections, addAcademicSection, updateAcademicSection, deleteAcademicSection, deleteProgram, isSectionFull, findNextAvailableSection,
      generateStudentAccessCode,
      savedReports, setSavedReports,
      PROGRAMS, SECTIONS, YEAR_LEVELS, GENDERS, SEMESTERS,
      hasPermission
    }}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
      </div>
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
