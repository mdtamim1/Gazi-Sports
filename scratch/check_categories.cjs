const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
});

db.all("SELECT setting_key, setting_value FROM system_settings WHERE setting_key = 'storefront_config'", [], (err, rows) => {
  if (err) {
    console.error('Error executing query:', err);
    return;
  }
  if (rows && rows.length > 0) {
    const val = rows[0].setting_value;
    try {
      const config = JSON.parse(val);
      console.log('CATEGORIES:');
      console.log(JSON.stringify(config.categories, null, 2));
    } catch (e) {
      console.error('Error parsing JSON:', e);
    }
  } else {
    console.log('No storefront_config row found');
  }
  db.close();
});
