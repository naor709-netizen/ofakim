import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "פורטל הגאנט – אופקים",
  description: "לוח אירועים שנתי של מנהל החינוך ומחלקת הנוער, עיריית אופקים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <body className="min-h-full">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
