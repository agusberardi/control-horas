const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

/* ---------- DB ---------- */
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(express.json());

/* ---------- HEALTH CHECK ---------- */
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

/* ---------- FUNCIÓN: OBTENER O CREAR USUARIO ---------- */
function getOrCreateUser(user_id, callback) {
  db.get('SELECT * FROM users WHERE id = ?', [user_id], (err, user) => {
    if (err) return callback(err);

    if (user) return callback(null, user);

    // Si no existe, lo creamos automáticamente
    db.run(
      'INSERT INTO users (id, name, pago_hora) VALUES (?, ?, ?)',
      [user_id, 'Agustin', 309],
      function (err) {
        if (err) return callback(err);

        callback(null, {
          id: user_id,
          name: 'Agustin',
          pago_hora: 309
        });
      }
    );
  });
}

/* ---------- ADD HOURS ---------- */
app.post('/add-hours', (req, res) => {
  const { user_id, date, start_time, end_time, sector } = req.body;

  if (!user_id || !date || !start_time || !end_time || !sector) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const [sh, sm] = start_time.split(':').map(Number);
  const [eh, em] = end_time.split(':').map(Number);

  let startM = sh * 60 + sm;
  let endM = eh * 60 + em;
  if (endM <= startM) endM += 1440;

  const hours = (endM - startM) / 60;

  db.get('SELECT pago_hora FROM users WHERE id = ?', [user_id], (err, user) => {
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const money = hours * user.pago_hora;

    db.run(
      `
      INSERT INTO hours (user_id, date, start_time, end_time, sector, money)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [user_id, date, start_time, end_time, sector, money],
      function () {
        res.json({ dinero: money });
      }
    );
  });
});

/* ---------- RESUMEN POR MES DE COBRO (21 → 20) ---------- */
app.get('/hours-by-month', (req, res) => {
  const { year, month } = req.query;
  const target = `${year}-${month}`;

  db.all(
    `
    SELECT *,
      CASE
        WHEN CAST(strftime('%d', date) AS INTEGER) <= 20
          THEN strftime('%Y-%m', date, '+1 month')
        ELSE
          strftime('%Y-%m', date, '+2 month')
      END AS mes_cobro
    FROM hours
    ORDER BY date
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const registros = rows.filter(r => r.mes_cobro === target);
      const total = registros.reduce((sum, r) => sum + r.money, 0);

      res.json({ total, registros });
    }
  );
});

/* ---------- DELETE HOUR ---------- */
app.delete('/delete-hour/:id', (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM hours WHERE id = ?',
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }
      res.json({ ok: true });
    }
  );
});

/* ---------- START (RENDER) ---------- */
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Servidor backend corriendo en Render');
});
