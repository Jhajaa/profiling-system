# Stage 1: Build Frontend
FROM node:18-alpine as frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build Backend
FROM php:8.1-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    wget \
    git \
    unzip \
    libxml2-dev \
    libpng-dev \
    libzip-dev \
    oniguruma-dev \
    supervisor

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Get Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy project files
COPY . .

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/public/build ./public/build

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Setup permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
RUN chmod +x /var/www/docker/run.sh

# Copy Nginx config
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Expose port
EXPOSE 80

# Start command
CMD ["sh", "/var/www/docker/run.sh"]
