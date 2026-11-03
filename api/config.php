<?php
/**
 * Database & Security Configuration for Syed Waleed Portfolio
 * 
 * LOCALHOST (XAMPP):
 * - Default host: localhost
 * - Default user: root
 * - Default pass: (empty)
 * - Default DB:   portfolio
 * 
 * ONLINE WEB HOSTING (cPanel / Namecheap / Hostinger / GoDaddy):
 * - Credentials can be supplied via environment variables or configured below.
 */

// Load from environment or use local defaults
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'portfolio');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_CHARSET', 'utf8mb4');

// Secret key for securing admin API endpoints (can be set in environment or server config)
define('API_SECRET_KEY', getenv('API_SECRET_KEY') ?: 'sw_admin_secure_key_2026');

// --------------------------------------------------------------------------
// RESTRICTED CORS CONFIGURATION
// Prevent arbitrary cross-origin sites from stealing confidential client leads
// --------------------------------------------------------------------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost',
    'http://127.0.0.1'
];

if (!empty($origin) && in_array(rtrim($origin, '/'), $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    // If running on custom domain / same-origin, default to same origin
    if (!empty($origin) && isset($_SERVER['HTTP_HOST']) && strpos($origin, $_SERVER['HTTP_HOST']) !== false) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header("Access-Control-Allow-Origin: http://localhost:5173");
    }
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token, x-filename, x-folder");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
