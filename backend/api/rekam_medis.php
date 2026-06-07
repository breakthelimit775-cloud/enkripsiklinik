<?php
/**
 * rekam_medis.php - REST API Endpoint untuk Modul Rekam Medis
 * =============================================================
 * Field `diagnosa` dienkripsi menggunakan ChaCha20 (CipherHelper).
 * =============================================================
 * 
 * Routes:
 *   GET    /api/rekam_medis.php          → Semua rekam medis (diagnosa terdekripsi)
 *   GET    /api/rekam_medis.php?id={id}  → Detail satu rekam medis
 *   POST   /api/rekam_medis.php          → Tambah rekam medis (diagnosa dienkripsi)
 *   DELETE /api/rekam_medis.php?id={id}  → Hapus rekam medis
 */

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../CipherHelper.php';

if (!CipherHelper::isCipherAvailable()) {
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'ChaCha20 tidak didukung.']));
}

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':    handleGet($id);    break;
    case 'POST':   handlePost();      break;
    case 'DELETE': handleDelete($id); break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method tidak diizinkan.']);
}

function handleGet(?int $id): void
{
    $db = getDB();

    try {
        if ($id !== null) {
            // Query dengan JOIN untuk mendapatkan nama pasien dan dokter
            $sql = '
                SELECT rm.*, p.nama_pasien, d.nama_dokter, d.spesialis
                FROM rekam_medis rm
                JOIN pasien p ON rm.pasien_id = p.id
                JOIN dokter d ON rm.dokter_id = d.id
                WHERE rm.id = ?
            ';
            $stmt = $db->prepare($sql);
            $stmt->execute([$id]);
            $rm = $stmt->fetch();

            if (!$rm) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Rekam medis tidak ditemukan.']);
                return;
            }

            // DEKRIPSI DIAGNOSA & RESEP OBAT
            $rm['diagnosa_cipher'] = $rm['diagnosa'];
            $rm['diagnosa'] = CipherHelper::decrypt($rm['diagnosa']);
            $rm['resep_obat_cipher'] = $rm['resep_obat'];
            $rm['resep_obat'] = CipherHelper::decrypt($rm['resep_obat']);
            echo json_encode(['success' => true, 'data' => $rm]);
        } else {
            $sql = '
                SELECT rm.*, p.nama_pasien, d.nama_dokter, d.spesialis
                FROM rekam_medis rm
                JOIN pasien p ON rm.pasien_id = p.id
                JOIN dokter d ON rm.dokter_id = d.id
                ORDER BY rm.tgl_kunjungan DESC, rm.created_at DESC
            ';
            $rms = $db->query($sql)->fetchAll();

            // DEKRIPSI DIAGNOSA & RESEP OBAT untuk semua record
            foreach ($rms as &$rm) {
                try {
                    $rm['diagnosa_cipher'] = $rm['diagnosa'];
                    $rm['diagnosa'] = CipherHelper::decrypt($rm['diagnosa']);
                    $rm['_diagnosa_encrypted_in_db'] = true;
                } catch (\Exception $e) {
                    $rm['diagnosa'] = '[GAGAL DEKRIPSI]';
                }
                
                try {
                    $rm['resep_obat_cipher'] = $rm['resep_obat'];
                    $rm['resep_obat'] = CipherHelper::decrypt($rm['resep_obat']);
                    $rm['_resep_obat_encrypted_in_db'] = true;
                } catch (\Exception $e) {
                    $rm['resep_obat'] = '[GAGAL DEKRIPSI/BUKAN CIPHERTEXT]';
                }
            }
            unset($rm);

            echo json_encode(['success' => true, 'data' => $rms]);
        }
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function handlePost(): void
{
    $db   = getDB();
    $body = json_decode(file_get_contents('php://input'), true);

    $required = ['pasien_id', 'dokter_id', 'tgl_kunjungan', 'diagnosa', 'resep_obat'];
    foreach ($required as $field) {
        if (empty($body[$field])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Field '{$field}' wajib diisi."]);
            return;
        }
    }

    try {
        // Validasi FK pasien dan dokter
        $stmtP = $db->prepare('SELECT id FROM pasien WHERE id = ?');
        $stmtP->execute([$body['pasien_id']]);
        if (!$stmtP->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Pasien tidak ditemukan.']);
            return;
        }

        $stmtD = $db->prepare('SELECT id FROM dokter WHERE id = ?');
        $stmtD->execute([$body['dokter_id']]);
        if (!$stmtD->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Dokter tidak ditemukan.']);
            return;
        }

        // ENKRIPSI DIAGNOSA & RESEP OBAT: plaintext → ciphertext sebelum disimpan ke DB
        $diagnosaEncrypted = CipherHelper::encrypt($body['diagnosa']);
        $resepEncrypted = CipherHelper::encrypt($body['resep_obat']);

        $stmt = $db->prepare(
            'INSERT INTO rekam_medis (pasien_id, dokter_id, tgl_kunjungan, diagnosa, resep_obat)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            (int)$body['pasien_id'],
            (int)$body['dokter_id'],
            $body['tgl_kunjungan'],
            $diagnosaEncrypted,  // ← Ciphertext
            $resepEncrypted,     // ← Ciphertext
        ]);

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Rekam medis berhasil disimpan.',
            'data'    => ['id' => $db->lastInsertId()],
            'encryption_info' => [
                'diagnosa_status'   => 'TERENKRIPSI (ChaCha20)',
                'resep_obat_status' => 'TERENKRIPSI (ChaCha20)',
                'key_source'        => 'SHA-256(MAC_Server + IP_Client)',
            ],
        ]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Gagal menyimpan: ' . $e->getMessage()]);
    }
}

function handleDelete(?int $id): void
{
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Parameter ID diperlukan.']);
        return;
    }

    $db = getDB();
    try {
        $stmt = $db->prepare('DELETE FROM rekam_medis WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Rekam medis tidak ditemukan.']);
            return;
        }
        echo json_encode(['success' => true, 'message' => 'Rekam medis berhasil dihapus.']);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
