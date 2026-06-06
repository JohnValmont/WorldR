const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  return client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
    '$2a$10$ne.nDz71nu5Ue3qrv77t7.jx2zMPeu44VGOg.ZR8XB81PordAIHmO',
    'infoforbiddengaming@gmail.com'
  ]);
}).then(res => {
  console.log(res.rowCount + ' row(s) updated');
  client.end();
}).catch(err => {
  console.error(err);
  client.end();
});
