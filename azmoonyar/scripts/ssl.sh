#!/bin/bash
# ===== دریافت SSL رایگان با Let's Encrypt =====

set -e

DOMAIN="azmoonai.ir"
EMAIL="admin@azmoonai.ir"

echo "🔒 دریافت SSL برای $DOMAIN..."

# دریافت certificate
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    -d $DOMAIN \
    -d www.$DOMAIN \
    -d api.$DOMAIN

# کپی به nginx
mkdir -p /opt/azmoonyar/nginx/ssl
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/azmoonyar/nginx/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/azmoonyar/nginx/ssl/

# تنظیم تمدید خودکار
echo "0 0 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/azmoonyar/nginx/ssl/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/azmoonyar/nginx/ssl/ && docker compose -f /opt/azmoonyar/docker-compose.prod.yml restart nginx" | crontab -

echo "✅ SSL با موفقیت دریافت شد!"
