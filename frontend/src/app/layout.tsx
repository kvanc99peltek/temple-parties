import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Temple Parties",
  description: "Discover weekend parties at Temple University",
  keywords: ["Temple University", "parties", "events", "Philadelphia", "college"],
  authors: [{ name: "Temple Parties" }],
  openGraph: {
    title: "Temple Parties",
    description: "Discover weekend parties at Temple University",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Temple Parties",
    description: "Discover weekend parties at Temple University",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
