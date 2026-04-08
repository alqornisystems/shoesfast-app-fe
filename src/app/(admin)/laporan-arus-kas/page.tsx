"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { TrendingUp, TrendingDown, Calendar, ArrowDownCircle, ArrowUpCircle, Wallet, FileDown, Printer } from "lucide-react"
import { exportTableToExcel, formatCurrencyForExport } from "@/lib/export-utils"

interface Summary {
  total_cash_in: number
  cash_in_count: number
  total_cash_out: number
  cash_out_count: number
  net_cash_flow: number
}

interface PaymentMethod {
  method: string
  method_label: string
  total: number
}

interface DailyCashFlow {
  date: string
  cash_in: number
  cash_out: number
  net_flow: number
  running_balance: number
}

export default function LaporanArusKasPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [dailyCashFlow, setDailyCashFlow] = useState<DailyCashFlow[]>([])

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/cash-flow?start_date=${startTimestamp}&end_date=${endTimestamp}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) throw new Error("Failed to fetch report")

      const data = await response.json()
      setSummary(data.summary)
      setPaymentMethods(data.payment_methods)
      setDailyCashFlow(data.daily_cash_flow)
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

  const handleExport = () => {
    if (!dailyCashFlow.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = dailyCashFlow.map(day => ({
      date: format(new Date(day.date), "dd MMM yyyy"),
      cash_in: formatCurrencyForExport(day.cash_in),
      cash_out: formatCurrencyForExport(day.cash_out),
      net_flow: formatCurrencyForExport(day.net_flow),
      running_balance: formatCurrencyForExport(day.running_balance)
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "date", label: "Tanggal" },
        { key: "cash_in", label: "Cash In" },
        { key: "cash_out", label: "Cash Out" },
        { key: "net_flow", label: "Net Flow" },
        { key: "running_balance", label: "Saldo" }
      ],
      `Laporan_Arus_Kas_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
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
          <h1 className="text-3xl font-bold tracking-tight">Laporan Arus Kas</h1>
          <p className="text-muted-foreground">Cash Flow Statement - Monitoring arus kas masuk & keluar</p>
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
              <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Tanggal Akhir</Label>
              <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash In</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_cash_in)}</div>
                <p className="text-xs text-muted-foreground">{summary.cash_in_count} transaksi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Out</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_cash_out)}</div>
                <p className="text-xs text-muted-foreground">{summary.cash_out_count} transaksi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.net_cash_flow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(summary.net_cash_flow)}
                </div>
                <p className="text-xs text-muted-foreground">Selisih kas bersih</p>
              </CardContent>
            </Card>
          </div>

          {paymentMethods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Breakdown Metode Pembayaran</CardTitle>
                <CardDescription>Cash in berdasarkan metode</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {paymentMethods.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="font-medium">{item.method_label}</span>
                      <span className="font-bold text-green-600">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Arus Kas Harian</CardTitle>
              <CardDescription>Detail cash flow per hari dengan running balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto max-h-[500px]">
                <table className="w-full caption-bottom text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Tanggal</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Cash In</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Cash Out</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Net Flow</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyCashFlow.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="h-24 text-center text-muted-foreground">
                          Tidak ada transaksi
                        </td>
                      </tr>
                    ) : (
                      dailyCashFlow.map((day, idx) => (
                        <tr key={idx} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle font-medium">
                            {format(new Date(day.date), "dd MMM yyyy")}
                          </td>
                          <td className="p-4 align-middle text-right text-green-600">
                            {formatCurrency(day.cash_in)}
                          </td>
                          <td className="p-4 align-middle text-right text-red-600">
                            {formatCurrency(day.cash_out)}
                          </td>
                          <td className={`p-4 align-middle text-right font-bold ${day.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(day.net_flow)}
                          </td>
                          <td className={`p-4 align-middle text-right font-bold ${day.running_balance >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                            {formatCurrency(day.running_balance)}
                          </td>
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
