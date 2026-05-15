import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Temple Parties — Demo",
  description: "Frozen snapshot of Temple Parties for recruiters.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
