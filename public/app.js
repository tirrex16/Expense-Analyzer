/**
 * app.js — Expense Analyzer (Full Feature)
 * Features:
 *   - Auto-categorization (5 categories)
 *   - Multi-month data store (localStorage)
 *   - Pie chart + Bar chart (Canvas API, no external lib)
 *   - Budget tracking with progress bars + alerts
 *   - Trend analysis (month-over-month)
 *   - Notification / alert engine
 *   - Excel export (SheetJS)
 *   - Excel import / resume (SheetJS)
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════
// 1. PARSER
// ═══════════════════════════════════════════════════════════════════

function parseAmount(raw) {
  if (!raw) return null;
  let c = raw.replace(/^rp\.?\s*/i, '').trim();
  if (/^\d{1,3}(\.\d{3})+$/.test(c)) c = c.replace(/\./g, '');
  c = c.replace(/,/g, '');
  const sm = c.match(/^([\d.]+)\s*(k|rb|ribu|jt|juta)$/i);
  if (sm) {
    const base = parseFloat(sm[1]);
    const s = sm[2].toLowerCase();
    if (['k','rb','ribu'].includes(s)) return Math.round(base * 1000);
    if (['jt','juta'].includes(s))     return Math.round(base * 1000000);
  }
  const n = parseFloat(c);
  return isNaN(n) ? null : Math.round(n);
}

function parseTransactions(input) {
  if (!input || typeof input !== 'string') return [];
  const segments = input.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const results = [];
  const AP = /(?:rp\.?\s*)?([\d.,]+\s*(?:k|rb|ribu|jt|juta)?)\s*$/i;
  for (const seg of segments) {
    const m = seg.match(AP);
    if (!m) continue;
    const amount = parseAmount(m[1].trim());
    if (!amount || amount <= 0) continue;
    const nameRaw = seg.slice(0, m.index).trim()
      .replace(/^(beli|bayar|langganan|isi|pesan)\s+/i, '')
      .replace(/\s+/g, ' ').trim();
    if (!nameRaw) continue;
    const name = nameRaw.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    results.push({ name, amount });
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════
// 2. CATEGORIZER
// ═══════════════════════════════════════════════════════════════════

const CAT_KEYS = ['Konsumsi','Operasional','Utilitas','Transportasi','Lain-lain'];

const CAT_MAP = {
  Konsumsi:     ['makan','minum','kopi','coffee','teh','nasi','ayam','bakso','soto','mie',
    'pizza','burger','sushi','roti','snack','camilan','gorengan','es','juice','jus',
    'susu','makanan','minuman','lunch','dinner','breakfast','sarapan','siang','malam',
    'resto','restoran','warung','cafe','kafe','martabak','indomie','gofood','grabfood',
    'shopeefood','pecel','lalapan','bebek','ikan','seafood','buah','sayur','beras','sembako'],
  Operasional:  ['netflix','spotify','youtube','streaming','langganan','subscription',
    'domain','hosting','vps','server','software','aplikasi','app','google','microsoft',
    'adobe','canva','figma','zoom','slack','office','antivirus','vpn','cloud','storage',
    'backup','atk','fotokopi','administrasi','materai','perangko','printer','tinta','kertas'],
  Utilitas:     ['listrik','air','pdam','pln','gas','internet','wifi','telpon','telepon',
    'pulsa','kuota','data','indihome','firstmedia','myrepublic','biznet','tv kabel',
    'tagihan','token','meteran','pbb','pajak','iuran','sewa','kontrak','kos','kosan','rumah'],
  Transportasi: ['bensin','bbm','pertamax','pertalite','solar','premium','ojek',
    'gojek','grab','maxim','indriver','taxi','taksi','bus','transjakarta','mrt','lrt',
    'commuter','kereta','krl','angkot','bis','damri','tol','parkir','tiket','pesawat',
    'lion','garuda','citilink','batik','sriwijaya','kapal','ferry','service','servis',
    'oli','ban','sparepart','motor','mobil','online','angkutan','transportasi',
    'ongkir','kirim','ekspedisi','jne','jnt','sicepat','anteraja','pos'],
};

function categorize(name) {
  const lo = name.toLowerCase();
  for (const [cat, kws] of Object.entries(CAT_MAP)) {
    if (kws.some(kw => lo.includes(kw))) return cat;
  }
  return 'Lain-lain';
}

// ═══════════════════════════════════════════════════════════════════
// 3. CATEGORY STYLE
// ═══════════════════════════════════════════════════════════════════

const CAT_STYLE = {
  Konsumsi:     { bg:'#f5f0e6', text:'#6b5317', dot:'#b8860b' },
  Operasional:  { bg:'#eaecf3', text:'#2d3282', dot:'#4f52b2' },
  Utilitas:     { bg:'#e6f2ec', text:'#1a5e3a', dot:'#2d8659' },
  Transportasi: { bg:'#ede8f5', text:'#4a2380', dot:'#6d42a8' },
  'Lain-lain':  { bg:'#eeeeee', text:'#4a4a4a', dot:'#888888' },
};

const CAT_CHART_COLORS = ['#b8860b','#4f52b2','#2d8659','#6d42a8','#888888'];

// ═══════════════════════════════════════════════════════════════════
// 4. DATA STORE  (localStorage)
// ═══════════════════════════════════════════════════════════════════

const STORE_KEY = 'ea_data_v2';

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch { return {}; }
}

function saveStore(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

// store structure: { "2025-06": [ {name, amount, category, date}, ... ], ... }
let store = loadStore();

function getMonthRows(monthKey) {
  return store[monthKey] || [];
}

function addRows(monthKey, rows) {
  if (!store[monthKey]) store[monthKey] = [];
  store[monthKey] = store[monthKey].concat(rows);
  saveStore(store);
}

function replaceStore(newStore) {
  store = newStore;
  saveStore(store);
}

function allMonths() {
  return Object.keys(store).sort();
}

// ═══════════════════════════════════════════════════════════════════
// 5. BUDGET STORE
// budget structure: { "2025-06": 2000000, "2025-07": 1500000, ... }
// One total budget amount per month — system splits tracking by category.
// ═══════════════════════════════════════════════════════════════════

const BUDGET_KEY = 'ea_budget_v3';

function loadBudget() {
  try {
    return JSON.parse(localStorage.getItem(BUDGET_KEY)) || {};
  } catch { return {}; }
}

function saveBudget(b) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(b));
}

let budget = loadBudget(); // { monthKey: totalAmount }

function getBudgetForMonth(monthKey) {
  return budget[monthKey] || 0;
}

function setBudgetForMonth(monthKey, amount) {
  budget[monthKey] = amount;
  saveBudget(budget);
}

// ═══════════════════════════════════════════════════════════════════
// 6. HELPERS
// ═══════════════════════════════════════════════════════════════════

function formatIDR(n) {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  const d = new Date(+y, +m - 1, 1);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function todayMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ═══════════════════════════════════════════════════════════════════
// 7. NOTIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════════

const notifBanner = document.getElementById('notif-banner');

function showNotif(type, html, autoDismiss = false) {
  const el = document.createElement('div');
  el.className = `notif notif-${type}`;
  el.innerHTML = `<span class="notif-icon">${type==='danger'?'🚨':type==='warn'?'⚠️':'✅'}</span><span>${html}</span><span class="notif-close" title="Tutup">✕</span>`;
  el.querySelector('.notif-close').addEventListener('click', () => el.remove());
  notifBanner.appendChild(el);
  if (autoDismiss) setTimeout(() => el.remove && el.remove(), 4000);
}

function clearNotifs() {
  notifBanner.innerHTML = '';
}

// ═══════════════════════════════════════════════════════════════════
// 8. INTERACTIVE CHARTS (Powered by Chart.js with Canvas Fallback)
// ═══════════════════════════════════════════════════════════════════

const chartInstances = {};

function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

function drawPieChart(canvasId, labels, values, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  destroyChart(canvasId);

  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return;

  if (typeof Chart !== 'undefined') {
    const isMobile = window.innerWidth < 520;
    chartInstances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverBorderWidth: 2,
          hoverOffset: 7,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 550,
        },
        plugins: {
          legend: {
            position: isMobile ? 'bottom' : 'right',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: isMobile ? 10 : 14,
              font: { family: "'DM Sans', sans-serif", size: 13, weight: '500' },
              color: '#1a1a1a',
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const val = data.datasets[0].data[i] || 0;
                    const pct = total ? ((val / total) * 100).toFixed(1) : '0';
                    return {
                      text: `${label} (${pct}%)`,
                      fillStyle: colors[i % colors.length],
                      strokeStyle: colors[i % colors.length],
                      lineWidth: 0,
                      hidden: isNaN(data.datasets[0].data[i]) || chart.getDatasetMeta(0).data[i].hidden,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            backgroundColor: '#1a1a1a',
            padding: 12,
            cornerRadius: 8,
            titleFont: { family: "'DM Sans', sans-serif", size: 13, weight: '700' },
            bodyFont: { family: "'DM Sans', sans-serif", size: 13, weight: '500' },
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                const pct = total ? ((val / total) * 100).toFixed(1) : '0';
                return ` ${formatIDR(val)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
    return;
  }

  // Fallback: raw Canvas API
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300, H = canvas.offsetHeight || 220;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  const cx = W * 0.38, cy = H / 2, r = Math.min(cx, cy) - 16;
  let startAngle = -Math.PI / 2;
  values.forEach((v, i) => {
    const slice = (v / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    startAngle += slice;
  });
  const legX = W * 0.70, legStartY = cy - (labels.length * 24) / 2;
  ctx.font = '13px "DM Sans", sans-serif';
  labels.forEach((lbl, i) => {
    const ly = legStartY + i * 26;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(legX, ly - 10, 12, 12);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText(lbl, legX + 18, ly);
    ctx.fillStyle = '#6b6b6b';
    ctx.fillText(((values[i] / total) * 100).toFixed(1) + '%', legX + 18, ly + 15);
  });
}

function drawBarChart(canvasId, labels, values, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  destroyChart(canvasId);

  if (!values.some(v => v > 0)) return;

  if (typeof Chart !== 'undefined') {
    chartInstances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 42,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a1a',
            padding: 12,
            cornerRadius: 8,
            titleFont: { family: "'DM Sans', sans-serif", size: 13, weight: '700' },
            bodyFont: { family: "'DM Sans', sans-serif", size: 13, weight: '500' },
            callbacks: {
              label: function(context) {
                return ` Nominal: ${formatIDR(context.raw || 0)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "'DM Sans', sans-serif", size: 12.5, weight: '500' },
              color: '#5e6470',
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f0f2f5' },
            border: { display: false },
            ticks: {
              font: { family: "'DM Sans', sans-serif", size: 12, weight: '500' },
              color: '#8e95a0',
              callback: function(value) {
                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'jt';
                if (value >= 1000) return (value / 1000).toFixed(0) + 'rb';
                return value;
              }
            }
          }
        }
      }
    });
    return;
  }

  // Fallback: raw Canvas API
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300, H = canvas.offsetHeight || 220;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  const pad = { top: 20, right: 16, bottom: 50, left: 16 };
  const chartW = W - pad.left - pad.right, chartH = H - pad.top - pad.bottom;
  const maxVal = Math.max(...values);
  const barW = (chartW / labels.length) * 0.55;
  const gap = chartW / labels.length;
  labels.forEach((lbl, i) => {
    if (!values[i]) return;
    const barH = (values[i] / maxVal) * chartH;
    const x = pad.left + gap * i + (gap - barW) / 2;
    const y = pad.top + chartH - barH;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]) : ctx.rect(x, y, barW, barH);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.font = '12px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    const shortVal = values[i] >= 1000000 ? (values[i]/1000000).toFixed(1)+'jt' : values[i] >= 1000 ? (values[i]/1000).toFixed(0)+'rb' : values[i];
    ctx.fillText(shortVal, x + barW / 2, y - 5);
    ctx.fillStyle = '#5e6470';
    ctx.font = '12.5px "DM Sans", sans-serif';
    ctx.fillText(lbl.length > 8 ? lbl.slice(0, 7)+'…' : lbl, x + barW / 2, H - pad.bottom + 18);
  });
  ctx.beginPath();
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.moveTo(pad.left, pad.top + chartH);
  ctx.lineTo(W - pad.right, pad.top + chartH);
  ctx.stroke();
}

function drawLineChart(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  destroyChart(canvasId);

  if (labels.length < 2) return;

  if (typeof Chart !== 'undefined') {
    chartInstances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          borderColor: '#e8380d',
          backgroundColor: 'rgba(232, 56, 13, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#e8380d',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointHoverBackgroundColor: '#e8380d',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a1a',
            padding: 12,
            cornerRadius: 8,
            titleFont: { family: "'DM Sans', sans-serif", size: 13, weight: '700' },
            bodyFont: { family: "'DM Sans', sans-serif", size: 13, weight: '500' },
            callbacks: {
              label: function(context) {
                return ` Total: ${formatIDR(context.raw || 0)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "'DM Sans', sans-serif", size: 12.5, weight: '500' },
              color: '#5e6470',
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f0f2f5' },
            border: { display: false },
            ticks: {
              font: { family: "'DM Sans', sans-serif", size: 12, weight: '500' },
              color: '#8e95a0',
              callback: function(value) {
                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'jt';
                if (value >= 1000) return (value / 1000).toFixed(0) + 'rb';
                return value;
              }
            }
          }
        }
      }
    });
    return;
  }

  // Fallback: raw Canvas API
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 600, H = canvas.offsetHeight || 200;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  const pad = { top: 28, right: 24, bottom: 44, left: 24 };
  const chartW = W - pad.left - pad.right, chartH = H - pad.top - pad.bottom;
  const maxVal = Math.max(...values) * 1.1 || 1;
  const pts = labels.map((_, i) => ({
    x: pad.left + (i / (labels.length - 1)) * chartW,
    y: pad.top + chartH - (values[i] / maxVal) * chartH,
  }));
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const gy = pad.top + (g / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(W - pad.right, gy); ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.top + chartH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(232,56,13,.08)';
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = '#e8380d';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.font = '12px "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  pts.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#e8380d';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    const shortVal = values[i] >= 1000000 ? (values[i]/1000000).toFixed(1)+'jt' : values[i] >= 1000 ? (values[i]/1000).toFixed(0)+'rb' : values[i];
    ctx.fillText(shortVal, p.x, p.y - 10);
    ctx.fillStyle = '#5e6470';
    ctx.font = '12.5px "DM Sans", sans-serif';
    ctx.fillText(labels[i], p.x, H - pad.bottom + 18);
  });
  ctx.beginPath();
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  ctx.moveTo(pad.left, pad.top + chartH);
  ctx.lineTo(W - pad.right, pad.top + chartH);
  ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════════
// 9. TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════════

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');

    if (btn.dataset.tab === 'tab-dashboard') renderDashboard();
    if (btn.dataset.tab === 'tab-trend')     renderTrend();
    if (btn.dataset.tab === 'tab-budget')    renderBudgetTab();
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. INPUT TAB
// ═══════════════════════════════════════════════════════════════════

const inputEl          = document.getElementById('expense-input');
const analyzeBtn       = document.getElementById('analyze-btn');
const clearBtn         = document.getElementById('clear-btn');
const errorBox         = document.getElementById('error-box');
const monthInput       = document.getElementById('month-input');
const charCount        = document.getElementById('char-count');
const budgetTotalInput = document.getElementById('budget-total-input');
const budgetRemaining  = document.getElementById('budget-remaining');

// Set default month to current month
monthInput.value = todayMonthKey();

inputEl.addEventListener('input', () => { charCount.textContent = inputEl.value.length + ' karakter'; });
inputEl.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyzeBtn.click(); });
analyzeBtn.addEventListener('click', handleAnalyze);

// When month changes, restore saved budget value for that month into the field
monthInput.addEventListener('change', () => {
  const mk = monthInput.value || todayMonthKey();
  const saved = getBudgetForMonth(mk);
  budgetTotalInput.value = saved ? saved.toLocaleString('id-ID') : '';
  updateRemainingDisplay(mk);
});

// Live remaining update as user types budget
budgetTotalInput.addEventListener('input', () => {
  updateRemainingDisplay(monthInput.value || todayMonthKey());
});

clearBtn.addEventListener('click', () => {
  inputEl.value = '';
  charCount.textContent = '0 karakter';
  budgetTotalInput.value = '';
  budgetRemaining.classList.add('hidden');
  hideError();
  clearNotifs();
});

/**
 * Reads the budget field and returns a number (0 if empty/invalid).
 */
function readBudgetField() {
  const raw = budgetTotalInput.value.replace(/\./g, '').replace(/,/g, '');
  return parseInt(raw, 10) || 0;
}

/**
 * Shows sisa anggaran inside the budget field row.
 */
function updateRemainingDisplay(monthKey) {
  const b = readBudgetField();
  if (b <= 0) {
    budgetRemaining.classList.add('hidden');
    return;
  }
  const spent = getMonthRows(monthKey).reduce((s, r) => s + r.amount, 0);
  const sisa = b - spent;
  const pct = Math.min((spent / b) * 100, 100);
  budgetRemaining.classList.remove('hidden');
  if (sisa < 0) {
    budgetRemaining.style.color = 'var(--danger)';
    budgetRemaining.textContent = `⛔ Melebihi ${formatIDR(Math.abs(sisa))}`;
  } else if (pct >= 80) {
    budgetRemaining.style.color = 'var(--warn)';
    budgetRemaining.textContent = `⚠️ Sisa ${formatIDR(sisa)}`;
  } else {
    budgetRemaining.style.color = 'var(--success)';
    budgetRemaining.textContent = `✅ Sisa ${formatIDR(sisa)}`;
  }
}

// ── Analyze & Save ────────────────────────────────────────────────
function handleAnalyze() {
  hideError();
  clearNotifs();
  const input = inputEl.value.trim();
  if (!input) { showInputError('Masukkan teks pengeluaran terlebih dahulu.'); return; }

  const monthKey = monthInput.value || todayMonthKey();
  const raw = parseTransactions(input);
  if (!raw.length) { showInputError('Error: No transaction data detected.'); return; }

  // Save budget for this month (if filled)
  const budgetAmt = readBudgetField();
  if (budgetAmt > 0) {
    setBudgetForMonth(monthKey, budgetAmt);
  }

  const rows = raw.map(t => ({
    name: t.name,
    amount: t.amount,
    category: categorize(t.name),
    date: monthKey,
  }));

  addRows(monthKey, rows);
  inputEl.value = '';
  charCount.textContent = '0 karakter';

  // Build budget alerts (based on total budget vs total spent)
  const alerts = buildBudgetAlerts(monthKey);

  // Update remaining display in the field row
  updateRemainingDisplay(monthKey);

  // Show success notif
  showNotif('ok', `✅ <strong>${rows.length} transaksi</strong> berhasil disimpan untuk <strong>${monthLabel(monthKey)}</strong>.`, true);

  // Show budget alerts right after — stay visible until dismissed
  alerts.forEach(a => showNotif(a.type, a.msg));

  // Switch to dashboard (longer delay if there are alerts so user can read them)
  const delay = alerts.length > 0 ? 1800 : 700;
  setTimeout(() => {
    document.querySelector('[data-tab="tab-dashboard"]').click();
  }, delay);
}

/**
 * Compares total spent for monthKey against the single total budget.
 * Returns array of { type, msg } alerts.
 */
function buildBudgetAlerts(monthKey) {
  const alerts = [];
  const b = getBudgetForMonth(monthKey);
  if (b <= 0) return alerts;

  const spent = getMonthRows(monthKey).reduce((s, r) => s + r.amount, 0);
  const pct = spent / b;

  if (pct >= 1) {
    alerts.push({
      type: 'danger',
      msg: `⛔ Total pengeluaran <strong>${formatIDR(spent)}</strong> telah melebihi anggaran <strong>${formatIDR(b)}</strong> (${Math.round(pct*100)}%)`,
    });
  } else if (pct >= 0.8) {
    alerts.push({
      type: 'warn',
      msg: `⚠️ Anggaran hampir habis — sudah terpakai <strong>${formatIDR(spent)}</strong> dari <strong>${formatIDR(b)}</strong> (${Math.round(pct*100)}%)`,
    });
  }
  return alerts;
}

function showInputError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}
function hideError() { errorBox.classList.add('hidden'); }

// ═══════════════════════════════════════════════════════════════════
// 11. DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════

const dashMonthSelect = document.getElementById('dash-month-select');
const tableBody       = document.getElementById('table-body');
const totalAmountEl   = document.getElementById('total-amount');
const exportBtn       = document.getElementById('export-btn');
const copyMdBtn       = document.getElementById('copy-md-btn');

let lastMarkdown = '';

dashMonthSelect.addEventListener('change', () => renderDashboard());
exportBtn.addEventListener('click', exportExcel);
copyMdBtn.addEventListener('click', copyMarkdown);
document.getElementById('delete-month-btn').addEventListener('click', () => {
  const monthKey = dashMonthSelect.value;
  if (!monthKey) return;
  const label = monthLabel(monthKey);
  if (!confirm(`Hapus semua data transaksi untuk ${label}?\n\nTindakan ini tidak dapat dibatalkan.`)) return;
  delete store[monthKey];
  saveStore(store);
  clearNotifs();
  showNotif('ok', `🗑 Data <strong>${label}</strong> berhasil dihapus.`, true);
  renderDashboard();
});

function renderDashboard() {
  const months = allMonths();
  if (!months.length) {
    document.getElementById('dashboard-empty').classList.remove('hidden');
    document.getElementById('dashboard-content').classList.add('hidden');
    return;
  }
  document.getElementById('dashboard-empty').classList.add('hidden');
  document.getElementById('dashboard-content').classList.remove('hidden');

  // Populate month selector
  const current = dashMonthSelect.value;
  dashMonthSelect.innerHTML = '';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = monthLabel(m);
    if (m === current) opt.selected = true;
    dashMonthSelect.appendChild(opt);
  });
  if (!current || !months.includes(current)) {
    dashMonthSelect.value = months[months.length - 1];
  }

  const monthKey = dashMonthSelect.value;
  const rows = getMonthRows(monthKey);
  const total = rows.reduce((s, r) => s + r.amount, 0);

  // ── Budget summary bar ──────────────────────────────────────────
  const monthBudget = getBudgetForMonth(monthKey);
  const dashBudgetBar      = document.getElementById('dash-budget-bar');
  const dashBudgetNumbers  = document.getElementById('dash-budget-numbers');
  const dashBudgetProgress = document.getElementById('dash-budget-progress');
  const dashBudgetLabel    = document.getElementById('dash-budget-label');

  if (monthBudget > 0) {
    const pct   = Math.min((total / monthBudget) * 100, 100);
    const sisa  = monthBudget - total;
    const over  = total > monthBudget;
    const color = over ? '#e8380d' : pct >= 80 ? '#bf8700' : '#1a7f37';

    dashBudgetBar.classList.remove('hidden');
    dashBudgetNumbers.style.color = color;
    dashBudgetNumbers.innerHTML =
      `Terpakai <strong>${formatIDR(total)}</strong> dari <strong>${formatIDR(monthBudget)}</strong>` +
      ` &nbsp;|&nbsp; Sisa: <strong>${formatIDR(Math.abs(sisa))}</strong>`;
    dashBudgetProgress.style.width    = pct + '%';
    dashBudgetProgress.style.background = color;
    dashBudgetLabel.style.color = color;
    dashBudgetLabel.textContent = over
      ? `⛔ Melebihi anggaran ${formatIDR(Math.abs(sisa))} (${Math.round(total / monthBudget * 100)}%)`
      : pct >= 80
        ? `⚠️ Hampir habis — ${Math.round(pct)}% terpakai`
        : `✅ Aman — ${Math.round(pct)}% terpakai`;
  } else {
    dashBudgetBar.classList.add('hidden');
  }

  // Category totals (needed for charts only)
  const catTotals = {};
  rows.forEach(r => { catTotals[r.category] = (catTotals[r.category] || 0) + r.amount; });

  // Charts
  const chartLabels  = CAT_KEYS.filter(c => catTotals[c]);
  const chartValues  = chartLabels.map(c => catTotals[c] || 0);
  const chartColors  = chartLabels.map(c => CAT_STYLE[c].dot);
  setTimeout(() => {
    drawPieChart('chart-pie', chartLabels, chartValues, chartColors);
    drawBarChart('chart-bar', CAT_KEYS, CAT_KEYS.map(c => catTotals[c] || 0), CAT_CHART_COLORS);
  }, 50);

  // Table
  tableBody.innerHTML = '';
  rows.forEach((r, i) => {
    const cs = CAT_STYLE[r.category];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-no">${i+1}</td>
      <td class="td-name">${escHtml(r.name)}</td>
      <td class="td-amount">${escHtml(formatIDR(r.amount))}</td>
      <td><span class="badge" style="background:${cs.bg};color:${cs.text};">
        <span class="dot" style="background:${cs.dot};"></span>${r.category}</span></td>
      <td class="td-date">${escHtml(r.date || '')}</td>`;
    tableBody.appendChild(tr);
  });
  totalAmountEl.textContent = formatIDR(total);

  // Markdown
  lastMarkdown = buildMarkdown(rows, total);
}

function buildMarkdown(rows, total) {
  const hdr = '| No | Barang/Jasa | Nominal (Rp) | Kategori |\n|----|-------------|--------------|----------|';
  const body = rows.map((r,i) => `| ${i+1}  | ${r.name} | ${formatIDR(r.amount)} | ${r.category} |`);
  return [hdr, ...body, `|    | **TOTAL PENGELUARAN** | **${formatIDR(total)}** |  |`].join('\n');
}

function copyMarkdown() {
  if (!lastMarkdown) return;
  navigator.clipboard.writeText(lastMarkdown).then(() => {
    copyMdBtn.textContent = '✓ Tersalin!';
    setTimeout(() => { copyMdBtn.textContent = '⎘ Salin Markdown'; }, 2000);
  });
}

// ═══════════════════════════════════════════════════════════════════
// 12. TREND TAB
// ═══════════════════════════════════════════════════════════════════

function renderTrend() {
  const months = allMonths();
  const trendEmpty   = document.getElementById('trend-empty');
  const trendContent = document.getElementById('trend-content');

  if (months.length < 2) {
    trendEmpty.classList.remove('hidden');
    trendContent.classList.add('hidden');
    return;
  }
  trendEmpty.classList.add('hidden');
  trendContent.classList.remove('hidden');

  // Build month totals
  const monthTotals = months.map(m => ({
    key: m,
    label: monthLabel(m),
    total: getMonthRows(m).reduce((s, r) => s + r.amount, 0),
    byCat: (() => {
      const ct = {};
      getMonthRows(m).forEach(r => { ct[r.category] = (ct[r.category] || 0) + r.amount; });
      return ct;
    })(),
  }));

  // Line chart
  const shortLabels = months.map(m => {
    const [y, mo] = m.split('-');
    return new Date(+y, +mo-1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
  });
  setTimeout(() => {
    drawLineChart('chart-trend', shortLabels, monthTotals.map(m => m.total));
  }, 50);

  // Trend table
  const tbody = document.getElementById('trend-table-body');
  tbody.innerHTML = '';
  monthTotals.forEach((m, i) => {
    const prev = monthTotals[i - 1];
    const delta = prev ? m.total - prev.total : null;
    const deltaStr = delta === null ? '—'
      : delta === 0 ? '±0'
      : (delta > 0 ? '▲ +' : '▼ ') + formatIDR(Math.abs(delta));
    const deltaColor = delta === null ? '' : delta > 0 ? '#e8380d' : delta < 0 ? '#1a7f37' : '';

    const tr = document.createElement('tr');
    tr.className = 'trend-month-row';
    tr.innerHTML = `
      <td style="font-weight:600;">${escHtml(m.label)}</td>
      ${CAT_KEYS.map(c => `<td class="td-amount">${m.byCat[c] ? formatIDR(m.byCat[c]) : '—'}</td>`).join('')}
      <td class="td-amount trend-total">${formatIDR(m.total)}</td>
      <td style="font-size:13px;font-weight:600;color:${deltaColor};">${deltaStr}</td>`;
    tbody.appendChild(tr);
  });
}

// ═══════════════════════════════════════════════════════════════════
// 14. EXCEL EXPORT
// ═══════════════════════════════════════════════════════════════════

function exportExcel() {
  if (typeof XLSX === 'undefined') {
    showNotif('danger', 'Library XLSX belum termuat. Pastikan terhubung ke internet.', true);
    return;
  }

  const monthKey = dashMonthSelect.value;
  const rows = getMonthRows(monthKey);
  if (!rows.length) { showNotif('warn', 'Tidak ada data untuk diekspor.', true); return; }

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Transactions ──
  const txData = [
    ['No', 'Barang / Jasa', 'Nominal (Rp)', 'Kategori', 'Bulan'],
    ...rows.map((r, i) => [i + 1, r.name, r.amount, r.category, r.date]),
    [],
    ['', 'TOTAL PENGELUARAN', rows.reduce((s, r) => s + r.amount, 0), '', ''],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(txData);
  ws1['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Transaksi');

  // ── Sheet 2: Summary by category ──
  const catTotals = {};
  rows.forEach(r => { catTotals[r.category] = (catTotals[r.category] || 0) + r.amount; });
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const sumData = [
    ['Kategori', 'Total (Rp)', 'Persentase (%)'],
    ...CAT_KEYS.filter(c => catTotals[c]).map(c => [
      c, catTotals[c], +((catTotals[c] / total * 100).toFixed(2))
    ]),
    [],
    ['TOTAL', total, 100],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(sumData);
  ws2['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Ringkasan');

  // ── Sheet 3: All months trend ──
  const allM = allMonths();
  const trendHdr = ['Bulan', ...CAT_KEYS, 'Total'];
  const trendRows = allM.map(m => {
    const ct = {};
    getMonthRows(m).forEach(r => { ct[r.category] = (ct[r.category] || 0) + r.amount; });
    return [monthLabel(m), ...CAT_KEYS.map(c => ct[c] || 0), getMonthRows(m).reduce((s,r)=>s+r.amount,0)];
  });
  const ws3 = XLSX.utils.aoa_to_sheet([trendHdr, ...trendRows]);
  ws3['!cols'] = [{ wch: 20 }, ...Array(6).fill({ wch: 14 })];
  XLSX.utils.book_append_sheet(wb, ws3, 'Tren Bulanan');

  // ── Sheet 4: Budget per bulan ──
  const allBudgetMonths = [...new Set([...allMonths(), ...Object.keys(budget)])].sort();
  const budgetSheetData = [
    ['Bulan', 'Anggaran (Rp)', 'Realisasi (Rp)', 'Sisa (Rp)', 'Status (%)'],
    ...allBudgetMonths.map(m => {
      const b     = getBudgetForMonth(m);
      const spent = getMonthRows(m).reduce((s, r) => s + r.amount, 0);
      const sisa  = b - spent;
      const pct   = b > 0 ? Math.round(spent / b * 100) : 0;
      const status = b <= 0 ? 'Tidak diset' : spent > b ? 'Melebihi' : pct >= 80 ? 'Hampir habis' : 'Aman';
      return [monthLabel(m), b, spent, sisa, status + (b > 0 ? ' (' + pct + '%)' : '')];
    }),
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(budgetSheetData);
  ws4['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Anggaran');

  // ── Sheet 5: Metadata (for re-import) ──
  const meta = [
    ['__EA_EXPORT__', '1'],
    ['exported_at', new Date().toISOString()],
    ['store_json', JSON.stringify(store)],
    ['budget_json', JSON.stringify(budget)],
  ];
  const ws5 = XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.book_append_sheet(wb, ws5, '__meta__');

  const filename = `expense-analyzer-${monthKey}.xlsx`;
  XLSX.writeFile(wb, filename);
  showNotif('ok', `⬇ File <strong>${filename}</strong> berhasil diunduh.`, true);
}

// ═══════════════════════════════════════════════════════════════════
// 15. EXCEL IMPORT
// ═══════════════════════════════════════════════════════════════════

function handleExcelUpload(file) {
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    showNotif('danger', 'Library XLSX belum termuat. Pastikan terhubung ke internet.', true);
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });

      // Try fast-path: restore from __meta__ sheet
      if (wb.SheetNames.includes('__meta__')) {
        const ws = wb.Sheets['__meta__'];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const metaMap = {};
        rows.forEach(r => { if (r[0]) metaMap[r[0]] = r[1]; });

        if (metaMap['__EA_EXPORT__'] === '1') {
          const importedStore  = JSON.parse(metaMap['store_json']  || '{}');
          const importedBudget = JSON.parse(metaMap['budget_json'] || '{}');

          // Merge store: imported base + any local rows not already present
          const merged = { ...importedStore };
          Object.entries(store).forEach(([m, rs]) => {
            if (merged[m]) {
              merged[m] = [...merged[m], ...rs.filter(r =>
                !merged[m].some(ir => ir.name === r.name && ir.amount === r.amount && ir.date === r.date)
              )];
            } else {
              merged[m] = rs;
            }
          });
          replaceStore(merged);

          // Merge budget: local wins over imported for same month key
          budget = { ...importedBudget, ...budget };
          saveBudget(budget);

          // Restore budget field for current month
          const mk = monthInput.value || todayMonthKey();
          const savedB = getBudgetForMonth(mk);
          if (savedB > 0) {
            budgetTotalInput.value = savedB.toLocaleString('id-ID');
          }
          updateRemainingDisplay(mk);

          const txCount = Object.values(merged).reduce((s, a) => s + a.length, 0);
          const budgetMonths = Object.keys(importedBudget).length;
          setUploadStatus(`✅ Berhasil diimpor: ${txCount} transaksi, ${budgetMonths} anggaran bulan.`);
          showNotif('ok', `📥 Data dari <strong>${file.name}</strong> berhasil digabungkan (termasuk anggaran).`, true);
          return;
        }
      }

      // Fallback: parse Transaksi sheet manually
      if (!wb.SheetNames.includes('Transaksi')) {
        showNotif('danger', 'Format file tidak dikenali. Gunakan file yang diunduh dari Expense Analyzer.', true);
        return;
      }
      const ws = wb.Sheets['Transaksi'];
      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      let imported = 0;
      for (let i = 1; i < rawRows.length; i++) {
        const [no, name, amount, category, date] = rawRows[i];
        if (!name || !amount || String(name).toUpperCase().includes('TOTAL')) continue;
        const monthKey = date || todayMonthKey();
        addRows(monthKey, [{ name: String(name), amount: +amount, category: String(category) || 'Lain-lain', date: monthKey }]);
        imported++;
      }
      setUploadStatus(`✅ Berhasil mengimpor ${imported} transaksi.`);
      showNotif('ok', `📥 ${imported} transaksi dari <strong>${file.name}</strong> berhasil diimpor.`, true);
    } catch (err) {
      showNotif('danger', 'Gagal membaca file: ' + err.message, true);
    }
  };
  reader.readAsArrayBuffer(file);
}

function setUploadStatus(msg) {
  const el = document.getElementById('upload-status');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

// Bind upload inputs (both header button + drop zone)
document.getElementById('upload-excel-input').addEventListener('change', e => handleExcelUpload(e.target.files[0]));
document.getElementById('upload-excel-drop').addEventListener('change',  e => handleExcelUpload(e.target.files[0]));

// Drag & drop onto upload zone label
const uploadLabel = document.querySelector('label[for="upload-excel-drop"]');
uploadLabel.addEventListener('dragover', e => { e.preventDefault(); uploadLabel.style.borderColor = '#e8380d'; });
uploadLabel.addEventListener('dragleave', () => { uploadLabel.style.borderColor = ''; });
uploadLabel.addEventListener('drop', e => {
  e.preventDefault();
  uploadLabel.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file) handleExcelUpload(file);
});

// ═══════════════════════════════════════════════════════════════════
// 15. INIT
// ═══════════════════════════════════════════════════════════════════

(function init() {
  // Restore saved budget for current month into the field on load
  const mk = monthInput.value || todayMonthKey();
  const savedB = getBudgetForMonth(mk);
  if (savedB > 0) {
    budgetTotalInput.value = savedB.toLocaleString('id-ID');
  }
  updateRemainingDisplay(mk);

  // If we already have data, show dashboard on load
  if (allMonths().length > 0) {
    document.querySelector('[data-tab="tab-dashboard"]').click();
  }

  // Show budget alerts for latest month on load
  const months = allMonths();
  if (months.length) {
    buildBudgetAlerts(months[months.length - 1]).forEach(a => showNotif(a.type, a.msg));
  }
})();
