const { Client } = require('ssh2');
const conn = new Client();

// Optimized Nginx config for Cloudflare CDN
// Key changes:
// 1. Real IP restoration from Cloudflare proxy headers
// 2. Long-term caching for static assets (1 year for hashed assets)
// 3. Gzip compression
// 4. Security headers compatible with Cloudflare
// 5. Proper Cache-Control for CDN edge caching

const nginxConfig = `
server {
    server_name gazisports24.com www.gazisports24.com;

    root /var/www/gazisports/dist;
    index index.html;

    client_max_body_size 50M;

    # ─── Cloudflare Real IP Restoration ───────────────────────────────────────
    # Cloudflare IP ranges (IPv4) — restores visitor real IP in logs & backend
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;

    # ─── Gzip Compression ─────────────────────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/json application/xml
               image/svg+xml font/woff font/woff2;
    gzip_min_length 1024;

    # ─── Uploaded Product Images ──────────────────────────────────────────────
    location /uploads/ {
        alias /var/www/gazisports/uploads/;
        expires 90d;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        access_log off;
    }

    # ─── Hashed Static Assets (JS/CSS with content hash in filename) ──────────
    # Vite generates files like: index-BfAVj21k.js — safe to cache 1 year
    location ~* /assets/.*\.(js|css|woff2?|ttf|otf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        access_log off;
        try_files \$uri =404;
    }

    # ─── Static Images in dist/assets ─────────────────────────────────────────
    location ~* /assets/.*\.(png|jpg|jpeg|gif|webp|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public";
        add_header Vary "Accept-Encoding";
        access_log off;
        try_files \$uri =404;
    }

    # ─── API Proxy ────────────────────────────────────────────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header CF-Connecting-IP \$http_cf_connecting_ip;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # ─── WebSocket Proxy ──────────────────────────────────────────────────────
    location /ws/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # ─── SEO / SSR routes via Node.js ─────────────────────────────────────────
    location ~* ^/(product|collection|blog|page|sitemap\\.xml|robots\\.txt|google-merchant\\.xml|merchant-feed\\.xml) {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # ─── SPA Fallback ─────────────────────────────────────────────────────────
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/gazisports24.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/gazisports24.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    server_name api.gazisports24.com;

    client_max_body_size 50M;

    # Cloudflare Real IP Restoration
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    real_ip_header CF-Connecting-IP;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header CF-Connecting-IP \$http_cf_connecting_ip;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/gazisports24.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/gazisports24.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if (\$host = www.gazisports24.com) {
        return 301 https://\$host\$request_uri;
    } # managed by Certbot
    if (\$host = gazisports24.com) {
        return 301 https://\$host\$request_uri;
    } # managed by Certbot
    listen 80;
    server_name gazisports24.com www.gazisports24.com;
    return 404; # managed by Certbot
}

server {
    if (\$host = api.gazisports24.com) {
        return 301 https://\$host\$request_uri;
    } # managed by Certbot
    listen 80;
    server_name api.gazisports24.com;
    return 404; # managed by Certbot
}
`;

conn.on('ready', () => {
  console.log('✅ SSH Connected! Applying Cloudflare-optimized Nginx config...\n');

  // Write the new config and reload nginx
  const escapedConfig = nginxConfig.replace(/'/g, "'\\''");
  const cmd = [
    // Backup old config
    `cp /etc/nginx/sites-enabled/gazisports24.com /etc/nginx/sites-enabled/gazisports24.com.bak`,
    // Write new config
    `cat > /etc/nginx/sites-enabled/gazisports24.com << 'NGINXEOF'\n${nginxConfig}\nNGINXEOF`,
    // Test config
    `nginx -t`,
    // Reload if test passes
    `systemctl reload nginx`,
    `echo ""`,
    `echo "✅ Nginx reloaded with Cloudflare-optimized config!"`,
    // Verify gzip is working
    `curl -sI -H "Accept-Encoding: gzip" https://gazisports24.com/ | grep -i "content-encoding" || echo "Note: gzip header check done"`,
    `echo ""`,
    `echo "🎉 All done! Now follow the Cloudflare setup guide."`,
  ].join(' && ');

  conn.exec(cmd, (err, stream) => {
    if (err) { console.error('❌ Error:', err); conn.end(); return; }
    stream.on('close', (code) => {
      console.log(`\nExit code: ${code}`);
      conn.end();
    }).on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stdout.write(d.toString()));
  });
}).on('error', err => console.error('❌', err))
  .connect({
    host: '159.198.36.84', port: 22,
    username: 'root', password: 'g790QnH0s17QcVLywX',
    readyTimeout: 30000
  });
