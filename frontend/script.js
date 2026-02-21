const API = 'https://control-horas-backend.onrender.com';

let USER_ID = null;
let selectedMonth = null;

/* ---------- INIT ---------- */
window.onload = async () => {
  try {
    await initUser();
    seleccionarMesActual();
  } catch (err) {
    console.error("Error inicializando app:", err);
  }
};

/* ---------- INIT USER ---------- */
async function initUser() {
  const res = await fetch(`${API}/init-user`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error("Error creando/obteniendo usuario");
  }

  USER_ID = data.id;
}

/* ---------- MES ACTUAL ---------- */
function seleccionarMesActual() {
  const hoy = new Date();
  let month = hoy.getMonth() + 1;
  let year = hoy.getFullYear();

  // Regla 21 → 20
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

/* ---------- DASHBOARD ---------- */
async function cargarDashboard() {
  if (!USER_ID || !selectedMonth) return;

  const res = await fetch(`${API}/resumen?user_id=${USER_ID}`);
  const resumen = await res.json();

  if (!res.ok) {
    console.error(resumen);
    alert("Error al cargar resumen");
    return;
  }

  const key = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`;
  const total = resumen[key] || 0;

  document.getElementById('totalMoney').innerText = `$${total.toFixed(0)}`;
document.getElementById('totalHours').innerText = total > 0 ? '✔' : '—';
document.getElementById('periodo').innerText =
  `${selectedMonth.month}/${selectedMonth.year}`;

  cargarDetalle();
}

/* ---------- DETALLE ---------- */
async function cargarDetalle() {
  if (!USER_ID || !selectedMonth) return;

  const res = await fetch(
    `${API}/hours-by-month?user_id=${USER_ID}&year=${selectedMonth.year}&month=${selectedMonth.month}`
  );

  const data = await res.json();

  if (!res.ok) {
    console.error(data);
    alert("Error al cargar detalle");
    return;
  }

  let html = '';

  data.registros.forEach(r => {
    html += `
      <div class="card">
        📅 ${r.date}<br>
        ⏰ ${r.start_time.slice(0,5)} - ${r.end_time.slice(0,5)}<br>
        🏥 ${r.sector}<br>
        💰 $${r.money.toFixed(0)}<br>
        <button onclick="borrarHora(${r.id})">🗑</button>
      </div>
    `;
  });

  document.getElementById('resultado').innerHTML =
    html || '<p>No hay horas cargadas</p>';
}

/* ---------- GUARDAR ---------- */
async function guardarHoras() {
  if (!USER_ID) return;

  const date = dateInput.value;
  const start = startInput.value;
  const end = endInput.value;
  const sector = sectorInput.value;

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
    console.error(data);
    alert("Error al guardar horas");
    return;
  }

  cargarDashboard();
}

/* ---------- BORRAR ---------- */
async function borrarHora(id) {
  const res = await fetch(`${API}/delete-hour/${id}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    alert("Error al borrar");
    return;
  }

  cargarDashboard();
}