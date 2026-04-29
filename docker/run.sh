#!/bin/sh

# Handle SSL CA certificate if provided via environment variable
if [ -n "$MYSQL_CA_CERT" ]; then
    echo "Writing SSL CA certificate to /var/www/storage/app/ca.pem..."
    echo "$MYSQL_CA_CERT" > /var/www/storage/app/ca.pem
    export MYSQL_ATTR_SSL_CA=/var/www/storage/app/ca.pem
fi

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Clear and cache configs
echo "Caching configurations..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start Supervisor (which starts PHP-FPM and Nginx)
echo "Starting supervisor..."
/usr/bin/supervisord -c /etc/supervisord.conf
