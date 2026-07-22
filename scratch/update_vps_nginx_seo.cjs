const { Client } = require('ssh2');

const conn = new Client();

console.log('🔌 Connecting to VPS server 159.198.36.84 via SSH to configure Nginx SEO Proxy...');

conn.on('ready', () => {
  console.log('✅ SSH Connection Established successfully!');
  
  const nginxConfig = `
server {
    server_name gazisports24.com www.gazisports24.com;

    root /var/www/gazisports/dist;
    index index.html;

    client_max_body_size 50M;

    # Serve uploaded product images
    location /uploads/ {
        alias /var/www/gazisports/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Proxy API & WebSocket requests
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Proxy Product, Sitemap & Feed routes to Node.js backend for Server-Side SEO & Meta Card Injection
    location ~* ^/(product|collection|blog|page|sitemap\\.xml|robots\\.txt|google-merchant\\.xml|merchant-feed\\.xml) {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve static asset files directly (JS, CSS, images, fonts)
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }

    # Fallback to SPA index.html for general routes
    location / {
        try_files $uri $uri/ /index.html;
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

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/gazisports24.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/gazisports24.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.gazisports24.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot
    if ($host = gazisports24.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot
    listen 80;
    server_name gazisports24.com www.gazisports24.com;
    return 404; # managed by Certbot
}

server {
    if ($host = api.gazisports24.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot
    listen 80;
    server_name api.gazisports24.com;
    return 404; # managed by Certbot
}
  `;

  const script = `
    cat << 'EOF' > /etc/nginx/sites-available/gazisports24.com
${nginxConfig}
EOF
    ln -sf /etc/nginx/sites-available/gazisports24.com /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
  `;

  conn.exec(script, (err, stream) => {
    if (err) {
      console.error('❌ SSH Command Error:', err);
      conn.end();
      return;
    }

    let output = '';
    stream.on('close', (code, signal) => {
      console.log(`\n📋 Nginx Update Output (code ${code}):\n${output}`);
      conn.end();
    }).on('data', (data) => {
      output += data.toString();
    }).stderr.on('data', (data) => {
      output += data.toString();
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Connection Error:', err);
}).connect({
  host: '159.198.36.84',
  port: 22,
  username: 'root',
  password: 'g790QnH0s17QcVLywX',
  readyTimeout: 30000
});
