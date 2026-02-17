const API = 'https://control-horas-backend.onrender.com';

let USER_ID = null;
let selectedMonth = null;
let selectedYear = null;

/* ================= INIT APP ================= */
window.onload = async () => {
  await initUser();
  setCurrentMonth();
};

/* ================= INIT USER ================= */
async function initUser() {
  const res = await fetch(`${API}/init-user`);
  const data = await res.json();

  USER_ID = data.id;

  if (!USER_ID) {
    alert('No se pudo inicializar el usuario');
  }
}

/* ================= MES ACTUAL (21 → 20) ================= */
function setCurrentMonth() {
  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();

  if (now.getDate() <= 20) {
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
  }

  selectMonth(month, year);
}

/* ================= SELECCIONAR MES ================= */
function selectMonth(month, year) {
  selectedMonth = month;
  selectedYear = year;

  document.querySelectorAll('.mes-btn').forEach(btn => {
    btn.classList.toggle(
      'active',
      Number(btn.dataset.month) === month
    );
  });

  cargarDashboard();
}

/* ================= BOTONES MESES ================= */
document.querySelectorAll('.mes-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectMonth(
      Number(btn.dataset.month),
      new Date().getFullYear()
    );
  });
});

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

/* ================= DASHBOARD + DETALLE ================= */
async function cargarDashboard() {
  if (!USER_ID || !selectedMonth || !selectedYear) return;

  const res = await fetch(
    `${API}/hours-by-month?year=${selectedYear}&month=${selectedMonth}`
  );

  const data = await res.json();
  const registros = data.registros || [];

  /* ----- TOTAL ----- */
  document.getElementById('dash-total').innerText =
    `$${data.total.toFixed(2)}`;

  /* ----- HORAS ----- */
  document.getElementById('dash-hours').innerText =
    `${calcularHoras(registros)} h`;

  /* ----- PERÍODO ----- */
  document.getElementById('dash-period').innerText =
    `${String(selectedMonth).padStart(2, '0')}/${selectedYear}`;

  /* ----- DETALLE ----- */
  let html = '';

  registros.forEach(r => {
    html += `
      <div class="card">
        📅 ${r.date}<br>
        ⏰ ${r.start_time} - ${r.end_time}<br>
        🏥 ${r.sector}<br>
        💰 $${r.money.toFixed(2)}<br>
        <button onclick="borrarHora(${r.id})">🗑 Borrar</button>
      </div>
    `;
  });

  document.getElementById('resultado').innerHTML =
    html || '<p>No hay horas cargadas</p>';
}

/* ================= CALCULAR HORAS ================= */
function calcularHoras(registros) {
  let total = 0;

  registros.forEach(r => {
    const [sh, sm] = r.start_time.split(':').map(Number);
    const [eh, em] = r.end_time.split(':').map(Number);

    let start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end <= start) end += 1440;

    total += (end - start) / 60;
  });

  return total.toFixed(1);
}

/* ================= BORRAR ================= */
async function borrarHora(id) {
  if (!confirm('¿Borrar esta hora?')) return;

  await fetch(`${API}/delete-hour/${id}`, { method: 'DELETE' });
  cargarDashboard();
}
