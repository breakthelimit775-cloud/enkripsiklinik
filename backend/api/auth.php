<?php
/**
 * auth.php - Endpoint untuk Login & Session
 * =============================================================
 * Menggunakan bcrypt untuk verifikasi password.
 * Menggunakan PHP Session untuk menyimpan state login.
 * =============================================================
 */

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); exit;
}

session_start();

require_once __DIR__ . '/../koneksi.php';

$action = $_GET['action'] ?? '';

if ($action === 'login') {
    $body = json_decode(file_get_contents('php://input'), true);
    $username = trim($body['username'] ?? '');
    $password = $body['password'] ?? '';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username dan password wajib diisi.']);
        exit;
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT id, username, password, role FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id']   = $user['id'];
        $_SESSION['username']  = $user['username'];
        $_SESSION['role']      = $user['role'];

        echo json_encode([
            'success' => true,
            'message' => 'Login berhasil.',
            'user'    => ['id' => $user['id'], 'username' => $user['username'], 'role' => $user['role']],
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Username atau password salah.']);
    }

} elseif ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logout berhasil.']);

} elseif ($action === 'me') {
    if (isset($_SESSION['user_id'])) {
        echo json_encode(['success' => true, 'user' => [
            'id'       => $_SESSION['user_id'],
            'username' => $_SESSION['username'],
            'role'     => $_SESSION['role'],
        ]]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Belum login.']);
    }

} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action tidak valid. Gunakan: login, logout, me']);
}
