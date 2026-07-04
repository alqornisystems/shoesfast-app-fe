"use client"

import type { ReactNode } from "react"
import { Calendar, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ReportExportButtons } from "@/components/report-export-buttons"

/**
 * Standard chrome for report pages (`laporan-*`): header + export/print
 * actions, the date-range filter card, and loading / empty states around the
 * report body. Pair with the `useReport` hook, which supplies the range state
 * and data.
 *
 * Example:
 *   const r = useReport<SalesReport>({ endpoint: "/api/reports/sales" })
 *   return (
 *     <ReportShell title="Laporan Penjualan" {...r} hasData={!!r.data}
 *       onExportExcel={handleExport}>
 *       ...report body using r.data...
 *     </ReportShell>
 *   )
 */
interface ReportShellProps {
  title: string
  description?: string

  // Date range (spread straight from useReport)
  startDate: string
  endDate: string
  setStartDate: (v: string) => void
  setEndDate: (v: string) => void
  refetch: () => void

  loading?: boolean
  /** Whether there's report data to show (drives the empty state). */
  hasData?: boolean
  emptyMessage?: string

  // Actions — an export button renders automatically when a handler is passed.
  onExportExcel?: () => void
  onExportPDF?: () => void
  showPrint?: boolean
  /** Extra buttons rendered alongside export/print. */
  actions?: ReactNode

  children?: ReactNode
}

export function ReportShell({
  title,
  description,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  refetch,
  loading = false,
  hasData = false,
  emptyMessage = "Pilih periode untuk melihat laporan",
  onExportExcel,
  onExportPDF,
  showPrint = true,
  actions,
  children,
}: ReportShellProps) {
  const hasExport = Boolean(onExportExcel || onExportPDF)

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        <div className="flex gap-2 print:hidden">
          {actions}
          {hasExport && (
            <ReportExportButtons
              onExportExcel={onExportExcel}
              onExportPDF={onExportPDF}
              isLoading={loading}
              showExcel={Boolean(onExportExcel)}
              showPDF={Boolean(onExportPDF)}
            />
          )}
          {showPrint && (
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!hasData}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          )}
        </div>
      </div>

      {/* Date-range filter */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5" />
            Filter Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report_start_date">Tanggal Mulai</Label>
              <Input
                id="report_start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report_end_date">Tanggal Akhir</Label>
              <Input
                id="report_end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={refetch} disabled={loading} className="w-full">
                {loading ? "Memuat..." : "Tampilkan Laporan"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Memuat laporan...</p>
          </div>
        </div>
      ) : hasData ? (
        children
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
