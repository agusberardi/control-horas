const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

console.log('🔥 SERVER CORRECTO 🔥');

/* ---------- ROOT ---------- */
app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

/* ---------- ADD HOURS ---------- */
app.post('/add-hours', (req, res) => {
  const { user_id, date, start_time, end_time } = req.body;

  if (!user_id || !date || !start_time || !end_time) {
    return res.json({ error: 'Faltan datos' });
  }

  const [sh, sm] = start_time.split(':').map(Number);
  const [eh, em] = end_time.split(':').map(Number);

  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;

  if (endMin <= startMin) {
    endMin += 24 * 60;
  }

  const workedHours = (endMin - startMin) / 60;

db.get(
  'SELECT * FROM hours WHERE user_id = ? AND date = ?',
  [user_id, date],
  (err, existing) => {
    if (existing) {
      return res.json({ error: 'Ya existen horas cargadas para este día' });
    }

    db.get(
      'SELECT pago_hora FROM users WHERE id = ?',
      [user_id],
      (err, user) => {
        if (!user) {
          return res.json({ error: 'Usuario no encontrado' });
        }

        const money = workedHours * user.pago_hora;

        db.run(
          `
          INSERT INTO hours (user_id, date, start_time, end_time, money)
          VALUES (?, ?, ?, ?, ?)
          `,
          [user_id, date, start_time, end_time, money],
          function (err) {
            if (err) return res.json({ error: err.message });

            res.json({
              mensaje: 'Horas guardadas correctamente ✔️',
              horas: workedHours,
              dinero: money
            });
          }
        );
      }
    );
  }
);

});

/* ---------- LIST HOURS ---------- */
app.get('/list-hours', (req, res) => {
  db.all(
    'SELECT * FROM hours ORDER BY date DESC',
    [],
    (err, rows) => {
      res.json(rows);
    }
  );
});

/* ---------- HOURS BY MONTH ---------- */
app.get('/hours-by-month', (req, res) => {
  const { year, month } = req.query;

  const like = `${year}-${month}%`;

  db.all(
    `
    SELECT *, SUM(money) OVER () AS total
    FROM hours
    WHERE date LIKE ?
    ORDER BY date
    `,
    [like],
    (err, rows) => {
      const total = rows.length ? rows[0].total : 0;
      res.json({ total, registros: rows });
    }
  );
});

app.listen(3001, () => {
  console.log('Servidor en http://localhost:3001');
});
