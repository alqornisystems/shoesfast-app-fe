# Report Page Pattern (`laporan-*`)

**Canonical reference:** `src/app/(admin)/laporan-penjualan/page.tsx`
**Primitives:** `useReport` (`src/hooks/use-report.ts`) + `<ReportShell>` (`src/components/report-shell.tsx`)

Report pages are a single `page.tsx` (no separate `*-client.tsx`) built from two reusable
primitives. **Never re-implement the date-range / fetch / header / loading boilerplate by hand** —
the older `laporan-*` pages that still do raw `fetch` are legacy and should be migrated to this.

---

## The 6 rules

1. **`useReport<T>({ endpoint })` owns the data layer.** It manages the start/end date range
   (defaults to the current month), converts it to query params, fetches through the **`api`
   client** (auth token + base-URL fallback + 401 handling — never raw `fetch`/`process.env`), and
   returns `{ data, loading, startDate, endDate, setStartDate, setEndDate, refetch }`.

2. **`<ReportShell>` owns the chrome.** Header (title + description + auto-wired export/print
   buttons) + the date-range filter card + loading spinner + empty state. Spread the `useReport`
   result into it and pass `hasData`.

3. **Date param mode.** Default `dateParam: "timestamp"` sends `start_date`/`end_date` as unix
   seconds (end padded to `23:59:59`). Pass `dateParam: "date"` for endpoints that want raw
   `yyyy-MM-dd`. Extra filters go through the `params` option.

4. **Export lives in the page.** Pass `onExportExcel` / `onExportPDF` handlers to `ReportShell`
   (the buttons render automatically). Build rows with helpers from `@/lib/export-utils` (Excel)
   and `@/lib/pdf-utils` (jsPDF). Guard against empty data with a `toast.error` before exporting.

5. **`hasData` drives the empty state.** Base it on the real payload
   (e.g. `hasData={!!data?.summary}`), not just `!!data`, so a `{}` response still shows the empty
   card instead of a blank body.

6. **Body = summary cards + tables in `<Card>`s.** Currency via `formatCurrency` from
   `@/lib/utils`. Map arrays null-safely (`(data.rows ?? []).map(...)`). Add `<ReportPagination>`
   for long paged tables. Indonesian copy throughout.

---

## Copy-paste skeleton

```tsx
"use client"

import { toast } from "sonner"
import { DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { formatCurrency } from "@/lib/utils"
import { exportTableToExcel, formatCurrencyForExport } from "@/lib/export-utils"

interface FooReport {
  summary: { total: number; revenue: number }
  rows: { label: string; amount: number }[]
}

export default function LaporanFooPage() {
  const report = useReport<FooReport>({ endpoint: "/api/reports/foo" })
  const data = report.data

  const handleExport = () => {
    if (!data?.rows?.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }
    exportTableToExcel(
      data.rows.map((r) => ({ label: r.label, amount: formatCurrencyForExport(r.amount) })),
      [
        { key: "label", label: "Keterangan" },
        { key: "amount", label: "Jumlah" },
      ],
      `Laporan_Foo_${report.startDate}_${report.endDate}`,
    )
    toast.success("Data berhasil diekspor ke Excel")
  }

  return (
    <ReportShell
      title="Laporan Foo"
      description="Deskripsi singkat laporan"
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
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.summary.revenue)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Rincian</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data.rows ?? []).map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <p className="font-medium">{r.label}</p>
                    <p className="font-bold">{formatCurrency(r.amount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </ReportShell>
  )
}
```
