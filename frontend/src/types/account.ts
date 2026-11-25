export type AccountUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: "CUSTOMER" | "PROFESSIONAL";
};

export type CustomerRequest = {
  id: string;
  service: string;
  quotedBasePrice: string | null;
  details: string;
  preferredDate: string;
  preferredTime: string;
  address: string;
  addressInstructions: string | null;
  status: "NEW" | "REVIEWING" | "CONTACTED" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  createdAt: string;
  booking: { id: string; status: string; scheduledAt: string; totalAmount: string } | null;
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

export type AddressForm = { label: string; line1: string; city: string; state: string; instructions: string };
export type AccountForm = { firstName: string; lastName: string; email: string; phone: string; password: string };
