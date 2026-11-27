const appointmentTimePattern = /^(?:0[8-9]|1[0-8]):00$/;
const appointmentDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isAppointmentTime(value: string) {
  return appointmentTimePattern.test(value);
}

export function nigeriaAppointmentDateTime(date: string, time: string): Date | null {
  if (!appointmentDatePattern.test(date) || !isAppointmentTime(time)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const requestedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    requestedDate.getUTCFullYear() !== year ||
    requestedDate.getUTCMonth() !== month - 1 ||
    requestedDate.getUTCDate() !== day
  ) return null;

  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 1, minute));
}
