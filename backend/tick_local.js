const db = require('./src/config/db');
db('world_clock').update({ next_arc_close_at: db.raw("NOW() - INTERVAL '1 second'") }).then(() => console.log('Ticked')).finally(() => db.destroy());
