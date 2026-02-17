/* ================= CONFIG ================= */
const API = 'https://control-horas-backend.onrender.com';
const USER_ID = 1;

/* ================= ESTADO ================= */
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth() + 1;

/* ================= UTIL ================= */
function formatMoney(n) {
  return '$' + n.toFixed(0);
}

function calcularPeriodo(year, month) {
  const start = `21/${month}`;
  const endMonth = month === 12 ? 1 : month + 1;
  return `${start} → 20/${endMonth}`;
}

/* ================= DASHBOARD ================= */
async function cargarDashboard(year, month) {
  try {
    const res = await fetch(
      `${API}/hours-by-month?year=${year}&month=${month}`
    );

    if (!res.ok) throw new Error('Error backend');

    const data = await res.json();

    // TOTAL
    document.getElementById('totalMoney').innerText =
      formatMoney(data.total || 0);

    // HORAS
    let horas = 0;
    data.registros.forEach(r => {
      if (r.start_time && r.end_time) {
        const [sh, sm] = r.start_time.split(':').map(Number);
        const [eh, em] = r.end_time.split(':').map(Number);
        let start = sh * 60 + sm;
        let end = eh * 60 + em;
        if (end <= start) end += 1440;
        horas += (end - start) / 60;
      }
    });

    document.getElementById('totalHours').innerText =
      horas ? horas.toFixed(1) + ' h' : '—';

    // PERIODO
    document.getElementById('periodo').innerText =
      calcularPeriodo(year, month);

  } catch (err) {
    console.error(err);
    alert('No se pudo cargar el resumen');
  }
}

/* ================= CAMBIO DE MES ================= */
function cambiarMes(month) {
  selectedMonth = month;
  cargarDashboard(selectedYear, selectedMonth);
}

/* ================= GUARDAR HORAS ================= */
async function guardarHoras() {
  const date = document.getElementById('date').value;
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  const sector = document.getElementById('sector').value;

  if (!date || !start || !end || !sector) {
    alert('Completá todos los campos');
    return;
  }

  const res = await fetch(`${API}/add-hours`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: USER_ID,
      date,
      start_time: start,
      end_time: end,
      sector
    })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || 'Error al guardar');
    return;
  }

  alert('Horas guardadas ✔️');
  cargarDashboard(selectedYear, selectedMonth);
}

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', () => {
  cargarDashboard(selectedYear, selectedMonth);
});
