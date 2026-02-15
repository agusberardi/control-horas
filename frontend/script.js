// ⚠️ URL DEL BACKEND EN RENDER (NO localhost / NO IP local)
const API = 'https://control-horas-backend.onrender.com';
const USER_ID = 1;
let selectedMonth = null;
const selectedYear = new Date().getFullYear();

document.addEventListener("DOMContentLoaded", () => {
  const botones = document.querySelectorAll(".mes-btn");

  botones.forEach(btn => {
    btn.addEventListener("click", () => {
      botones.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMonth = btn.dataset.month;
    });
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

  try {
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
      alert(data.error || 'Error al guardar horas');
      return;
    }

    alert(`Horas guardadas ✔️\n$${data.dinero.toFixed(2)}`);

  } catch (err) {
    console.error(err);
    alert('No se pudo conectar con el servidor');
  }
}

/* ---------- VER RESUMEN MENSUAL ---------- */
async function verResumen() {
 if (!selectedMonth) {
  alert('Seleccioná un mes');
  return;
}

const year = selectedYear;
const month = selectedMonth;


  try {
    const res = await fetch(
      `${API}/hours-by-month?year=${year}&month=${month}`
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error al obtener resumen');
      return;
    }

    let html = `
      <div class="card">
        <b>Total del mes:</b> $${data.total.toFixed(2)}
      </div>
    `;

    /* ---- TOTAL POR SECTOR ---- */
    const porSector = {};

    data.registros.forEach(r => {
      porSector[r.sector] = (porSector[r.sector] || 0) + r.money;
    });

    for (const sector in porSector) {
      html += `
        <div class="card">
          <b>${sector}</b>: $${porSector[sector].toFixed(2)}
        </div>
      `;
    }

    /* ---- LISTADO DETALLADO ---- */
    data.registros.forEach(r => {
      html += `
        <div class="card">
          📅 ${r.date}<br>
          ⏰ ${r.start_time} - ${r.end_time}<br>
          🏥 ${r.sector}<br>
          💰 $${r.money.toFixed(2)}<br><br>

          <button onclick="borrarHora(${r.id})"
            style="background:#e53935;color:white;border:none;padding:8px 12px;border-radius:6px;">
            🗑️ Borrar
          </button>
        </div>
      `;
    });

    document.getElementById('resultado').innerHTML = html;

  } catch (err) {
    console.error(err);
    alert('No se pudo conectar con el servidor');
  }
}

/* ---------- BORRAR HORA ---------- */
async function borrarHora(id) {
  if (!confirm('¿Seguro que querés borrar esta hora?')) return;

  try {
    const res = await fetch(`${API}/delete-hour/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'Error al borrar');
      return;
    }

    alert('Hora borrada ✔️');
    verResumen(); // refresca el resumen

  } catch (err) {
    console.error(err);
    alert('No se pudo conectar con el servidor');
  }
}
