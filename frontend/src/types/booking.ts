export type Service = { id: string; name: string; description: string | null; basePrice: string };
export type AppointmentTime = string;

export type BookingRequest = {
  service: string;
  details: string;
  date: string;
  time: AppointmentTime;
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
