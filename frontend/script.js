// ⚠️ URL DEL BACKEND EN RENDER
const API = 'https://control-horas-backend.onrender.com';
const USER_ID = 1;

/* ---------- MES SELECCIONADO ---------- */
let selectedMonth = null;
const currentYear = new Date().getFullYear();

/* ---------- BOTONES DE MESES ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const botonesMes = document.querySelectorAll('.mes-btn');

  botonesMes.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMonth = btn.dataset.month.padStart(2, '0');

      botonesMes.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      verResumen();
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

    // refresca resumen si hay mes seleccionado
    if (selectedMonth) {
      verResumen();
    }

  } catch (err) {
    console.error(err);
    alert('No se pudo conectar con el servidor');
  }
}

/* ---------- VER RESUMEN ---------- */
async function verResumen() {
  if (!selectedMonth) {
    alert('Seleccioná un mes');
    return;
  }

  try {
    const res = await fetch(
      `${API}/hours-by-month?year=${currentYear}&month=${selectedMonth}`
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

    // Totales por sector
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

    // Detalle de horas
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
    verResumen();

  } catch (err) {
    console.error(err);
    alert('No se pudo conectar con el servidor');
  }
}
