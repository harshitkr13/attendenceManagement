/* ═══════════════════════════════════════════════════════════
   AttendEase – script.js  (Enhanced v2)
   Student Attendance Management System
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const STORAGE_KEYS = {
  STUDENTS:   'attendease_students',
  ATTENDANCE: 'attendease_attendance',
  ACTIVITY:   'attendease_activity',
  THEME:      'attendease_theme',
  SEEDED:     'attendease_demo_seeded',
};

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EE', 'ME'];

const FIRST_NAMES = [
  'Aarav','Aditya','Akash','Amit','Amrit','Ananya','Anjali','Ankit','Arjun','Aryan',
  'Ayesha','Bhavna','Chirag','Deepa','Dhruv','Divya','Gaurav','Harish','Ishaan','Isha',
  'Jatin','Kavya','Kiran','Komal','Kriti','Kunal','Lakshmi','Manish','Meera','Mihir',
  'Mohit','Nandini','Neha','Nikhil','Om','Pankaj','Pooja','Priya','Rahul','Riya',
  'Rohit','Sachin','Sahil','Sanjay','Shivam','Shreya','Siddharth','Simran','Sneha','Tanvi',
  'Tanya','Varun','Vikram','Vishal','Vivek','Yash','Zara','Ritesh','Sumit','Pradeep',
];

const LAST_NAMES = [
  'Agarwal','Arora','Bansal','Bhatt','Chauhan','Das','Desai','Dubey','Ghosh','Gupta',
  'Iyer','Jain','Joshi','Kapoor','Kumar','Mehta','Mishra','Nair','Pandey','Patel',
  'Rao','Reddy','Sharma','Singh','Sinha','Thakur','Tiwari','Varma','Verma','Yadav',
];

/* ══════════════════════════════════════════
   APPLICATION STATE
══════════════════════════════════════════ */
const state = {
  students:    [],
  attendance:  {},
  activity:    [],
  currentPage: 'dashboard',
  deleteTarget: null,
  editTarget:   null,
  filters: {
    search:  '',
    dept:    '',
    sem:     '',
    status:  '',
    pct:     '',
    sort:    'name',
    sortDir: 'asc',
  },
  selectedDate: todayStr(),
  selected: new Set(),
  pagination: { page: 1, perPage: 25 },
  cache: null,
};

/* ══════════════════════════════════════════
   UTILITY HELPERS
══════════════════════════════════════════ */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function generateId() {
  return 'S' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function storageGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function storageSave(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

/* ══════════════════════════════════════════
   DOM HELPERS  (cached on first call)
══════════════════════════════════════════ */
const _elCache = {};
const $ = id => _elCache[id] || (_elCache[id] = document.getElementById(id));
const $$ = sel => document.querySelectorAll(sel);

function show(el) { el?.classList?.add('visible'); }
function hide(el) { el?.classList?.remove('visible'); }

/* ══════════════════════════════════════════
   DUMMY DATA GENERATOR
══════════════════════════════════════════ */

/** Generate all working dates from the 1st of the current month to yesterday. */
function getCurrentMonthDates() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const dates = [];

  // Day 1 up to (but not including) today
  for (let d = 1; d < now.getDate(); d++) {
    dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  // Fallback: if today is the 1st, use last 28 days
  if (dates.length === 0) {
    for (let i = 28; i >= 1; i--) {
      const past = new Date(now);
      past.setDate(past.getDate() - i);
      dates.push(past.toISOString().split('T')[0]);
    }
  }
  return dates;
}

/**
 * Seeds 100 demo students with realistic attendance only when
 * localStorage is completely empty.
 */
function seedDemoData() {
  const existing = storageGet(STORAGE_KEYS.STUDENTS, []);
  if (existing.length > 0) return; // Never overwrite existing data

  const students  = [];
  const attendance = {};

  const monthDates = getCurrentMonthDates();

  // Initialise attendance records for each date
  monthDates.forEach(d => { attendance[d] = {}; });

  // Also prepare today
  const today = todayStr();
  attendance[today] = {};

  // Track used first names to maximise diversity
  const firstNamePool = [...FIRST_NAMES].sort(() => Math.random() - 0.5);

  for (let i = 1; i <= 100; i++) {
    const firstName = firstNamePool[(i - 1) % firstNamePool.length];
    const lastName  = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name      = `${firstName} ${lastName}`;
    const roll      = `13000123${String(i).padStart(3, '0')}`;
    const dept      = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
    const sem       = Math.floor(Math.random() * 8) + 1;
    const id        = `D${String(i).padStart(3, '0')}`;

    students.push({ id, name, roll, dept, sem, createdAt: new Date().toISOString() });

    // Target attendance percentage: 55%–100%, clustered around 75–90%
    const rand     = Math.random();
    const targetPct = rand < 0.12 ? 55 + Math.floor(Math.random() * 20)   // 12% at risk  (55–74)
                    : rand < 0.35 ? 75 + Math.floor(Math.random() * 15)   // 23% moderate (75–89)
                    :               90 + Math.floor(Math.random() * 11);   // 65% good     (90–100)

    const totalDays   = monthDates.length;
    const presentDays = Math.min(totalDays, Math.round(totalDays * targetPct / 100));

    // Shuffle dates and mark the first `presentDays` as present
    const shuffled = [...monthDates].sort(() => Math.random() - 0.5);
    monthDates.forEach((d, idx) => {
      attendance[d][id] = shuffled.indexOf(d) < presentDays ? 'present' : 'absent';
    });

    // Mark today: ~80% present
    attendance[today][id] = Math.random() < 0.80 ? 'present' : 'absent';
  }

  storageSave(STORAGE_KEYS.STUDENTS,   students);
  storageSave(STORAGE_KEYS.ATTENDANCE, attendance);
  storageSave(STORAGE_KEYS.SEEDED, true);
}

/* ══════════════════════════════════════════
   PERSISTENCE
══════════════════════════════════════════ */
function loadData() {
  seedDemoData(); // No-op when data already exists
  state.students   = storageGet(STORAGE_KEYS.STUDENTS,   []);
  state.attendance = storageGet(STORAGE_KEYS.ATTENDANCE, {});
  state.activity   = storageGet(STORAGE_KEYS.ACTIVITY,   []);
}

function saveStudents()   { storageSave(STORAGE_KEYS.STUDENTS,   state.students); }
function saveAttendance() { storageSave(STORAGE_KEYS.ATTENDANCE, state.attendance); }
function saveActivity()   { storageSave(STORAGE_KEYS.ACTIVITY,   state.activity); }

/* ══════════════════════════════════════════
   STATS CACHE  (computed once per refresh)
══════════════════════════════════════════ */
function computeStatsCache() {
  const students = state.students;
  const total    = students.length;

  if (total === 0) {
    state.cache = {
      pcts: {}, avgPct: 0, above90: 0, below75: 0, perfect: 0,
      deptMap: {}, semMap: {}, withPct: [],
      totalRecords: 0, totalPresent: 0, totalAbsent: 0,
    };
    return;
  }

  const allDates = Object.keys(state.attendance);
  const pcts     = {};
  let pctSum = 0, above90 = 0, below75 = 0, perfect = 0;
  let totalRecords = 0, totalPresent = 0;

  students.forEach(s => {
    let present = 0, tot = 0;
    allDates.forEach(d => {
      const rec = state.attendance[d];
      if (rec && rec[s.id] !== undefined) {
        tot++;
        totalRecords++;
        if (rec[s.id] === 'present') { present++; totalPresent++; }
      }
    });
    const pct   = tot === 0 ? 0 : Math.round((present / tot) * 100);
    pcts[s.id]  = pct;
    pctSum     += pct;
    if (pct >= 90) above90++;
    if (pct <  75) below75++;
    if (pct === 100) perfect++;
  });

  // Dept & Semester averages
  const deptMap = {}, semMap = {};
  students.forEach(s => {
    if (!deptMap[s.dept]) deptMap[s.dept] = [];
    deptMap[s.dept].push(pcts[s.id]);
    const sk = String(s.sem);
    if (!semMap[sk]) semMap[sk] = [];
    semMap[sk].push(pcts[s.id]);
  });

  const withPct = students
    .map(s => ({ ...s, pct: pcts[s.id] }))
    .sort((a, b) => b.pct - a.pct);

  state.cache = {
    pcts, avgPct: Math.round(pctSum / total),
    above90, below75, perfect,
    deptMap, semMap, withPct,
    totalRecords, totalPresent,
    totalAbsent: totalRecords - totalPresent,
  };
}

/* ══════════════════════════════════════════
   ATTENDANCE HELPERS
══════════════════════════════════════════ */
function getDateRecord(dateStr) {
  if (!state.attendance[dateStr]) state.attendance[dateStr] = {};
  return state.attendance[dateStr];
}

/** Returns cached pct if available, otherwise computes directly. */
function calcAttendancePct(studentId) {
  if (state.cache?.pcts?.[studentId] !== undefined) return state.cache.pcts[studentId];
  const dates = Object.keys(state.attendance);
  if (dates.length === 0) return 0;
  let present = 0, total = 0;
  dates.forEach(d => {
    const rec = state.attendance[d];
    if (rec && rec[studentId] !== undefined) {
      total++;
      if (rec[studentId] === 'present') present++;
    }
  });
  return total === 0 ? 0 : Math.round((present / total) * 100);
}

function countForDate(dateStr) {
  const rec = state.attendance[dateStr] || {};
  let present = 0, absent = 0, unmarked = 0;
  state.students.forEach(s => {
    if      (rec[s.id] === 'present') present++;
    else if (rec[s.id] === 'absent')  absent++;
    else                              unmarked++;
  });
  return { present, absent, unmarked };
}

/** Returns the most recent date with a record for the student. */
function getLastAttendanceDate(studentId) {
  const dates = Object.keys(state.attendance).sort().reverse();
  for (const d of dates) {
    if (state.attendance[d][studentId] !== undefined) return d;
  }
  return null;
}

/** Returns total present days for a student. */
function getTotalPresent(studentId) {
  return Object.values(state.attendance).filter(r => r[studentId] === 'present').length;
}

/** Returns total absent days for a student. */
function getTotalAbsent(studentId) {
  return Object.values(state.attendance).filter(r => r[studentId] === 'absent').length;
}

/* ══════════════════════════════════════════
   ACTIVITY LOG
══════════════════════════════════════════ */
function logActivity(type, text) {
  state.activity.unshift({ type, text, time: new Date().toISOString() });
  if (state.activity.length > 100) state.activity.length = 100;
  saveActivity();
  renderActivityList();
}

function renderActivityList() {
  const list = $('activityList');
  if (!list) return;
  if (state.activity.length === 0) {
    list.innerHTML = `
      <li class="activity-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>No recent activity</p>
      </li>`;
    return;
  }
  list.innerHTML = state.activity.slice(0, 20).map(a => `
    <li class="activity-item">
      <span class="activity-dot ${a.type}" aria-hidden="true"></span>
      <span class="activity-text">${a.text}</span>
      <span class="activity-time">${formatTime(a.time)}</span>
    </li>
  `).join('');
}

/* ══════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════ */
function showToast(message, type = 'info') {
  const container = $('toastContainer');
  const icons     = { success: '✓', error: '✕', info: 'i', warning: '!' };
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<div class="toast-icon">${icons[type] || 'i'}</div><span>${message}</span><div class="toast-bar"></div>`;
  container.appendChild(toast);
  const timer = setTimeout(() => removeToast(toast), 3200);
  toast.addEventListener('click', () => { clearTimeout(timer); removeToast(toast); });
}

function removeToast(toast) {
  toast.classList.add('removing');
  setTimeout(() => toast.remove(), 300);
}

/* ══════════════════════════════════════════
   ANIMATED COUNTER
══════════════════════════════════════════ */
function animateCounter(el, targetVal, suffix = '') {
  if (!el) return;
  const current  = parseInt(el.textContent) || 0;
  if (current === targetVal) return;
  const duration = 600;
  const start    = performance.now();
  const tick = now => {
    const progress = clamp((now - start) / duration, 0, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(current + (targetVal - current) * eased) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = targetVal + suffix;
  };
  requestAnimationFrame(tick);
}

/* ══════════════════════════════════════════
   DASHBOARD RENDER
══════════════════════════════════════════ */
function renderDashboard() {
  const c     = state.cache;
  const total = state.students.length;
  const { present, absent } = countForDate(state.selectedDate);

  // Row 1 cards
  animateCounter($('statTotal'),   total);
  animateCounter($('statPresent'), present);
  animateCounter($('statAbsent'),  absent);
  animateCounter($('statAvg'),     c ? c.avgPct : 0, '%');

  $('statTotalTrend').textContent   = 'Registered';
  $('statPresentTrend').textContent = total > 0 ? `${Math.round((present / total) * 100)}% of total` : '0% of total';
  $('statAbsentTrend').textContent  = total > 0 ? `${Math.round((absent  / total) * 100)}% of total` : '0% of total';
  $('statAvgTrend').textContent     = 'Overall average rate';

  // Row 2 cards
  const deptCount = new Set(state.students.map(s => s.dept)).size;
  animateCounter($('statDepts'),   deptCount);
  animateCounter($('statAbove90'), c ? c.above90 : 0);
  animateCounter($('statBelow75'), c ? c.below75 : 0);
  animateCounter($('statRecords'), c ? c.totalRecords : 0);

  $('statDeptsTrend').textContent   = `of ${DEPARTMENTS.length} possible`;
  $('statAbove90Trend').textContent = 'Excellent performers';
  $('statBelow75Trend').textContent = 'Need attention';
  $('statRecordsTrend').textContent = 'Attendance logs';

  // Sidebar snapshot
  $('sb-present').textContent = `${present} Present`;
  $('sb-absent').textContent  = `${absent} Absent`;

  // Charts
  renderDeptChart();
  renderSemChart();
  renderDistChart();
  renderWeeklyTrend();
  renderQuickStats();
  renderActivityList();
}

/* Reusable bar chart renderer (horizontal CSS bars) */
function renderBarChart(container, entries, gradClass = '') {
  if (!container) return;
  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-chart"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><p>No data yet</p></div>`;
    return;
  }
  container.innerHTML = entries.map(e => `
    <div class="chart-bar-row" role="img" aria-label="${escHtml(e.label)}: ${e.value}%">
      <span class="chart-bar-label" title="${escHtml(e.label)}">${escHtml(e.label)}</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill ${gradClass}" style="width:0%" data-target="${e.value}"></div>
      </div>
      <span class="chart-bar-val">${e.value}%</span>
    </div>
  `).join('');
  requestAnimationFrame(() => {
    container.querySelectorAll('.chart-bar-fill[data-target]').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  });
}

function renderDeptChart() {
  const c   = state.cache;
  const el  = $('deptChart');
  if (!el || !c) return;
  const entries = Object.entries(c.deptMap).map(([label, pcts]) => ({
    label,
    value: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
  })).sort((a, b) => b.value - a.value);
  renderBarChart(el, entries);
}

function renderSemChart() {
  const c  = state.cache;
  const el = $('semChart');
  if (!el || !c) return;
  const entries = Object.entries(c.semMap).map(([label, pcts]) => ({
    label: `Sem ${label}`,
    value: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
  })).sort((a, b) => parseInt(a.label.replace('Sem ', '')) - parseInt(b.label.replace('Sem ', '')));
  renderBarChart(el, entries, 'fill-purple');
}

function renderDistChart() {
  const c  = state.cache;
  const el = $('distChart');
  if (!el || !c) return;
  const total = state.students.length;
  if (total === 0) { renderBarChart(el, []); return; }
  const above90 = c.above90;
  const mid     = total - c.above90 - c.below75;
  const below75 = c.below75;
  const entries = [
    { label: '≥ 90% Excellent', value: Math.round((above90 / total) * 100) },
    { label: '75–89% Good',     value: Math.round((mid     / total) * 100) },
    { label: '< 75% At Risk',   value: Math.round((below75 / total) * 100) },
  ];
  const el2 = $('distChart');
  el2.innerHTML = entries.map((e, i) => {
    const grad = i === 0 ? 'fill-success' : i === 1 ? 'fill-warning' : 'fill-danger';
    return `
      <div class="chart-bar-row" role="img" aria-label="${escHtml(e.label)}: ${e.value}%">
        <span class="chart-bar-label" title="${escHtml(e.label)}">${escHtml(e.label)}</span>
        <div class="chart-bar-track">
          <div class="chart-bar-fill ${grad}" style="width:0%" data-target="${e.value}"></div>
        </div>
        <span class="chart-bar-val">${e.value}%</span>
      </div>
    `;
  }).join('');
  requestAnimationFrame(() => {
    el2.querySelectorAll('.chart-bar-fill[data-target]').forEach(bar => {
      bar.style.width = bar.dataset.target + '%';
    });
  });
}

/** Vertical bar chart: last 7 days attendance % */
function renderWeeklyTrend() {
  const el    = $('weeklyChart');
  if (!el)    return;
  const total = state.students.length;

  if (total === 0) {
    el.innerHTML = `<div class="empty-chart" style="width:100%"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><p>No data yet</p></div>`;
    return;
  }

  const days    = [];
  const today   = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  el.innerHTML = days.map(d => {
    const rec    = state.attendance[d] || {};
    const cnt    = state.students.reduce((n, s) => n + (rec[s.id] === 'present' ? 1 : 0), 0);
    const pct    = Math.round((cnt / total) * 100);
    const dow    = new Date(d + 'T00:00:00').getDay();
    const isToday = d === todayStr();
    const h      = Math.max(4, Math.round(pct * 1.4)); // max ~140px

    return `
      <div class="week-bar-col">
        <span class="week-bar-pct">${pct}%</span>
        <div class="week-bar-wrap">
          <div class="week-bar-fill" style="height:0;background:${isToday ? 'var(--grad-success)' : 'var(--grad-primary)'}"
            data-h="${h}px" aria-label="${dayLabels[dow]}: ${pct}%"></div>
        </div>
        <span class="week-bar-day" style="${isToday ? 'color:var(--success);font-weight:700' : ''}">${isToday ? 'Today' : dayLabels[dow]}</span>
      </div>
    `;
  }).join('');

  // Animate bar heights
  requestAnimationFrame(() => {
    el.querySelectorAll('.week-bar-fill[data-h]').forEach(bar => {
      bar.style.height = bar.dataset.h;
    });
  });
}

function renderQuickStats() {
  const c     = state.cache;
  const total = state.students.length;
  if (!c || total === 0) {
    ['qsHighest','qsLowest','qsDepts','qsSems','qsPerfect','qsAtRisk'].forEach(id => {
      const el = $(id); if (el) el.textContent = id === 'qsHighest' || id === 'qsLowest' ? '—' : '0';
    });
    return;
  }
  $('qsHighest').textContent = `${c.withPct[0].name.split(' ')[0]} (${c.withPct[0].pct}%)`;
  $('qsLowest').textContent  = `${c.withPct[c.withPct.length-1].name.split(' ')[0]} (${c.withPct[c.withPct.length-1].pct}%)`;
  $('qsDepts').textContent   = new Set(state.students.map(s => s.dept)).size;
  $('qsSems').textContent    = new Set(state.students.map(s => s.sem)).size;
  $('qsPerfect').textContent = c.perfect;
  $('qsAtRisk').textContent  = c.below75;
}

/* ══════════════════════════════════════════
   STATISTICS PAGE
══════════════════════════════════════════ */
function renderStatisticsPage() {
  renderStatsMiniCards();
  renderTop10();
  renderBottom10();
  renderDeptRanking();
  renderSemRanking();
}

function renderStatsMiniCards() {
  const grid = $('statsMiniGrid');
  if (!grid || !state.cache) return;
  const c     = state.cache;
  const total = state.students.length;

  const cards = [
    { label: 'Total Students',    value: total,          color: 'var(--primary)' },
    { label: 'Average Attendance',value: c.avgPct + '%', color: 'var(--warning)' },
    { label: 'Perfect (100%)',     value: c.perfect,      color: 'var(--success)' },
    { label: 'At Risk (<75%)',     value: c.below75,      color: 'var(--danger)'  },
    { label: 'Above 90%',         value: c.above90,      color: 'var(--success)' },
    { label: 'Total Records',     value: c.totalRecords, color: 'var(--accent)'  },
  ];

  grid.innerHTML = cards.map(card => `
    <div class="stats-mini-card glass-card">
      <span class="smc-label">${card.label}</span>
      <span class="smc-value" style="color:${card.color}">${card.value}</span>
    </div>
  `).join('');
}

function renderTop10() {
  const el = $('top10List');
  if (!el) return;
  if (!state.cache || state.students.length === 0) {
    el.innerHTML = '<p class="no-report">No data available.</p>'; return;
  }
  const top10 = state.cache.withPct.slice(0, 10);
  el.innerHTML = top10.map((s, i) => `
    <div class="rank-row">
      <span class="rank-num ${i < 3 ? 'rank-medal' : ''}">${i + 1}</span>
      <div class="avatar" style="width:30px;height:30px;font-size:0.6rem;" aria-hidden="true">${getInitials(s.name)}</div>
      <div class="rank-info">
        <span class="rank-name">${escHtml(s.name)}</span>
        <span class="rank-meta">${escHtml(s.dept)} · Sem ${s.sem}</span>
      </div>
      <span class="rank-pct pct-green">${s.pct}%</span>
    </div>
  `).join('');
}

function renderBottom10() {
  const el = $('bottom10List');
  if (!el) return;
  if (!state.cache || state.students.length === 0) {
    el.innerHTML = '<p class="no-report">No data available.</p>'; return;
  }
  const bottom10 = [...state.cache.withPct].slice(-10).reverse();
  const totalCount = state.students.length;
  el.innerHTML = bottom10.map((s, i) => `
    <div class="rank-row">
      <span class="rank-num danger-rank">${totalCount - i}</span>
      <div class="avatar" style="width:30px;height:30px;font-size:0.6rem;background:var(--grad-danger);" aria-hidden="true">${getInitials(s.name)}</div>
      <div class="rank-info">
        <span class="rank-name">${escHtml(s.name)}</span>
        <span class="rank-meta">${escHtml(s.dept)} · Sem ${s.sem}</span>
      </div>
      <span class="rank-pct pct-red">${s.pct}%</span>
    </div>
  `).join('');
}

function renderDeptRanking() {
  const el = $('deptRankingChart');
  if (!el || !state.cache) return;
  const dm = state.cache.deptMap;
  if (Object.keys(dm).length === 0) { el.innerHTML = '<p class="no-report">No data yet.</p>'; return; }

  const entries = Object.entries(dm)
    .map(([dept, pcts]) => ({
      dept,
      avg:   Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      count: pcts.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  el.innerHTML = entries.map((e, i) => `
    <div class="rank-bar-row">
      <span class="rank-bar-pos">#${i + 1}</span>
      <span class="rank-bar-label" title="${escHtml(e.dept)}">${escHtml(e.dept)}</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:0%" data-target="${e.avg}"></div>
      </div>
      <span class="rank-bar-val">${e.avg}% <small>(${e.count})</small></span>
    </div>
  `).join('');

  requestAnimationFrame(() => {
    el.querySelectorAll('.chart-bar-fill[data-target]').forEach(b => { b.style.width = b.dataset.target + '%'; });
  });
}

function renderSemRanking() {
  const el = $('semRankingChart');
  if (!el || !state.cache) return;
  const sm = state.cache.semMap;
  if (Object.keys(sm).length === 0) { el.innerHTML = '<p class="no-report">No data yet.</p>'; return; }

  const entries = Object.entries(sm)
    .map(([sem, pcts]) => ({
      sem:   parseInt(sem),
      avg:   Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      count: pcts.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  el.innerHTML = entries.map((e, i) => `
    <div class="rank-bar-row">
      <span class="rank-bar-pos">#${i + 1}</span>
      <span class="rank-bar-label">Sem ${e.sem}</span>
      <div class="chart-bar-track">
        <div class="chart-bar-fill fill-purple" style="width:0%" data-target="${e.avg}"></div>
      </div>
      <span class="rank-bar-val">${e.avg}% <small>(${e.count})</small></span>
    </div>
  `).join('');

  requestAnimationFrame(() => {
    el.querySelectorAll('.chart-bar-fill[data-target]').forEach(b => { b.style.width = b.dataset.target + '%'; });
  });
}

/* ══════════════════════════════════════════
   STUDENT FILTERING & SORTING
══════════════════════════════════════════ */
function getFilteredStudents() {
  const { search, dept, sem, status, pct, sort, sortDir } = state.filters;
  const rec = state.attendance[state.selectedDate] || {};

  let list = [...state.students];

  // Advanced search: name, roll, dept, semester
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.roll.toLowerCase().includes(q) ||
      s.dept.toLowerCase().includes(q) ||
      String(s.sem).includes(q)
    );
  }

  if (dept) list = list.filter(s => s.dept === dept);
  if (sem)  list = list.filter(s => String(s.sem) === String(sem));

  // Status filter (today's attendance)
  if (status === 'present') list = list.filter(s => rec[s.id] === 'present');
  if (status === 'absent')  list = list.filter(s => rec[s.id] !== 'present');

  // Attendance % range filter
  if (pct) {
    list = list.filter(s => {
      const p = calcAttendancePct(s.id);
      if (pct === 'above90') return p >= 90;
      if (pct === '75to90')  return p >= 75 && p < 90;
      if (pct === 'below75') return p < 75;
      return true;
    });
  }

  // Sort
  list.sort((a, b) => {
    let va, vb;
    if (sort === 'name') { va = a.name.toLowerCase();          vb = b.name.toLowerCase(); }
    else if (sort === 'roll') { va = a.roll;                   vb = b.roll; }
    else if (sort === 'dept') { va = a.dept.toLowerCase();     vb = b.dept.toLowerCase(); }
    else if (sort === 'sem')  { va = a.sem;                    vb = b.sem; }
    else if (sort === 'pct')  { va = calcAttendancePct(a.id);  vb = calcAttendancePct(b.id); }
    else if (sort === 'seen') {
      va = getLastAttendanceDate(a.id) || '0000-00-00';
      vb = getLastAttendanceDate(b.id) || '0000-00-00';
    }
    else if (sort === 'id')   { va = a.id; vb = b.id; }
    else                      { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }

    let cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return list;
}

/* ══════════════════════════════════════════
   PAGINATION
══════════════════════════════════════════ */
function getPaginatedStudents(list) {
  const { page, perPage } = state.pagination;
  const start = (page - 1) * perPage;
  return list.slice(start, start + perPage);
}

function renderPagination(totalFiltered) {
  const bar       = $('paginationBar');
  const infoEl    = $('paginationInfo');
  const indEl     = $('pageIndicator');
  const prevBtn   = $('prevPage');
  const nextBtn   = $('nextPage');
  if (!bar) return;

  if (totalFiltered === 0) { bar.style.display = 'none'; return; }
  bar.style.display = '';

  const { page, perPage } = state.pagination;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
  const start      = (page - 1) * perPage + 1;
  const end        = Math.min(page * perPage, totalFiltered);

  if (infoEl) infoEl.textContent = `Showing ${start}–${end} of ${totalFiltered} students`;
  if (indEl)  indEl.textContent  = `${page} / ${totalPages}`;
  if (prevBtn) prevBtn.disabled  = page <= 1;
  if (nextBtn) nextBtn.disabled  = page >= totalPages;
}

/* ══════════════════════════════════════════
   SKELETON LOADING
══════════════════════════════════════════ */
function showTableSkeleton(tbody, cols) {
  tbody.innerHTML = Array.from({ length: 5 }, () => `
    <tr class="skeleton-row">
      ${Array.from({ length: cols }, (_, ci) => `
        <td><div class="skeleton-cell" style="width:${ci === 0 ? '20px' : ci === 1 ? '90px' : ci === 8 ? '110px' : '60px'}"></div></td>
      `).join('')}
    </tr>
  `).join('');
}

/* ══════════════════════════════════════════
   SORT INDICATORS
══════════════════════════════════════════ */
function updateSortIndicators() {
  $$('th[data-sort]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === state.filters.sort) {
      th.classList.add(state.filters.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

/* ══════════════════════════════════════════
   SELECTION SYSTEM
══════════════════════════════════════════ */
function toggleSelectRow(id) {
  if (state.selected.has(id)) state.selected.delete(id);
  else                        state.selected.add(id);
  updateBulkBar();
  updateSelectAllCheckbox();
}

function toggleSelectAll() {
  const filtered   = getFilteredStudents();
  const paginated  = getPaginatedStudents(filtered);
  const allChecked = paginated.every(s => state.selected.has(s.id));
  paginated.forEach(s => allChecked ? state.selected.delete(s.id) : state.selected.add(s.id));
  updateBulkBar();
  renderStudentsTable(false); // no skeleton on checkbox re-render
}

function clearSelection() {
  state.selected.clear();
  updateBulkBar();
  $$('.row-check').forEach(cb => { cb.checked = false; });
  const sac = $('selectAllCheck');
  if (sac) { sac.checked = false; sac.indeterminate = false; }
}

function updateBulkBar() {
  const bar   = $('bulkBar');
  const count = $('bulkCount');
  if (!bar) return;
  const n = state.selected.size;
  bar.classList.toggle('active', n > 0);
  if (count) count.textContent = `${n} student${n !== 1 ? 's' : ''} selected`;
}

function updateSelectAllCheckbox() {
  const sac = $('selectAllCheck');
  if (!sac) return;
  const filtered  = getFilteredStudents();
  const paginated = getPaginatedStudents(filtered);
  if (paginated.length === 0) { sac.checked = false; sac.indeterminate = false; return; }
  const checkedCount = paginated.filter(s => state.selected.has(s.id)).length;
  if (checkedCount === 0)                    { sac.checked = false; sac.indeterminate = false; }
  else if (checkedCount === paginated.length) { sac.checked = true;  sac.indeterminate = false; }
  else                                       { sac.checked = false; sac.indeterminate = true;  }
}

/* ══════════════════════════════════════════
   STUDENTS TABLE RENDER
══════════════════════════════════════════ */
function renderStudentsTable(showSkeleton = true) {
  const tbody   = $('studentsTableBody');
  const empty   = $('emptyState');
  const counter = $('tableCount');
  if (!tbody)   return;

  // Brief skeleton flash for large lists
  if (showSkeleton && state.students.length > 25) showTableSkeleton(tbody, 10);

  const filtered  = getFilteredStudents();
  const total     = filtered.length;
  if (counter) counter.textContent = `${total} student${total !== 1 ? 's' : ''}`;

  if (total === 0) {
    tbody.innerHTML = '';
    show(empty);
    renderPagination(0);
    return;
  }
  hide(empty);

  // Pagination
  const paginated = getPaginatedStudents(filtered);
  renderPagination(total);

  const today = state.selectedDate;
  const rec   = state.attendance[today] || {};

  const rows = paginated.map(s => {
    const pct      = calcAttendancePct(s.id);
    const status   = rec[s.id] === 'present' ? 'present' : 'absent';
    const pctClass = pct >= 75 ? 'pct-high' : pct >= 50 ? 'pct-med' : 'pct-low';
    const lastSeen = getLastAttendanceDate(s.id);
    const isToday  = lastSeen === todayStr();
    const checked  = state.selected.has(s.id);

    return `
      <tr data-id="${s.id}" class="${checked ? 'row-selected' : ''}">
        <td class="col-check">
          <label class="custom-check" aria-label="Select ${escHtml(s.name)}">
            <input type="checkbox" class="row-check" data-id="${s.id}" ${checked ? 'checked' : ''}/>
            <span class="checkmark" aria-hidden="true"></span>
          </label>
        </td>
        <td><span style="font-size:0.68rem;font-weight:600;color:var(--text-muted);">${escHtml(s.id)}</span></td>
        <td>
          <div class="student-cell">
            <div class="avatar" aria-hidden="true">${getInitials(s.name)}</div>
            <div>
              <div class="student-name">${escHtml(s.name)}</div>
              <div class="student-id">${escHtml(s.roll)}</div>
            </div>
          </div>
        </td>
        <td><span style="font-weight:600;color:var(--text-primary);">${escHtml(s.roll)}</span></td>
        <td><span class="badge badge-dept">${escHtml(s.dept)}</span></td>
        <td><span class="badge badge-sem">Sem ${escHtml(String(s.sem))}</span></td>
        <td>
          <span class="last-seen-cell ${isToday ? 'today' : ''}" title="${lastSeen ? formatDate(lastSeen) : 'No record'}">
            ${lastSeen ? (isToday ? '● Today' : formatDateShort(lastSeen)) : '—'}
          </span>
        </td>
        <td>
          <button class="status-toggle ${status}"
            data-id="${s.id}" data-action="toggle-status"
            aria-label="Toggle attendance for ${escHtml(s.name)}: currently ${status}">
            <span class="status-dot" aria-hidden="true"></span>
            ${status === 'present' ? 'Present' : 'Absent'}
          </button>
        </td>
        <td>
          <div class="att-progress-wrap ${pctClass}">
            <div class="att-bar">
              <div class="att-bar-fill" style="width:${pct}%" role="progressbar"
                aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <span class="att-pct">${pct}%</span>
          </div>
        </td>
        <td>
          <div class="actions-cell">
            <button class="action-btn btn-edit" data-id="${s.id}" data-action="edit"
              aria-label="Edit ${escHtml(s.name)}">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="action-btn btn-del" data-id="${s.id}" data-action="delete"
              aria-label="Delete ${escHtml(s.name)}">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rows.join('');
  updateSortIndicators();
  updateSelectAllCheckbox();
}

/* ══════════════════════════════════════════
   ATTENDANCE TABLE RENDER
══════════════════════════════════════════ */
function renderAttendanceTable() {
  const tbody = $('attendanceTableBody');
  const empty = $('attEmptyState');
  if (!tbody) return;

  const dateStr = $('attDatePicker')?.value || state.selectedDate;
  const rec     = getDateRecord(dateStr);

  if (state.students.length === 0) {
    tbody.innerHTML = '';
    show(empty);
    return;
  }
  hide(empty);

  const list = [...state.students].sort((a, b) => a.name.localeCompare(b.name));

  tbody.innerHTML = list.map(s => {
    const status       = rec[s.id] || 'absent';
    const pct          = calcAttendancePct(s.id);
    const pctClass     = pct >= 75 ? 'pct-high' : pct >= 50 ? 'pct-med' : 'pct-low';
    const totalPresent = getTotalPresent(s.id);

    return `
      <tr data-id="${s.id}">
        <td>
          <div class="student-cell">
            <div class="avatar" aria-hidden="true">${getInitials(s.name)}</div>
            <div>
              <div class="student-name">${escHtml(s.name)}</div>
              <div class="student-id">${escHtml(s.roll)}</div>
            </div>
          </div>
        </td>
        <td style="font-weight:600;">${escHtml(s.roll)}</td>
        <td><span class="badge badge-dept">${escHtml(s.dept)}</span></td>
        <td><span class="badge badge-sem">Sem ${s.sem}</span></td>
        <td style="font-weight:600;color:var(--success);">${totalPresent}</td>
        <td>
          <div class="att-progress-wrap ${pctClass}">
            <div class="att-bar">
              <div class="att-bar-fill" style="width:${pct}%" role="progressbar"
                aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <span class="att-pct">${pct}%</span>
          </div>
        </td>
        <td>
          <button class="toggle-att-btn ${status}"
            data-id="${s.id}" data-date="${dateStr}"
            aria-label="Mark ${escHtml(s.name)} as ${status === 'present' ? 'absent' : 'present'}">
            ${status === 'present' ? '✅ Present' : '❌ Absent'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

/* ══════════════════════════════════════════
   REPORTS PAGE
══════════════════════════════════════════ */
function renderReportsPage() {
  renderReportTable();
  renderReportSummary();
}

function renderReportTable() {
  const tbody = $('reportTableBody');
  if (!tbody) return;
  if (state.students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted);">No students added yet.</td></tr>`;
    return;
  }
  const list = [...state.students]
    .map(s => ({ ...s, pct: calcAttendancePct(s.id) }))
    .sort((a, b) => b.pct - a.pct);

  tbody.innerHTML = list.map(s => {
    const statusClass = s.pct >= 75 ? 'good' : s.pct >= 50 ? 'warn' : 'bad';
    const statusText  = s.pct >= 75 ? 'Good'  : s.pct >= 50 ? 'At Risk' : 'Critical';
    const pctClass    = s.pct >= 75 ? 'pct-green' : s.pct >= 50 ? 'pct-yellow' : 'pct-red';
    const tp          = getTotalPresent(s.id);
    const ta          = getTotalAbsent(s.id);

    return `
      <tr>
        <td style="font-size:0.68rem;font-weight:600;color:var(--text-muted);">${escHtml(s.id)}</td>
        <td>
          <div class="student-cell">
            <div class="avatar" aria-hidden="true">${getInitials(s.name)}</div>
            <span class="student-name">${escHtml(s.name)}</span>
          </div>
        </td>
        <td>${escHtml(s.roll)}</td>
        <td><span class="badge badge-dept">${escHtml(s.dept)}</span></td>
        <td><span class="badge badge-sem">Sem ${s.sem}</span></td>
        <td style="font-weight:600;color:var(--success);">${tp}</td>
        <td style="font-weight:600;color:var(--danger);">${ta}</td>
        <td class="summary-pct ${pctClass}" style="font-weight:700;">${s.pct}%</td>
        <td><span class="report-status ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join('');
}

function renderReportSummary() {
  const container = $('reportSummaryList');
  if (!container) return;
  if (state.students.length === 0) {
    container.innerHTML = '<p class="no-report">No data available. Add students first.</p>'; return;
  }
  const list = [...state.students]
    .map(s => ({ ...s, pct: calcAttendancePct(s.id) }))
    .sort((a, b) => b.pct - a.pct);

  container.innerHTML = list.map(s => {
    const cls = s.pct >= 75 ? 'pct-green' : s.pct >= 50 ? 'pct-yellow' : 'pct-red';
    return `
      <div class="summary-row">
        <span class="summary-name">${escHtml(s.name)}</span>
        <span class="badge badge-dept">${escHtml(s.dept)}</span>
        <span class="summary-pct ${cls}">${s.pct}%</span>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════════════════════
   DEPARTMENT FILTER POPULATION
══════════════════════════════════════════ */
function populateDeptFilter() {
  const select  = $('filterDept');
  if (!select)  return;
  const current = select.value;
  const depts   = [...new Set(state.students.map(s => s.dept))].sort();
  select.innerHTML = `<option value="">All Departments</option>` +
    depts.map(d => `<option value="${escHtml(d)}"${d === current ? ' selected' : ''}>${escHtml(d)}</option>`).join('');
}

/* ══════════════════════════════════════════
   STUDENT MODAL  (ADD / EDIT)
══════════════════════════════════════════ */
function openAddModal() {
  state.editTarget = null;
  $('modalTitle').textContent    = 'Add New Student';
  $('submitBtnText').textContent = 'Add Student';
  $('editId').value = '';
  $('studentForm').reset();
  clearFormErrors();
  openModal('studentModalOverlay');
  setTimeout(() => $('studentName')?.focus(), 350);
}

function openEditModal(studentId) {
  const s = state.students.find(st => st.id === studentId);
  if (!s) return;
  state.editTarget           = studentId;
  $('modalTitle').textContent    = 'Edit Student';
  $('submitBtnText').textContent = 'Save Changes';
  $('editId').value    = s.id;
  $('studentName').value = s.name;
  $('rollNumber').value  = s.roll;
  $('department').value  = s.dept;
  $('semester').value    = s.sem;
  clearFormErrors();
  openModal('studentModalOverlay');
  setTimeout(() => $('studentName')?.focus(), 350);
}

function openModal(overlayId) {
  const overlay = $(overlayId);
  if (!overlay) return;
  overlay.classList.add('open');
  overlay.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(overlayId) {
  const overlay = $(overlayId);
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════
   FORM VALIDATION
══════════════════════════════════════════ */
function clearFormErrors() {
  ['nameError','rollError','deptError','semError'].forEach(id => {
    const el = $(id); if (el) el.textContent = '';
  });
  ['studentName','rollNumber','department','semester'].forEach(id => {
    $(id)?.classList?.remove('error');
  });
}

function validateStudentForm() {
  clearFormErrors();
  let valid = true;
  const name = $('studentName').value.trim();
  const roll = $('rollNumber').value.trim();
  const dept = $('department').value.trim();
  const sem  = $('semester').value;

  if (!name || name.length < 2) {
    showFieldError('studentName', 'nameError', name ? 'Name must be ≥ 2 characters' : 'Name is required');
    valid = false;
  }
  if (!roll) {
    showFieldError('rollNumber', 'rollError', 'Roll number is required');
    valid = false;
  } else if (state.students.some(s => s.roll.toLowerCase() === roll.toLowerCase() && s.id !== state.editTarget)) {
    showFieldError('rollNumber', 'rollError', 'Roll number already exists');
    valid = false;
  }
  if (!dept) { showFieldError('department', 'deptError', 'Department is required'); valid = false; }
  if (!sem)  { showFieldError('semester',   'semError',  'Please select a semester'); valid = false; }
  return valid;
}

function showFieldError(inputId, errorId, msg) {
  $(inputId)?.classList?.add('error');
  const el = $(errorId); if (el) el.textContent = msg;
}

/* ══════════════════════════════════════════
   CRUD OPERATIONS
══════════════════════════════════════════ */
function handleStudentFormSubmit(e) {
  e.preventDefault();
  if (!validateStudentForm()) return;

  const name = $('studentName').value.trim();
  const roll = $('rollNumber').value.trim();
  const dept = $('department').value.trim();
  const sem  = parseInt($('semester').value);

  if (state.editTarget) {
    const idx = state.students.findIndex(s => s.id === state.editTarget);
    if (idx !== -1) {
      state.students[idx] = { ...state.students[idx], name, roll, dept, sem };
      saveStudents();
      logActivity('edit', `Edited <strong>${escHtml(name)}</strong>`);
      showToast(`${name} updated successfully!`, 'success');
    }
  } else {
    const student = { id: generateId(), name, roll, dept, sem, createdAt: new Date().toISOString() };
    state.students.push(student);
    saveStudents();
    logActivity('add', `Added student <strong>${escHtml(name)}</strong>`);
    showToast(`${name} added successfully!`, 'success');
  }

  closeModal('studentModalOverlay');
  state.editTarget = null;
  refreshAll();
}

function promptDelete(studentId) {
  const s = state.students.find(st => st.id === studentId);
  if (!s) return;
  state.deleteTarget = studentId;
  $('confirmMsg').textContent = `Are you sure you want to delete "${s.name}"? All their attendance records will also be removed.`;
  openModal('confirmModalOverlay');
}

function promptDeleteSelected() {
  const n = state.selected.size;
  if (n === 0) { showToast('No students selected.', 'warning'); return; }
  state.deleteTarget = '__selected__';
  $('confirmMsg').textContent = `Delete ${n} selected student${n !== 1 ? 's' : ''}? All their attendance records will also be removed. This cannot be undone.`;
  openModal('confirmModalOverlay');
}

function confirmDelete() {
  if (!state.deleteTarget) return;

  if (state.deleteTarget === '__selected__') {
    const ids = [...state.selected];
    ids.forEach(id => {
      state.students = state.students.filter(s => s.id !== id);
      Object.keys(state.attendance).forEach(d => { delete state.attendance[d][id]; });
    });
    const n = ids.length;
    logActivity('delete', `Deleted <strong>${n} student${n !== 1 ? 's' : ''}</strong>`);
    showToast(`${n} student${n !== 1 ? 's' : ''} deleted.`, 'info');
    state.selected.clear();
  } else {
    const s = state.students.find(st => st.id === state.deleteTarget);
    if (!s) { closeModal('confirmModalOverlay'); return; }
    state.students = state.students.filter(st => st.id !== state.deleteTarget);
    Object.keys(state.attendance).forEach(d => { delete state.attendance[d][state.deleteTarget]; });
    logActivity('delete', `Deleted <strong>${escHtml(s.name)}</strong>`);
    showToast(`${s.name} deleted.`, 'info');
  }

  saveStudents();
  saveAttendance();
  state.deleteTarget = null;
  closeModal('confirmModalOverlay');
  refreshAll();
}

/* ══════════════════════════════════════════
   ATTENDANCE ACTIONS
══════════════════════════════════════════ */
function toggleStudentAttendance(studentId, dateStr) {
  const d   = dateStr || state.selectedDate;
  const rec = getDateRecord(d);
  rec[studentId] = rec[studentId] === 'present' ? 'absent' : 'present';
  saveAttendance();

  const s   = state.students.find(st => st.id === studentId);
  const nm  = s ? s.name : studentId;
  logActivity(rec[studentId], `Marked <strong>${escHtml(nm)}</strong> as <strong>${rec[studentId]}</strong> on ${formatDate(d)}`);
  refreshAll();
}

function markAllForDate(dateStr, status) {
  const rec = getDateRecord(dateStr);
  state.students.forEach(s => { rec[s.id] = status; });
  saveAttendance();
  logActivity(status, `Marked <strong>all students</strong> as <strong>${status}</strong> on ${formatDate(dateStr)}`);
  showToast(`All students marked ${status}!`, status === 'present' ? 'success' : 'info');
  refreshAll();
}

/** Mark currently selected students present or absent for the selected date */
function markSelectedAs(status) {
  if (state.selected.size === 0) { showToast('No students selected.', 'warning'); return; }
  const rec = getDateRecord(state.selectedDate);
  state.selected.forEach(id => { rec[id] = status; });
  saveAttendance();
  const n = state.selected.size;
  logActivity(status, `Marked <strong>${n} selected</strong> as <strong>${status}</strong>`);
  showToast(`${n} student${n !== 1 ? 's' : ''} marked ${status}!`, status === 'present' ? 'success' : 'info');
  refreshAll();
}

/* ══════════════════════════════════════════
   CSV EXPORT  (9 columns)
══════════════════════════════════════════ */
function exportToCSV(students) {
  if (!students || students.length === 0) { showToast('No data to export!', 'warning'); return; }

  const header = ['Student ID','Roll Number','Name','Department','Semester','Present Days','Absent Days','Attendance %','Last Attendance Date'];
  const rows   = students.map(s => {
    const pct  = calcAttendancePct(s.id);
    const tp   = getTotalPresent(s.id);
    const ta   = getTotalAbsent(s.id);
    const last = getLastAttendanceDate(s.id);
    return [s.id, s.roll, s.name, s.dept, `Sem ${s.sem}`, tp, ta, `${pct}%`, last ? formatDate(last) : '—'];
  });

  const csv  = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `attendance_report_${todayStr()}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully!', 'success');
}

/* ══════════════════════════════════════════
   RESTORE DEMO DATA
══════════════════════════════════════════ */
function restoreDemoData() {
  // Remove existing data
  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
  localStorage.removeItem(STORAGE_KEYS.SEEDED);

  state.students   = [];
  state.attendance = {};
  state.activity   = [];
  state.selected.clear();
  state.pagination.page = 1;

  // Re-seed
  seedDemoData();
  state.students   = storageGet(STORAGE_KEYS.STUDENTS,   []);
  state.attendance = storageGet(STORAGE_KEYS.ATTENDANCE, {});

  logActivity('reset', 'Restored <strong>100 demo students</strong> with attendance data');
  closeModal('restoreModalOverlay');
  showToast('Demo data restored successfully!', 'success');
  refreshAll();
}

/* ══════════════════════════════════════════
   RESET ALL DATA
══════════════════════════════════════════ */
function resetAllData() {
  state.students   = [];
  state.attendance = {};
  state.activity   = [];
  state.selected.clear();
  state.pagination.page = 1;
  localStorage.removeItem(STORAGE_KEYS.SEEDED);
  saveStudents();
  saveAttendance();
  saveActivity();
  logActivity('reset', 'All data has been reset');
  closeModal('resetModalOverlay');
  showToast('All data has been reset.', 'info');
  refreshAll();
}

/* ══════════════════════════════════════════
   PAGE NAVIGATION
══════════════════════════════════════════ */
const pageMeta = {
  dashboard:  { title: 'Dashboard',   subtitle: "Welcome back! Here's your attendance overview." },
  students:   { title: 'Students',    subtitle: 'Manage students, mark attendance, and export data.' },
  attendance: { title: 'Attendance',  subtitle: 'Mark and track daily attendance by date.' },
  statistics: { title: 'Statistics',  subtitle: 'Rankings, trends, and deep analytics.' },
  reports:    { title: 'Reports',     subtitle: 'Export and print detailed attendance reports.' },
};

function navigateTo(page) {
  if (state.currentPage === page) return;

  $$('.page.active').forEach(p  => p.classList.remove('active'));
  $$('.nav-item.active').forEach(n => { n.classList.remove('active'); n.removeAttribute('aria-current'); });

  const pageEl = $(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  const navEl = $(`nav-${page}`);
  if (navEl) { navEl.classList.add('active'); navEl.setAttribute('aria-current', 'page'); }

  const meta = pageMeta[page] || { title: page, subtitle: '' };
  $('pageTitle').textContent    = meta.title;
  $('pageSubtitle').textContent = meta.subtitle;

  state.currentPage = page;
  closeSidebar();

  // FAB only on students page
  $('fabAddStudent').style.display = page === 'students' ? 'flex' : 'none';

  if (page === 'dashboard')  renderDashboard();
  if (page === 'students')   { populateDeptFilter(); renderStudentsTable(); }
  if (page === 'attendance') renderAttendanceTable();
  if (page === 'statistics') renderStatisticsPage();
  if (page === 'reports')    renderReportsPage();
}

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
function openSidebar() {
  $('sidebar').classList.add('open');
  $('sidebarOverlay').classList.add('active');
  $('sidebarOverlay').style.display = 'block';
  $('hamburger').setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebarOverlay').classList.remove('active');
  $('hamburger').setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    if (!$('sidebar').classList.contains('open')) $('sidebarOverlay').style.display = '';
  }, 350);
}

/* ══════════════════════════════════════════
   THEME
══════════════════════════════════════════ */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}
function toggleTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

/* ══════════════════════════════════════════
   LIVE CLOCK
══════════════════════════════════════════ */
function startClock() {
  const tick = () => {
    const now   = new Date();
    const dateEl  = $('liveDate');
    const clockEl = $('liveClock');
    if (dateEl)  dateEl.textContent  = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };
  tick();
  setInterval(tick, 1000);
}

/* ══════════════════════════════════════════
   REFRESH  (central update hub)
══════════════════════════════════════════ */
function refreshAll() {
  computeStatsCache();
  populateDeptFilter();
  if (state.currentPage === 'dashboard')  renderDashboard();
  if (state.currentPage === 'students')   renderStudentsTable(false);
  if (state.currentPage === 'attendance') renderAttendanceTable();
  if (state.currentPage === 'statistics') renderStatisticsPage();
  if (state.currentPage === 'reports')    renderReportsPage();

  // Always keep sidebar snapshot fresh
  const { present, absent } = countForDate(state.selectedDate);
  $('sb-present').textContent = `${present} Present`;
  $('sb-absent').textContent  = `${absent} Absent`;
}

/* ══════════════════════════════════════════
   HTML ESCAPE
══════════════════════════════════════════ */
function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

/* ══════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════ */
function initEventListeners() {

  /* ── Navigation ── */
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
  });

  /* ── Hamburger / Sidebar ── */
  $('hamburger').addEventListener('click', () =>
    $('sidebar').classList.contains('open') ? closeSidebar() : openSidebar()
  );
  $('sidebarClose').addEventListener('click', closeSidebar);
  $('sidebarOverlay').addEventListener('click', closeSidebar);

  /* ── Theme ── */
  $('themeToggle').addEventListener('click', toggleTheme);

  /* ── FAB ── */
  $('fabAddStudent').addEventListener('click', openAddModal);

  /* ── Student Form ── */
  $('studentForm').addEventListener('submit', handleStudentFormSubmit);

  /* ── Modal Closes ── */
  $('modalClose').addEventListener('click',  () => closeModal('studentModalOverlay'));
  $('cancelModal').addEventListener('click', () => closeModal('studentModalOverlay'));
  $('confirmCancel').addEventListener('click', () => closeModal('confirmModalOverlay'));
  $('confirmDelete').addEventListener('click', confirmDelete);
  $('resetCancel').addEventListener('click',   () => closeModal('resetModalOverlay'));
  $('resetConfirm').addEventListener('click',  resetAllData);
  $('resetAllBtn').addEventListener('click',   () => openModal('resetModalOverlay'));
  $('restoreDemoBtn').addEventListener('click', () => openModal('restoreModalOverlay'));
  $('restoreCancel').addEventListener('click',  () => closeModal('restoreModalOverlay'));
  $('restoreConfirm').addEventListener('click', restoreDemoData);

  /* Close modals on overlay click */
  ['studentModalOverlay','confirmModalOverlay','resetModalOverlay','restoreModalOverlay'].forEach(id => {
    $(id).addEventListener('click', e => { if (e.target === $(id)) closeModal(id); });
  });

  /* ── Keyboard: Escape ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['studentModalOverlay','confirmModalOverlay','resetModalOverlay','restoreModalOverlay'].forEach(id => {
        if ($(id)?.classList.contains('open')) closeModal(id);
      });
    }
  });

  /* ── Students Table Delegation ── */
  $('studentsTableBody')?.addEventListener('click', e => {
    // Checkbox
    const cb = e.target.closest('.row-check');
    if (cb) { toggleSelectRow(cb.dataset.id); return; }

    const btn    = e.target.closest('[data-action]');
    if (!btn) return;
    const id     = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === 'toggle-status') toggleStudentAttendance(id);
    if (action === 'edit')          openEditModal(id);
    if (action === 'delete')        promptDelete(id);
  });

  /* ── Select All ── */
  $('selectAllCheck')?.addEventListener('change', toggleSelectAll);

  /* ── Bulk Actions ── */
  $('bulkMarkPresent')?.addEventListener('click', () => markSelectedAs('present'));
  $('bulkMarkAbsent')?.addEventListener('click',  () => markSelectedAs('absent'));
  $('bulkExport')?.addEventListener('click', () => {
    const ids = [...state.selected];
    exportToCSV(state.students.filter(s => ids.includes(s.id)));
  });
  $('bulkDelete')?.addEventListener('click', promptDeleteSelected);
  $('bulkClear')?.addEventListener('click',  () => { clearSelection(); renderStudentsTable(false); });

  /* ── Attendance Table Delegation ── */
  $('attendanceTableBody')?.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-att-btn');
    if (btn) toggleStudentAttendance(btn.dataset.id, btn.dataset.date);
  });

  /* ── Search ── */
  $('searchInput')?.addEventListener('input', e => {
    state.filters.search  = e.target.value;
    state.pagination.page = 1;
    renderStudentsTable(false);
  });

  /* ── Filter Selects ── */
  $('filterDept')?.addEventListener('change', e => {
    state.filters.dept = e.target.value; state.pagination.page = 1; renderStudentsTable(false);
  });
  $('filterSem')?.addEventListener('change', e => {
    state.filters.sem  = e.target.value; state.pagination.page = 1; renderStudentsTable(false);
  });
  $('filterStatus')?.addEventListener('change', e => {
    state.filters.status = e.target.value; state.pagination.page = 1; renderStudentsTable(false);
  });
  $('filterPct')?.addEventListener('change', e => {
    state.filters.pct = e.target.value; state.pagination.page = 1; renderStudentsTable(false);
  });
  $('sortBy')?.addEventListener('change', e => {
    state.filters.sort = e.target.value; renderStudentsTable(false);
  });

  /* ── Column Sort Headers ── */
  $$('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      if (state.filters.sort === th.dataset.sort) {
        state.filters.sortDir = state.filters.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.filters.sort    = th.dataset.sort;
        state.filters.sortDir = 'asc';
      }
      state.pagination.page = 1;
      renderStudentsTable(false);
    });
  });

  /* ── Attendance Date (Students page) ── */
  $('attendanceDate')?.addEventListener('change', e => {
    state.selectedDate    = e.target.value || todayStr();
    state.pagination.page = 1;
    renderStudentsTable(false);
    renderDashboard();
  });

  /* ── Attendance Page Date Picker ── */
  $('attDatePicker')?.addEventListener('change', e => {
    state.selectedDate = e.target.value || todayStr();
    renderAttendanceTable();
  });

  /* ── Bulk Attendance (Attendance page) ── */
  $('markAllPresent')?.addEventListener('click', () =>
    markAllForDate($('attDatePicker')?.value || state.selectedDate, 'present')
  );
  $('markAllAbsent')?.addEventListener('click', () =>
    markAllForDate($('attDatePicker')?.value || state.selectedDate, 'absent')
  );

  /* ── Pagination ── */
  $('prevPage')?.addEventListener('click', () => {
    if (state.pagination.page > 1) { state.pagination.page--; renderStudentsTable(false); }
  });
  $('nextPage')?.addEventListener('click', () => {
    const filtered    = getFilteredStudents();
    const totalPages  = Math.ceil(filtered.length / state.pagination.perPage);
    if (state.pagination.page < totalPages) { state.pagination.page++; renderStudentsTable(false); }
  });
  $('rowsPerPage')?.addEventListener('change', e => {
    state.pagination.perPage = parseInt(e.target.value);
    state.pagination.page    = 1;
    renderStudentsTable(false);
  });

  /* ── Export ── */
  $('exportBtn')?.addEventListener('click',        () => exportToCSV(getFilteredStudents()));
  $('exportAllBtn')?.addEventListener('click',     () => exportToCSV(state.students));
  $('exportFilteredBtn')?.addEventListener('click',() => exportToCSV(getFilteredStudents()));

  /* ── Print ── */
  $('printBtn')?.addEventListener('click',      () => window.print());
  $('printReportBtn')?.addEventListener('click',() => window.print());

  /* ── Clear Activity ── */
  $('clearActivityBtn')?.addEventListener('click', () => {
    state.activity = [];
    saveActivity();
    renderActivityList();
    showToast('Activity log cleared.', 'info');
  });
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
function init() {
  // Restore theme first to prevent flash
  applyTheme(localStorage.getItem(STORAGE_KEYS.THEME) || 'light');

  // Load (or seed) data
  loadData();

  // Set date inputs to today
  const today = todayStr();
  state.selectedDate = today;
  [$('attendanceDate'), $('attDatePicker')].forEach(el => {
    if (el) { el.value = today; el.max = today; }
  });

  // Wire up all events
  initEventListeners();

  // Start clock
  startClock();

  // FAB hidden by default (shown only on Students page)
  $('fabAddStudent').style.display = 'none';

  // Compute stats and render dashboard
  computeStatsCache();
  navigateTo('dashboard');
  $('page-dashboard').classList.add('active');
  $('nav-dashboard').classList.add('active');
  renderDashboard();

  // Remove loading screen
  setTimeout(() => $('loadingOverlay').classList.add('hidden'), 700);
}

document.addEventListener('DOMContentLoaded', init);
