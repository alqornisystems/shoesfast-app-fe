"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { format } from "date-fns"
import { CircleDollarSign, TrendingDown, Layers, PieChart } from "lucide-react"
import { exportTableToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export-utils"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { formatCurrency, formatDate } from "@/lib/utils"

type ExpenseType = "all" | "general" | "operational"

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

interface ExpenseReport {
  summary: Summary
  category_breakdown: CategoryBreakdown[]
  daily_expenses: DailyExpense[]
  data: Expense[]
}

export default function LaporanPengeluaranPage() {
  const [typeFilter, setTypeFilter] = useState<ExpenseType>("all")

  const report = useReport<ExpenseReport>({
    endpoint: "/api/reports/expenses",
    params: { type: typeFilter === "all" ? undefined : typeFilter },
  })
  const data = report.data

  // The `type` filter is passed through useReport's `params`, which the hook
  // reads from a ref at fetch time — so a change won't auto-refetch. Trigger it
  // here, skipping the initial mount (useReport already fetches once on mount).
  // `refetchRef` is kept current via an effect (refetch's identity changes with
  // the date range), so the typeFilter effect can stay keyed only on typeFilter.
  const refetchRef = useRef(report.refetch)
  useEffect(() => {
    refetchRef.current = report.refetch
  })
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    refetchRef.current()
  }, [typeFilter])

  const getTypeBadge = (type: string) => {
    if (type === "general") {
      return <Badge variant="default">Umum</Badge>
    }
    return <Badge variant="secondary">Operasional</Badge>
  }

  const handleExport = () => {
    const expenses = data?.data ?? []
    if (!expenses.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = expenses.map((expense) => ({
      date: formatDateForExport(expense.date),
      branch_name: expense.branch_name,
      category: expense.category,
      description: expense.description,
      total: formatCurrencyForExport(expense.total),
      type: expense.type === "general" ? "Umum" : "Operasional",
      user_name: expense.user_name,
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
        { key: "user_name", label: "User" },
      ],
      `Laporan_Pengeluaran${typeLabel}_${format(new Date(report.startDate), "dd-MM-yyyy")}_${format(new Date(report.endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  const typeSelector = (
    <select
      id="type_filter"
      aria-label="Jenis Pengeluaran"
      value={typeFilter}
      onChange={(e) => setTypeFilter(e.target.value as ExpenseType)}
      className="flex h-9 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="all">Semua Jenis</option>
      <option value="general">Pengeluaran Umum</option>
      <option value="operational">Pengeluaran Operasional</option>
    </select>
  )

  return (
    <ReportShell
      title="Laporan Pengeluaran"
      description="Monitoring dan analisis pengeluaran usaha"
      startDate={report.startDate}
      endDate={report.endDate}
      setStartDate={report.setStartDate}
      setEndDate={report.setEndDate}
      refetch={report.refetch}
      loading={report.loading}
      hasData={!!data?.summary}
      onExportExcel={handleExport}
      actions={typeSelector}
    >
      {data?.summary && (
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
                  {formatCurrency(data.summary.total_expenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.summary.count_general + data.summary.count_operational} transaksi
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pengeluaran Umum</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.summary.total_general)}</div>
                <p className="text-xs text-muted-foreground">{data.summary.count_general} transaksi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pengeluaran Operasional</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.total_operational)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.summary.count_operational} transaksi
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          {(data.category_breakdown ?? []).length > 0 && (
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
                  {data.category_breakdown.map((item, index) => (
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
                    {(data.daily_expenses ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="h-24 text-center text-muted-foreground">
                          Tidak ada pengeluaran pada periode ini
                        </td>
                      </tr>
                    ) : (
                      data.daily_expenses.map((daily, index) => (
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
                    {(data.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="h-24 text-center text-muted-foreground">
                          Tidak ada transaksi pengeluaran
                        </td>
                      </tr>
                    ) : (
                      data.data.map((expense) => (
                        <tr
                          key={`${expense.type}-${expense.id}`}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle">
                            <div className="text-xs text-muted-foreground">
                              {formatDate(expense.date, "dd MMM yyyy HH:mm")}
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
      )}
    </ReportShell>
  )
}
