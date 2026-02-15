// ⚠️ URL DEL BACKEND EN RENDER (NO localhost / NO IP local)
const API = 'https://control-horas-backend.onrender.com';
const USER_ID = 1;

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

    if (!res.ok) {
      throw new Error('Error al guardar horas');
    }

    const data = await res.json();
    alert(`Horas guardadas ✔️\n$${data.dinero.toFixed(2)}`);
  } catch (err) {
    alert('No se pudo conectar con el servidor');
    console.error(err);
  }
}

/* ---------- VER RESUMEN ---------- */
async function verResumen() {
  const monthInput = document.getElementById('month').value;

  if (!monthInput) {
    alert('Seleccioná un mes');
    return;
  }

  const [year, month] = monthInput.split('-');

  try {
    const res = await fetch(
      `${API}/hours-by-month?year=${year}&month=${month}`
    );

    if (!res.ok) {
      throw new Error('Error al obtener resumen');
    }

    const data = await res.json();

    let html = `<div class="card"><b>Total del mes:</b> $${data.total.toFixed(2)}</div>`;

    const porSector = {};

    data.registros.forEach(r => {
      porSector[r.sector] = (porSector[r.sector] || 0) + r.money;
    });

    for (const sector in porSector) {
      html += `<div class="card"><b>${sector}</b>: $${porSector[sector].toFixed(2)}</div>`;
    }

    data.registros.forEach(r => {
      html += `
        <div class="card">
          📅 ${r.date}<br>
          ⏰ ${r.start_time} - ${r.end_time}<br>
          🏥 ${r.sector}<br>
          💰 $${r.money.toFixed(2)}
        </div>
      `;
    });

    document.getElementById('resultado').innerHTML = html;
  } catch (err) {
    alert('No se pudo cargar el resumen');
    console.error(err);
  }
}