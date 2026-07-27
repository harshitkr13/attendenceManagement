# AttendEase – Student Attendance Management System

> A modern, fully client-side Student Attendance Management System built with pure **HTML5**, **CSS3**, and **Vanilla JavaScript**. No frameworks. No dependencies. Just open `index.html` and go.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Demo Data](#demo-data)
- [Data Storage](#data-storage)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**AttendEase** is a production-quality, single-page attendance management dashboard designed for educational institutions. It runs entirely in the browser using localStorage for persistence — no backend, no database, no installation required.

Built with a **Glassmorphism** design system featuring a blue-indigo gradient theme, smooth micro-animations, and full **dark/light mode** support.

---

## Features

### Dashboard
- 8 animated stat cards: Total Students, Present Today, Absent Today, Avg Attendance, Departments, Above 90 pct, Below 75 pct, Total Records
- Department-wise attendance horizontal bar chart
- Semester-wise attendance horizontal bar chart
- Attendance distribution chart (3 bands: ≥90% / 75–89% / <75%)
- Weekly trend vertical bar chart (last 7 days)
- Quick stats panel (highest/lowest attendee, perfect attendance, at-risk count)
- Live activity feed

### Student Management
- Add / Edit / Delete students with form validation
- Duplicate roll number detection
- Row checkboxes with select-all (supports indeterminate state)
- Bulk actions: Mark Present, Mark Absent, Export CSV, Delete
- Last Seen column with Today highlight

### Search and Filter
- Search by name, roll number, department, or semester simultaneously
- Filter by Department, Semester, Status (Present/Absent), Attendance % range
- Sort by any column with direction toggle (ascending / descending) — visual ▲/▼ indicators
- Pagination: 10 / 25 / 50 / 100 rows per page

### Attendance
- Date picker to mark attendance for any date
- One-click Present/Absent toggle per student
- Mark All Present / Mark All Absent buttons
- Attendance % progress bar inline per student

### Statistics Page
- 6 mini stat cards overview
- Top 10 highest attendance (with medal badges for top 3)
- Bottom 10 lowest attendance
- Department ranking by average attendance %
- Semester ranking by average attendance %

### Reports and Export
- 9-column CSV export: ID, Roll, Name, Dept, Sem, Present Days, Absent Days, Attendance %, Last Seen Date
- Export All / Export Filtered / Export Selected
- Print-optimised stylesheet

### UI / UX
- Glassmorphism cards with backdrop blur
- Dark and Light mode toggle (persisted)
- Fully responsive: Desktop, Tablet, Mobile with collapsible sidebar
- Sticky table header while scrolling
- Skeleton loading shimmer rows
- Live clock in topnav
- Toast notifications (Success / Error / Info / Warning)
- Escape key closes modals

---

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Semantic markup, ARIA accessibility |
| CSS3 | Design tokens, Grid, Flexbox, animations |
| Vanilla JavaScript | State management, DOM rendering, events |
| Google Fonts (Poppins) | Typography |
| localStorage | Client-side persistence |

**Zero external libraries. Zero build tools. Zero dependencies.**

---

## Project Structure

`
attendenceManagement/
│
├── index.html       # App shell: markup, modals, navigation
├── style.css        # Design system: tokens, components, animations
├── script.js        # Business logic: state, rendering, events
└── README.md        # Documentation
`

### Architecture
- Single-page app using section elements toggled with CSS active class
- Single state object synced to localStorage
- Stats cache computed once per refresh cycle (O(1) reads for all charts)
- Event delegation on table bodies for dynamic rows
- Each page section renders independently — no full re-renders

---

## Getting Started

### Direct Open (simplest)
`ash
git clone https://github.com/harshitkr13/attendenceManagement.git
cd attendenceManagement
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
`

### Local HTTP Server (recommended)
`ash
# Python 3
python -m http.server 8080

# Node.js
npx serve .
`

Then open http://localhost:8080

### Browser Support
Chrome 90+, Edge 90+, Firefox 88+, Safari 14+

---

## Demo Data

On first launch with empty localStorage, AttendEase auto-generates **100 demo students**:

| Field | Details |
|---|---|
| Roll Numbers | 13000123001 through 13000123100 |
| Names | Realistic Indian first + last name combinations |
| Departments | Randomly assigned: CSE, IT, ECE, EE, ME |
| Semesters | Randomly assigned: 1 through 8 |
| Attendance History | Every day from 1st of current month to yesterday |
| Attendance % | Distributed: 12% at-risk (55–74%), 23% moderate (75–89%), 65% good (90–100%) |
| Today | ~80% marked present |

Your data is never overwritten. Seeding only runs when localStorage is completely empty.
Use **Restore Demo Data** in the sidebar footer to reload the original 100 students at any time.

---

## Data Storage

All data lives in the browser's localStorage:

| Key | Contents |
|---|---|
| attendease_students | Array of student objects |
| attendease_attendance | Map of date to student status records |
| attendease_activity | Activity log (max 100 entries) |
| attendease_theme | light or dark |
| attendease_demo_seeded | Flag to prevent re-seeding |

Data is local to your browser. Use Export CSV to back it up.

---

## Contributing

`ash
# Fork, then clone your fork
git clone https://github.com/YOUR_USERNAME/attendenceManagement.git
cd attendenceManagement

git checkout -b feature/your-feature-name

# Make changes, commit, push
git add .
git commit -m feat: describe your change
git push origin feature/your-feature-name

# Open a Pull Request on GitHub
`

Guidelines:
- Keep the zero-dependency constraint (no npm, no frameworks)
- Follow the existing CSS variable / design token system
- All JS should be strict mode and use the existing state pattern
- Test in Chrome, Firefox, and Safari before submitting

---

## License

MIT License — Copyright (c) 2026 Harshit Kumar

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the Software), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED AS IS, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.

---

Made with love by [Harshit Kumar](https://github.com/harshitkr13) — Star this repo if you found it useful!
