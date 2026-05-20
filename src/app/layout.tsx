import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevDoc AI",
  description: "Akıllı kod dokümantasyon motoru",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
