import "dotenv/config";
import app from "./app.js";
import { dispatchPendingNotificationEmails } from "./services/notificationEmailService.js";
import { dispatchPendingNotificationSms } from "./services/notificationSmsService.js";
const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`HomeEase API listening on http://localhost:${port}`));

const dispatchNotificationEmails = () => {
  void dispatchPendingNotificationEmails().catch(() => console.error("Notification email worker failed."));
};
const dispatchNotificationSms = () => {
  void dispatchPendingNotificationSms().catch(() => console.error("Notification SMS worker failed."));
};
dispatchNotificationEmails();
dispatchNotificationSms();
const notificationEmailTimer = setInterval(dispatchNotificationEmails, 15_000);
notificationEmailTimer.unref();
const notificationSmsTimer = setInterval(dispatchNotificationSms, 15_000);
notificationSmsTimer.unref();
