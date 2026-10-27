'use strict';

/* ---------- Data (ganti dengan API/database sungguhan) ---------- */
const WILAYAH = {
  'Jawa Timur': ['Surabaya', 'Malang', 'Sidoarjo', 'Kediri', 'Jember'],
  'Jawa Tengah': ['Semarang', 'Surakarta', 'Magelang', 'Tegal'],
  'Jawa Barat': ['Bandung', 'Bekasi', 'Bogor', 'Depok'],
  'DKI Jakarta': ['Jakarta Pusat', 'Jakarta Selatan', 'Jakarta Barat'],
  'DI Yogyakarta': ['Yogyakarta', 'Sleman', 'Bantul'],
  'Bali': ['Denpasar', 'Badung', 'Gianyar']
};
const PRODI = ['Teknik Informatika', 'Sistem Informasi', 'Manajemen', 'Akuntansi', 'Teknik Sipil', 'Kedokteran'];
const PRODI_TIDAK_TERSEDIA = ['Kedokteran']; // contoh aturan bisnis #3
const MAX_FILE = 5 * 1024 * 1024;
const STORE_KEY = 'pmb_pendaftar';

/* ---------- Helper ---------- */
const $ = (id) => document.getElementById(id);
const form = $('form');
const getStore = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } };
const setStore = (v) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch {} };

function fill(select, items) {
  items.forEach((t) => select.add(new Option(t, t)));
}
fill($('provinsi'), Object.keys(WILAYAH));
fill($('prodi'), PRODI);
const thisYear = new Date().getFullYear();
fill($('lulus'), Array.from({ length: 12 }, (_, i) => String(thisYear - i)));

$('provinsi').addEventListener('change', (e) => {
  const kota = $('kota');
  kota.length = 1;
  const list = WILAYAH[e.target.value] || [];
  fill(kota, list);
  kota.disabled = !list.length;
});

/* ---------- UI kecil ---------- */
$('nik').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
  $('nikCount').textContent = e.target.value.length + '/16';
});
$('telp').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 15); });
$('tanggal').addEventListener('input', (e) => {
  const d = e.target.value.replace(/\D/g, '').slice(0, 8);
  e.target.value = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
});
$('calBtn').addEventListener('click', () => {
  const p = $('tanggalPicker');
  p.max = new Date().toISOString().slice(0, 10);
  try { p.showPicker(); } catch { p.focus(); }
});
$('tanggalPicker').addEventListener('change', (e) => {
  const [y, m, d] = e.target.value.split('-');
  if (y) $('tanggal').value = `${d}/${m}/${y}`;
});
$('pickBtn').addEventListener('click', () => $('berkas').click());
$('berkas').addEventListener('change', (e) => {
  const f = e.target.files[0];
  $('fileInfo').textContent = f ? `${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)` : 'Maksimal 5 MB';
});
$('batal').addEventListener('click', () => {
  if (confirm('Batalkan pendaftaran? Data yang sudah diisi akan hilang.')) {
    form.reset();
    window.location.href = 'index.html'; // ganti dengan halaman awal / login
  }
});

function banner(type, text) {
  $('banner').className = 'banner ' + type;
  $('bannerText').textContent = text;
  $('banner').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function setError(id, msg) {
  const el = $(id) || form.querySelector(`[name="${id}"]`);
  const field = el.closest('.field');
  field.classList.toggle('invalid', !!msg);
  field.querySelector('.err').textContent = msg || '';
  return msg;
}

/* ---------- Validasi format (tabel 2) ---------- */
function isValidDate(str) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (!m) return false;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d && dt <= new Date();
}

function validate() {
  const v = (id) => $(id).value.trim();
  const file = $('berkas').files[0];
  const results = [
    setError('nama', v('nama').length >= 3 ? '' : 'Nama lengkap harus diisi minimal 3 karakter.'),
    setError('nik', /^\d{16}$/.test(v('nik')) ? '' : 'NIK harus terdiri dari 16 digit angka.'),
    setError('tempat', v('tempat') ? '' : 'Tempat lahir harus diisi.'),
    setError('tanggal', isValidDate(v('tanggal')) ? '' : 'Tanggal lahir harus diisi dengan format yang benar.'),
    setError('jk', form.jk.value ? '' : 'Jenis kelamin harus dipilih.'),
    setError('telp', /^08\d{6,13}$/.test(v('telp')) ? '' : 'Nomor telepon harus 8–15 digit dan diawali 08.'),
    setError('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email')) ? '' : 'Format email tidak valid.'),
    setError('alamat', v('alamat') ? '' : 'Alamat lengkap harus diisi.'),
    setError('provinsi', v('provinsi') && v('kota') ? '' : 'Provinsi dan kota/kabupaten harus dipilih.'),
    setError('prodi', v('prodi') ? '' : 'Program studi harus dipilih.'),
    setError('sekolah', v('sekolah') ? '' : 'Nama sekolah harus diisi.'),
    setError('lulus', v('lulus') ? '' : 'Tahun lulus harus dipilih.'),
    setError('berkas', file && file.type === 'application/pdf' && file.size <= MAX_FILE ? '' : 'File harus berformat PDF dan ukuran maksimal 5 MB.'),
    setError('setuju', $('setuju').checked ? '' : 'Anda harus menyetujui pernyataan tersebut.')
  ];
  // field kota ikut ditandai bila provinsi/kota belum lengkap
  if (results[8]) $('kota').closest('.field').classList.add('invalid');
  else $('kota').closest('.field').classList.remove('invalid');
  return results.every((r) => !r);
}

/* ---------- Validasi aturan bisnis (tabel 3) ---------- */
function validateBisnis() {
  const store = getStore();
  const file = $('berkas').files[0];
  if (file && file.size > MAX_FILE) { setError('berkas', 'Ukuran file tidak boleh lebih dari 5 MB.'); return false; }
  if (store.some((s) => s.nik === $('nik').value.trim())) { setError('nik', 'NIK ini sudah terdaftar. Silakan gunakan NIK lain.'); return false; }
  if (store.some((s) => s.email === $('email').value.trim().toLowerCase())) { setError('email', 'Email ini sudah terdaftar. Silakan gunakan email lain.'); return false; }
  if (PRODI_TIDAK_TERSEDIA.includes($('prodi').value)) { setError('prodi', 'Program studi yang dipilih tidak tersedia.'); return false; }
  return true;
}

/* ---------- Submit ---------- */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) {
    banner('warn', 'Pastikan data yang Anda masukkan sudah benar sebelum melanjutkan.');
    const first = form.querySelector('.field.invalid input, .field.invalid select, .field.invalid textarea');
    if (first) first.focus({ preventScroll: false });
    return;
  }
  if (!validateBisnis()) {
    banner('warn', 'Pastikan data yang Anda masukkan sudah benar sebelum melanjutkan.');
    return;
  }

  const btn = form.querySelector('.primary');
  btn.disabled = true; btn.textContent = 'Memproses...';

  // TODO: ganti bagian ini dengan fetch('/api/pendaftaran', { method:'POST', body: new FormData(form) })
  await new Promise((r) => setTimeout(r, 600));
  const store = getStore();
  const no = 'REG' + thisYear + String(store.length + 1).padStart(3, '0');
  store.push({ no, nik: $('nik').value.trim(), email: $('email').value.trim().toLowerCase() });
  setStore(store);

  banner('ok', `Pendaftaran berhasil! Nomor registrasi Anda: ${no}.`);
  form.reset();
  $('nikCount').textContent = '0/16';
  $('fileInfo').textContent = 'Maksimal 5 MB';
  $('kota').length = 1; $('kota').disabled = true;
  btn.disabled = false; btn.textContent = 'Daftar';
});

/* Hapus pesan error saat pengguna mengubah isian */
form.addEventListener('input', (e) => {
  const f = e.target.closest('.field');
  if (f && f.classList.contains('invalid')) { f.classList.remove('invalid'); }
});
form.addEventListener('change', (e) => {
  const f = e.target.closest('.field');
  if (f) f.classList.remove('invalid');
});