"use client"

import { format } from "date-fns"
import { toast } from "sonner"
import {
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Users,
  Target,
  BarChart2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useReport } from "@/hooks/use-report"
import { ReportShell } from "@/components/report-shell"
import { formatCurrency, formatDate } from "@/lib/utils"
import { exportTableToExcel, formatCurrencyForExport, formatPercentForExport } from "@/lib/export-utils"

interface Summary {
  total_impressions: number
  total_clicks: number
  total_cost: number
  total_conversions: number
  total_revenue: number
  avg_ctr: number
  avg_cpc: number
  avg_cpa: number
  total_roas: number
}

interface CampaignBreakdown {
  campaign_name: string
  impressions: number
  clicks: number
  cost: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
}

interface DailyPerformance {
  date: string
  impressions: number
  clicks: number
  cost: number
  conversions: number
  revenue: number
}

interface MetaAdsData {
  id: number
  date: number
  campaign_name: string
  campaign_id: string | null
  impressions: number
  clicks: number
  cost: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  cpa: number
  roas: number
  branch_name: string
  notes: string | null
}

interface MetaAdsReport {
  summary: Summary
  campaign_breakdown: CampaignBreakdown[]
  daily_performance: DailyPerformance[]
  data: MetaAdsData[]
}

function formatNumber(num: number) {
  return new Intl.NumberFormat("id-ID").format(num)
}

function formatROAS(roas: number) {
  return `${roas.toFixed(2)}x`
}

export default function LaporanMetaAdsPage() {
  const report = useReport<MetaAdsReport>({ endpoint: "/api/reports/meta-ads" })
  const data = report.data

  const summary = data?.summary
  const campaignBreakdown = data?.campaign_breakdown ?? []
  const dailyPerformance = data?.daily_performance ?? []
  const detailedData = data?.data ?? []

  const handleExport = () => {
    if (!campaignBreakdown.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = campaignBreakdown.map((campaign) => ({
      campaign_name: campaign.campaign_name,
      impressions: campaign.impressions.toString(),
      clicks: campaign.clicks.toString(),
      cost: formatCurrencyForExport(campaign.cost),
      conversions: campaign.conversions.toString(),
      revenue: formatCurrencyForExport(campaign.revenue),
      ctr: formatPercentForExport(campaign.ctr),
      cpc: formatCurrencyForExport(campaign.cpc),
      cpa: formatCurrencyForExport(campaign.cpa),
      roas: formatROAS(campaign.roas),
    }))

    exportTableToExcel(
      exportData,
      [
        { key: "campaign_name", label: "Campaign Name" },
        { key: "impressions", label: "Impressions" },
        { key: "clicks", label: "Clicks" },
        { key: "cost", label: "Biaya Iklan" },
        { key: "conversions", label: "Konversi" },
        { key: "revenue", label: "Pendapatan" },
        { key: "ctr", label: "CTR" },
        { key: "cpc", label: "CPC" },
        { key: "cpa", label: "CPA" },
        { key: "roas", label: "ROAS" },
      ],
      `Laporan_Meta_Ads_${format(new Date(report.startDate), "dd-MM-yyyy")}_${format(new Date(report.endDate), "dd-MM-yyyy")}`
    )

    toast.success("Data berhasil diekspor ke Excel")
  }

  return (
    <ReportShell
      title="Laporan Meta Ads (Facebook & Instagram)"
      description="Meta Ads Campaign Performance"
      startDate={report.startDate}
      endDate={report.endDate}
      setStartDate={report.setStartDate}
      setEndDate={report.setEndDate}
      refetch={report.refetch}
      loading={report.loading}
      hasData={!!summary}
      emptyMessage="Pilih periode"
      onExportExcel={handleExport}
    >
      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <BarChart2 className="h-4 w-4" />
                  Total Impressions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(summary.total_impressions)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <MousePointerClick className="h-4 w-4" />
                  Total Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatNumber(summary.total_clicks)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Biaya Iklan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_cost)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Total Konversi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(summary.total_conversions)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Total Pendapatan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_revenue)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Average CTR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.avg_ctr}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Average CPC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.avg_cpc)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Average CPA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.avg_cpa)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Total ROAS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{formatROAS(summary.total_roas)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Breakdown</CardTitle>
              <CardDescription>Performance per campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="h-12 px-4 text-left font-medium">Campaign Name</th>
                      <th className="px-4 text-right font-medium">Impressions</th>
                      <th className="px-4 text-right font-medium">Clicks</th>
                      <th className="px-4 text-right font-medium">Biaya</th>
                      <th className="px-4 text-right font-medium">Konversi</th>
                      <th className="px-4 text-right font-medium">Pendapatan</th>
                      <th className="px-4 text-right font-medium">CTR</th>
                      <th className="px-4 text-right font-medium">CPC</th>
                      <th className="px-4 text-right font-medium">CPA</th>
                      <th className="px-4 text-right font-medium">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignBreakdown.map((campaign, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-4 font-medium">{campaign.campaign_name}</td>
                        <td className="p-4 text-right">{formatNumber(campaign.impressions)}</td>
                        <td className="p-4 text-right">{formatNumber(campaign.clicks)}</td>
                        <td className="p-4 text-right text-red-600">{formatCurrency(campaign.cost)}</td>
                        <td className="p-4 text-right">{formatNumber(campaign.conversions)}</td>
                        <td className="p-4 text-right text-green-600 font-bold">{formatCurrency(campaign.revenue)}</td>
                        <td className="p-4 text-right">{campaign.ctr}%</td>
                        <td className="p-4 text-right">{formatCurrency(campaign.cpc)}</td>
                        <td className="p-4 text-right">{formatCurrency(campaign.cpa)}</td>
                        <td className="p-4 text-right font-bold text-purple-600">{formatROAS(campaign.roas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
              <CardDescription>Metrics per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="h-12 px-4 text-left font-medium">Tanggal</th>
                      <th className="px-4 text-right font-medium">Impressions</th>
                      <th className="px-4 text-right font-medium">Clicks</th>
                      <th className="px-4 text-right font-medium">Biaya</th>
                      <th className="px-4 text-right font-medium">Konversi</th>
                      <th className="px-4 text-right font-medium">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyPerformance.map((day, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-4">{format(new Date(day.date), "dd MMM yyyy")}</td>
                        <td className="p-4 text-right">{formatNumber(day.impressions)}</td>
                        <td className="p-4 text-right">{formatNumber(day.clicks)}</td>
                        <td className="p-4 text-right text-red-600">{formatCurrency(day.cost)}</td>
                        <td className="p-4 text-right">{formatNumber(day.conversions)}</td>
                        <td className="p-4 text-right text-green-600 font-bold">{formatCurrency(day.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Campaigns</CardTitle>
              <CardDescription>All campaign data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="h-12 px-4 text-left font-medium">Tanggal</th>
                      <th className="px-4 text-left font-medium">Campaign</th>
                      <th className="px-4 text-left font-medium">Cabang</th>
                      <th className="px-4 text-right font-medium">Impressions</th>
                      <th className="px-4 text-right font-medium">Clicks</th>
                      <th className="px-4 text-right font-medium">Biaya</th>
                      <th className="px-4 text-right font-medium">Konversi</th>
                      <th className="px-4 text-right font-medium">Pendapatan</th>
                      <th className="px-4 text-right font-medium">ROAS</th>
                      <th className="px-4 text-left font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedData.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 text-xs">{formatDate(item.date)}</td>
                        <td className="p-4">
                          <div className="font-medium">{item.campaign_name}</div>
                          {item.campaign_id && (
                            <div className="text-xs text-muted-foreground">{item.campaign_id}</div>
                          )}
                        </td>
                        <td className="p-4">{item.branch_name}</td>
                        <td className="p-4 text-right">{formatNumber(item.impressions)}</td>
                        <td className="p-4 text-right">{formatNumber(item.clicks)}</td>
                        <td className="p-4 text-right text-red-600">{formatCurrency(item.cost)}</td>
                        <td className="p-4 text-right">{formatNumber(item.conversions)}</td>
                        <td className="p-4 text-right text-green-600 font-bold">{formatCurrency(item.revenue)}</td>
                        <td className="p-4 text-right font-bold text-purple-600">{formatROAS(item.roas)}</td>
                        <td className="p-4 text-xs text-muted-foreground">{item.notes || "-"}</td>
                      </tr>
                    ))}
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
