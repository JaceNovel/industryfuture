FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader --no-scripts

FROM php:8.2-cli-alpine

RUN apk add --no-cache \
    icu-dev \
    oniguruma-dev \
    libzip-dev \
    postgresql-dev \
    unzip \
    git \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql mbstring bcmath intl

WORKDIR /var/www/html

COPY . .
COPY --from=vendor /app/vendor ./vendor

RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

EXPOSE 10000

CMD ["sh", "-c", "php artisan storage:link || true; php artisan serve --host=0.0.0.0 --port=${PORT:-10000}"]
