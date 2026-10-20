<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

/** @var array<string,mixed> $config */

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$uri = rawurldecode($uri);

// Support both /api/... and /api/index.php/...
$path = preg_replace('#^/api(?:/index\.php)?#', '', $uri) ?? '';
$path = '/' . trim((string)$path, '/');
if ($path === '/') {
    $path = '/';
}

try {
    $pdo = db_connect($config);

    if ($method === 'GET' && ($path === '/' || $path === '/health')) {
        json_ok([
            'service' => 'style-more-pos',
            'status' => 'ok',
            'time' => date('c'),
            'php' => PHP_VERSION,
        ]);
    }

    if ($method === 'POST' && $path === '/login') {
        $body = read_json_body();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');
        if ($username === '' || $password === '') {
            json_error('Username and password are required', 422);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = :username LIMIT 1');
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, (string)$user['password_hash'])) {
            json_error('Invalid credentials', 401);
        }

        json_ok([
            'token' => issue_token($user, $config),
            'user' => [
                'username' => (string)$user['username'],
                'displayName' => (string)$user['display_name'],
                'shortName' => (string)$user['short_name'],
            ],
        ]);
    }

    if ($method === 'GET' && $path === '/me') {
        $auth = require_auth($config);
        json_ok([
            'username' => (string)$auth['username'],
            'displayName' => (string)$auth['displayName'],
            'shortName' => (string)$auth['shortName'],
        ]);
    }

    if ($method === 'GET' && $path === '/store') {
        require_auth($config);
        json_ok(fetch_store($pdo));
    }

    if ($method === 'PUT' && $path === '/store') {
        require_auth($config);
        $body = read_json_body();
        replace_store($pdo, $body);
        json_ok(fetch_store($pdo));
    }

    if ($method === 'PUT' && $path === '/settings') {
        require_auth($config);
        $body = read_json_body();
        save_settings($pdo, $body);
        json_ok(fetch_settings($pdo));
    }

    if ($method === 'POST' && $path === '/products') {
        require_auth($config);
        $body = read_json_body();
        upsert_product($pdo, $body);
        json_ok(['saved' => true]);
    }

    if ($method === 'POST' && $path === '/sales') {
        require_auth($config);
        $body = read_json_body();
        assert_sale_in_stock($pdo, $body);
        upsert_sale($pdo, $body);
        json_ok(['saved' => true]);
    }

    if ($method === 'DELETE' && preg_match('#^/sales/(\d+)$#', $path, $m)) {
        require_auth($config);
        $stmt = $pdo->prepare('DELETE FROM sales WHERE id = :id');
        $stmt->execute([':id' => (int)$m[1]]);
        json_ok(['deleted' => $stmt->rowCount() > 0]);
    }

    if ($method === 'POST' && $path === '/exchanges') {
        require_auth($config);
        $body = read_json_body();
        upsert_exchange($pdo, $body);
        json_ok(['saved' => true]);
    }

    if ($method === 'DELETE' && preg_match('#^/exchanges/(\d+)$#', $path, $m)) {
        require_auth($config);
        $stmt = $pdo->prepare('DELETE FROM exchanges WHERE id = :id');
        $stmt->execute([':id' => (int)$m[1]]);
        json_ok(['deleted' => $stmt->rowCount() > 0]);
    }

    if ($method === 'POST' && $path === '/expenses') {
        require_auth($config);
        $body = read_json_body();
        upsert_expense($pdo, $body);
        json_ok(['saved' => true]);
    }

    if ($method === 'DELETE' && preg_match('#^/expenses/(\d+)$#', $path, $m)) {
        require_auth($config);
        $stmt = $pdo->prepare('DELETE FROM expenses WHERE id = :id');
        $stmt->execute([':id' => (int)$m[1]]);
        json_ok(['deleted' => $stmt->rowCount() > 0]);
    }

    json_error('Not found', 404, ['method' => $method, 'path' => $path]);
} catch (Throwable $e) {
    json_error('Server error', 500, $e->getMessage());
}
