require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAGE_SIZE = 500;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en backend/.env");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const profileCache = new Map();
const forceRecalc = process.argv.includes("--force");
const hourIdArg = process.argv.find((arg) => arg.startsWith("--hour-id="));
const targetHourId = hourIdArg ? Number(hourIdArg.split("=")[1]) : null;
const userIdArg = process.argv.find((arg) => arg.startsWith("--user-id="));
const targetUserId = userIdArg ? userIdArg.split("=")[1] : null;

function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function parseTimeToMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(String(value || ""));
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

async function getProfileRates(userId) {
  if (profileCache.has(userId)) {
    return profileCache.get(userId);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("hourly_rate, hourly_rate_night")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error leyendo perfil user_id=${userId}: ${error.message}`);
  }

  const rates = {
    hourlyRate: Number(data?.hourly_rate),
    hourlyRateNight: Number(data?.hourly_rate_night)
  };

  profileCache.set(userId, rates);
  return rates;
}

async function main() {
  let from = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("hours")
      .select("id,user_id,start_time,end_time,money,worked_hours_total,worked_hours_normal,worked_hours_night,hourly_rate_snapshot,hourly_rate_night_snapshot")
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Error leyendo horas (${from}-${to}): ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const row of data) {
      if (targetUserId && row.user_id !== targetUserId) {
        continue;
      }

      if (targetHourId && row.id !== targetHourId) {
        continue;
      }

      const split = splitShiftHours(row.start_time, row.end_time);
      if (!split) {
        skipped += 1;
        continue;
      }

      const { hourlyRate, hourlyRateNight } = await getProfileRates(row.user_id);
      if (!Number.isFinite(hourlyRate) || hourlyRate <= 0 || !Number.isFinite(hourlyRateNight) || hourlyRateNight <= 0) {
        skipped += 1;
        continue;
      }

      const currentTotal = Number(row.worked_hours_total);
      const alreadyBackfilled =
        Number.isFinite(currentTotal) &&
        currentTotal > 0 &&
        row.hourly_rate_snapshot !== null &&
        row.hourly_rate_night_snapshot !== null &&
        Number(row.money) === roundTo(split.worked_hours_normal * Number(row.hourly_rate_snapshot) + split.worked_hours_night * Number(row.hourly_rate_night_snapshot), 2);

      if (!forceRecalc && alreadyBackfilled) {
        continue;
      }

      const money = roundTo(
        split.worked_hours_normal * hourlyRate +
        split.worked_hours_night * hourlyRateNight,
        2
      );

      const payload = {
        worked_hours_total: split.worked_hours_total,
        worked_hours_normal: split.worked_hours_normal,
        worked_hours_night: split.worked_hours_night,
        hourly_rate_snapshot: roundTo(hourlyRate, 2),
        hourly_rate_night_snapshot: roundTo(hourlyRateNight, 2),
        money
      };

      const { error: updateError } = await supabase
        .from("hours")
        .update(payload)
        .eq("id", row.id);

      if (updateError) {
        throw new Error(`Error actualizando id=${row.id}: ${updateError.message}`);
      }

      updated += 1;
    }

    from += PAGE_SIZE;
  }

  console.log("Backfill histórico completado");
  console.log(`Registros actualizados: ${updated}`);
  console.log(`Registros omitidos: ${skipped}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
