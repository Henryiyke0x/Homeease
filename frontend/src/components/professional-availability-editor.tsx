import type { WeeklyAvailability } from "@/types/professional";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const times = Array.from({ length: 11 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);

export function ProfessionalAvailabilityEditor({ availability, isSaving, error, onToggle, onSave }: {
  availability: WeeklyAvailability[];
  isSaving: boolean;
  error: string;
  onToggle: (dayOfWeek: number, time: string) => void;
  onSave: () => void;
}) {
  return <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Your weekly schedule</p><h2 className="mt-2 text-xl font-semibold text-emerald-950">When can you take jobs?</h2><p className="mt-2 text-sm leading-6 text-stone-600">Choose the hourly start times you can take in Lagos time. HomeEase uses this when offering you assignments.</p></div><div className="mt-6 space-y-4">{days.map((dayName, dayOfWeek) => {
    const day = availability.find((item) => item.dayOfWeek === dayOfWeek);
    return <fieldset className="rounded-2xl bg-[#f7f6f1] p-4" key={dayName}><legend className="px-1 text-sm font-semibold text-emerald-950">{dayName}</legend><div className="mt-2 flex flex-wrap gap-2">{times.map((time) => <label className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-medium transition ${day?.availableTimes.includes(time) ? "border-emerald-800 bg-emerald-800 text-white" : "border-stone-300 bg-white text-stone-600 hover:border-emerald-700"}`} key={time}><input className="sr-only" type="checkbox" checked={day?.availableTimes.includes(time) ?? false} onChange={() => onToggle(dayOfWeek, time)} />{time}</label>)}</div></fieldset>;
  })}</div>{error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}<button className="mt-5 rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50" disabled={isSaving} onClick={onSave} type="button">{isSaving ? "Saving schedule…" : "Save weekly availability"}</button></section>;
}
