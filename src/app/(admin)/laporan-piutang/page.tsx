"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { format } from "date-fns"
import { DollarSign, AlertCircle, FileText, Filter } from "lucide-react"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { formatCurrency, formatDate } from "@/lib/utils"
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

interface ReceivablesReport {
  summary: Summary
  data: ReceivableOrder[]
}

type StatusFilter = "all" | "unpaid" | "partial"

export default function LaporanPiutangPage() {
  const [filter, setFilter] = useState<StatusFilter>("all")

  const report = useReport<ReceivablesReport>({
    endpoint: "/api/reports/receivables",
    params: { status: filter === "all" ? undefined : filter },
  })

  const summary = report.data?.summary ?? null
  const orders = report.data?.data ?? []

  // The status filter lives in `params` (a ref inside the hook), so changing it
  // doesn't auto-trigger a fetch — re-fetch explicitly. Skip the first render,
  // which the hook's own autoFetch already covers.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    report.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

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
      `Laporan_Piutang${filterLabel}_${format(new Date(report.startDate), "dd-MM-yyyy")}_${format(new Date(report.endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  return (
    <ReportShell
      title="Laporan Piutang & Kredit"
      description="Monitoring piutang pelanggan dan penagihan"
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
          {/* Status Filter */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-5 w-5" />
                Status Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

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
      )}
    </ReportShell>
  )
}
