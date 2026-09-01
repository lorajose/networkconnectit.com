<?php
// NetworkConnectIT runtime configuration loader.
// No secret values belong in this file or anywhere in the public repository.

function nci_private_config(string $key, string $default = ''): string {
    static $config = null;

    if ($config === null) {
        $config = [];
        $accountHome = dirname(__DIR__, 2);
        $configPath = $accountHome . '/private-config/networkconnectit.php';

        if (is_file($configPath) && is_readable($configPath)) {
            $loaded = require $configPath;
            if (is_array($loaded)) {
                $config = $loaded;
            }
        }
    }

    if (!array_key_exists($key, $config)) {
        return $default;
    }

    $value = $config[$key];
    return is_scalar($value) ? trim((string)$value) : $default;
}
