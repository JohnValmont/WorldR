const { Client } = require('pg');
const jwt = require('jsonwebtoken');

const client = new Client('postgres://postgres:postgres@localhost:5432/worldr_db');
client.connect()
  .then(() => client.query("SELECT owner_character_id FROM companies WHERE id = '0c564fdf-ee01-4ad2-b123-50df61e73093' LIMIT 1"))
  .then(res => {
    const charId = res.rows[0].owner_character_id;
    return client.query("SELECT user_id FROM characters WHERE id = $1 LIMIT 1", [charId]);
  })
  .then(res => {
    const userId = res.rows[0].user_id;
    const token = jwt.sign({ userId }, 'worldr_access_secret_dev_key_at_least_32_chars_long', { expiresIn: '1y' });
    console.log('TOKEN:', token);
    process.exit(0);
  })
  .catch(e => { console.error(e); process.exit(1); });
