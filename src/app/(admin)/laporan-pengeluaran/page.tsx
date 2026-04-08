"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { CircleDollarSign, Calendar, TrendingDown, Layers, PieChart, FileDown, Printer } from "lucide-react"
import { exportTableToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export-utils"

interface Summary {
  total_expenses: number
  total_general: number
  total_operational: number
  count_general: number
  count_operational: number
}

interface CategoryBreakdown {
  category: string
  count: number
  total: number
}

interface DailyExpense {
  expense_date: string
  total_expenses: number
  total_amount: number
}

interface Expense {
  id: number
  date: number
  branch_name: string
  category: string
  description: string
  total: number
  user_name: string
  type: "general" | "operational"
}

export default function LaporanPengeluaranPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([])
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  // Filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "general" | "operational">("all")

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
  }, [startDate, endDate, typeFilter])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("sf_token")
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(endDate + " 23:59:59").getTime() / 1000)

      const typeParam = typeFilter !== "all" ? `&type=${typeFilter}` : ""
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/expenses?start_date=${startTimestamp}&end_date=${endTimestamp}${typeParam}`,
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
      setCategoryBreakdown(data.category_breakdown)
      setDailyExpenses(data.daily_expenses)
      setExpenses(data.data)
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

  const getTypeBadge = (type: string) => {
    if (type === "general") {
      return <Badge variant="default">Umum</Badge>
    }
    return <Badge variant="secondary">Operasional</Badge>
  }

  const handleExport = () => {
    if (!expenses.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = expenses.map(expense => ({
      date: formatDateForExport(expense.date),
      branch_name: expense.branch_name,
      category: expense.category,
      description: expense.description,
      total: formatCurrencyForExport(expense.total),
      type: expense.type === "general" ? "Umum" : "Operasional",
      user_name: expense.user_name
    }))

    const typeLabel = typeFilter !== "all" ? `_${typeFilter}` : ""
    exportTableToExcel(
      exportData,
      [
        { key: "date", label: "Tanggal" },
        { key: "branch_name", label: "Cabang" },
        { key: "category", label: "Kategori" },
        { key: "description", label: "Deskripsi" },
        { key: "total", label: "Nominal" },
        { key: "type", label: "Jenis" },
        { key: "user_name", label: "User" }
      ],
      `Laporan_Pengeluaran${typeLabel}_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
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
          <h1 className="text-3xl font-bold tracking-tight">Laporan Pengeluaran</h1>
          <p className="text-muted-foreground">Monitoring dan analisis pengeluaran usaha</p>
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
            Filter Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="type_filter">Jenis Pengeluaran</Label>
              <select
                id="type_filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">Semua</option>
                <option value="general">Pengeluaran Umum</option>
                <option value="operational">Pengeluaran Operasional</option>
              </select>
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
                <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
                <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.total_expenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.count_general + summary.count_operational} transaksi
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pengeluaran Umum</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.total_general)}</div>
                <p className="text-xs text-muted-foreground">{summary.count_general} transaksi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pengeluaran Operasional</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.total_operational)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.count_operational} transaksi
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Breakdown Kategori Pengeluaran Umum
                </CardTitle>
                <CardDescription>Distribusi pengeluaran berdasarkan kategori</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryBreakdown.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.category}</p>
                        <p className="text-sm text-muted-foreground">{item.count} transaksi</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-red-600">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Pengeluaran Harian</CardTitle>
              <CardDescription>Ringkasan pengeluaran per hari</CardDescription>
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
                        Total Pengeluaran
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="h-24 text-center text-muted-foreground">
                          Tidak ada pengeluaran pada periode ini
                        </td>
                      </tr>
                    ) : (
                      dailyExpenses.map((daily, index) => (
                        <tr key={index} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle">
                            {format(new Date(daily.expense_date), "dd MMM yyyy")}
                          </td>
                          <td className="p-4 align-middle text-right">{daily.total_expenses}</td>
                          <td className="p-4 align-middle text-right font-medium text-red-600">
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

          {/* Detailed Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Transaksi Pengeluaran</CardTitle>
              <CardDescription>Daftar lengkap semua transaksi pengeluaran</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Tanggal</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Cabang</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Kategori</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Deskripsi</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Nominal</th>
                      <th className="h-12 px-4 text-center align-middle font-medium">Jenis</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="h-24 text-center text-muted-foreground">
                          Tidak ada transaksi pengeluaran
                        </td>
                      </tr>
                    ) : (
                      expenses.map((expense) => (
                        <tr
                          key={`${expense.type}-${expense.id}`}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle">
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(expense.date)}
                            </div>
                          </td>
                          <td className="p-4 align-middle text-xs">{expense.branch_name}</td>
                          <td className="p-4 align-middle">
                            <Badge variant="outline">{expense.category}</Badge>
                          </td>
                          <td className="p-4 align-middle">{expense.description}</td>
                          <td className="p-4 align-middle text-right font-bold text-red-600">
                            {formatCurrency(expense.total)}
                          </td>
                          <td className="p-4 align-middle text-center">
                            {getTypeBadge(expense.type)}
                          </td>
                          <td className="p-4 align-middle text-xs">{expense.user_name}</td>
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
