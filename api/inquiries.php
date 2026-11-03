<?php
/**
 * Inquiries Endpoint for Online Web Hosting
 */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Restrict reading customer inquiries to authenticated administrator only
    requireAdminAuth();

    try {
        $stmt = $pdo->query("SELECT * FROM `inquiries` ORDER BY `created_at` DESC");
        $rows = $stmt->fetchAll();
        $inquiries = array_map(function($r) {
            return [
                'id' => $r['id'],
                'name' => htmlspecialchars($r['name'] ?? '', ENT_QUOTES, 'UTF-8'),
                'email' => htmlspecialchars($r['email'] ?? '', ENT_QUOTES, 'UTF-8'),
                'budget' => htmlspecialchars($r['budget'] ?? '', ENT_QUOTES, 'UTF-8'),
                'types' => json_decode($r['types'] ?? '[]', true) ?: [],
                'message' => htmlspecialchars($r['message'] ?? '', ENT_QUOTES, 'UTF-8'),
                'status' => htmlspecialchars($r['status'] ?? 'new', ENT_QUOTES, 'UTF-8'),
                'timestamp' => $r['created_at']
            ];
        }, $rows);
        sendJsonResponse(['success' => true, 'inquiries' => $inquiries]);
    } catch (\Exception $e) {
        error_log('[Inquiries Fetch Error] ' . $e->getMessage());
        sendJsonResponse(['success' => false, 'error' => 'Failed to retrieve inquiries'], 500);
    }
}

if ($method === 'POST') {
    $data = getJsonInput();
    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    
    if (empty($name) || empty($email)) {
        sendJsonResponse(['success' => false, 'error' => 'Name and email are required'], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendJsonResponse(['success' => false, 'error' => 'Please provide a valid email address'], 400);
    }

    // Cryptographically random unique identifier
    $id = 'inq_' . time() . '_' . bin2hex(random_bytes(6));
    $types = json_encode(array_slice($data['types'] ?? [], 0, 10));
    $budget = substr(trim($data['budget'] ?? ''), 0, 50);
    $message = substr(trim($data['message'] ?? ''), 0, 3000);

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `inquiries` (`id`, `name`, `email`, `budget`, `types`, `message`, `status`)
            VALUES (?, ?, ?, ?, ?, ?, 'new')
        ");
        $stmt->execute([
            $id,
            $name,
            $email,
            $budget,
            $types,
            $message
        ]);

        sendJsonResponse(['success' => true, 'id' => $id]);
    } catch (\Exception $e) {
        error_log('[Inquiries Save Error] ' . $e->getMessage());
        sendJsonResponse(['success' => false, 'error' => 'Failed to save inquiry'], 500);
    }
}
