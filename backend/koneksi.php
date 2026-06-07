<?php
// Pastikan PHP error/warning TIDAK keluar ke response (agar JSON tidak terkontaminasi)
// Error tetap dicatat di log PHP server
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
/**
 * koneksi.php
 * =============================================================
 * File konfigurasi koneksi database menggunakan PDO (PHP Data Objects).
 * PDO menyediakan abstraksi akses database yang aman (prepared statements)
 * sehingga kebal terhadap SQL Injection.
 * =============================================================
 */

// -- Konfigurasi Database --
// Sesuaikan nilai-nilai ini dengan environment Anda
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'klinik_db');
define('DB_USER', 'root');        // Ganti dengan user MySQL Anda
define('DB_PASS', '');            // Ganti dengan password MySQL Anda
define('DB_CHARSET', 'utf8mb4');

/**
 * Fungsi getDB()
 * Mengembalikan instance PDO singleton (satu koneksi per request).
 * 
 * @return PDO Instance koneksi PDO
 * @throws PDOException Jika koneksi gagal
 */
function getDB(): PDO {
    static $pdo = null; // Static agar hanya dibuat sekali per request

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,  // Lempar exception saat error
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,        // Fetch sebagai associative array
            PDO::ATTR_EMULATE_PREPARES   => false,                    // Gunakan prepared statements native
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Di production, log error ini dan tampilkan pesan generik
            http_response_code(500);
            die(json_encode([
                'success' => false,
                'message' => 'Koneksi database gagal. Hubungi administrator.',
                // 'debug'   => $e->getMessage(), // Uncomment hanya untuk debugging
            ]));
        }
    }

    return $pdo;
}
