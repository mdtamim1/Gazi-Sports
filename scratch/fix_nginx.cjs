const { Client } = require('ssh2');

const conn = new Client();

const NGINX_CONFIG = `server {
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

    # Proxy ALL API requests to Node.js backend
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

    # Serve static frontend files, fallback to index.html for SPA routing
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
}`;

conn.on('ready', () => {
  console.log('✅ SSH Connected! Fixing Nginx config...');
  
  // Write the new nginx config
  const writeCmd = `cat > /etc/nginx/sites-enabled/gazisports24.com << 'NGINXEOF'\n${NGINX_CONFIG}\nNGINXEOF`;
  
  conn.exec(writeCmd, (err, stream) => {
    if (err) { console.error('❌ Error:', err); conn.end(); return; }
    
    stream.on('close', (code) => {
      if (code !== 0) {
        console.log('❌ Failed to write nginx config, exit code:', code);
        conn.end();
        return;
      }
      
      console.log('✅ Nginx config written! Testing and reloading...');
      
      // Test and reload nginx
      conn.exec('nginx -t && nginx -s reload && echo "NGINX_RELOAD_OK"', (err2, stream2) => {
        if (err2) { console.error('❌ Reload error:', err2); conn.end(); return; }
        
        stream2.on('close', (code2) => {
          console.log(`\nNginx reload exit code: ${code2}`);
          conn.end();
        }).on('data', (data) => {
          console.log(data.toString().trim());
        }).stderr.on('data', (data) => {
          console.log('STDERR:', data.toString().trim());
        });
      });
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
