import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeEase — Your home. Handled.",
  description: "Book trusted professionals for everyday home services.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
