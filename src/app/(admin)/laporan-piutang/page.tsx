"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { format } from "date-fns"
import { DollarSign, AlertCircle, FileText, Filter, FileDown, Printer, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { exportTableToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export-utils"

interface Summary {
  total_credit: number
  total_orders: number
  overdue_orders: number
}

interface ReceivableOrder {
  id: number
  code: string
  date: number
  customer_name: string
  customer_phone: string
  branch_name: string
  total: number
  total_paid: number
  credit: number
  due_date: number
  days_overdue: number
  status: "unpaid" | "partial"
}

export default function LaporanPiutangPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [orders, setOrders] = useState<ReceivableOrder[]>([])
  const [filter, setFilter] = useState<"all" | "unpaid" | "partial">("all")
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
    if (startDate && endDate) fetchReport()
  }, [filter, startDate, endDate])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const statusFilter = filter !== "all" ? `status=${filter}` : ""
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(endDate + " 23:59:59").getTime() / 1000)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/receivables?start_date=${startTimestamp}&end_date=${endTimestamp}&${statusFilter}`,
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
      setOrders(data.data)
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

  const getOverdueBadge = (daysOverdue: number) => {
    if (daysOverdue === 0) {
      return <Badge variant="outline">Tepat Waktu</Badge>
    } else if (daysOverdue <= 7) {
      return <Badge variant="secondary">Terlambat {daysOverdue} hari</Badge>
    } else if (daysOverdue <= 14) {
      return <Badge className="bg-yellow-500">Terlambat {daysOverdue} hari</Badge>
    } else {
      return <Badge variant="destructive">Terlambat {daysOverdue} hari</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === "unpaid") {
      return <Badge variant="destructive">Belum Bayar</Badge>
    } else {
      return <Badge className="bg-yellow-500">Cicil</Badge>
    }
  }

  const handleExport = () => {
    if (!orders.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = orders.map(order => ({
      code: order.code,
      date: formatDateForExport(order.date),
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      branch_name: order.branch_name,
      total: formatCurrencyForExport(order.total),
      total_paid: formatCurrencyForExport(order.total_paid),
      credit: formatCurrencyForExport(order.credit),
      due_date: formatDateForExport(order.due_date),
      days_overdue: order.days_overdue.toString(),
      status: order.status === "unpaid" ? "Belum Bayar" : "Cicil"
    }))

    const filterLabel = filter !== "all" ? `_${filter}` : ""
    exportTableToExcel(
      exportData,
      [
        { key: "code", label: "Kode Order" },
        { key: "date", label: "Tanggal Order" },
        { key: "customer_name", label: "Nama Pelanggan" },
        { key: "customer_phone", label: "No. HP" },
        { key: "branch_name", label: "Cabang" },
        { key: "total", label: "Total" },
        { key: "total_paid", label: "Dibayar" },
        { key: "credit", label: "Piutang" },
        { key: "due_date", label: "Jatuh Tempo" },
        { key: "days_overdue", label: "Hari Terlambat" },
        { key: "status", label: "Status" }
      ],
      `Laporan_Piutang${filterLabel}_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
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
          <h1 className="text-3xl font-bold tracking-tight">Laporan Piutang & Kredit</h1>
          <p className="text-muted-foreground">Monitoring piutang pelanggan dan penagihan</p>
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
            <Filter className="h-5 w-5" />
            Filter Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Date Range Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Akhir</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={fetchReport} disabled={loading} className="w-full">
                  {loading ? "Memuat..." : "Tampilkan"}
                </Button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status Pembayaran</Label>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                >
                  Semua
                </Button>
                <Button
                  variant={filter === "unpaid" ? "default" : "outline"}
                  onClick={() => setFilter("unpaid")}
                >
                  Belum Bayar
                </Button>
                <Button
                  variant={filter === "partial" ? "default" : "outline"}
                  onClick={() => setFilter("partial")}
                >
                  Cicil
                </Button>
              </div>
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
                <CardTitle className="text-sm font-medium">Total Piutang</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.total_credit)}
                </div>
                <p className="text-xs text-muted-foreground">Dari {summary.total_orders} pesanan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pesanan Tertunda</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_orders}</div>
                <p className="text-xs text-muted-foreground">Belum lunas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pesanan Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.overdue_orders}</div>
                <p className="text-xs text-muted-foreground">Lewat jatuh tempo</p>
              </CardContent>
            </Card>
          </div>

          {/* Receivables Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Piutang</CardTitle>
              <CardDescription>
                Detail pesanan yang belum dibayar lunas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Kode</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Pelanggan</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Cabang</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Total</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Dibayar</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Piutang</th>
                      <th className="h-12 px-4 text-center align-middle font-medium">Status</th>
                      <th className="h-12 px-4 text-center align-middle font-medium">Jatuh Tempo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="h-24 text-center text-muted-foreground">
                          Tidak ada piutang{filter !== "all" ? ` dengan status ${filter}` : ""}
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle">
                            <div className="font-medium">{order.code}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(order.date)}
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium">{order.customer_name}</div>
                            <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                          </td>
                          <td className="p-4 align-middle">{order.branch_name}</td>
                          <td className="p-4 align-middle text-right">
                            {formatCurrency(order.total)}
                          </td>
                          <td className="p-4 align-middle text-right text-green-600">
                            {formatCurrency(order.total_paid)}
                          </td>
                          <td className="p-4 align-middle text-right font-bold text-red-600">
                            {formatCurrency(order.credit)}
                          </td>
                          <td className="p-4 align-middle text-center">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">
                                {formatDate(order.due_date)}
                              </div>
                              {getOverdueBadge(order.days_overdue)}
                            </div>
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
      ) : null}
    </div>
  )
}
