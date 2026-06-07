-- ============================================================
-- SCRIPT DATABASE: Sistem Informasi Klinik Sederhana
-- Deskripsi: Skema database dengan kolom terenkripsi (NIK & Diagnosa)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `klinik_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `klinik_db`;

-- ------------------------------------------------------------
-- Tabel: users
-- Menyimpan data akun pengguna sistem (admin, dokter, dll.)
-- Password disimpan sebagai hash bcrypt (TIDAK plaintext)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(100) NOT NULL UNIQUE,
  `password`   VARCHAR(255) NOT NULL COMMENT 'Disimpan sebagai hash bcrypt',
  `role`       ENUM('admin', 'dokter', 'perawat') NOT NULL DEFAULT 'perawat',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Tabel: dokter
-- Menyimpan data profil dokter
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dokter` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_dokter` VARCHAR(150) NOT NULL,
  `spesialis`   VARCHAR(100) NOT NULL,
  `no_hp`       VARCHAR(20)  DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Tabel: pasien
-- Field `nik` disimpan sebagai CIPHERTEXT (terenkripsi ChaCha20)
-- Format ciphertext: base64(iv + encrypted_data)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pasien` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_pasien` VARCHAR(150) NOT NULL,
  `nik`         TEXT         NOT NULL COMMENT 'TERENKRIPSI - ChaCha20 ciphertext dalam format base64',
  `no_hp`       VARCHAR(20)  DEFAULT NULL,
  `alamat`      TEXT         DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Tabel: rekam_medis
-- Field `diagnosa` disimpan sebagai CIPHERTEXT (terenkripsi ChaCha20)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rekam_medis` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pasien_id`     INT UNSIGNED NOT NULL,
  `dokter_id`     INT UNSIGNED NOT NULL,
  `tgl_kunjungan` DATE         NOT NULL,
  `diagnosa`      TEXT         NOT NULL COMMENT 'TERENKRIPSI - ChaCha20 ciphertext dalam format base64',
  `resep_obat`    TEXT         DEFAULT NULL COMMENT 'Tidak dienkripsi (data non-sensitif)',
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_rm_pasien`
    FOREIGN KEY (`pasien_id`) REFERENCES `pasien`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rm_dokter`
    FOREIGN KEY (`dokter_id`) REFERENCES `dokter`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DATA AWAL (SEED DATA)
-- ============================================================

-- Akun Admin Default
-- Password: admin123 (hash bcrypt)
INSERT INTO `users` (`username`, `password`, `role`) VALUES
('admin', '$2y$12$AyfrHCDR5AznTqQlZ7FmRulIVe1NW8.7XNqPYgg5mwRRzNHW7K7hC', 'admin');

-- Data Dokter Contoh
INSERT INTO `dokter` (`nama_dokter`, `spesialis`, `no_hp`) VALUES
('Dr. Budi Santoso, Sp.PD', 'Penyakit Dalam', '08121234001'),
('Dr. Sari Dewi, Sp.A', 'Anak', '08121234002'),
('Dr. Ahmad Fauzi, Sp.B', 'Bedah Umum', '08121234003'),
('Dr. Rina Marlina, Sp.OG', 'Obstetri & Ginekologi', '08121234004');

-- CATATAN: Data pasien & rekam_medis TIDAK diisi di sini karena
-- NIK dan Diagnosa memerlukan enkripsi dari server yang berjalan.
-- Gunakan endpoint API untuk menambah data pasien dan rekam medis.
