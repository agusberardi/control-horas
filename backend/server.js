const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

/* ---------- SUPABASE ---------- */
const supabaseUrl = 'https://kslcypddazdiqnvnubrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbGN5cGRkYXpkaXFudm51YnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzM3OTEsImV4cCI6MjA4Njg0OTc5MX0.gjtV9KLwtCps_HwN53vUYmbd4ipwVB7WMgmFhp2Fy4I'; // después la pasamos a env
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

/* ---------- RESUMEN MES (21 → 20) ---------- */
app.get('/hours-by-month', async (req, res) => {
  const { year, month } = req.query;

  const start = `${year}-${String(month).padStart(2, '0')}-21`;
  const nextMonth = month == 12 ? 1 : Number(month) + 1;
  const nextYear = month == 12 ? Number(year) + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-20`;

  const { data, error } = await supabase
    .from('hours')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('date');

  if (error) return res.status(500).json(error);

  const total = data.reduce((sum, h) => sum + h.money, 0);

  res.json({ total, registros: data });
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
