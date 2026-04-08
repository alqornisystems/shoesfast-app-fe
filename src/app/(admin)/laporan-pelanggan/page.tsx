"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { Users, Calendar, DollarSign, Repeat, TrendingUp, Star, FileDown, Printer } from "lucide-react"
import { exportTableToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export-utils"

interface Summary {
  total_customers: number
  repeat_customers: number
  repeat_rate_percent: number
  total_revenue: number
  avg_order_value: number
}

interface Customer {
  customer_id: number
  customer_name: string
  customer_phone: string
  total_orders: number
  total_spent: number
  avg_order_value: number
  last_order_date: number
}

export default function LaporanPelangganPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [topCustomers, setTopCustomers] = useState<Customer[]>([])
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
  }, [startDate, endDate])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(endDate + " 23:59:59").getTime() / 1000)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/customers?start_date=${startTimestamp}&end_date=${endTimestamp}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )

      if (!response.ok) throw new Error("Failed")
      const data = await response.json()
      setSummary(data.summary)
      setTopCustomers(data.top_customers)
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount)
  }

  const handleExport = () => {
    if (!topCustomers.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = topCustomers.map(customer => ({
      customer_name: customer.customer_name,
      customer_phone: customer.customer_phone,
      total_orders: customer.total_orders.toString(),
      total_spent: formatCurrencyForExport(customer.total_spent),
      avg_order_value: formatCurrencyForExport(customer.avg_order_value),
      last_order_date: customer.last_order_date ? formatDateForExport(customer.last_order_date) : "-",
      status: customer.total_orders >= 5 ? "VIP" : customer.total_orders > 1 ? "Repeat" : "New"
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "customer_name", label: "Nama Pelanggan" },
        { key: "customer_phone", label: "No. HP" },
        { key: "total_orders", label: "Total Order" },
        { key: "total_spent", label: "Total Spending" },
        { key: "avg_order_value", label: "Avg Order Value" },
        { key: "last_order_date", label: "Last Order" },
        { key: "status", label: "Status" }
      ],
      `Laporan_Pelanggan_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
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
          <h1 className="text-3xl font-bold">Laporan Pelanggan</h1>
          <p className="text-muted-foreground">Customer Analytics & Loyalty</p>
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
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5"/>Filter Periode</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Tanggal Mulai</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}/></div>
            <div className="space-y-2"><Label>Tanggal Akhir</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}/></div>
            <div className="flex items-end"><Button onClick={fetchReport} disabled={loading} className="w-full">{loading ? "Memuat..." : "Tampilkan"}</Button></div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>
      ) : summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Users className="h-4 w-4"/>Total Customer</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total_customers}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Repeat className="h-4 w-4"/>Repeat Customer</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{summary.repeat_customers}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Star className="h-4 w-4"/>Repeat Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.repeat_rate_percent}%</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><DollarSign className="h-4 w-4"/>Total Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_revenue)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><TrendingUp className="h-4 w-4"/>Avg Order</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(summary.avg_order_value)}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Top 20 Pelanggan</CardTitle><CardDescription>Customer dengan total spending tertinggi</CardDescription></CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b"><tr><th className="h-12 px-4 text-left font-medium">Pelanggan</th><th className="px-4 text-right font-medium">Total Order</th><th className="px-4 text-right font-medium">Total Spending</th><th className="px-4 text-right font-medium">Avg Order</th><th className="px-4 text-left font-medium">Last Order</th><th className="px-4 text-center font-medium">Status</th></tr></thead>
                  <tbody>
                    {topCustomers.map((customer, idx) => (
                      <tr key={customer.customer_id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium">{customer.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{customer.customer_phone}</div>
                        </td>
                        <td className="p-4 text-right">{customer.total_orders}</td>
                        <td className="p-4 text-right font-bold text-green-600">{formatCurrency(customer.total_spent)}</td>
                        <td className="p-4 text-right">{formatCurrency(customer.avg_order_value)}</td>
                        <td className="p-4 text-xs text-muted-foreground">{customer.last_order_date ? format(new Date(customer.last_order_date * 1000), "dd MMM yyyy") : "-"}</td>
                        <td className="p-4 text-center">
                          <Badge className={customer.total_orders >= 5 ? "bg-purple-600" : customer.total_orders > 1 ? "bg-blue-600" : "bg-gray-500"}>
                            {customer.total_orders >= 5 ? "VIP" : customer.total_orders > 1 ? "Repeat" : "New"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="flex items-center justify-center min-h-[400px]"><div className="text-center"><Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4"/><p className="text-muted-foreground">Pilih periode</p></div></CardContent></Card>
      )}
    </div>
  )
}
