const API = 'https://control-horas-backend.onrender.com';

let USER_ID = null;
let selectedMonth = null;

/* ---------- INIT ---------- */
window.onload = async () => {
  await initUser();
  seleccionarMesActual();
};

/* ---------- INIT USER ---------- */
async function initUser() {
  const res = await fetch(`${API}/init-user`);
  const data = await res.json();
  USER_ID = data.id;
}

/* ---------- MES ACTUAL ---------- */
function seleccionarMesActual() {
  const hoy = new Date();
  let month = hoy.getMonth() + 1;
  let year = hoy.getFullYear();

  if (hoy.getDate() <= 20) {
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
  }

  seleccionarMes(month, year);
}

/* ---------- BOTONES MES ---------- */
document.querySelectorAll('.mes-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    seleccionarMes(Number(btn.dataset.month), new Date().getFullYear());
  });
});

/* ---------- SELECCIONAR MES ---------- */
function seleccionarMes(month, year) {
  selectedMonth = { month, year };

  document.querySelectorAll('.mes-btn').forEach(b =>
    b.classList.toggle('active', Number(b.dataset.month) === month)
  );

  cargarDashboard();
}

/* ---------- DASHBOARD + DETALLE ---------- */
async function cargarDashboard() {
  const res = await fetch(`${API}/resumen?user_id=${USER_ID}`);
  const resumen = await res.json();

  const key = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`;
  const total = resumen[key] || 0;

  document.getElementById('dash-total').innerText = `$${total.toFixed(0)}`;
  document.getElementById('dash-hours').innerText = total > 0 ? '✔' : '—';
  document.getElementById('dash-period').innerText =
    `${selectedMonth.month}/` + selectedMonth.year;

  cargarDetalle();
}

/* ---------- DETALLE ---------- */
async function cargarDetalle() {
  const res = await fetch(`${API}/hours-by-month?year=${selectedMonth.year}&month=${selectedMonth.month}`);
  const data = await res.json();

  let html = '';

  data.registros.forEach(r => {
    html += `
      <div class="card">
        📅 ${r.date}<br>
        ⏰ ${r.start_time} - ${r.end_time}<br>
        🏥 ${r.sector}<br>
        💰 $${r.money}<br>
        <button onclick="borrarHora(${r.id})">🗑</button>
      </div>
    `;
  });

  document.getElementById('resultado').innerHTML =
    html || '<p>No hay horas cargadas</p>';
}

/* ---------- GUARDAR ---------- */
async function guardarHoras() {
  const date = dateInput.value;
  const start = startInput.value;
  const end = endInput.value;
  const sector = sectorInput.value;

  await fetch(`${API}/add-hours`, {
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

  cargarDashboard();
}

/* ---------- BORRAR ---------- */
async function borrarHora(id) {
  await fetch(`${API}/delete-hour/${id}`, { method: 'DELETE' });
  cargarDashboard();
}