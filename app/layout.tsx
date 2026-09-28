import type { Metadata } from "next";
import { Karla, Newsreader } from "next/font/google";
import { env } from "@/lib/env";
import "./globals.css";

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: '%s | Martin Sawyer Reunion',
    default: 'Martin Sawyer Reunion',
  },
  description: 'Six branches. Four generations. One register.',
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  openGraph: {
    title: 'Martin Sawyer Reunion',
    description: 'Six branches. Four generations. One register.',
    url: '/',
    siteName: 'Martin Sawyer Reunion',
    // Image comes from the app/opengraph-image.tsx convention route.
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${karla.variable} ${newsreader.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
