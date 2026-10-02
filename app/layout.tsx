import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "9jaTrade · Verified B2B Trade & Invoice Financing",
  description: "Privacy-preserving B2B infrastructure for verifying commercial obligations, connecting confirmed invoices to financing, and coordinating settlement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Nunito:ital,wght@0,200..1000;1,200..1000&family=Playfair+Display:ital,wght@1,400;1,600;1,700;1,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
