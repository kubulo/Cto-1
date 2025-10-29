import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { APP_NAME, DEFAULT_LOCALE } from "@/lib/constants";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-sc",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "基于 Next.js 的全栈应用脚手架",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body className={`${notoSans.variable} font-sans antialiased min-h-screen`}>{children}</body>
    </html>
  );
}
