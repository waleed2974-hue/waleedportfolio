<?php
/**
 * Projects CRUD Endpoint for Online Web Hosting
 */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM `projects` ORDER BY `sort_order` ASC, `id` ASC");
        $rows = $stmt->fetchAll();
        $projects = array_map(function($r) {
            $disciplines = json_decode($r['disciplines'] ?? '[]', true) ?: [];
            $media = json_decode($r['media'] ?? '[]', true) ?: [];
            return [
                'id' => (int)$r['id'],
                'slug' => $r['slug'] ?: 'project-' . $r['id'],
                'title' => $r['title'],
                'year' => $r['year'] ?: '2026',
                'client' => $r['client'] ?: '',
                'summary' => $r['summary'] ?: ($r['description'] ?: ''),
                'impact' => $r['impact'] ?: '',
                'disciplines' => $disciplines,
                'launchUrl' => $r['launch_url'] ?: ($r['url'] ?: ''),
                'behanceUrl' => $r['behance_url'] ?: '',
                'cover' => $r['cover'] ?: ($r['image'] ?: ''),
                'media' => $media
            ];
        }, $rows);
        sendJsonResponse(['success' => true, 'projects' => $projects]);
    } catch (\Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'POST') {
    requireAdminAuth();
    $data = getJsonInput();
    if (empty($data['title'])) {
        sendJsonResponse(['success' => false, 'error' => 'Title is required'], 400);
    }

    $slug = $data['slug'] ?? strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $data['title']));
    $disciplines = json_encode($data['disciplines'] ?? []);
    $media = json_encode($data['media'] ?? []);
    $summary = $data['summary'] ?? ($data['description'] ?? '');
    $cover = $data['cover'] ?? ($data['image'] ?? '');
    $url = $data['launchUrl'] ?? ($data['url'] ?? '');

    try {
        $stmt = $pdo->prepare("
            INSERT INTO `projects`
                (`slug`, `title`, `year`, `client`, `description`, `summary`, `impact`, `disciplines`, `image`, `cover`, `url`, `launch_url`, `behance_url`, `media`)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                `title` = VALUES(`title`),
                `year` = VALUES(`year`),
                `client` = VALUES(`client`),
                `description` = VALUES(`description`),
                `summary` = VALUES(`summary`),
                `impact` = VALUES(`impact`),
                `disciplines` = VALUES(`disciplines`),
                `image` = VALUES(`image`),
                `cover` = VALUES(`cover`),
                `url` = VALUES(`url`),
                `launch_url` = VALUES(`launch_url`),
                `behance_url` = VALUES(`behance_url`),
                `media` = VALUES(`media`)
        ");
        $stmt->execute([
            $slug,
            $data['title'],
            $data['year'] ?? '2026',
            $data['client'] ?? '',
            $summary,
            $summary,
            $data['impact'] ?? '',
            $disciplines,
            $cover,
            $cover,
            $url,
            $url,
            $data['behanceUrl'] ?? '',
            $media
        ]);

        sendJsonResponse(['success' => true, 'slug' => $slug]);
    } catch (\Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

if ($method === 'DELETE') {
    requireAdminAuth();
    $slug = $_GET['slug'] ?? '';
    if (!$slug) {
        sendJsonResponse(['success' => false, 'error' => 'Slug is required'], 400);
    }
    try {
        $stmt = $pdo->prepare("DELETE FROM `projects` WHERE `slug` = ?");
        $stmt->execute([$slug]);
        sendJsonResponse(['success' => true]);
    } catch (\Exception $e) {
        sendJsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
