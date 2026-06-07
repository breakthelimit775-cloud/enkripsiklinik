<?php
/**
 * pasien.php - REST API Endpoint untuk Modul Pasien
 * =============================================================
 * Mengimplementasikan CRUD untuk data pasien.
 * Field `nik` dienkripsi menggunakan CipherHelper (ChaCha20)
 * sebelum masuk database, dan didekripsi saat diambil.
 * =============================================================
 * 
 * Routes:
 *   GET    /api/pasien.php          → Daftar semua pasien (NIK terdekripsi)
 *   GET    /api/pasien.php?id={id}  → Detail satu pasien
 *   POST   /api/pasien.php          → Tambah pasien baru (NIK dienkripsi)
 *   PUT    /api/pasien.php?id={id}  → Update data pasien
 *   DELETE /api/pasien.php?id={id}  → Hapus pasien
 */

// -- Header CORS & Content-Type --
// Izinkan akses dari origin frontend React (sesuaikan di production)
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight request (OPTIONS) untuk CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// -- Include dependensi --
require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../CipherHelper.php';

// Pastikan ChaCha20 tersedia di server ini
if (!CipherHelper::isCipherAvailable()) {
    http_response_code(500);
    die(json_encode([
        'success' => false,
        'message' => 'Cipher ChaCha20 tidak didukung oleh instalasi OpenSSL di server ini.',
    ]));
}

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

// -- Router Utama --
switch ($method) {
    case 'GET':
        handleGet($id);
        break;
    case 'POST':
        handlePost();
        break;
    case 'PUT':
        handlePut($id);
        break;
    case 'DELETE':
        handleDelete($id);
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method tidak diizinkan.']);
}

// =========================================================
// HANDLER FUNCTIONS
// =========================================================

/**
 * handleGet() - Ambil data pasien
 * NIK di database (ciphertext) → didekripsi → dikirim ke frontend
 */
function handleGet(?int $id): void
{
    $db = getDB();

    try {
        if ($id !== null) {
            // Ambil satu pasien berdasarkan ID
            $stmt = $db->prepare('SELECT * FROM pasien WHERE id = ?');
            $stmt->execute([$id]);
            $pasien = $stmt->fetch();

            if (!$pasien) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Pasien tidak ditemukan.']);
                return;
            }

            // DEKRIPSI NIK: ciphertext dari DB → plaintext untuk frontend
            $pasien['nik_cipher'] = $pasien['nik'];
            $pasien['nik'] = CipherHelper::decrypt($pasien['nik']);
            $pasien['_nik_encrypted_in_db'] = true; // Flag informatif

            echo json_encode(['success' => true, 'data' => $pasien]);
        } else {
            // Ambil semua pasien
            $stmt = $db->query('SELECT * FROM pasien ORDER BY created_at DESC');
            $pasiens = $stmt->fetchAll();

            // DEKRIPSI NIK untuk setiap record
            foreach ($pasiens as &$pasien) {
                try {
                    $pasien['nik_cipher'] = $pasien['nik'];
                    $pasien['nik'] = CipherHelper::decrypt($pasien['nik']);
                    $pasien['_nik_encrypted_in_db'] = true;
                } catch (\Exception $e) {
                    // Jika dekripsi gagal (misal data lama sebelum enkripsi diterapkan)
                    $pasien['nik'] = '[GAGAL DEKRIPSI]';
                    error_log('[pasien.php] Dekripsi NIK gagal untuk ID ' . $pasien['id'] . ': ' . $e->getMessage());
                }
            }
            unset($pasien); // Penting: lepas referensi setelah foreach by reference

            echo json_encode(['success' => true, 'data' => $pasiens]);
        }
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

/**
 * handlePost() - Tambah pasien baru
 * NIK dari frontend (plaintext) → dienkripsi → disimpan di database
 */
function handlePost(): void
{
    $db   = getDB();
    $body = json_decode(file_get_contents('php://input'), true);

    // Validasi input wajib
    $required = ['nama_pasien', 'nik', 'no_hp', 'alamat'];
    foreach ($required as $field) {
        if (empty($body[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Field '{$field}' wajib diisi."]);
            return;
        }
    }

    try {
        // ENKRIPSI NIK: plaintext dari frontend → ciphertext untuk disimpan di DB
        // Ini adalah inti dari fitur keamanan sistem ini
        $nikEncrypted = CipherHelper::encrypt($body['nik']);

        $stmt = $db->prepare(
            'INSERT INTO pasien (nama_pasien, nik, no_hp, alamat) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            $body['nama_pasien'],
            $nikEncrypted,   // ← Ciphertext, bukan plaintext
            $body['no_hp'],
            $body['alamat'],
        ]);

        $newId = $db->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'success'  => true,
            'message'  => 'Pasien berhasil ditambahkan.',
            'data'     => ['id' => $newId],
            'encryption_info' => [
                'nik_status' => 'TERENKRIPSI (ChaCha20)',
                'key_source' => 'SHA-256(MAC_Server + IP_Client)',
            ],
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Gagal menyimpan pasien: ' . $e->getMessage()]);
    }
}

/**
 * handlePut() - Update data pasien
 */
function handlePut(?int $id): void
{
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Parameter ID diperlukan.']);
        return;
    }

    $db   = getDB();
    $body = json_decode(file_get_contents('php://input'), true);

    try {
        // Cek apakah pasien ada
        $stmt = $db->prepare('SELECT id FROM pasien WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Pasien tidak ditemukan.']);
            return;
        }

        $fields = [];
        $values = [];

        if (!empty($body['nama_pasien'])) {
            $fields[] = 'nama_pasien = ?';
            $values[] = $body['nama_pasien'];
        }
        if (!empty($body['nik'])) {
            // Re-enkripsi NIK baru
            $fields[] = 'nik = ?';
            $values[] = CipherHelper::encrypt($body['nik']);
        }
        if (!empty($body['no_hp'])) {
            $fields[] = 'no_hp = ?';
            $values[] = $body['no_hp'];
        }
        if (isset($body['alamat'])) {
            $fields[] = 'alamat = ?';
            $values[] = $body['alamat'];
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Tidak ada data yang diupdate.']);
            return;
        }

        $values[] = $id;
        $sql = 'UPDATE pasien SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $db->prepare($sql)->execute($values);

        echo json_encode(['success' => true, 'message' => 'Data pasien berhasil diperbarui.']);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Gagal update: ' . $e->getMessage()]);
    }
}

/**
 * handleDelete() - Hapus pasien
 */
function handleDelete(?int $id): void
{
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Parameter ID diperlukan.']);
        return;
    }

    $db = getDB();

    try {
        $stmt = $db->prepare('DELETE FROM pasien WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Pasien tidak ditemukan.']);
            return;
        }

        echo json_encode(['success' => true, 'message' => 'Pasien berhasil dihapus.']);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Gagal menghapus: ' . $e->getMessage()]);
    }
}
