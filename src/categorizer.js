/**
 * categorizer.js
 * Maps a transaction item name to one of 5 fixed categories:
 *   Konsumsi | Operasional | Utilitas | Transportasi | Lain-lain
 */

const CATEGORIES = {
  Konsumsi: [
    'makan', 'minum', 'kopi', 'coffee', 'teh', 'nasi', 'ayam', 'bakso',
    'soto', 'mie', 'pizza', 'burger', 'sushi', 'roti', 'snack', 'camilan',
    'gorengan', 'es', 'juice', 'jus', 'susu', 'makanan', 'minuman',
    'lunch', 'dinner', 'breakfast', 'sarapan', 'siang', 'malam', 'resto',
    'restoran', 'warung', 'cafe', 'kafe', 'martabak', 'indomie', 'gofood',
    'grabfood', 'shopeefood', 'pecel', 'lalapan', 'bebek', 'ikan', 'seafood',
    'buah', 'sayur', 'beras', 'sembako'
  ],
  Operasional: [
    'netflix', 'spotify', 'youtube', 'streaming', 'langganan', 'subscription',
    'domain', 'hosting', 'vps', 'server', 'software', 'aplikasi', 'app',
    'google', 'microsoft', 'adobe', 'canva', 'figma', 'zoom', 'slack',
    'office', 'antivirus', 'vpn', 'cloud', 'storage', 'backup',
    'alat tulis', 'printer', 'tinta', 'kertas', 'atk', 'fotokopi',
    'administrasi', 'biaya admin', 'materai', 'perangko'
  ],
  Utilitas: [
    'listrik', 'air', 'pdam', 'pln', 'gas', 'internet', 'wifi', 'telpon',
    'telepon', 'pulsa', 'kuota', 'data', 'indihome', 'firstmedia', 'myrepublic',
    'biznet', 'isp', 'tv kabel', 'tagihan', 'token', 'meteran', 'pbb',
    'pajak', 'iuran', 'sewa', 'kontrak', 'kos', 'kosan', 'rumah'
  ],
  Transportasi: [
    'bensin', 'bbm', 'pertamax', 'pertalite', 'solar', 'premium',
    'ojek', 'gojek', 'grab', 'maxim', 'indriver', 'taxi', 'taksi',
    'bus', 'transjakarta', 'mrt', 'lrt', 'commuter', 'kereta', 'krl',
    'angkot', 'bis', 'damri', 'tol', 'parkir', 'tiket', 'pesawat',
    'lion', 'garuda', 'citilink', 'batik', 'sriwijaya', 'kapal', 'ferry',
    'service', 'servis', 'oli', 'ban', 'sparepart', 'motor', 'mobil',
    'online', 'angkutan', 'transportasi', 'ongkir', 'kirim', 'ekspedisi',
    'jne', 'jnt', 'sicepat', 'anteraja', 'pos'
  ],
};

/**
 * Returns the category for a given item name.
 * Performs case-insensitive keyword matching.
 * Falls back to 'Lain-lain' if no keyword matches.
 * @param {string} name
 * @returns {string}
 */
function categorize(name) {
  const lower = name.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }

  return 'Lain-lain';
}

module.exports = { categorize, CATEGORIES };
