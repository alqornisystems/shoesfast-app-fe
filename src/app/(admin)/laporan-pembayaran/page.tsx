"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { DollarSign, Calendar, CreditCard, TrendingUp, FileText, FileDown, Printer } from "lucide-react"
import { exportTableToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export-utils"

interface Summary {
  total_payments: number
  total_amount: number
  average_payment: number
}

interface DailyPayment {
  payment_date: string
  total_payments: number
  total_amount: number
}

interface MethodBreakdown {
  method: string
  method_label: string
  count: number
  total_amount: number
}

interface Payment {
  id: number
  date: number
  order_code: string
  customer_name: string
  customer_phone: string
  branch_name: string
  total: number
  method: string
  method_label: string
  user_name: string
  notes: string | null
}

export default function LaporanPembayaranPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [dailyPayments, setDailyPayments] = useState<DailyPayment[]>([])
  const [methodBreakdown, setMethodBreakdown] = useState<MethodBreakdown[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  // Filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    // Set default to current month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setStartDate(format(firstDay, "yyyy-MM-dd"))
    setEndDate(format(lastDay, "yyyy-MM-dd"))
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport()
    }
  }, [startDate, endDate])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(endDate + " 23:59:59").getTime() / 1000)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/payments?start_date=${startTimestamp}&end_date=${endTimestamp}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch report")
      }

      const data = await response.json()
      setSummary(data.summary)
      setDailyPayments(data.daily_payments)
      setMethodBreakdown(data.method_breakdown)
      setPayments(data.data)
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat laporan")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "dd MMM yyyy")
  }

  const formatDateTime = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "dd MMM yyyy HH:mm")
  }

  const getMethodBadgeColor = (method: string) => {
    const methodLower = method.toLowerCase()
    if (methodLower === "cash") return "bg-green-500"
    if (methodLower === "transfer") return "bg-blue-500"
    if (methodLower === "qris") return "bg-purple-500"
    if (methodLower.includes("wallet")) return "bg-orange-500"
    return "bg-gray-500"
  }

  const handleExport = () => {
    if (!payments.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = payments.map(payment => ({
      date: formatDateForExport(payment.date),
      order_code: payment.order_code,
      customer_name: payment.customer_name,
      customer_phone: payment.customer_phone,
      branch_name: payment.branch_name,
      total: formatCurrencyForExport(payment.total),
      method_label: payment.method_label,
      user_name: payment.user_name
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "date", label: "Tanggal" },
        { key: "order_code", label: "Kode Order" },
        { key: "customer_name", label: "Nama Pelanggan" },
        { key: "customer_phone", label: "No. HP" },
        { key: "branch_name", label: "Cabang" },
        { key: "total", label: "Nominal" },
        { key: "method_label", label: "Metode" },
        { key: "user_name", label: "Kasir" }
      ],
      `Laporan_Pembayaran_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Pembayaran</h1>
          <p className="text-muted-foreground">Analisis dan monitoring transaksi pembayaran</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!summary}>
            <FileDown className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!summary}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Tanggal Akhir</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReport} disabled={loading} className="w-full">
                {loading ? "Memuat..." : "Tampilkan Laporan"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Memuat laporan...</p>
          </div>
        </div>
      ) : summary ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_payments}</div>
                <p className="text-xs text-muted-foreground">Pembayaran diterima</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Penerimaan</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.total_amount)}
                </div>
                <p className="text-xs text-muted-foreground">Cash in periode ini</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rata-rata Pembayaran</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.average_payment)}</div>
                <p className="text-xs text-muted-foreground">Per transaksi</p>
              </CardContent>
            </Card>
          </div>

          {/* Method Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Breakdown Metode Pembayaran
              </CardTitle>
              <CardDescription>Distribusi pembayaran berdasarkan metode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {methodBreakdown.map((item) => (
                  <div
                    key={item.method}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getMethodBadgeColor(item.method)}`}>
                        <CreditCard className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{item.method_label}</p>
                        <p className="text-sm text-muted-foreground">{item.count} transaksi</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(item.total_amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Pembayaran Harian</CardTitle>
              <CardDescription>Ringkasan pembayaran per hari</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto max-h-[400px]">
                <table className="w-full caption-bottom text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Tanggal</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Jumlah Transaksi
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Total Penerimaan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyPayments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="h-24 text-center text-muted-foreground">
                          Tidak ada pembayaran pada periode ini
                        </td>
                      </tr>
                    ) : (
                      dailyPayments.map((daily, index) => (
                        <tr key={index} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle">
                            {format(new Date(daily.payment_date), "dd MMM yyyy")}
                          </td>
                          <td className="p-4 align-middle text-right">{daily.total_payments}</td>
                          <td className="p-4 align-middle text-right font-medium text-green-600">
                            {formatCurrency(daily.total_amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Transaksi Pembayaran</CardTitle>
              <CardDescription>Daftar lengkap semua transaksi pembayaran</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Tanggal</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Order</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Pelanggan</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Cabang</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Nominal</th>
                      <th className="h-12 px-4 text-center align-middle font-medium">Metode</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Kasir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="h-24 text-center text-muted-foreground">
                          Tidak ada transaksi pembayaran
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle">
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(payment.date)}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium">{payment.order_code}</div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium">{payment.customer_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {payment.customer_phone}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-xs">{payment.branch_name}</td>
                          <td className="p-4 align-middle text-right font-bold text-green-600">
                            {formatCurrency(payment.total)}
                          </td>
                          <td className="p-4 align-middle text-center">
                            <Badge className={getMethodBadgeColor(payment.method)}>
                              {payment.method_label}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle text-xs">{payment.user_name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Pilih periode untuk melihat laporan</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
