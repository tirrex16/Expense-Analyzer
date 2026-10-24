# 💸 AnalyzerSense

> Pelacak & Analis Pengeluaran Pribadi berbasis teks — input bebas, kategorisasi otomatis, visualisasi instan.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![No Build Required](https://img.shields.io/badge/build-none%20required-brightgreen.svg)](#web-ui)

---

## ✨ Highlights

- **Input bebas** — tulis pengeluaran seperti chat: `makan siang 45ribu, bensin 60rb, listrik 150.000`
- **Kategorisasi otomatis** — 5 kategori (Konsumsi, Operasional, Utilitas, Transportasi, Lain-lain)
- **Anggaran bulanan** — tetapkan 1 budget total, sistem lacak sisa & beri peringatan ⚠️
- **Visualisasi grafik** — Pie chart + Bar chart per kategori, Line chart tren bulanan
- **Multi-bulan** — data tersimpan per bulan di `localStorage`, tidak hilang saat refresh
- **Export & Import Excel** — unduh `.xlsx` (4 sheet), upload kembali untuk lanjut input
- **Zero dependency** — tidak butuh npm install untuk web UI, tidak butuh build step

---

## 🖥️ Demo

![Expense Analyzer Demo]((https://expense-analyzer-gamma.vercel.app/))

---

## 🚀 Quick Start

### Jalankan Web UI (direkomendasikan)

```bash
# Clone repositori
git clone https://github.com/tirrex16/Expense-Analyzer.git
cd Expense-Analyzer

# Jalankan server lokal
node server.js
# → Buka http://localhost:3000
```

### Jalankan via CLI

```bash
# Input langsung
node src/index.js "makan siang 45ribu, bensin 60rb, bayar listrik 150.000"

# Dari stdin (pipe)
echo "makan siang 45ribu, bensin 60rb" | node src/index.js

# Output JSON
node src/index.js --json "makan siang 45ribu, bensin 60rb"
```

### Jalankan Tests

```bash
node tests/test.js
# → 53 passed, 0 failed
```

---

## 📱 Fitur Web UI

### 📝 Tab Input
Masukkan pengeluaran dalam format bebas, pisahkan dengan koma atau baris baru. Isi anggaran bulan ini sekali — sistem otomatis menghitung sisa dan memberi peringatan.

### 📊 Tab Dashboard
- Pilih bulan yang ingin dilihat
- Progress bar anggaran dengan status ✅ / ⚠️ / ⛔
- **Pie chart** distribusi per kategori
- **Bar chart** nominal per kategori
- Tabel detail semua transaksi
- Unduh Excel / Salin Markdown

### 📈 Tab Tren
- **Line chart** total pengeluaran bulan ke bulan
- Tabel ringkasan dengan kolom delta (▲ boros / ▼ hemat)
- Membutuhkan minimal 2 bulan data

---

## 📊 Contoh Output CLI

```
| No | Barang/Jasa       | Nominal (Rp)   | Kategori     |
|----|-------------------|----------------|--------------|
| 1  | Makan Siang       | Rp 45.000      | Konsumsi     |
| 2  | Bensin            | Rp 60.000      | Transportasi |
| 3  | Listrik           | Rp 150.000     | Utilitas     |
| 4  | Kopi              | Rp 25.000      | Konsumsi     |
| 5  | Ojek Online       | Rp 18.500      | Transportasi |
| 6  | Netflix           | Rp 54.000      | Operasional  |
| 7  | Obat              | Rp 32.500      | Lain-lain    |
|    | TOTAL PENGELUARAN | **Rp 385.000** |              |
```

---

## 📂 Struktur Proyek

```
Expense-Analyzer/
├── public/
│   ├── index.html       # Web UI (single page app)
│   └── app.js           # Semua logic browser (no build step)
├── src/
│   ├── parser.js        # Teks bebas → array transaksi
│   ├── categorizer.js   # Keyword-based categorizer
│   ├── renderer.js      # Output Markdown & JSON
│   ├── analyzer.js      # Pipeline orchestrator
│   └── index.js         # CLI entry point
├── tests/
│   └── test.js          # 53 unit tests
├── server.js            # Static file server (dev)
├── package.json
└── .gitignore
```

---

## 💰 Format Nominal yang Didukung

| Input | Diparse Sebagai |
|-------|-----------------|
| `45ribu` | Rp 45.000 |
| `60rb` | Rp 60.000 |
| `25k` | Rp 25.000 |
| `150.000` | Rp 150.000 |
| `18500` | Rp 18.500 |
| `1.5jt` | Rp 1.500.000 |
| `2juta` | Rp 2.000.000 |
| `Rp 32.500` | Rp 32.500 |

---

## 🏷️ Kategori Pengeluaran

| Kategori | Contoh Item |
|----------|-------------|
| 🍜 **Konsumsi** | Makan, minum, kopi, warung, GoFood, GrabFood |
| 💻 **Operasional** | Netflix, Spotify, domain, software, ATK |
| ⚡ **Utilitas** | Listrik, air, internet, pulsa, kuota, sewa |
| 🚗 **Transportasi** | Bensin, ojek, Gojek, Grab, kereta, tol, ongkir |
| 📦 **Lain-lain** | Obat, dan item yang tidak masuk kategori lain |

---

## 📤 Export & Import Excel

File `.xlsx` yang diunduh berisi 4 sheet:

| Sheet | Isi |
|-------|-----|
| **Transaksi** | Semua item dengan kategori & bulan |
| **Ringkasan** | Total per kategori + persentase |
| **Tren Bulanan** | Perbandingan antar bulan |
| **Anggaran** | Budget vs realisasi per bulan |

Upload file Excel sebelumnya → data & anggaran **otomatis tergabung** (tidak overwrite).

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Web UI | Vanilla HTML + CSS + JavaScript (no framework) |
| Charts | Canvas API (no chart library) |
| Excel | [SheetJS (xlsx)](https://sheetjs.com/) via CDN |
| Storage | `localStorage` (browser) |
| CLI | Node.js built-in |
| Server | Node.js `http` module |

---

## 📋 Requirements

- **Node.js** v18 atau lebih baru (hanya untuk CLI & server lokal)
- **Browser modern** untuk web UI (Chrome, Firefox, Edge, Safari)
- Koneksi internet hanya diperlukan untuk memuat SheetJS (Excel export/import)

---

## 📄 License

[MIT](LICENSE) © 2025 tirrex16
