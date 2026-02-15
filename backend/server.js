const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(express.json());

/* ---------- DB (RUTA RELATIVA SEGURA) ---------- */
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('Error abriendo DB', err);
  } else {
    console.log('SQLite conectado');
  }
});

/* ---------- HEALTH CHECK (IMPORTANTE) ---------- */
app.get('/', (req, res) => {
  res.send('Backend control-horas OK');
});

/* ---------- TABLAS ---------- */
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      pago_hora REAL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date TEXT,
      start_time TEXT,
      end_time TEXT,
      sector TEXT,
      money REAL
    )
  `);
});

/* ---------- INIT USER ---------- */
app.get('/init-user', (req, res) => {
  db.get('SELECT * FROM users WHERE id = 1', (err, user) => {
    if (err) return res.status(500).json(err);
    if (user) return res.json(user);

    db.run(
      'INSERT INTO users (name, pago_hora) VALUES (?, ?)',
      ['Agustin', 309],
      function (err) {
        if (err) return res.status(500).json(err);
        res.json({ user_id: this.lastID });
      }
    );
  });
});

/* ---------- ADD HOURS ---------- */
app.post('/add-hours', (req, res) => {
  const { user_id, date, start_time, end_time, sector } = req.body;

  if (!user_id || !date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const [sh, sm] = start_time.split(':').map(Number);
  const [eh, em] = end_time.split(':').map(Number);

  let startM = sh * 60 + sm;
  let endM = eh * 60 + em;
  if (endM <= startM) endM += 1440;

  const hours = (endM - startM) / 60;

  db.get('SELECT pago_hora FROM users WHERE id = ?', [user_id], (err, user) => {
    if (err || !user) return res.status(500).json(err || {});

    const money = hours * user.pago_hora;

    db.run(
      `INSERT INTO hours (user_id, date, start_time, end_time, sector, money)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, date, start_time, end_time, sector, money],
      err => {
        if (err) return res.status(500).json(err);
        res.json({ dinero: money });
      }
    );
  });
});

/* ---------- RESUMEN MES ---------- */
app.get('/hours-by-month', (req, res) => {
  const { year, month } = req.query;
  const ym = `${year}-${month}`;

  db.all(
    `SELECT *, SUM(money) OVER () AS total
     FROM hours
     WHERE date LIKE ?
     ORDER BY date`,
    [`${ym}%`],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json({
        total: rows.length ? rows[0].total : 0,
        registros: rows
      });
    }
  );
});

/* ---------- START (RENDER READY) ---------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});




