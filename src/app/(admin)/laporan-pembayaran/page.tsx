"use client"

import { format } from "date-fns"
import { toast } from "sonner"
import { DollarSign, CreditCard, TrendingUp, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { formatCurrency, formatDate } from "@/lib/utils"
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
  method: string | null
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
  method: string | null
  method_label: string
  user_name: string
  notes: string | null
}

interface PaymentReport {
  summary: Summary
  daily_payments: DailyPayment[]
  method_breakdown: MethodBreakdown[]
  data: Payment[]
}

function getMethodBadgeColor(method: string | null | undefined) {
  const methodLower = (method ?? "").toLowerCase()
  if (methodLower === "cash") return "bg-green-500"
  if (methodLower === "transfer") return "bg-blue-500"
  if (methodLower === "qris") return "bg-purple-500"
  if (methodLower.includes("wallet")) return "bg-orange-500"
  return "bg-gray-500"
}

export default function LaporanPembayaranPage() {
  const report = useReport<PaymentReport>({ endpoint: "/api/reports/payments" })
  const data = report.data

  const summary = data?.summary ?? null
  const dailyPayments = data?.daily_payments ?? []
  const methodBreakdown = data?.method_breakdown ?? []
  const payments = data?.data ?? []

  const handleExport = () => {
    if (!payments.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = payments.map((payment) => ({
      date: formatDateForExport(payment.date),
      order_code: payment.order_code,
      customer_name: payment.customer_name,
      customer_phone: payment.customer_phone,
      branch_name: payment.branch_name,
      total: formatCurrencyForExport(payment.total),
      method_label: payment.method_label,
      user_name: payment.user_name,
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
        { key: "user_name", label: "Kasir" },
      ],
      `Laporan_Pembayaran_${format(new Date(report.startDate), "dd-MM-yyyy")}_${format(new Date(report.endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  return (
    <ReportShell
      title="Laporan Pembayaran"
      description="Analisis dan monitoring transaksi pembayaran"
      startDate={report.startDate}
      endDate={report.endDate}
      setStartDate={report.setStartDate}
      setEndDate={report.setEndDate}
      refetch={report.refetch}
      loading={report.loading}
      hasData={!!summary}
      onExportExcel={handleExport}
    >
      {summary && (
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
                              {formatDate(payment.date, "dd MMM yyyy HH:mm")}
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
      )}
    </ReportShell>
  )
}
