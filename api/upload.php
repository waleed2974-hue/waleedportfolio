<?php
/**
 * Media Upload Endpoint for Online Web Hosting & XAMPP
 * Accepts lossless high-res JPG, PNG, WEBP, and MP4 files.
 * Stores files in ../media/uploads/ and indexes them in MySQL.
 */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

// Enforce authentication on media uploads
requireAdminAuth();

$uploadDir = __DIR__ . '/../media/uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$fileData = null;
$origName = 'asset.jpg';
$fileSize = 0;
$mimeType = 'image/jpeg';

if (!empty($_FILES['file'])) {
    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendJsonResponse(['success' => false, 'error' => 'File upload error code: ' . $file['error']], 400);
    }
    $origName = $file['name'];
    $fileSize = $file['size'];
    $mimeType = mime_content_type($file['tmp_name']) ?: $file['type'];
    $tmpPath = $file['tmp_name'];
} else {
    // Raw binary stream support
    $rawInput = file_get_contents('php://input');
    if (empty($rawInput)) {
        sendJsonResponse(['success' => false, 'error' => 'No file data received'], 400);
    }
    $headers = getallheaders();
    $origName = isset($headers['x-filename']) ? urldecode($headers['x-filename']) : (isset($headers['X-Filename']) ? urldecode($headers['X-Filename']) : 'asset.jpg');
    $mimeType = isset($headers['Content-Type']) ? $headers['Content-Type'] : 'application/octet-stream';
    $fileSize = strlen($rawInput);
}

// Enforce maximum file size limit (60MB)
$maxFileSize = 60 * 1024 * 1024;
if ($fileSize > $maxFileSize) {
    sendJsonResponse(['success' => false, 'error' => 'File exceeds maximum upload size (60MB)'], 400);
}

// Allowed extensions strictly checked (jpg, png, webp, mp4, webm, mov) - disallows SVG script injection
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'webm', 'mov'];

if (!in_array($ext, $allowed, true)) {
    sendJsonResponse(['success' => false, 'error' => "Unsupported file type: .$ext. Allowed types are JPG, PNG, WEBP, and MP4."], 400);
}

// Generate unpredictable unique name to prevent path traversal and overwrite attacks
$cleanBase = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
$cleanBase = substr($cleanBase, 0, 40);
$uniqueName = time() . '_' . bin2hex(random_bytes(4)) . '_' . $cleanBase . '.' . $ext;
$targetPath = $uploadDir . $uniqueName;

if (isset($tmpPath)) {
    if (!move_uploaded_file($tmpPath, $targetPath)) {
        sendJsonResponse(['success' => false, 'error' => 'Failed to save file to disk'], 500);
    }
} else {
    if (file_put_contents($targetPath, $rawInput) === false) {
        sendJsonResponse(['success' => false, 'error' => 'Failed to write file stream to disk'], 500);
    }
}

// Restrict uploaded file permissions (read-only for web server, not executable)
@chmod($targetPath, 0644);

$publicUrl = '/media/uploads/' . $uniqueName;
$isVideo = in_array($ext, ['mp4', 'webm', 'mov']) || strpos($mimeType, 'video') === 0;

// Log to MySQL media table
$mediaId = null;
try {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("
        INSERT INTO `media` (`filename`, `url`, `file_path`, `file_type`, `mime_type`, `file_size`, `folder`)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $folder = isset($_REQUEST['folder']) ? $_REQUEST['folder'] : 'projects';
    $stmt->execute([
        $uniqueName,
        $publicUrl,
        $targetPath,
        $isVideo ? 'video' : 'image',
        $mimeType,
        $fileSize,
        $folder
    ]);
    $mediaId = $pdo->lastInsertId();
} catch (\Exception $e) {
    // Continue even if logging fails
}

sendJsonResponse([
    'success' => true,
    'url' => $publicUrl,
    'filename' => $uniqueName,
    'size' => $fileSize,
    'id' => $mediaId,
    'provider' => 'Local Disk + MySQL'
]);
