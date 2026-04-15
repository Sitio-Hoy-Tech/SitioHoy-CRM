import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/layout/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM SitioHoy",
  description: "Sistema de gestión de clientes - SitioHoy",
  icons: {
    icon: "/logo-sitio-hoy.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col relative overflow-x-hidden">
        {/* Capas de fondo para Glassmorphism */}
        <div className="bg-solid-layer" />
        <div className="bg-decoration-blur bg-accent top-[-10%] right-[-10%] opacity-20" />
        <div className="bg-decoration-blur bg-blue-600 bottom-[-10%] left-[-10%] opacity-15" />
        
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
