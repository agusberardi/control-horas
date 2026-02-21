const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

/* ---------- SUPABASE ---------- */
const supabaseUrl = 'https://kslcypddazdiqnvnubrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbGN5cGRkYXpkaXFudm51YnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzM3OTEsImV4cCI6MjA4Njg0OTc5MX0.gjtV9KLwtCps_HwN53vUYmbd4ipwVB7WMgmFhp2Fy4I';
const supabase = createClient(supabaseUrl, supabaseKey);

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(express.json());

/* ---------- HEALTH ---------- */
app.get('/', (req, res) => {
  res.send('Backend Supabase OK');
});

/* ---------- INIT USER ---------- */
app.get('/init-user', async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', 1)
    .single();

  if (user) return res.json(user);

  const { data, error } = await supabase
    .from('users')
    .insert({ name: 'Agustin', pago_hora: 309 })
    .select()
    .single();

  if (error) return res.status(500).json(error);

  res.json(data);
});

/* ---------- ADD HOURS ---------- */
app.post('/add-hours', async (req, res) => {
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

  const { data: user } = await supabase
    .from('users')
    .select('pago_hora')
    .eq('id', user_id)
    .single();

  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const money = hours * user.pago_hora;

  const { error } = await supabase
    .from('hours')
    .insert({
      user_id,
      date,
      start_time,
      end_time,
      sector,
      money
    });

  if (error) return res.status(500).json(error);

  res.json({ dinero: money });
});

/* ---------- ✅ RESUMEN CON HORAS + DINERO ---------- */
app.get('/resumen', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id requerido' });
  }

  const { data, error } = await supabase
    .from('hours')
    .select('date, money, start_time, end_time')
    .eq('user_id', user_id);

  if (error) return res.status(500).json(error);

  const resumen = {};

  data.forEach(r => {
    const fecha = new Date(r.date);
    let year = fecha.getFullYear();
    let month = fecha.getMonth() + 1;

    // regla 21 → 20
    if (fecha.getDate() >= 21) {
      month += 1;
      if (month === 13) {
        month = 1;
        year += 1;
      }
    }

    const key = `${year}-${String(month).padStart(2, '0')}`;

    // calcular horas reales
    const [sh, sm] = r.start_time.split(':').map(Number);
    const [eh, em] = r.end_time.split(':').map(Number);

    let startM = sh * 60 + sm;
    let endM = eh * 60 + em;
    if (endM <= startM) endM += 1440;

    const hours = (endM - startM) / 60;

    if (!resumen[key]) {
      resumen[key] = { money: 0, hours: 0 };
    }

    resumen[key].money += r.money;
    resumen[key].hours += hours;
  });

  res.json(resumen);
});

/* ---------- ✅ DETALLE CORREGIDO 21 → 20 ---------- */
app.get('/hours-by-month', async (req, res) => {
  const { year, month, user_id } = req.query;

  if (!year || !month || !user_id) {
    return res.status(400).json({ error: 'Parámetros incompletos' });
  }

  const y = Number(year);
  const m = Number(month);

  // 🔥 el período de FEBRERO es:
  // 21 ENERO → 20 FEBRERO

  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;

  const start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-21`;
  const end = `${y}-${String(m).padStart(2, '0')}-20`;

  const { data, error } = await supabase
    .from('hours')
    .select('*')
    .eq('user_id', user_id)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });

  if (error) {
    return res.status(500).json(error);
  }

  const total = data.reduce((sum, h) => sum + h.money, 0);

  res.json({
    total,
    registros: data
  });
});


/* ---------- DELETE ---------- */
app.delete('/delete-hour/:id', async (req, res) => {
  const { error } = await supabase
    .from('hours')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json(error);

  res.json({ ok: true });
});

/* ---------- START ---------- */
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Servidor Supabase corriendo');
});
