const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const db = new sqlite3.Database('./database.db');

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Backend control-horas OK');
});


/* ---------- TABLAS ---------- */
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

/* ---------- INIT USER ---------- */
app.get('/init-user', (req, res) => {
  db.get('SELECT * FROM users WHERE id = 1', (err, user) => {
    if (user) return res.json(user);

    db.run(
      'INSERT INTO users (name, pago_hora) VALUES (?, ?)',
      ['Agustin', 309],
      function () {
        res.json({ user_id: this.lastID });
      }
    );
  });
});

/* ---------- ADD HOURS ---------- */
app.post('/add-hours', (req, res) => {
  const { user_id, date, start_time, end_time, sector } = req.body;

  const [sh, sm] = start_time.split(':').map(Number);
  const [eh, em] = end_time.split(':').map(Number);

  let startM = sh * 60 + sm;
  let endM = eh * 60 + em;
  if (endM <= startM) endM += 1440;

  const hours = (endM - startM) / 60;

  db.get('SELECT pago_hora FROM users WHERE id = ?', [user_id], (err, user) => {
    const money = hours * user.pago_hora;

    db.run(
      `INSERT INTO hours (user_id, date, start_time, end_time, sector, money)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, date, start_time, end_time, sector, money],
      () => res.json({ dinero: money })
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
      res.json({
        total: rows.length ? rows[0].total : 0,
        registros: rows
      });
    }
  );
});

/* ---------- START ---------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});



