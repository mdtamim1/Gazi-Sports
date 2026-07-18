const { Client } = require('ssh2');

const conn = new Client();

const NGINX_CONFIG = `server {
    server_name gazisports24.com www.gazisports24.com;

    root /var/www/gazisports/dist;
    index index.html;

    # Serve uploaded product images directly
    location /uploads/ {
        alias /var/www/gazisports/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Proxy ALL /api/ requests to Node.js backend
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

    # Serve static frontend files, fallback to index.html for SPA
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
}`;

conn.on('ready', () => {
  console.log('✅ SSH Connected!');
  console.log('🔧 Removing old conflicting default symlink and fixing nginx config...');
  
  // Step 1: Remove old conflicting symlink, write correct config to sites-available/gazisports, symlink it
  const fixCmd = `
    # Remove conflicting old default symlink
    rm -f /etc/nginx/sites-enabled/default &&
    # Also remove the new gazisports24.com file (to avoid double conflict)
    rm -f /etc/nginx/sites-enabled/gazisports24.com &&
    # Write new correct config to sites-available
    cat > /etc/nginx/sites-available/gazisports << 'CONF'
${NGINX_CONFIG}
CONF
    # Symlink to sites-enabled
    ln -sf /etc/nginx/sites-available/gazisports /etc/nginx/sites-enabled/default &&
    echo "Config written!" &&
    nginx -t &&
    nginx -s reload &&
    echo "NGINX_OK" &&
    # Test API is now accessible
    sleep 1 &&
    echo "API TEST:" && curl -s "https://gazisports24.com/api/v1/products" | head -c 200
  `;
  
  conn.exec(fixCmd, (err, stream) => {
    if (err) { console.error('❌ Error:', err); conn.end(); return; }
    stream.on('close', (code) => {
      console.log(`\n🎉 Done! Exit code: ${code}`);
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString().trim());
    }).stderr.on('data', (data) => {
      console.log('STDERR:', data.toString().trim());
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Error:', err);
}).connect({
  host: '159.198.36.84',
  port: 22,
  username: 'root',
  password: 'g790QnH0s17QcVLywX',
  readyTimeout: 30000
});
