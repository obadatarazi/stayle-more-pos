<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'https://style.lecadeaupk.com',
    'http://style.lecadeaupk.com',
    'http://localhost:5173',
    'http://localhost:8443',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8443',
];

if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: https://style.lecadeaupk.com');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$configCandidates = [
    dirname(__DIR__, 3) . '/private/style_pos_config.php',
    dirname(__DIR__, 2) . '/private/style_pos_config.php',
    __DIR__ . '/config.local.php',
    __DIR__ . '/config.php',
];

$config = null;
foreach ($configCandidates as $path) {
    if (is_readable($path)) {
        /** @var array<string,mixed> $config */
        $config = require $path;
        break;
    }
}

if (!is_array($config)) {
    json_error('Server config missing', 500);
}

date_default_timezone_set((string)($config['timezone'] ?? 'Asia/Damascus'));

function json_ok(mixed $data = null, int $status = 200): never
{
    http_response_code($status);
    echo json_encode(
        ['ok' => true, 'data' => $data],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

function json_error(string $message, int $status = 400, mixed $details = null): never
{
    http_response_code($status);
    $payload = ['ok' => false, 'error' => $message];
    if ($details !== null) {
        $payload['details'] = $details;
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_error('Invalid JSON body', 400);
    }
    return $decoded;
}

function db_connect(array $config): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['db_host'] ?? '127.0.0.1',
        (int)($config['db_port'] ?? 3306),
        $config['db_name']
    );

    try {
        $pdo = new PDO($dsn, (string)$config['db_user'], (string)$config['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable $e) {
        json_error('Database connection failed', 500);
    }

    return $pdo;
}

function b64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode(string $data): string|false
{
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'), true);
}

function issue_token(array $user, array $config): string
{
    $payload = [
        'sub' => (int)$user['id'],
        'username' => (string)$user['username'],
        'displayName' => (string)$user['display_name'],
        'shortName' => (string)$user['short_name'],
        'iat' => time(),
        'exp' => time() + (int)($config['token_ttl'] ?? 60 * 60 * 24 * 30),
    ];
    $body = b64url_encode(json_encode($payload, JSON_UNESCAPED_UNICODE));
    $sig = b64url_encode(hash_hmac('sha256', $body, (string)$config['app_secret'], true));
    return $body . '.' . $sig;
}

function require_auth(array $config): array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(\S+)$/i', $header, $m)) {
        json_error('Unauthorized', 401);
    }

    $parts = explode('.', $m[1], 2);
    if (count($parts) !== 2) {
        json_error('Invalid token', 401);
    }

    [$body, $sig] = $parts;
    $expected = b64url_encode(hash_hmac('sha256', $body, (string)$config['app_secret'], true));
    if (!hash_equals($expected, $sig)) {
        json_error('Invalid token signature', 401);
    }

    $json = b64url_decode($body);
    if ($json === false) {
        json_error('Invalid token payload', 401);
    }
    $payload = json_decode($json, true);
    if (!is_array($payload) || empty($payload['exp']) || time() > (int)$payload['exp']) {
        json_error('Token expired', 401);
    }

    return $payload;
}

function map_product(array $row): array
{
    return [
        'sku' => (string)$row['sku'],
        'name' => (string)($row['name'] ?? ''),
        'nameAr' => (string)$row['name_ar'],
        'category' => (string)$row['category'],
        'cost' => (float)$row['cost'],
        'price' => (float)$row['price'],
        'costUsd' => (float)($row['cost_usd'] ?? 0),
        'usdRate' => (float)($row['usd_rate'] ?? 0),
        'initialStock' => (int)$row['initial_stock'],
        'reorderLevel' => (int)$row['reorder_level'],
        'quickSale' => (bool)(int)($row['quick_sale'] ?? 0),
    ];
}

function map_sale(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'date' => (string)$row['date'],
        'sku' => (string)$row['sku'],
        'quantity' => (int)$row['quantity'],
        'unitPrice' => $row['unit_price'] === null ? null : (float)$row['unit_price'],
        'unitCost' => !isset($row['unit_cost']) || $row['unit_cost'] === null ? null : (float)$row['unit_cost'],
        'unitCostUsd' => !isset($row['unit_cost_usd']) || $row['unit_cost_usd'] === null ? null : (float)$row['unit_cost_usd'],
        'soldBy' => isset($row['sold_by']) && $row['sold_by'] !== null && $row['sold_by'] !== ''
            ? (string)$row['sold_by']
            : null,
        'soldByName' => isset($row['sold_by_name']) && $row['sold_by_name'] !== null && $row['sold_by_name'] !== ''
            ? (string)$row['sold_by_name']
            : null,
    ];
}

function map_expense(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'category' => (string)$row['category'],
        'categoryAr' => (string)$row['category_ar'],
        'amount' => (float)$row['amount'],
        'dueDate' => (string)$row['due_date'],
    ];
}

function fetch_store(PDO $pdo): array
{
    $products = $pdo->query('SELECT * FROM products ORDER BY name_ar ASC')->fetchAll();
    $sales = $pdo->query('SELECT * FROM sales ORDER BY date DESC, id DESC')->fetchAll();
    $expenses = $pdo->query('SELECT * FROM expenses ORDER BY due_date DESC, id DESC')->fetchAll();

    return [
        'products' => array_map('map_product', $products),
        'sales' => array_map('map_sale', $sales),
        'expenses' => array_map('map_expense', $expenses),
        'settings' => fetch_settings($pdo),
        'exchanges' => fetch_exchanges($pdo),
    ];
}

function map_exchange(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'date' => (string)$row['date'],
        'direction' => (string)$row['direction'],
        'sypAmount' => (float)$row['syp_amount'],
        'usdAmount' => (float)$row['usd_amount'],
        'note' => $row['note'] !== null && $row['note'] !== '' ? (string)$row['note'] : null,
        'doneBy' => $row['done_by'] !== null && $row['done_by'] !== '' ? (string)$row['done_by'] : null,
        'doneByName' => $row['done_by_name'] !== null && $row['done_by_name'] !== '' ? (string)$row['done_by_name'] : null,
    ];
}

function fetch_exchanges(PDO $pdo): array
{
    try {
        $rows = $pdo->query('SELECT * FROM exchanges ORDER BY date DESC, id DESC')->fetchAll();
    } catch (PDOException $e) {
        // Table not migrated yet: the rest of the store still loads.
        return [];
    }
    return array_map('map_exchange', $rows);
}

function upsert_exchange(PDO $pdo, array $exchange, bool $exitOnError = true): void
{
    $id = (int)($exchange['id'] ?? 0);
    $date = trim((string)($exchange['date'] ?? ''));
    $direction = (string)($exchange['direction'] ?? '');
    $sypAmount = (float)($exchange['sypAmount'] ?? $exchange['syp_amount'] ?? 0);
    $usdAmount = (float)($exchange['usdAmount'] ?? $exchange['usd_amount'] ?? 0);
    if ($id < 1 || $date === '' || !in_array($direction, ['sypToUsd', 'usdToSyp'], true) || $sypAmount <= 0 || $usdAmount <= 0) {
        if ($exitOnError) {
            json_error('Exchange id, date, direction and both amounts are required', 422);
        }
        throw new InvalidArgumentException('Exchange id, date, direction and both amounts are required');
    }

    $note = trim((string)($exchange['note'] ?? ''));
    $doneBy = trim((string)($exchange['doneBy'] ?? $exchange['done_by'] ?? ''));
    $doneByName = trim((string)($exchange['doneByName'] ?? $exchange['done_by_name'] ?? ''));
    $stmt = $pdo->prepare(
        'INSERT INTO exchanges (id, date, direction, syp_amount, usd_amount, note, done_by, done_by_name)
         VALUES (:id, :date, :direction, :syp_amount, :usd_amount, :note, :done_by, :done_by_name)
         ON DUPLICATE KEY UPDATE
           date = VALUES(date),
           direction = VALUES(direction),
           syp_amount = VALUES(syp_amount),
           usd_amount = VALUES(usd_amount),
           note = VALUES(note),
           done_by = VALUES(done_by),
           done_by_name = VALUES(done_by_name)'
    );
    $stmt->execute([
        ':id' => $id,
        ':date' => $date,
        ':direction' => $direction,
        ':syp_amount' => $sypAmount,
        ':usd_amount' => $usdAmount,
        ':note' => $note !== '' ? mb_substr($note, 0, 255) : null,
        ':done_by' => $doneBy !== '' ? $doneBy : null,
        ':done_by_name' => $doneByName !== '' ? $doneByName : null,
    ]);
}

function fetch_settings(PDO $pdo): array
{
    $rows = $pdo->query('SELECT name, value FROM settings')->fetchAll();
    $values = [];
    foreach ($rows as $row) {
        $values[(string)$row['name']] = (string)$row['value'];
    }

    return [
        'usdRate' => (float)($values['usd_rate'] ?? 0),
    ];
}

function save_settings(PDO $pdo, array $settings): void
{
    if (!isset($settings['usdRate'])) {
        return;
    }
    $usdRate = (float)$settings['usdRate'];
    if ($usdRate < 0) {
        json_error('usdRate must be positive', 422);
    }
    $stmt = $pdo->prepare(
        'INSERT INTO settings (name, value) VALUES (:name, :value)
         ON DUPLICATE KEY UPDATE value = VALUES(value)'
    );
    $stmt->execute([':name' => 'usd_rate', ':value' => (string)$usdRate]);
}

function upsert_product(PDO $pdo, array $product, bool $exitOnError = true): void
{
    $sku = trim((string)($product['sku'] ?? ''));
    $nameAr = trim((string)($product['nameAr'] ?? $product['name_ar'] ?? ''));
    if ($sku === '' || $nameAr === '') {
        if ($exitOnError) {
            json_error('Product sku and nameAr are required', 422);
        }
        throw new InvalidArgumentException('Product sku and nameAr are required');
    }

    $stmt = $pdo->prepare(
        'INSERT INTO products (sku, name, name_ar, category, cost, price, cost_usd, usd_rate, initial_stock, reorder_level, quick_sale)
         VALUES (:sku, :name, :name_ar, :category, :cost, :price, :cost_usd, :usd_rate, :initial_stock, :reorder_level, :quick_sale)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           name_ar = VALUES(name_ar),
           category = VALUES(category),
           cost = VALUES(cost),
           price = VALUES(price),
           cost_usd = VALUES(cost_usd),
           usd_rate = VALUES(usd_rate),
           initial_stock = VALUES(initial_stock),
           reorder_level = VALUES(reorder_level),
           quick_sale = VALUES(quick_sale)'
    );

    $quickSaleRaw = $product['quickSale'] ?? $product['quick_sale'] ?? false;
    $quickSale = filter_var($quickSaleRaw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($quickSale === null) {
        $quickSale = (bool)(int)$quickSaleRaw;
    }

    $stmt->execute([
        ':sku' => $sku,
        ':name' => trim((string)($product['name'] ?? '')),
        ':name_ar' => $nameAr,
        ':category' => trim((string)($product['category'] ?? 'أخرى')) ?: 'أخرى',
        ':cost' => (float)($product['cost'] ?? 0),
        ':price' => (float)($product['price'] ?? 0),
        ':cost_usd' => (float)($product['costUsd'] ?? $product['cost_usd'] ?? 0),
        ':usd_rate' => (float)($product['usdRate'] ?? $product['usd_rate'] ?? 0),
        ':initial_stock' => (int)($product['initialStock'] ?? $product['initial_stock'] ?? 0),
        ':reorder_level' => (int)($product['reorderLevel'] ?? $product['reorder_level'] ?? 5),
        ':quick_sale' => $quickSale ? 1 : 0,
    ]);
}

function upsert_sale(PDO $pdo, array $sale, bool $exitOnError = true): void
{
    $id = (int)($sale['id'] ?? 0);
    $sku = trim((string)($sale['sku'] ?? ''));
    $date = trim((string)($sale['date'] ?? ''));
    $quantity = (int)($sale['quantity'] ?? 0);
    if ($id < 1 || $sku === '' || $date === '' || $quantity < 1) {
        if ($exitOnError) {
            json_error('Sale id, sku, date and quantity are required', 422);
        }
        throw new InvalidArgumentException('Sale id, sku, date and quantity are required');
    }

    $unitPrice = $sale['unitPrice'] ?? $sale['unit_price'] ?? null;
    $unitCost = $sale['unitCost'] ?? $sale['unit_cost'] ?? null;
    $unitCostUsd = $sale['unitCostUsd'] ?? $sale['unit_cost_usd'] ?? null;
    $soldBy = trim((string)($sale['soldBy'] ?? $sale['sold_by'] ?? ''));
    $soldByName = trim((string)($sale['soldByName'] ?? $sale['sold_by_name'] ?? ''));
    $stmt = $pdo->prepare(
        'INSERT INTO sales (id, date, sku, quantity, unit_price, unit_cost, unit_cost_usd, sold_by, sold_by_name)
         VALUES (:id, :date, :sku, :quantity, :unit_price, :unit_cost, :unit_cost_usd, :sold_by, :sold_by_name)
         ON DUPLICATE KEY UPDATE
           date = VALUES(date),
           sku = VALUES(sku),
           quantity = VALUES(quantity),
           unit_price = VALUES(unit_price),
           unit_cost = VALUES(unit_cost),
           unit_cost_usd = VALUES(unit_cost_usd),
           sold_by = VALUES(sold_by),
           sold_by_name = VALUES(sold_by_name)'
    );
    $stmt->execute([
        ':id' => $id,
        ':date' => $date,
        ':sku' => $sku,
        ':quantity' => $quantity,
        ':unit_price' => $unitPrice === null || $unitPrice === '' ? null : (float)$unitPrice,
        ':unit_cost' => $unitCost === null || $unitCost === '' ? null : (float)$unitCost,
        ':unit_cost_usd' => $unitCostUsd === null || $unitCostUsd === '' ? null : (float)$unitCostUsd,
        ':sold_by' => $soldBy !== '' ? $soldBy : null,
        ':sold_by_name' => $soldByName !== '' ? $soldByName : null,
    ]);
}

// Refuse a sale that would take stock below zero (re-saving an existing sale counts only its own change).
function assert_sale_in_stock(PDO $pdo, array $sale): void
{
    $id = (int)($sale['id'] ?? 0);
    $sku = trim((string)($sale['sku'] ?? ''));
    $quantity = (int)($sale['quantity'] ?? 0);

    $stmt = $pdo->prepare('SELECT initial_stock FROM products WHERE sku = :sku');
    $stmt->execute([':sku' => $sku]);
    $initialStock = $stmt->fetchColumn();
    if ($initialStock === false) {
        json_error('Unknown product', 422);
    }

    $stmt = $pdo->prepare('SELECT COALESCE(SUM(quantity), 0) FROM sales WHERE sku = :sku AND id <> :id');
    $stmt->execute([':sku' => $sku, ':id' => $id]);
    $soldByOthers = (int)$stmt->fetchColumn();

    if ($quantity > (int)$initialStock - $soldByOthers) {
        json_error('Out of stock', 409, ['available' => max(0, (int)$initialStock - $soldByOthers)]);
    }
}

function upsert_expense(PDO $pdo, array $expense, bool $exitOnError = true): void
{
    $id = (int)($expense['id'] ?? 0);
    $category = trim((string)($expense['category'] ?? ''));
    $categoryAr = trim((string)($expense['categoryAr'] ?? $expense['category_ar'] ?? $category));
    $amount = (float)($expense['amount'] ?? 0);
    $dueDate = trim((string)($expense['dueDate'] ?? $expense['due_date'] ?? ''));
    if ($id < 1 || $category === '' || $amount <= 0 || $dueDate === '') {
        if ($exitOnError) {
            json_error('Expense id, category, amount and dueDate are required', 422);
        }
        throw new InvalidArgumentException('Expense id, category, amount and dueDate are required');
    }

    $stmt = $pdo->prepare(
        'INSERT INTO expenses (id, category, category_ar, amount, due_date)
         VALUES (:id, :category, :category_ar, :amount, :due_date)
         ON DUPLICATE KEY UPDATE
           category = VALUES(category),
           category_ar = VALUES(category_ar),
           amount = VALUES(amount),
           due_date = VALUES(due_date)'
    );
    $stmt->execute([
        ':id' => $id,
        ':category' => $category,
        ':category_ar' => $categoryAr ?: $category,
        ':amount' => $amount,
        ':due_date' => $dueDate,
    ]);
}

function replace_store(PDO $pdo, array $store): void
{
    $products = $store['products'] ?? [];
    $sales = $store['sales'] ?? [];
    $expenses = $store['expenses'] ?? [];
    if (!is_array($products) || !is_array($sales) || !is_array($expenses)) {
        json_error('Invalid store payload', 422);
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec('DELETE FROM sales');
        $pdo->exec('DELETE FROM expenses');
        $pdo->exec('DELETE FROM products');

        foreach ($products as $product) {
            if (!is_array($product)) {
                throw new InvalidArgumentException('Invalid product row');
            }
            upsert_product($pdo, $product, false);
        }
        foreach ($sales as $sale) {
            if (!is_array($sale)) {
                throw new InvalidArgumentException('Invalid sale row');
            }
            upsert_sale($pdo, $sale, false);
        }
        foreach ($expenses as $expense) {
            if (!is_array($expense)) {
                throw new InvalidArgumentException('Invalid expense row');
            }
            upsert_expense($pdo, $expense, false);
        }
        if (isset($store['settings']) && is_array($store['settings'])) {
            save_settings($pdo, $store['settings']);
        }
        if (isset($store['exchanges']) && is_array($store['exchanges'])) {
            $pdo->exec('DELETE FROM exchanges');
            foreach ($store['exchanges'] as $exchange) {
                if (!is_array($exchange)) {
                    throw new InvalidArgumentException('Invalid exchange row');
                }
                upsert_exchange($pdo, $exchange, false);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_error('Failed to replace store', 500, $e->getMessage());
    }
}
