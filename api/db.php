<?php
/**
 * PDO Database Connection & Security Helper Functions
 */

require_once __DIR__ . '/config.php';

function getDbConnection() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (\PDOException $e) {
            error_log("[Database Connection Error] " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database connection unavailable'
            ]);
            exit();
        }
    }
    return $pdo;
}

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit();
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

/**
 * Authentication Guard for Sensitive & State-Changing API Endpoints
 */
function requireAdminAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $adminToken = $headers['X-Admin-Token'] ?? $headers['x-admin-token'] ?? '';

    // Check Bearer token
    $bearerToken = '';
    if (preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
        $bearerToken = trim($matches[1]);
    }

    $provided = $bearerToken ?: $adminToken;
    $expected = API_SECRET_KEY;

    // Constant-time string comparison to prevent timing attacks
    if (empty($provided) || !hash_equals($expected, $provided)) {
        // Also allow local requests in dev environment (localhost / 127.0.0.1)
        $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
        $isLocalhost = in_array($remoteAddr, ['127.0.0.1', '::1'], true);
        
        // If not localhost or if explicitly protected, deny
        if (!$isLocalhost && !empty($expected)) {
            sendJsonResponse([
                'success' => false,
                'error' => 'Unauthorized: Valid administration token required'
            ], 401);
        }
    }
}
