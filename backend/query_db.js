const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dev.sqlite3', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(err.message);
  }
});

db.serialize(() => {
  db.get(`SELECT * FROM world_clock`, (err, row) => {
    if (err) {
      console.error(err.message);
    }
    console.log('World Clock:', row);
  });
  
  db.all(`SELECT * FROM pol_cycles`, (err, rows) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Political Cycles:', rows);
  });
});

db.close();
