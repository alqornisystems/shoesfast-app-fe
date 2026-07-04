"use client"

import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { formatCurrency } from "@/lib/utils"
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

interface CashFlowReport {
  summary: Summary
  payment_methods: PaymentMethod[]
  daily_cash_flow: DailyCashFlow[]
}

function formatDate(dateString: string) {
  return format(new Date(dateString), "dd MMM yyyy")
}

export default function LaporanArusKasPage() {
  const report = useReport<CashFlowReport>({ endpoint: "/api/reports/cash-flow" })
  const data = report.data

  const handleExport = () => {
    if (!data?.daily_cash_flow?.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    exportTableToExcel(
      data.daily_cash_flow.map((day) => ({
        date: formatDate(day.date),
        cash_in: formatCurrencyForExport(day.cash_in),
        cash_out: formatCurrencyForExport(day.cash_out),
        net_flow: formatCurrencyForExport(day.net_flow),
        running_balance: formatCurrencyForExport(day.running_balance),
      })),
      [
        { key: "date", label: "Tanggal" },
        { key: "cash_in", label: "Cash In" },
        { key: "cash_out", label: "Cash Out" },
        { key: "net_flow", label: "Net Flow" },
        { key: "running_balance", label: "Saldo" },
      ],
      `Laporan_Arus_Kas_${format(new Date(report.startDate), "dd-MM-yyyy")}_${format(new Date(report.endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  return (
    <ReportShell
      title="Laporan Arus Kas"
      description="Cash Flow Statement - Monitoring arus kas masuk & keluar"
      startDate={report.startDate}
      endDate={report.endDate}
      setStartDate={report.setStartDate}
      setEndDate={report.setEndDate}
      refetch={report.refetch}
      loading={report.loading}
      hasData={!!data?.summary}
      onExportExcel={handleExport}
    >
      {data?.summary && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash In</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.total_cash_in)}</div>
                <p className="text-xs text-muted-foreground">{data.summary.cash_in_count} transaksi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Out</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(data.summary.total_cash_out)}</div>
                <p className="text-xs text-muted-foreground">{data.summary.cash_out_count} transaksi</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${data.summary.net_cash_flow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(data.summary.net_cash_flow)}
                </div>
                <p className="text-xs text-muted-foreground">Selisih kas bersih</p>
              </CardContent>
            </Card>
          </div>

          {(data.payment_methods ?? []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Breakdown Metode Pembayaran</CardTitle>
                <CardDescription>Cash in berdasarkan metode</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {data.payment_methods.map((item, idx) => (
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
                    {(data.daily_cash_flow ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="h-24 text-center text-muted-foreground">
                          Tidak ada transaksi
                        </td>
                      </tr>
                    ) : (
                      data.daily_cash_flow.map((day, idx) => (
                        <tr key={idx} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle font-medium">{formatDate(day.date)}</td>
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
      )}
    </ReportShell>
  )
}
