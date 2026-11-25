export type Professional = { id: string; firstName: string; lastName: string; phone: string | null; city: string; state: string; services: string[] };

export type Booking = {
  id: string;
  status: "CONFIRMED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  scheduledAt: string;
  totalAmount: string;
  notes: string | null;
  contactName: string;
  contactPhone: string;
  serviceAddress: string;
  addressInstructions: string | null;
  service: { name: string };
  assignment: { professional: { id: string; firstName: string; lastName: string; phone: string | null } } | null;
};
