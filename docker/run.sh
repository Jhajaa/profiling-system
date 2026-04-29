#!/bin/sh

# Start PHP-FPM in the background
php-fpm -D

# Run migrations (Optional: remove if you want to run manually)
php artisan migrate --force

# Clear and cache configs
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start Nginx in the foreground
nginx -g "daemon off;"
