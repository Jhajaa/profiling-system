# Comprehensive Profiling System
### College of Computing Studies

A full-featured student and faculty management system built with **Vite + React**.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open browser at http://localhost:5173
```

---

## 🔐 Demo Accounts

| Role    | User Number | Password     |
|---------|-------------|--------------|
| Admin   | ADMIN001    | admin123     |
| Student | #2203343    | student123   |
| Faculty | #0000001    | faculty123   |

---

## 👤 Role Permissions

| Feature                        | Admin | Student/Faculty |
|-------------------------------|-------|-----------------|
| View all records              | ✅    | ✅              |
| Add students / faculty        | ✅    | ❌              |
| Edit / Update profiles        | ✅    | ❌              |
| Delete records                | ✅    | ❌              |
| Add curriculum / syllabus     | ✅    | ❌              |
| Add / manage schedules        | ✅    | ❌              |
| Add / delete events           | ✅    | ❌              |
| Post announcements            | ✅    | ❌              |
| Edit medical records          | ✅    | ❌              |
| Request medical records       | ✅    | ✅              |

---

## 📦 Tech Stack

- **Vite 5** – Build tool
- **React 18** – UI framework
- **React Router 6** – Client-side routing
- **Lucide React** – Icons
- **CSS Variables** – Theming (no external CSS framework)

---

## 🗂 Project Structure

```
src/
├── context/
│   └── AppContext.jsx       # Global state & CRUD operations
├── components/
│   ├── Layout.jsx           # Main app shell
│   ├── Sidebar.jsx          # Navigation
│   ├── Header.jsx           # Top bar
│   ├── Modal.jsx            # Reusable modal + confirm dialog
│   └── DotMenu.jsx          # Row action menu
└── pages/
    ├── Login.jsx            # Auth page
    ├── Home.jsx             # Dashboard
    ├── Scheduling.jsx       # Weekly calendar
    ├── Events.jsx           # Events list
    ├── EventDetail.jsx      # Event detail
    ├── students/
    │   ├── StudentList.jsx
    │   ├── StudentProfile.jsx
    │   └── MedicalRecords.jsx
    ├── faculty/
    │   ├── FacultyList.jsx
    │   └── FacultyProfile.jsx
    └── instructional/
        ├── Curriculum.jsx
        ├── Syllabus.jsx
        └── Lesson.jsx
```

---

## ✅ Features

- **Login** with role-based access (Admin / Student / Faculty)
- **Home Dashboard** – live clock, metrics, announcements, recent activity
- **Student Information** – full profiles with family/educational background + medical records
- **Faculty Information** – faculty profiles with same detail sections
- **Instructional Content** – Curriculum → Syllabus → Lesson with weekly plan
- **Scheduling** – interactive weekly calendar with conflict detection
- **Events Management** – event creation, detail view, attachments
- **Form Validations** on all Add/Edit forms
- **Admin-only** CRUD buttons (hidden for non-admins)
- **Toast notifications** for all actions
- **Confirm dialogs** before deletion
