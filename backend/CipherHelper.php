<?php
/**
 * CipherHelper.php
 * =============================================================
 * CORE ENCRYPTION MODULE - Sistem Informasi Klinik
 * =============================================================
 * 
 * Modul ini mengimplementasikan enkripsi Stream Cipher ChaCha20
 * dengan KUNCI DINAMIS yang dihasilkan dari komponen jaringan:
 *   - MAC Address Server
 *   - IP Address Client
 * 
 * Algoritma: ChaCha20 (via OpenSSL)
 * Key Generation: SHA-256(MAC_Server + IP_Client)
 * 
 * ALUR ENKRIPSI:
 *   plaintext → [ChaCha20 Encrypt dengan key jaringan] → base64(iv:ciphertext) → database
 * 
 * ALUR DEKRIPSI:
 *   database → base64_decode → split iv:ciphertext → [ChaCha20 Decrypt] → plaintext
 * =============================================================
 */

class CipherHelper
{
    /**
     * Nama cipher yang digunakan oleh OpenSSL.
     * 'chacha20' adalah stream cipher modern yang aman dan cepat.
     * Tidak membutuhkan padding seperti block cipher (AES-CBC).
     */
    private const CIPHER_METHOD = 'chacha20';

    /**
     * Panjang IV (Initialization Vector / Nonce) untuk ChaCha20.
     * PHP OpenSSL 'chacha20' membutuhkan IV 128-bit = 16 byte.
     * (12 byte nonce + 4 byte counter, sesuai struktur internal ChaCha20)
     */
    private const IV_LENGTH = 16; // bytes (128 bit)

    /**
     * Separator untuk memisahkan IV dan ciphertext dalam string yang disimpan.
     */
    private const SEPARATOR = ':';

    // =========================================================
    // BAGIAN 1: PENGAMBILAN KOMPONEN JARINGAN
    // =========================================================

    /**
     * getMacAddress()
     * ---------------------------------------------------------
     * Mengambil MAC Address dari antarmuka jaringan server/host.
     * Metode berbeda digunakan berdasarkan sistem operasi.
     * 
     * Pada Windows: Menggunakan perintah `getmac`
     * Pada Linux/Mac: Menggunakan perintah `ip link` atau `ifconfig`
     * 
     * @return string MAC Address dalam format "XX:XX:XX:XX:XX:XX" atau fallback
     */
    public static function getMacAddress(): string
    {
        $mac = '';

        // Cek apakah fungsi shell_exec tersedia (bisa dinonaktifkan di php.ini)
        if (!function_exists('shell_exec')) {
            // Fallback: gunakan hostname server sebagai pengganti MAC
            error_log('[CipherHelper] shell_exec tidak tersedia. Menggunakan fallback hostname.');
            return gethostname() ?: 'fallback-mac-unknown';
        }

        try {
            if (PHP_OS_FAMILY === 'Windows') {
                // ---- Windows ----
                // Perintah `getmac /fo csv /nh` menghasilkan output CSV
                // Contoh output: "C0-FF-EE-00-11-22","\Device\Tcpip_{...}"
                $output = shell_exec('getmac /fo csv /nh 2>nul');

                if ($output) {
                    // Ambil baris pertama (antarmuka jaringan utama)
                    $lines = explode("\n", trim($output));
                    if (!empty($lines[0])) {
                        // Parsing: ambil kolom pertama (MAC address)
                        $parts = str_getcsv($lines[0]);
                        if (!empty($parts[0])) {
                            // Normalisasi format: ganti '-' dengan ':' → XX:XX:XX:XX:XX:XX
                            $mac = str_replace('-', ':', strtoupper(trim($parts[0])));
                        }
                    }
                }
            } else {
                // ---- Linux / macOS ----
                // Coba `ip link show` terlebih dahulu (modern Linux)
                $output = shell_exec("ip link show 2>/dev/null | grep -E 'link/ether' | awk '{print $2}' | head -1");

                if (empty(trim($output ?? ''))) {
                    // Fallback ke `ifconfig` jika `ip` tidak tersedia (macOS, BSD)
                    $output = shell_exec("ifconfig 2>/dev/null | grep -E 'ether|HWaddr' | awk '{print $2}' | head -1");
                }

                if ($output) {
                    $mac = strtoupper(trim($output));
                }
            }
        } catch (\Throwable $e) {
            error_log('[CipherHelper] Error saat mengambil MAC Address: ' . $e->getMessage());
        }

        // Validasi format MAC Address (XX:XX:XX:XX:XX:XX atau XX-XX-XX-XX-XX-XX)
        if (!empty($mac) && preg_match('/^([0-9A-F]{2}[:\-]){5}[0-9A-F]{2}$/i', $mac)) {
            return strtoupper($mac);
        }

        // Fallback terakhir: gunakan kombinasi hostname + IP server
        error_log('[CipherHelper] MAC Address tidak valid atau tidak ditemukan. Menggunakan fallback.');
        $serverIp = $_SERVER['SERVER_ADDR'] ?? '127.0.0.1';
        return 'FALLBACK:' . strtoupper(md5(gethostname() . $serverIp));
    }

    /**
     * getClientIp()
     * ---------------------------------------------------------
     * Mengambil IP Address dari client yang mengirim request HTTP.
     * Mempertimbangkan kemungkinan client berada di balik proxy/load balancer.
     * 
     * @return string IP Address client
     */
    public static function getClientIp(): string
    {
        // Cek header proxy yang umum (berurutan dari paling spesifik)
        $ipHeaders = [
            'HTTP_CF_CONNECTING_IP',   // Cloudflare
            'HTTP_X_REAL_IP',          // Nginx proxy
            'HTTP_X_FORWARDED_FOR',    // Proxy standar (bisa berisi chain IP)
            'HTTP_CLIENT_IP',          // Proxy alternatif
            'REMOTE_ADDR',             // IP langsung (paling reliable jika tidak ada proxy)
        ];

        foreach ($ipHeaders as $header) {
            if (!empty($_SERVER[$header])) {
                // X-Forwarded-For bisa berisi chain: "client, proxy1, proxy2"
                // Ambil IP pertama (IP client yang sebenarnya)
                $ip = trim(explode(',', $_SERVER[$header])[0]);

                // Validasi apakah string tersebut adalah IP yang valid
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        // Fallback ke REMOTE_ADDR (termasuk IP private/loopback untuk development)
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }

    // =========================================================
    // BAGIAN 2: GENERASI KUNCI DINAMIS
    // =========================================================

    /**
     * generateKey()
     * ---------------------------------------------------------
     * FUNGSI UTAMA GENERASI KUNCI ENKRIPSI
     * 
     * Proses:
     *   1. Ambil MAC Address server  → "C0:FF:EE:00:11:22"
     *   2. Ambil IP Address client   → "192.168.1.100"
     *   3. Gabungkan: "C0:FF:EE:00:11:22192.168.1.100"
     *   4. Hash SHA-256 → 64 char hex string
     *   5. Ambil 32 byte pertama dari raw binary hash
     * 
     * Hasilnya adalah kunci 256-bit (32 byte) yang:
     *   - UNIK per kombinasi server+client
     *   - KONSISTEN: request berulang dengan MAC+IP sama → key sama
     *   - TIDAK hardcoded di kode
     * 
     * @return string Binary string 32 byte sebagai kunci ChaCha20
     */
    public static function generateKey(): string
    {
        // Langkah 1 & 2: Ambil komponen jaringan
        $macAddress = self::getMacAddress();
        $clientIp   = self::getClientIp();

        // Logging untuk debugging (hapus/nonaktifkan di production)
        error_log(sprintf(
            '[CipherHelper] Key Generation - MAC: %s | Client IP: %s',
            $macAddress,
            $clientIp
        ));

        // Langkah 3: Gabungkan MAC dan IP
        $keyMaterial = $macAddress . $clientIp;

        // Langkah 4 & 5: Hash SHA-256 dan ambil raw binary (32 byte = 256 bit)
        // hash('sha256', $data, true) → parameter `true` mengembalikan raw binary
        $key = hash('sha256', $keyMaterial, true);

        // Verifikasi panjang kunci (must be exactly 32 bytes for ChaCha20-256)
        if (strlen($key) !== 32) {
            throw new \RuntimeException('[CipherHelper] Kunci yang dihasilkan tidak valid (bukan 32 byte).');
        }

        return $key;
    }

    // =========================================================
    // BAGIAN 3: ENKRIPSI & DEKRIPSI ChaCha20
    // =========================================================

    /**
     * encrypt()
     * ---------------------------------------------------------
     * Mengenkripsi plaintext menggunakan ChaCha20 Stream Cipher.
     * 
     * Format output yang disimpan ke database:
     *   base64_encode(IV) + SEPARATOR + base64_encode(ciphertext)
     *   Contoh: "dGVzdC1pdg==:ZW5jcnlwdGVkLWRhdGE="
     * 
     * Mengapa IV disimpan bersama ciphertext?
     *   - IV tidak rahasia, tapi harus UNIK setiap enkripsi
     *   - Diperlukan saat dekripsi untuk menghasilkan keystream yang sama
     * 
     * @param string $plaintext  Data asli yang akan dienkripsi
     * @return string            Ciphertext dalam format "base64(iv):base64(data)"
     * @throws \RuntimeException Jika enkripsi gagal
     */
    public static function encrypt(string $plaintext): string
    {
        // Generate kunci dari komponen jaringan
        $key = self::generateKey();

        // Generate IV (Nonce) secara acak dan kriptografis aman
        // random_bytes() menggunakan CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
        $iv = random_bytes(self::IV_LENGTH);

        // Enkripsi menggunakan OpenSSL ChaCha20
        // openssl_encrypt(data, method, key, options, iv)
        // OPENSSL_RAW_DATA = 0 → output raw binary (bukan base64 otomatis dari openssl)
        $ciphertext = openssl_encrypt(
            $plaintext,         // Data yang dienkripsi
            self::CIPHER_METHOD, // 'chacha20'
            $key,               // Kunci 32 byte dari SHA-256(MAC+IP)
            OPENSSL_RAW_DATA,   // Flag: output raw binary
            $iv                 // Nonce 12 byte
        );

        if ($ciphertext === false) {
            $error = openssl_error_string();
            throw new \RuntimeException('[CipherHelper] Enkripsi gagal: ' . $error);
        }

        // Encode IV dan ciphertext ke base64 agar aman disimpan sebagai teks di database
        // Format: "base64(IV):base64(ciphertext)"
        return base64_encode($iv) . self::SEPARATOR . base64_encode($ciphertext);
    }

    /**
     * decrypt()
     * ---------------------------------------------------------
     * Mendekripsi ciphertext yang dihasilkan oleh encrypt().
     * Kunci diregenerasi dari komponen jaringan yang SAMA.
     * 
     * PENTING: Dekripsi akan HANYA berhasil jika:
     *   1. Menggunakan kunci yang sama (MAC server + IP client yang sama)
     *   2. Format ciphertext valid ("base64(iv):base64(data)")
     * 
     * @param string $encryptedData  Data terenkripsi dari database
     * @return string                Plaintext hasil dekripsi
     * @throws \RuntimeException     Jika format invalid atau dekripsi gagal
     */
    public static function decrypt(string $encryptedData): string
    {
        // Pisahkan IV dan ciphertext menggunakan separator ':'
        $parts = explode(self::SEPARATOR, $encryptedData, 2);

        if (count($parts) !== 2) {
            throw new \RuntimeException(
                '[CipherHelper] Format ciphertext tidak valid. Expected: "base64(iv):base64(data)"'
            );
        }

        // Decode IV dan ciphertext dari base64 kembali ke binary
        $iv         = base64_decode($parts[0], true);
        $ciphertext = base64_decode($parts[1], true);

        if ($iv === false || $ciphertext === false) {
            throw new \RuntimeException('[CipherHelper] Gagal mendecode base64 dari ciphertext.');
        }

        // Validasi panjang IV
        if (strlen($iv) !== self::IV_LENGTH) {
            throw new \RuntimeException(
                sprintf('[CipherHelper] Panjang IV tidak valid: %d byte (expected %d)', strlen($iv), self::IV_LENGTH)
            );
        }

        // Regenerasi kunci dari komponen jaringan yang sama
        // Key HARUS identik dengan yang digunakan saat enkripsi
        $key = self::generateKey();

        // Dekripsi menggunakan OpenSSL ChaCha20
        $plaintext = openssl_decrypt(
            $ciphertext,         // Data terenkripsi (binary)
            self::CIPHER_METHOD, // 'chacha20'
            $key,                // Kunci yang sama dengan saat enkripsi
            OPENSSL_RAW_DATA,    // Flag: input raw binary
            $iv                  // IV yang sama dengan saat enkripsi
        );

        if ($plaintext === false) {
            $error = openssl_error_string();
            throw new \RuntimeException('[CipherHelper] Dekripsi gagal: ' . $error);
        }

        return $plaintext;
    }

    // =========================================================
    // BAGIAN 4: UTILITY & INFORMASI DEBUG
    // =========================================================

    /**
     * getKeyInfo()
     * ---------------------------------------------------------
     * Mengembalikan informasi diagnostik tentang komponen kunci.
     * Gunakan HANYA untuk debugging. JANGAN expose di production API!
     * 
     * @return array Informasi komponen jaringan dan kunci (dalam hex)
     */
    public static function getKeyInfo(): array
    {
        $mac = self::getMacAddress();
        $ip  = self::getClientIp();
        $key = self::generateKey();

        return [
            'mac_address'    => $mac,
            'client_ip'      => $ip,
            'key_material'   => $mac . $ip,
            'key_sha256_hex' => bin2hex($key),  // Representasi hex dari kunci binary
            'cipher_method'  => self::CIPHER_METHOD,
            'key_length_bits'=> strlen($key) * 8,
            'iv_length_bits' => self::IV_LENGTH * 8,
        ];
    }

    /**
     * isCipherAvailable()
     * ---------------------------------------------------------
     * Memeriksa apakah ChaCha20 tersedia di instalasi OpenSSL saat ini.
     * 
     * @return bool True jika ChaCha20 didukung
     */
    public static function isCipherAvailable(): bool
    {
        return in_array(self::CIPHER_METHOD, openssl_get_cipher_methods(), true);
    }
}
