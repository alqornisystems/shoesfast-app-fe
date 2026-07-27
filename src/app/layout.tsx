import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { NavigationProgress } from "@/components/navigation-progress";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shoesfast Management System",
  description: "Admin panel Shoesfast",
  // iOS tidak membaca manifest.json untuk ini — ikon home screen dan mode layar
  // penuh harus disebut lewat meta tag Apple, jadi keduanya ditulis di sini.
  appleWebApp: {
    capable: true,
    title: "Shoesfast",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  // Aplikasi dipakai teknisi sambil bekerja; jangan halangi mereka memperbesar
  // teks atau foto. Karena itu user-scalable tidak dimatikan.
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NavigationProgress />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
