const API = 'https://control-horas-backend.onrender.com';

let USER_ID = null;
let selectedMonth = null;
let selectedYear = null;

/* ---------- INIT APP ---------- */
window.onload = async () => {
  await initUser();
  setCurrentPeriod();
};

/* ---------- INIT USER ---------- */
async function initUser() {
  try {
    const res = await fetch(`${API}/init-user`);
    const data = await res.json();

    USER_ID = data.id;

    if (!USER_ID) {
      alert('No se pudo inicializar el usuario');
    }
  } catch (err) {
    alert('Error conectando con el servidor');
  }
}

/* ---------- PERÍODO ACTUAL (21 → 20) ---------- */
function setCurrentPeriod() {
  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();

  if (now.getDate() <= 20) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  selectMonth(month, year);
}

/* ---------- SELECCIONAR MES ---------- */
function selectMonth(month, year) {
  selectedMonth = month;
  selectedYear = year;

  document.querySelectorAll('.mes-btn').forEach(btn => {
    btn.classList.toggle(
      'active',
      Number(btn.dataset.month) === month
    );
  });

  cargarResumen();
}

/* ---------- BOTONES MESES ---------- */
document.querySelectorAll('.mes-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const month = Number(btn.dataset.month);
    const year = new Date().getFullYear();
    selectMonth(month, year);
  });
});

/* ---------- GUARDAR HORAS ---------- */
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

  if (!res.ok) {
    alert('Error al guardar horas');
    return;
  }

  cargarResumen();
}

/* ---------- CARGAR RESUMEN + DASHBOARD ---------- */
async function cargarResumen() {
  if (!selectedMonth || !selectedYear || !USER_ID) return;

  const res = await fetch(
    `${API}/hours-by-month?year=${selectedYear}&month=${selectedMonth}&user_id=${USER_ID}`
  );

  const data = await res.json();

  /* DASHBOARD */
  document.getElementById('dash-total').innerText =
    `$${data.total.toFixed(2)}`;

  const horas = calcularHoras(data.registros);
  document.getElementById('dash-hours').innerText =
    `${horas} h`;

  const startLabel = `21/${String(selectedMonth).padStart(2, '0')}`;
  const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
  document.getElementById('dash-period').innerText =
    `${startLabel} → 20/${String(nextMonth).padStart(2, '0')}`;

  /* DETALLE */
  let html = '';

  if (data.registros.length === 0) {
    html = '<p>No hay horas cargadas en este período</p>';
  } else {
    data.registros.forEach(r => {
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
  }

  document.getElementById('resultado').innerHTML = html;
}

/* ---------- CALCULAR HORAS ---------- */
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

/* ---------- BORRAR HORA ---------- */
async function borrarHora(id) {
  if (!confirm('¿Borrar esta hora?')) return;

  await fetch(`${API}/delete-hour/${id}`, {
    method: 'DELETE'
  });

  cargarResumen();
}