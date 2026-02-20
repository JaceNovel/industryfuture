import type { Metadata } from "next";
import { env } from "process";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFaq } from "@/components/site-faq";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL ?? "https://futurind.space"),
  title: "Industrie de l'avenir",
  description: "E-commerce industriel (Next.js + Laravel)",
  icons: {
    icon: "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png",
    apple: "/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png",
  },
  openGraph: {
    title: "Industrie de l'avenir",
    description: "E-commerce industriel (Next.js + Laravel)",
    images: ["/WhatsApp_Image_2026-02-12_at_21.36.46-removebg-preview.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-muted/20 text-foreground`}
      >
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <div className="flex-1 pb-[40vh]">{children}</div>
            <SiteFaq />
          </div>
        </Providers>
      </body>
    </html>
  );
}
