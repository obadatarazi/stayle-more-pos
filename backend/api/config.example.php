<?php
declare(strict_types=1);

/**
 * Copy to a private path outside public_html on the server:
 * /home/u119189099/domains/lecadeaupk.com/private/style_pos_config.php
 */
return [
    'db_host' => '127.0.0.1',
    'db_port' => 3306,
    'db_name' => 'u119189099_pos_app',
    'db_user' => 'u119189099_PoS_APP_2026',
    'db_pass' => 'CHANGE_ME',
    'app_secret' => 'CHANGE_ME_TO_LONG_RANDOM_STRING',
    'token_ttl' => 60 * 60 * 24 * 30,
    'timezone' => 'Asia/Damascus',
];
