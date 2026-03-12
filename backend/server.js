require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

app.use(cors());
app.use(express.json());

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function parseTimeToMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ""));
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isNightMinute(minuteOfDay) {
  return minuteOfDay >= 22 * 60 || minuteOfDay < 6 * 60;
}

function splitShiftHours(startTime, endTime) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  let durationMinutes = endMinutes - startMinutes;
  if (durationMinutes <= 0) {
    durationMinutes += 24 * 60;
  }

  if (durationMinutes <= 0 || durationMinutes > 24 * 60) {
    return null;
  }

  let nightMinutes = 0;
  for (let offset = 0; offset < durationMinutes; offset += 1) {
    const minuteOfDay = (startMinutes + offset) % (24 * 60);
    if (isNightMinute(minuteOfDay)) {
      nightMinutes += 1;
    }
  }

  const normalMinutes = durationMinutes - nightMinutes;

  return {
    worked_hours_total: roundTo(durationMinutes / 60, 4),
    worked_hours_normal: roundTo(normalMinutes / 60, 4),
    worked_hours_night: roundTo(nightMinutes / 60, 4)
  };
}

function getPayPeriodKey(dateValue) {
  const fecha = new Date(`${dateValue}T00:00:00`);

  let year = fecha.getFullYear();
  let month = fecha.getMonth() + 1;

  if (fecha.getDate() >= 21) {
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

function sanitizeSector(value) {
  const sector = String(value || "").trim();
  if (!sector || sector.length > 120) return null;
  return sector;
}

function validateHourPayload(payload) {
  const { user_id, date, start_time, end_time, sector } = payload || {};

  if (!isValidUuid(user_id)) {
    return { ok: false, status: 400, error: "user_id inválido" };
  }

  if (!isValidDate(date)) {
    return { ok: false, status: 400, error: "Fecha inválida" };
  }

  if (parseTimeToMinutes(start_time) === null || parseTimeToMinutes(end_time) === null) {
    return { ok: false, status: 400, error: "Formato de hora inválido" };
  }

  const sanitizedSector = sanitizeSector(sector);
  if (!sanitizedSector) {
    return { ok: false, status: 400, error: "Sector inválido" };
  }

  return {
    ok: true,
    data: {
      user_id,
      date,
      start_time,
      end_time,
      sector: sanitizedSector
    }
  };
}

function sendClientError(res, status, message) {
  return res.status(status).json({ error: message });
}

function sendServerError(res, message, error) {
  console.error(message, error);
  return res.status(500).json({ error: "Ocurrió un error interno" });
}

async function getProfileForUser(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, hourly_rate, hourly_rate_night")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const hourlyRate = normalizeNumber(data.hourly_rate, NaN);
  const hourlyRateNight = normalizeNumber(data.hourly_rate_night, NaN);

  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
    return { ...data, hourly_rate: null, hourly_rate_night: hourlyRateNight };
  }

  if (!Number.isFinite(hourlyRateNight) || hourlyRateNight <= 0) {
    return { ...data, hourly_rate: hourlyRate, hourly_rate_night: null };
  }

  return {
    ...data,
    hourly_rate: hourlyRate,
    hourly_rate_night: hourlyRateNight
  };
}

async function userHasSector(userId, sectorName) {
  const { data, error } = await supabase
    .from("user_sectors")
    .select("id")
    .eq("user_id", userId)
    .eq("name", sectorName)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function getHourRecordForUser(hourId, userId) {
  const { data, error } = await supabase
    .from("hours")
    .select("id, sector")
    .eq("id", hourId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

function computeEntryFinancials({ startTime, endTime, hourlyRate, hourlyRateNight }) {
  const split = splitShiftHours(startTime, endTime);
  if (!split) {
    return null;
  }

  const money = roundTo(
    split.worked_hours_normal * hourlyRate +
      split.worked_hours_night * hourlyRateNight,
    2
  );

  return {
    ...split,
    hourly_rate_snapshot: roundTo(hourlyRate, 2),
    hourly_rate_night_snapshot: roundTo(hourlyRateNight, 2),
    money
  };
}

function hydrateHoursRow(row) {
  const workedHoursTotal = normalizeOptionalNumber(row.worked_hours_total);
  const workedHoursNormal = normalizeOptionalNumber(row.worked_hours_normal);
  const workedHoursNight = normalizeOptionalNumber(row.worked_hours_night);
  const money = normalizeNumber(row.money, 0);
  const hourlyRateSnapshot = normalizeOptionalNumber(row.hourly_rate_snapshot);
  const hourlyRateNightSnapshot = normalizeOptionalNumber(row.hourly_rate_night_snapshot);

  if (
    workedHoursTotal !== null &&
    workedHoursNormal !== null &&
    workedHoursNight !== null
  ) {
    return {
      ...row,
      worked_hours_total: workedHoursTotal,
      worked_hours_normal: workedHoursNormal,
      worked_hours_night: workedHoursNight,
      hourly_rate_snapshot: hourlyRateSnapshot,
      hourly_rate_night_snapshot: hourlyRateNightSnapshot,
      money
    };
  }

  const split = splitShiftHours(String(row.start_time || "").slice(0, 5), String(row.end_time || "").slice(0, 5));
  const fallbackTotal = split?.worked_hours_total || 0;
  const fallbackNormal = split?.worked_hours_normal || fallbackTotal;
  const fallbackNight = split?.worked_hours_night || 0;
  const fallbackRate = fallbackTotal > 0 ? roundTo(money / fallbackTotal, 2) : null;

  return {
    ...row,
    worked_hours_total: fallbackTotal,
    worked_hours_normal: fallbackNormal,
    worked_hours_night: fallbackNight,
    hourly_rate_snapshot: fallbackRate,
    hourly_rate_night_snapshot: fallbackRate,
    money
  };
}

app.get("/", (req, res) => {
  res.send("Backend Supabase OK");
});

app.post("/add-hours", async (req, res) => {
  const validation = validateHourPayload(req.body);
  if (!validation.ok) {
    return sendClientError(res, validation.status, validation.error);
  }

  const { user_id, date, start_time, end_time, sector } = validation.data;

  let profile;
  try {
    profile = await getProfileForUser(user_id);
  } catch (error) {
    return sendServerError(res, "Error obteniendo perfil para add-hours", error);
  }

  if (!profile) {
    return sendClientError(res, 400, "Primero completá tu perfil");
  }

  if (!profile.hourly_rate || !profile.hourly_rate_night) {
    return sendClientError(res, 400, "Definí valor por hora normal y nocturno en Perfil");
  }

  try {
    const sectorExists = await userHasSector(user_id, sector);
    if (!sectorExists) {
      return sendClientError(res, 400, "Seleccioná un sector válido desde Perfil");
    }
  } catch (error) {
    return sendServerError(res, "Error validando sector para add-hours", error);
  }

  const financials = computeEntryFinancials({
    startTime: start_time,
    endTime: end_time,
    hourlyRate: profile.hourly_rate,
    hourlyRateNight: profile.hourly_rate_night
  });

  if (!financials) {
    return sendClientError(res, 400, "No se pudo calcular el turno ingresado");
  }

  const payload = {
    user_id,
    date,
    start_time,
    end_time,
    sector,
    worked_hours_total: financials.worked_hours_total,
    worked_hours_normal: financials.worked_hours_normal,
    worked_hours_night: financials.worked_hours_night,
    hourly_rate_snapshot: financials.hourly_rate_snapshot,
    hourly_rate_night_snapshot: financials.hourly_rate_night_snapshot,
    money: financials.money
  };

  const { error } = await supabase.from("hours").insert(payload);
  if (error) {
    return sendServerError(res, "Error insertando registro de horas", error);
  }

  return res.json({
    ok: true,
    dinero: financials.money,
    worked_hours_total: financials.worked_hours_total,
    worked_hours_normal: financials.worked_hours_normal,
    worked_hours_night: financials.worked_hours_night
  });
});

app.get("/resumen", async (req, res) => {
  const { user_id } = req.query;

  if (!isValidUuid(user_id)) {
    return sendClientError(res, 400, "user_id inválido");
  }

  let profile;
  try {
    profile = await getProfileForUser(user_id);
  } catch (error) {
    return sendServerError(res, "Error obteniendo perfil para resumen", error);
  }

  const { data, error } = await supabase
    .from("hours")
    .select("date, start_time, end_time, money, worked_hours_total, worked_hours_normal, worked_hours_night, hourly_rate_snapshot, hourly_rate_night_snapshot")
    .eq("user_id", user_id);

  if (error) {
    return sendServerError(res, "Error obteniendo resumen", error);
  }

  const resumen = {};

  (data || []).forEach((row) => {
    const hydrated = hydrateHoursRow(row);
    const key = getPayPeriodKey(row.date);
    const recalculatedMoney =
      profile?.hourly_rate && profile?.hourly_rate_night
        ? roundTo(
            hydrated.worked_hours_normal * profile.hourly_rate +
              hydrated.worked_hours_night * profile.hourly_rate_night,
            2
          )
        : hydrated.money;

    if (!resumen[key]) {
      resumen[key] = {
        money: 0,
        hours_total: 0,
        hours_normal: 0,
        hours_night: 0,
        hourly_rate_snapshot: hydrated.hourly_rate_snapshot,
        hourly_rate_night_snapshot: hydrated.hourly_rate_night_snapshot
      };
    }

    resumen[key].money = roundTo(resumen[key].money + recalculatedMoney, 2);
    resumen[key].hours_total = roundTo(resumen[key].hours_total + hydrated.worked_hours_total, 4);
    resumen[key].hours_normal = roundTo(resumen[key].hours_normal + hydrated.worked_hours_normal, 4);
    resumen[key].hours_night = roundTo(resumen[key].hours_night + hydrated.worked_hours_night, 4);

    if (resumen[key].hourly_rate_snapshot !== hydrated.hourly_rate_snapshot) {
      resumen[key].hourly_rate_snapshot = null;
    }

    if (resumen[key].hourly_rate_night_snapshot !== hydrated.hourly_rate_night_snapshot) {
      resumen[key].hourly_rate_night_snapshot = null;
    }
  });

  res.json(resumen);
});

app.get("/hours-by-month", async (req, res) => {
  const { year, month, user_id } = req.query;

  if (!isValidUuid(user_id)) {
    return sendClientError(res, 400, "user_id inválido");
  }

  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return sendClientError(res, 400, "Mes o año inválido");
  }

  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const start = `${prevYear}-${String(prevMonth).padStart(2, "0")}-21`;
  const end = `${y}-${String(m).padStart(2, "0")}-20`;

  const { data, error } = await supabase
    .from("hours")
    .select("*")
    .eq("user_id", user_id)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  if (error) {
    return sendServerError(res, "Error obteniendo horas del mes", error);
  }

  const registros = (data || []).map(hydrateHoursRow);
  const total = roundTo(registros.reduce((sum, row) => sum + row.money, 0), 2);
  const totalHours = roundTo(registros.reduce((sum, row) => sum + row.worked_hours_total, 0), 4);
  const normalHours = roundTo(registros.reduce((sum, row) => sum + row.worked_hours_normal, 0), 4);
  const nightHours = roundTo(registros.reduce((sum, row) => sum + row.worked_hours_night, 0), 4);

  res.json({
    total,
    total_hours: totalHours,
    normal_hours: normalHours,
    night_hours: nightHours,
    registros
  });
});

app.get("/hours-by-calendar-month", async (req, res) => {
  const { year, month, user_id } = req.query;

  if (!isValidUuid(user_id)) {
    return sendClientError(res, 400, "user_id inválido");
  }

  const y = Number(year);
  const m = Number(month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return sendClientError(res, 400, "Mes o año inválido");
  }

  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("hours")
    .select("id, date, start_time, end_time, sector, money, worked_hours_total, worked_hours_normal, worked_hours_night")
    .eq("user_id", user_id)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  if (error) {
    return sendServerError(res, "Error obteniendo calendario mensual", error);
  }

  res.json({ registros: (data || []).map(hydrateHoursRow) });
});

app.delete("/delete-hour/:id", async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body || {};

  const hourId = Number(id);
  if (!Number.isInteger(hourId) || hourId <= 0) {
    return sendClientError(res, 400, "id inválido");
  }

  if (!isValidUuid(user_id)) {
    return sendClientError(res, 400, "user_id inválido");
  }

  const { data, error } = await supabase
    .from("hours")
    .delete()
    .eq("id", hourId)
    .eq("user_id", user_id)
    .select("id")
    .maybeSingle();

  if (error) {
    return sendServerError(res, "Error eliminando registro", error);
  }

  if (!data) {
    return sendClientError(res, 404, "Registro no encontrado");
  }

  res.json({ ok: true });
});

app.put("/update-hour/:id", async (req, res) => {
  const { id } = req.params;
  const hourId = Number(id);

  if (!Number.isInteger(hourId) || hourId <= 0) {
    return sendClientError(res, 400, "id inválido");
  }

  const validation = validateHourPayload(req.body);
  if (!validation.ok) {
    return sendClientError(res, validation.status, validation.error);
  }

  const { user_id, date, start_time, end_time, sector } = validation.data;

  let profile;
  try {
    profile = await getProfileForUser(user_id);
  } catch (error) {
    return sendServerError(res, "Error obteniendo perfil para update-hour", error);
  }

  if (!profile) {
    return sendClientError(res, 400, "Primero completá tu perfil");
  }

  if (!profile.hourly_rate || !profile.hourly_rate_night) {
    return sendClientError(res, 400, "Definí valor por hora normal y nocturno en Perfil");
  }

  try {
    const existingRecord = await getHourRecordForUser(hourId, user_id);
    if (!existingRecord) {
      return sendClientError(res, 404, "Registro no encontrado");
    }

    const sectorExists = await userHasSector(user_id, sector);
    const isKeepingExistingSector = existingRecord.sector === sector;
    if (!sectorExists && !isKeepingExistingSector) {
      return sendClientError(res, 400, "Seleccioná un sector válido desde Perfil");
    }
  } catch (error) {
    return sendServerError(res, "Error validando sector para update-hour", error);
  }

  const financials = computeEntryFinancials({
    startTime: start_time,
    endTime: end_time,
    hourlyRate: profile.hourly_rate,
    hourlyRateNight: profile.hourly_rate_night
  });

  if (!financials) {
    return sendClientError(res, 400, "No se pudo calcular el turno ingresado");
  }

  const payload = {
    date,
    start_time,
    end_time,
    sector,
    worked_hours_total: financials.worked_hours_total,
    worked_hours_normal: financials.worked_hours_normal,
    worked_hours_night: financials.worked_hours_night,
    hourly_rate_snapshot: financials.hourly_rate_snapshot,
    hourly_rate_night_snapshot: financials.hourly_rate_night_snapshot,
    money: financials.money
  };

  const { data, error } = await supabase
    .from("hours")
    .update(payload)
    .eq("id", hourId)
    .eq("user_id", user_id)
    .select("*")
    .maybeSingle();

  if (error) {
    return sendServerError(res, "Error actualizando registro", error);
  }

  if (!data) {
    return sendClientError(res, 404, "Registro no encontrado");
  }

  const hydrated = hydrateHoursRow(data);

  return res.json({
    ok: true,
    registro: hydrated
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor Supabase corriendo");
});
