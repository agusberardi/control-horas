// ⚠️ URL DEL BACKEND EN RENDER (NO localhost / NO IP local)
const API = 'https://control-horas-backend.onrender.com';
const USER_ID = 1;

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
      console.error('Error backend:', data);
      alert('Error backend: ' + (data.error || 'desconocido'));
      return;
    }

    alert(`Horas guardadas ✔️\n$${data.dinero.toFixed(2)}`);

  } catch (err) {
    console.error('Error fetch:', err);
    alert('No se pudo conectar con el servidor');
  }
}
