// Utilidades de fecha/hora de eventos (espejo de utils/timezones del frontend).

const TZ_LABELS: Record<string, string> = {
  'America/Argentina/Buenos_Aires': 'hora de Argentina',
  'America/Montevideo': 'hora de Uruguay',
  'America/Sao_Paulo': 'hora de Brasil',
  'America/Santiago': 'hora de Chile',
  'America/Bogota': 'hora de Colombia',
  'America/Lima': 'hora de Perú',
  'America/Mexico_City': 'hora de México',
  'America/New_York': 'hora del Este de EE.UU.',
  'Europe/Madrid': 'hora de España',
};

export function timezoneLabel(tz: string): string {
  if (TZ_LABELS[tz]) return TZ_LABELS[tz];
  const city = tz.split('/').pop()?.replace(/_/g, ' ');
  return city ? `hora de ${city}` : tz;
}

// Las fechas se guardan como medianoche UTC: formatear en UTC evita correr un día.
export function formatEventDay(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatEventDateRange(date: Date, endDate?: Date | null): string {
  const start = formatEventDay(date);
  if (!endDate || endDate.toISOString().slice(0, 10) === date.toISOString().slice(0, 10)) {
    return start;
  }
  return `${start} y ${formatEventDay(endDate)}`;
}

/** Convierte fecha (medianoche UTC) + "HH:MM" en la zona del evento a un instante UTC. */
export function localTimeToUtc(date: Date, time: string, tz: string): Date {
  const [y, m, d] = date.toISOString().slice(0, 10).split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, h, min));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(guess);
  const val = (type: string) => {
    const v = parseInt(parts.find((p) => p.type === type)?.value || '0');
    return type === 'hour' && v === 24 ? 0 : v;
  };
  const localAsUtc = Date.UTC(val('year'), val('month') - 1, val('day'), val('hour'), val('minute'));
  return new Date(guess.getTime() - (localAsUtc - guess.getTime()));
}

/** Día actual (YYYY-MM-DD) en la zona horaria indicada. */
export function todayInTimezone(tz: string): string {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function calendarStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function googleCalendarUrl(opts: {
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  timezone: string;
  details: string;
  location: string;
}): string {
  const start = localTimeToUtc(opts.date, opts.startTime, opts.timezone);
  let end = localTimeToUtc(opts.date, opts.endTime, opts.timezone);
  if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    details: opts.details,
    location: opts.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
