import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "ScrapeCore — Scrape. Analyse. Understand behaviour.",
  description:
    "Scrape data from websites, app stores, reviews, and social media — then apply COM-B behavioural science to reveal barriers, motivators, and interventions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
