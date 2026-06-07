# KlinikCipher — Sistem Informasi Klinik dengan Enkripsi ChaCha20

> Proyek ini dibuat sebagai demonstrasi penerapan **Stream Cipher ChaCha20** pada sistem informasi berbasis web, dengan kunci enkripsi yang dihasilkan secara otomatis dari komponen jaringan.

---

## 🔐 Konsep Enkripsi (CORE LOGIC)

### Algoritma
- **Stream Cipher**: ChaCha20 (via `openssl_encrypt`/`openssl_decrypt` PHP)
- **Ukuran Kunci**: 256 bit (32 byte)
- **Nonce/IV**: 96 bit (12 byte), random per enkripsi

### Alur Generasi Kunci Dinamis

```
MAC Address Server  ──┐
                      ├─► Concatenate ──► SHA-256 ──► KEY (32 byte)
IP Address Client   ──┘
```

1. **MAC Address Server** diambil via `shell_exec('getmac')` (Windows) atau `ip link show` (Linux)
2. **IP Client** diambil dari `$_SERVER['REMOTE_ADDR']` (dengan fallback proxy headers)
3. Keduanya digabung dan di-hash dengan **SHA-256** menghasilkan kunci 256-bit

### Field yang Dienkripsi
| Tabel | Field | Status |
|-------|-------|--------|
| `pasien` | `nik` | 🔐 ChaCha20 Encrypted |
| `rekam_medis` | `diagnosa` | 🔐 ChaCha20 Encrypted |

### Format Ciphertext di Database
```
base64(IV_12_byte) + ":" + base64(ciphertext)
Contoh: "dGVzdC1pdg==:ZW5jcnlwdGVkLWRhdGE="
```

---

## 📁 Struktur Proyek

```
enkripsiklinik/
├── database/
│   └── klinik.sql              ← Schema + seed data
│
├── backend/
│   ├── koneksi.php             ← Koneksi PDO MySQL
│   ├── CipherHelper.php        ← ⭐ Core enkripsi ChaCha20
│   ├── .htaccess               ← CORS Apache config
│   └── api/
│       ├── auth.php            ← Login/Logout/Session
│       ├── dashboard.php       ← Statistik + info enkripsi
│       ├── pasien.php          ← CRUD Pasien (NIK terenkripsi)
│       ├── dokter.php          ← CRUD Dokter
│       └── rekam_medis.php     ← CRUD Rekam Medis (diagnosa terenkripsi)
│
└── frontend/
    ├── src/
    │   ├── contexts/
    │   │   └── AuthContext.jsx
    │   ├── services/
    │   │   └── api.js          ← Axios API client
    │   ├── components/
    │   │   └── MainLayout.jsx  ← Sidebar navigation
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── PasienPage.jsx
    │   │   ├── DokterPage.jsx
    │   │   └── RekamMedisPage.jsx
    │   ├── App.jsx             ← Router + Protected Routes
    │   ├── main.jsx
    │   └── index.css           ← Design system (dark theme)
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Cara Menjalankan

### Prasyarat
- **PHP 8.0+** (dengan ekstensi `openssl` aktif)
- **MySQL 8.0+** atau MariaDB
- **Node.js 18+**
- **Web Server**: XAMPP, Laragon, atau built-in PHP server

### Langkah 1 — Setup Database
```sql
-- Import file SQL ke MySQL
mysql -u root -p < database/klinik.sql
```
Atau buka phpMyAdmin → Import → pilih `klinik.sql`

### Langkah 2 — Konfigurasi Backend
Edit `backend/koneksi.php`:
```php
define('DB_USER', 'root');    // Username MySQL Anda
define('DB_PASS', '');        // Password MySQL Anda
```

### Langkah 3 — Jalankan PHP Server
```bash
# Dari direktori backend
cd backend
php -S localhost:8000
```

Atau arahkan virtual host Apache/Nginx ke folder `backend/`.

### Langkah 4 — Jalankan Frontend
```bash
cd frontend
npm install
npm run dev
```

Akses di: **http://localhost:5173**

### Login Default
| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

---

## ✅ Verifikasi Enkripsi

Setelah menambahkan pasien, cek database langsung:
```sql
SELECT id, nama_pasien, nik FROM pasien;
```
Output kolom `nik` akan berupa ciphertext base64, contoh:
```
dGVzdC1pdg==:ABC123xyz...
```

Di Dashboard, panel **"Status Enkripsi Sistem"** menampilkan:
- MAC Address server yang terdeteksi
- IP Client saat ini
- Algoritma dan panjang kunci

---

## ⚠️ Catatan Penting

1. **PHP ChaCha20**: Pastikan `openssl_get_cipher_methods()` mengandung `'chacha20'`.  
   Cek: `php -r "var_dump(in_array('chacha20', openssl_get_cipher_methods()));"`

2. **shell_exec**: Harus aktif di `php.ini` agar MAC Address bisa diambil.  
   Jika dinonaktifkan, sistem fallback ke hostname.

3. **Konsistensi Key**: Dekripsi hanya berhasil jika IP client sama dengan saat enkripsi.  
   Hal ini normal karena kunci bersifat **per-session-jaringan**.

4. **Production**: Tambahkan autentikasi JWT/token dan HTTPS untuk keamanan penuh.
