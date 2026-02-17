const API = 'https://control-horas-backend.onrender.com'; // ajustá si cambia
const USER_ID = 1;

let selectedMonth = new Date().getMonth() + 1;
let selectedYear = new Date().getFullYear();

/* ---------- CAMBIAR MES ---------- */
function cambiarMes(month) {
  selectedMonth = month;
  cargarResumen();
}

/* ---------- GUARDAR HORAS ---------- */
async function guardarHoras() {
  const date = document.getElementById('date').value;
  const start_time = document.getElementById('start').value;
  const end_time = document.getElementById('end').value;
  const sector = document.getElementById('sector').value;

  if (!date || !start_time || !end_time || !sector) {
    alert('Completá todos los campos');
    return;
  }

  await fetch(`${API}/add-hours`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: USER_ID,
      date,
      start_time,
      end_time,
      sector
    })
  });

  cargarResumen();
}

/* ---------- RESUMEN + DETALLE ---------- */
async function cargarResumen() {
  const res = await fetch(
    `${API}/hours-by-month?year=${selectedYear}&month=${selectedMonth}`
  );
  const data = await res.json();

  document.getElementById('totalMoney').textContent =
    `$${data.total.toFixed(0)}`;

  const totalHours = data.registros.reduce((sum, r) => {
    const start = r.start_time.split(':');
    const end = r.end_time.split(':');
    let s = (+start[0] * 60) + +start[1];
    let e = (+end[0] * 60) + +end[1];
    if (e <= s) e += 1440;
    return sum + (e - s) / 60;
  }, 0);

  document.getElementById('totalHours').textContent =
    `${totalHours.toFixed(1)} h`;

  const inicio = `${selectedMonth}/21`;
  const fin = `${selectedMonth + 1}/20`;
  document.getElementById('periodo').textContent = `${inicio} → ${fin}`;

  renderDetalle(data.registros);
}

/* ---------- DETALLE ---------- */
function renderDetalle(registros) {
  const tbody = document.getElementById('detalleHoras');
  tbody.innerHTML = '';

  registros.forEach(r => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${r.date}</td>
      <td>${r.start_time}</td>
      <td>${r.end_time}</td>
      <td>${r.sector}</td>
      <td>$${r.money.toFixed(0)}</td>
      <td>
        <button onclick="borrarHora(${r.id})">🗑</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ---------- BORRAR ---------- */
async function borrarHora(id) {
  if (!confirm('¿Eliminar esta hora?')) return;

  await fetch(`${API}/delete-hour/${id}`, {
    method: 'DELETE'
  });

  cargarResumen();
}

/* ---------- INIT ---------- */
cargarResumen();
