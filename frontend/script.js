/* ================================
   CONFIG
================================ */
const API_URL = "https://control-horas-backend.onrender.com";
const USER_ID = 1;

let selectedMonth = new Date().getMonth() + 1;
let selectedYear = new Date().getFullYear();

/* ================================
   ELEMENTOS
================================ */
const totalEl = document.getElementById("dash-total");
const hoursEl = document.getElementById("dash-hours");
const periodEl = document.getElementById("dash-period");
const resultEl = document.getElementById("resultado");

/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  activarMesActual();
  cargarResumen();
  cargarDetalle();
});

/* ================================
   MESES
================================ */
document.querySelectorAll(".mes-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedMonth = Number(btn.dataset.month);

    document.querySelectorAll(".mes-btn")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    cargarResumen();
    cargarDetalle();
  });
});

function activarMesActual() {
  document.querySelectorAll(".mes-btn").forEach(btn => {
    if (Number(btn.dataset.month) === selectedMonth) {
      btn.classList.add("active");
    }
  });
}

/* ================================
   RESUMEN (21 → 20)
================================ */
async function cargarResumen() {
  const res = await fetch(
    `${API_URL}/resumen?user_id=${USER_ID}`
  );
  const data = await res.json();

  const key = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const total = data[key] || 0;

  totalEl.textContent = `$${total.toFixed(0)}`;

  periodEl.textContent = calcularPeriodo();

  await cargarHorasTotales();
}

async function cargarHorasTotales() {
  const res = await fetch(
    `${API_URL}/hours-by-month?year=${selectedYear}&month=${selectedMonth}`
  );
  const data = await res.json();

  const horas = data.registros.reduce((sum, r) => {
    const [sh, sm] = r.start_time.split(":").map(Number);
    const [eh, em] = r.end_time.split(":").map(Number);

    let start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end <= start) end += 1440;

    return sum + (end - start) / 60;
  }, 0);

  hoursEl.textContent = `${horas.toFixed(1)} h`;
}

/* ================================
   PERÍODO
================================ */
function calcularPeriodo() {
  const start = `21/${selectedMonth}`;
  const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
  const end = `20/${nextMonth}`;
  return `${start} → ${end}`;
}

/* ================================
   GUARDAR
================================ */
async function guardarHoras() {
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const sector = document.getElementById("sector").value;

  if (!date || !start || !end || !sector) {
    alert("Completá todos los campos");
    return;
  }

  await fetch(`${API_URL}/add-hours`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: USER_ID,
      date,
      start_time: start,
      end_time: end,
      sector
    })
  });

  cargarResumen();
  cargarDetalle();

  document.getElementById("date").value = "";
  document.getElementById("start").value = "";
  document.getElementById("end").value = "";
  document.getElementById("sector").value = "";
}

/* ================================
   DETALLE + BORRAR
================================ */
async function cargarDetalle() {
  const res = await fetch(
    `${API_URL}/hours-by-month?year=${selectedYear}&month=${selectedMonth}`
  );
  const data = await res.json();

  if (!data.registros.length) {
    resultEl.innerHTML = "<p>No hay registros</p>";
    return;
  }

  resultEl.innerHTML = data.registros.map(r => `
    <div class="row">
      <span>${r.date}</span>
      <span>${r.start_time} - ${r.end_time}</span>
      <span>${r.sector}</span>
      <span>$${r.money.toFixed(0)}</span>
      <button onclick="borrar(${r.id})">🗑</button>
    </div>
  `).join("");
}

async function borrar(id) {
  if (!confirm("¿Borrar este registro?")) return;

  await fetch(`${API_URL}/delete-hour/${id}`, {
    method: "DELETE"
  });

  cargarResumen();
  cargarDetalle();
}
