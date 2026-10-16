import type { Metadata, Viewport } from "next";
import { Karla, Newsreader } from "next/font/google";
import { env } from "@/lib/env";
import "./globals.css";
import { site } from '@/content/site'

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${site.name}`,
    default: site.name,
  },
  description: site.tagline,
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  openGraph: {
    title: site.name,
    description: site.tagline,
    url: '/',
    siteName: site.name,
    // Image comes from the app/opengraph-image.tsx convention route.
    locale: 'en_US',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#10233A',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables must sit on <html>: globals.css applies font-sans there,
    // and a variable defined only on <body> leaves <html> on the browser default.
    <html lang="en" className={`${karla.variable} ${newsreader.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
