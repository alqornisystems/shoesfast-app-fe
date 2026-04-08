"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { ShoppingBag, Calendar, Package, TrendingUp, BarChart3, FileDown, Printer } from "lucide-react"
import { exportTableToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export-utils"

interface Summary {
  total_items: number
  total_revenue: number
  average_per_item: number
}

interface ServiceBreakdown {
  id: number
  service_name: string
  total_count: number
  total_revenue: number
  avg_price: number
}

interface StatusBreakdown {
  status: number
  status_label: string
  count: number
}

interface OrderItem {
  id: number
  order_code: string
  order_date: number
  order_status: string
  customer_name: string
  customer_phone: string
  branch_name: string
  service_name: string
  price: number
  discount: number
  net_price: number
}

export default function LaporanPesananPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdown[]>([])
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([])
  const [items, setItems] = useState<OrderItem[]>([])

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/orders?start_date=${startTimestamp}&end_date=${endTimestamp}`,
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
      setServiceBreakdown(data.service_breakdown)
      setStatusBreakdown(data.status_breakdown)
      setItems(data.data)
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

  const getStatusBadgeVariant = (status: string) => {
    if (status === "Pending") return "outline"
    if (status === "Process") return "default"
    if (status === "Done") return "secondary"
    if (status === "Canceled") return "destructive"
    return "outline"
  }

  const handleExport = () => {
    if (!items.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = items.map(item => ({
      order_date: formatDateForExport(item.order_date),
      order_code: item.order_code,
      customer_name: item.customer_name,
      customer_phone: item.customer_phone,
      service_name: item.service_name,
      price: formatCurrencyForExport(item.price),
      discount: formatCurrencyForExport(item.discount),
      net_price: formatCurrencyForExport(item.net_price),
      order_status: item.order_status
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "order_date", label: "Tanggal" },
        { key: "order_code", label: "Kode Order" },
        { key: "customer_name", label: "Nama Pelanggan" },
        { key: "customer_phone", label: "No. HP" },
        { key: "service_name", label: "Layanan" },
        { key: "price", label: "Harga" },
        { key: "discount", label: "Diskon" },
        { key: "net_price", label: "Total" },
        { key: "order_status", label: "Status" }
      ],
      `Laporan_Pesanan_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
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
          <h1 className="text-3xl font-bold tracking-tight">Laporan Pesanan & Item</h1>
          <p className="text-muted-foreground">
            Analisis detail pesanan dan breakdown per layanan
          </p>
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
                <CardTitle className="text-sm font-medium">Total Item</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_items}</div>
                <p className="text-xs text-muted-foreground">Item layanan diproses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.total_revenue)}
                </div>
                <p className="text-xs text-muted-foreground">Pendapatan bersih</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rata-rata per Item</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.average_per_item)}</div>
                <p className="text-xs text-muted-foreground">Nilai rata-rata</p>
              </CardContent>
            </Card>
          </div>

          {/* Service Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Breakdown per Layanan
              </CardTitle>
              <CardDescription>
                Top layanan berdasarkan jumlah item dan revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Layanan</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Jumlah Item
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Total Revenue
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium">
                        Harga Rata-rata
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="h-24 text-center text-muted-foreground">
                          Tidak ada data layanan
                        </td>
                      </tr>
                    ) : (
                      serviceBreakdown.map((service) => (
                        <tr
                          key={service.id}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle font-medium">{service.service_name}</td>
                          <td className="p-4 align-middle text-right">{service.total_count}</td>
                          <td className="p-4 align-middle text-right font-bold text-green-600">
                            {formatCurrency(service.total_revenue)}
                          </td>
                          <td className="p-4 align-middle text-right">
                            {formatCurrency(service.avg_price)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown Status Pesanan</CardTitle>
              <CardDescription>Distribusi pesanan berdasarkan status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statusBreakdown.map((item) => (
                  <div
                    key={item.status}
                    className="flex flex-col items-center justify-center p-4 border rounded-lg"
                  >
                    <Badge variant={getStatusBadgeVariant(item.status_label)}>
                      {item.status_label}
                    </Badge>
                    <div className="text-2xl font-bold mt-2">{item.count}</div>
                    <p className="text-xs text-muted-foreground">pesanan</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Item Pesanan</CardTitle>
              <CardDescription>
                Daftar lengkap item pesanan (maksimal 500 data terbaru)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Tanggal</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Order</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Pelanggan</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Layanan</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Harga</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Diskon</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Total</th>
                      <th className="h-12 px-4 text-center align-middle font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="h-24 text-center text-muted-foreground">
                          Tidak ada item pesanan
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle text-xs text-muted-foreground">
                            {formatDate(item.order_date)}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium">{item.order_code}</div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="font-medium text-sm">{item.customer_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.customer_phone}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-sm">{item.service_name}</td>
                          <td className="p-4 align-middle text-right">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="p-4 align-middle text-right text-red-600">
                            {item.discount > 0 ? `-${formatCurrency(item.discount)}` : "-"}
                          </td>
                          <td className="p-4 align-middle text-right font-bold text-green-600">
                            {formatCurrency(item.net_price)}
                          </td>
                          <td className="p-4 align-middle text-center">
                            <Badge variant={getStatusBadgeVariant(item.order_status)}>
                              {item.order_status}
                            </Badge>
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
