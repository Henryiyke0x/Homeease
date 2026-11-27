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
  booking: { id: string; status: "CONFIRMED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"; scheduledAt: string; totalAmount: string; payments: { status: string }[]; review: CustomerReview | null } | null;
};

export type CustomerReview = { id: string; rating: number; comment: string; displayName: string; status: string; createdAt: string };

export type SavedAddress = {
  id: string;
  label: string | null;
  line1: string;
  city: string;
  state: string;
  country: string;
  instructions: string | null;
};

export type AccountNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  bookingId: string | null;
  bookingRequestId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AddressForm = { label: string; line1: string; city: string; state: string; instructions: string };
export type AccountForm = { firstName: string; lastName: string; email: string; phone: string; password: string };
