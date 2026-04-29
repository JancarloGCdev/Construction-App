import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ConstruYa — calculadoras y cotización",
  description:
    "Para constructores: calculadoras de materiales, cotización y precios configurables — todo guardado solo en este dispositivo.",
  applicationName: "ConstruYa",
  manifest: "/site.webmanifest",
  openGraph: {
    title: "ConstruYa — calculadoras y cotización",
    description:
      "Para constructores: calculadoras de materiales, cotización y precios configurables — todo guardado solo en este dispositivo.",
    siteName: "ConstruYa",
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ConstruYa — calculadoras y cotización",
    description:
      "Para constructores: calculadoras de materiales, cotización y precios configurables — todo guardado solo en este dispositivo.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ea580c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans min-h-dvh text-foreground`}
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
