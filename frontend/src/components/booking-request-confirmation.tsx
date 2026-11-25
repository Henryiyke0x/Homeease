import type { BookingRequest } from "@/types/booking";

type Props = {
  request: BookingRequest;
  requestId: string;
  quotedBasePrice: string;
  onEdit: () => void;
};

export default function BookingRequestConfirmation({ request, requestId, quotedBasePrice, onEdit }: Props) {
  return (
    <section aria-live="polite" className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-7 sm:p-9">
      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-800 text-xl text-white" aria-hidden="true">✓</div>
      <h2 className="mt-5 text-2xl font-semibold text-emerald-950">Your request has been received</h2>
      <p className="mt-2 leading-7 text-stone-700">You selected {request.service} for {request.date} at {request.time}, at {request.address}.</p>
      {quotedBasePrice && <p className="mt-3 font-semibold text-emerald-900">Base price at request: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(quotedBasePrice))}</p>}
      <p className="mt-4 text-sm leading-6 text-stone-600">Request reference: <span className="font-semibold text-emerald-950">{requestId}</span>. It’s saved as a new request for the HomeEase team to review. This is not a confirmed booking yet.</p>
      <button className="mt-6 rounded-full border border-emerald-900 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-white" onClick={onEdit} type="button">Edit request</button>
    </section>
  );
}
