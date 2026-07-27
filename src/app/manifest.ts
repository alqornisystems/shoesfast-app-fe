import type { MetadataRoute } from "next"

/**
 * Manifest PWA — supaya aplikasi ini bisa dipasang ke layar utama HP dan dibuka
 * layar penuh tanpa address bar, seperti aplikasi biasa.
 *
 * Sengaja TANPA service worker: tidak ada mode offline. Data di sini (pekerjaan,
 * pengiriman, pembayaran) berubah sepanjang hari, dan halaman offline yang basi
 * lebih berbahaya daripada halaman yang jujur gagal memuat — teknisi bisa
 * mengerjakan pesanan yang sudah dibatalkan. Kalau offline benar-benar dibutuhkan,
 * itu keputusan tersendiri, bukan efek samping dari "biar bisa dipasang".
 *
 * `start_url: "/dashboard"` karena membuka aplikasi di halaman login lalu langsung
 * dilempar ke dashboard membuat ikon terasa lambat; yang belum login tetap
 * diarahkan ke /login oleh gerbang auth di (admin)/layout.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shoesfast Management System",
    short_name: "Shoesfast",
    description: "Aplikasi operasional Shoesfast — pengerjaan, pengiriman, absensi.",
    lang: "id",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
