const LAGOS_WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function getLagosAppointmentSlot(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayOfWeek = LAGOS_WEEKDAYS[values.weekday];
  if (dayOfWeek === undefined) return null;
  return { dayOfWeek, time: `${values.hour}:${values.minute}` };
}
