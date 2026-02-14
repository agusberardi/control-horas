const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar DB:', err.message);
  } else {
    console.log('✅ Base de datos conectada');
  }
});

module.exports = db;
