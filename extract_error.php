<?php
$logPath = 'storage/logs/laravel.log';
$outputPath = 'last_error.txt';

if (file_exists($logPath)) {
    $lines = file($logPath);
    $lastError = "";
    $found = false;
    for ($i = count($lines) - 1; $i >= 0; $i--) {
        if (strpos($lines[$i], 'local.ERROR') !== false) {
            for ($j = $i; $j < min($i + 50, count($lines)); $j++) {
                $lastError .= $lines[$j];
            }
            $found = true;
            break;
        }
    }
    file_put_contents($outputPath, $found ? $lastError : "No error found.");
} else {
    file_put_contents($outputPath, "Log file not found.");
}
