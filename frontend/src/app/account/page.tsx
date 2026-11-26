"use client";

import SiteHeader from "@/components/site-header";
import { AccountAuthPanel, AccountBenefits, AccountSummary, AddressBook, RequestHistory } from "@/components/account-sections";
import { NotificationInbox } from "@/components/notification-inbox";
import { useAccount } from "@/hooks/use-account";

export default function AccountPage() {
  const account = useAccount();
  const {
    user, requests, notifications, addresses, addressForm, form, isRegistering, isCheckingSession,
    isSubmitting, isSavingAddress, removingAddressId, confirmCancelId, cancellingId, reschedulingId, payingId,
    error, setError, setIsRegistering, setConfirmCancelId, update, updateAddress,
    submit, signOut, addAddress, removeAddress, cancelRequest, rescheduleBooking, startPayment, markNotificationRead,
  } = account;

  return (
    <main className="booking-page min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_350px] lg:py-16">
        <section className="max-w-2xl">
          <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/">← Back to HomeEase</a>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800"><span className="size-1.5 rounded-full bg-emerald-600" />Your HomeEase account</p>
          {isCheckingSession ? (
            <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 text-sm text-stone-600">Checking your account…</div>
          ) : user ? (
            <section className="booking-form-panel mt-5 rounded-[2rem] p-6 sm:p-9" aria-live="polite">
              <AccountSummary user={user} onSignOut={() => void signOut()} />
              <RequestHistory
                requests={requests}
                confirmCancelId={confirmCancelId}
                cancellingId={cancellingId}
                reschedulingId={reschedulingId}
                payingId={payingId}
                onRequestCancel={setConfirmCancelId}
                onConfirmCancel={(id) => void cancelRequest(id)}
                onReschedule={rescheduleBooking}
                onPay={(bookingId) => void startPayment(bookingId)}
                onKeepRequest={() => setConfirmCancelId("")}
              />
              <NotificationInbox notifications={notifications} onRead={(id) => void markNotificationRead(id)} />
              <AddressBook
                addresses={addresses}
                form={addressForm}
                removingAddressId={removingAddressId}
                isSaving={isSavingAddress}
                onChange={updateAddress}
                onSubmit={(event) => void addAddress(event)}
                onRemove={(id) => void removeAddress(id)}
              />
              {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
            </section>
          ) : (
            <AccountAuthPanel
              form={form}
              isRegistering={isRegistering}
              isSubmitting={isSubmitting}
              error={error}
              onModeChange={(registering) => { setIsRegistering(registering); setError(""); }}
              onUpdate={update}
              onSubmit={(event) => void submit(event)}
            />
          )}
        </section>
        <AccountBenefits />
      </div>
    </main>
  );
}
