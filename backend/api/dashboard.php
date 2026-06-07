<?php
/**
 * dashboard.php - Statistik untuk Widget Dashboard
 */

header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); exit;
}

require_once __DIR__ . '/../koneksi.php';
require_once __DIR__ . '/../CipherHelper.php';

/**
 * Mendeteksi IPv4 lokal server (WiFi/LAN) secara otomatis.
 * - Windows: parse output `ipconfig`
 * - Linux/Mac: parse output `hostname -I`
 * - Fallback: SERVER_ADDR / gethostbyname
 */
function getLocalIPv4(): string {
    $ips = [];

    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        // Windows: gunakan ipconfig
        $output = @shell_exec('ipconfig');
        if ($output) {
            // Cari semua baris IPv4 Address
            preg_match_all('/IPv4 Address[.\s]+:\s*([\d.]+)/i', $output, $matches);
            foreach ($matches[1] as $ip) {
                // Filter: bukan loopback, bukan APIPA (169.254.x.x)
                if ($ip !== '127.0.0.1' && strpos($ip, '169.254.') !== 0) {
                    $ips[] = $ip;
                }
            }
        }
    } else {
        // Linux/Mac
        $output = @shell_exec('hostname -I 2>/dev/null');
        if ($output) {
            $parts = explode(' ', trim($output));
            foreach ($parts as $ip) {
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)
                    && $ip !== '127.0.0.1'
                    && strpos($ip, '169.254.') !== 0) {
                    $ips[] = $ip;
                }
            }
        }
    }

    if (!empty($ips)) {
        // Prioritaskan IP yang kemungkinan WiFi/LAN (192.168.x.x atau 10.x.x.x)
        foreach ($ips as $ip) {
            if (strpos($ip, '192.168.') === 0 || strpos($ip, '10.') === 0) {
                return $ip;
            }
        }
        return $ips[0];
    }

    // Fallback terakhir
    $host = @gethostname();
    if ($host) {
        $resolved = gethostbyname($host);
        if ($resolved !== $host && $resolved !== '127.0.0.1') {
            return $resolved;
        }
    }
    return $_SERVER['SERVER_ADDR'] ?? 'N/A';
}

$db = getDB();

$jumlahPasien    = $db->query('SELECT COUNT(*) FROM pasien')->fetchColumn();
$jumlahDokter    = $db->query('SELECT COUNT(*) FROM dokter')->fetchColumn();
$jumlahRekamMedis = $db->query('SELECT COUNT(*) FROM rekam_medis')->fetchColumn();

// Kunjungan hari ini
$today = date('Y-m-d');
$stmt  = $db->prepare('SELECT COUNT(*) FROM rekam_medis WHERE tgl_kunjungan = ?');
$stmt->execute([$today]);
$kunjunganHariIni = $stmt->fetchColumn();

// Info enkripsi + IP lokal WiFi/LAN
$keyInfo       = CipherHelper::getKeyInfo();
$serverLocalIP = getLocalIPv4();

echo json_encode([
    'success' => true,
    'data' => [
        'jumlah_pasien'      => (int)$jumlahPasien,
        'jumlah_dokter'      => (int)$jumlahDokter,
        'jumlah_rekam_medis' => (int)$jumlahRekamMedis,
        'kunjungan_hari_ini' => (int)$kunjunganHariIni,
        'enkripsi_info'      => [
            'mac_address'     => $keyInfo['mac_address'],
            'client_ip'       => $keyInfo['client_ip'],
            'server_local_ip' => $serverLocalIP,
            'key_material'    => $keyInfo['key_material'],
            'key_sha256_hex'  => $keyInfo['key_sha256_hex'],
            'cipher'          => $keyInfo['cipher_method'],
            'key_length'      => $keyInfo['key_length_bits'] . ' bit',
            'algoritma_key'   => 'SHA-256(MAC_Server || IP_Client)',
        ],
    ],
]);
