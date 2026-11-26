import type { AccountNotification } from "@/types/account";

export function NotificationInbox({ notifications, onRead }: { notifications: AccountNotification[]; onRead: (id: string) => void }) {
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <section className="mt-10 border-t border-stone-200 pt-7">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Booking updates</p><h2 className="mt-2 text-xl font-semibold text-emerald-950">Notifications</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">{unreadCount} unread</span></div>
      {notifications.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-stone-300 px-5 py-7 text-center text-sm text-stone-500">Booking updates will appear here.</div> : <div className="mt-5 space-y-3">{notifications.map((notification) => <article key={notification.id} className={`rounded-2xl border p-4 ${notification.readAt ? "border-stone-200 bg-white" : "border-emerald-200 bg-emerald-50/60"}`}><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-emerald-950">{notification.title}</h3><p className="mt-1 text-sm leading-6 text-stone-700">{notification.message}</p><p className="mt-2 text-xs text-stone-500">{new Date(notification.createdAt).toLocaleString()}</p></div>{!notification.readAt && <button className="shrink-0 text-xs font-semibold text-emerald-800 hover:underline" onClick={() => onRead(notification.id)} type="button">Mark read</button>}</div></article>)}</div>}
    </section>
  );
}
