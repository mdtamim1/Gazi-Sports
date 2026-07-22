const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  const query = `
    SELECT
      p.id, p.name, p.slug, p.sku, p.brand, p.category,
      p.price, p.original_price, p.image, p.rating, p.reviews,
      p.in_stock, p.published, p.stock, p.sold, p.revenue,
      p.features, p.specs, p.sizes, p.video_url,
      p.created_at,
      STRING_AGG(g.image_url, ',') AS gallery_urls
    FROM products p
    LEFT JOIN product_gallery g ON g.product_id = p.id
    GROUP BY p.id
    ORDER BY p.id DESC
    LIMIT 1;
  `;

  conn.exec(`sudo -u postgres psql -d postgres -c "${query.replace(/"/g, '\\"')}"`, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', () => conn.end())
      .on('data', d => process.stdout.write(d.toString()))
      .stderr.on('data', d => process.stdout.write(d.toString()));
  });
}).on('error', err => console.error(err))
  .connect({
    host: '159.198.36.84', port: 22,
    username: 'root', password: 'g790QnH0s17QcVLywX',
    readyTimeout: 30000
  });
