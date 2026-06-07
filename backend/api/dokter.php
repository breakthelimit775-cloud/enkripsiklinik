<?php
/**
 * dokter.php - REST API Endpoint untuk Modul Dokter
 * =============================================================
 * Data dokter tidak terenkripsi (bukan data sensitif).
 * =============================================================
 */

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); exit;
}

require_once __DIR__ . '/../koneksi.php';

$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        $db = getDB();
        if ($id) {
            $stmt = $db->prepare('SELECT * FROM dokter WHERE id = ?');
            $stmt->execute([$id]);
            $d = $stmt->fetch();
            echo json_encode($d ? ['success'=>true,'data'=>$d] : ['success'=>false,'message'=>'Tidak ditemukan.']);
        } else {
            $rows = $db->query('SELECT * FROM dokter ORDER BY nama_dokter ASC')->fetchAll();
            echo json_encode(['success'=>true,'data'=>$rows]);
        }
        break;

    case 'POST':
        $body = json_decode(file_get_contents('php://input'), true);
        if (empty($body['nama_dokter']) || empty($body['spesialis'])) {
            http_response_code(400);
            echo json_encode(['success'=>false,'message'=>'nama_dokter dan spesialis wajib diisi.']);
            break;
        }
        $db = getDB();
        $stmt = $db->prepare('INSERT INTO dokter (nama_dokter, spesialis, no_hp) VALUES (?,?,?)');
        $stmt->execute([$body['nama_dokter'], $body['spesialis'], $body['no_hp'] ?? null]);
        http_response_code(201);
        echo json_encode(['success'=>true,'message'=>'Dokter berhasil ditambahkan.','data'=>['id'=>$db->lastInsertId()]]);
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID diperlukan.']); break; }
        $db = getDB();
        $stmt = $db->prepare('DELETE FROM dokter WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode($stmt->rowCount() ? ['success'=>true,'message'=>'Dokter dihapus.'] : ['success'=>false,'message'=>'Tidak ditemukan.']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success'=>false,'message'=>'Method tidak diizinkan.']);
}
