export type Service = { id: string; name: string; description: string | null; basePrice: string };
export type BookingTimeWindow = "MORNING" | "AFTERNOON" | "EVENING";

export const bookingTimeWindowLabels: Record<BookingTimeWindow, string> = {
  MORNING: "Morning (8am–12pm)",
  AFTERNOON: "Afternoon (12pm–4pm)",
  EVENING: "Evening (4pm–7pm)",
};

export type BookingRequest = {
  service: string;
  details: string;
  date: string;
  time: BookingTimeWindow | "";
  address: string;
  addressId: string;
  contactName: string;
  phone: string;
};

export type SavedAddress = {
  id: string;
  label: string | null;
  line1: string;
  city: string;
  state: string;
  country: string;
  instructions: string | null;
};
