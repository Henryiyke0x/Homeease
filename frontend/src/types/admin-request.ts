export type RequestStatus = "NEW" | "REVIEWING" | "CONTACTED" | "ACCEPTED" | "DECLINED" | "CANCELLED";

export type BookingRequest = {
  id: string;
  service: string;
  quotedBasePrice: string | null;
  details: string;
  preferredDate: string;
  preferredTime: string;
  address: string;
  addressInstructions: string | null;
  contactName: string;
  phone: string;
  status: RequestStatus;
  createdAt: string;
  booking: { id: string; status: string; scheduledAt: string; totalAmount: string } | null;
};
