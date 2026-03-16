import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BehaviourInsight — AI Behavioural Analysis Platform",
  description:
    "Transform qualitative text into evidence-grounded behavioural insights using COM-B, Behaviour Change Wheel, and Claude AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
