const API = 'https://control-horas-backend.onrender.com';
let USER_ID = null;
let selectedMonth = null;

window.onload = async () => {
  await initUser();

  const { data } = await client.auth.getUser();

  if (data.user) {
    USER_ID = data.user.id;
    seleccionarMesActual();
  }
};

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

document.querySelectorAll('.mes-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    seleccionarMes(Number(btn.dataset.month), new Date().getFullYear());
  });
});

function seleccionarMes(month, year) {
  selectedMonth = { month, year };
  cargarDashboard();
}

/* ---------- DASHBOARD ---------- */
async function cargarDashboard() {
  if (!USER_ID || !selectedMonth) return;

  const res = await fetch(`${API}/resumen?user_id=${USER_ID}`);
  const resumen = await res.json();

  const key = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`;
  const dataMes = resumen[key] || { money: 0, hours: 0 };

  document.getElementById('totalMoney').innerText =
    `$${dataMes.money.toFixed(0)}`;

  document.getElementById('totalHours').innerText =
    `${dataMes.hours.toFixed(1)} h`;

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
  let html = '';

  if (data.registros && data.registros.length > 0) {
    data.registros.forEach(r => {
      html += `
        <div class="card">
          📅 ${r.date}<br>
          ⏰ ${r.start_time.slice(0,5)} - ${r.end_time.slice(0,5)}<br>
          🏥 ${r.sector}<br>
          💰 $${r.money.toFixed(0)}<br>
          <button data-id="${r.id}">🗑</button>
        </div>
      `;
    });
  } else {
    html = '<p>No hay horas cargadas</p>';
  }

  document.getElementById('resultado').innerHTML = html;
}

/* ---------- GUARDAR ---------- */
async function guardarHoras() {
  if (!USER_ID) {
    alert("Usuario no identificado");
    return;
  }

  const date = document.getElementById('date').value;
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  const sector = document.getElementById('sector').value;

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

  console.log("STATUS:", res.status);

  const text = await res.text();
  console.log("RESPUESTA RAW:", text);

  if (res.ok) {
    mostrarMensajeExito();
    limpiarCampos();
    cargarDashboard();
  } else {
    alert("Error backend");
  }
}

/* ---------- MENSAJE DE ÉXITO ---------- */
function mostrarMensajeExito() {
  const mensaje = document.getElementById('mensajeExito');
  if (!mensaje) return;

  mensaje.style.display = 'block';

  setTimeout(() => {
    mensaje.style.display = 'none';
  }, 3000);
}

/* ---------- LIMPIAR CAMPOS ---------- */
function limpiarCampos() {
  document.getElementById('date').value = '';
  document.getElementById('start').value = '';
  document.getElementById('end').value = '';
  document.getElementById('sector').value = '';
}

/* ---------- BORRAR (delegación de eventos) ---------- */
document.getElementById('resultado').addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON' && e.target.dataset.id) {
    borrarHora(e.target.dataset.id);
  }
});

async function borrarHora(id) {
  await fetch(`${API}/delete-hour/${id}`, {
    method: 'DELETE'
  });

  cargarDashboard();
}