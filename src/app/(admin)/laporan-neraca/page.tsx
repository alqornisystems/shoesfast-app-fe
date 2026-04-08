"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen } from "lucide-react"

export default function LaporanNeracaPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Neraca Keuangan</h1>
        <p className="text-muted-foreground">Laporan posisi keuangan usaha (Balance Sheet)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            Laporan Neraca sedang dalam tahap pengembangan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="font-medium">Fitur yang akan tersedia:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Aset Lancar (Kas, Piutang, Persediaan)</li>
              <li>Aset Tetap (Peralatan, Kendaraan)</li>
              <li>Liabilitas Jangka Pendek (Hutang Usaha)</li>
              <li>Liabilitas Jangka Panjang</li>
              <li>Modal/Ekuitas Pemilik</li>
              <li>Perbandingan periode (Month-over-Month, Year-over-Year)</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Catatan:</strong> Untuk implementasi lengkap laporan neraca, diperlukan
              pencatatan aset dan liabilitas yang terstruktur. Saat ini sistem fokus pada
              laporan operasional (penjualan, pengeluaran, HPP).
            </p>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-3">Laporan Alternatif yang Tersedia:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <a
                href="/laporan-penjualan"
                className="p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="font-medium">Laporan Penjualan</div>
                <div className="text-sm text-muted-foreground">
                  Revenue dan omzet penjualan
                </div>
              </a>
              <a
                href="/laporan-pembayaran"
                className="p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="font-medium">Laporan Pembayaran</div>
                <div className="text-sm text-muted-foreground">Arus kas masuk</div>
              </a>
              <a
                href="/laporan-piutang"
                className="p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="font-medium">Laporan Piutang</div>
                <div className="text-sm text-muted-foreground">Aset piutang usaha</div>
              </a>
              <a
                href="/laporan-pengeluaran"
                className="p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="font-medium">Laporan Pengeluaran</div>
                <div className="text-sm text-muted-foreground">Arus kas keluar</div>
              </a>
              <a
                href="/laporan-hpp"
                className="p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="font-medium">Laporan HPP</div>
                <div className="text-sm text-muted-foreground">Profit margin analysis</div>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
