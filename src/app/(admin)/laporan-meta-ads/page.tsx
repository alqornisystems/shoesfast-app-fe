"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Users,
  Target,
  BarChart2,
  Calendar,
  FileDown,
  Printer
} from "lucide-react"
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

export default function LaporanMetaAdsPage() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [campaignBreakdown, setCampaignBreakdown] = useState<CampaignBreakdown[]>([])
  const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance[]>([])
  const [data, setData] = useState<MetaAdsData[]>([])
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/reports/meta-ads?start_date=${startTimestamp}&end_date=${endTimestamp}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )

      if (!response.ok) throw new Error("Failed")
      const result = await response.json()
      setSummary(result.summary)
      setCampaignBreakdown(result.campaign_breakdown)
      setDailyPerformance(result.daily_performance)
      setData(result.data)
    } catch (error: any) {
      toast.error(error.message || "Gagal memuat")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num)
  }

  const formatROAS = (roas: number) => {
    return `${roas.toFixed(2)}x`
  }

  const handleExport = () => {
    if (!campaignBreakdown.length) {
      toast.error("Tidak ada data untuk diekspor")
      return
    }

    const exportData = campaignBreakdown.map(campaign => ({
      campaign_name: campaign.campaign_name,
      impressions: campaign.impressions.toString(),
      clicks: campaign.clicks.toString(),
      cost: formatCurrencyForExport(campaign.cost),
      conversions: campaign.conversions.toString(),
      revenue: formatCurrencyForExport(campaign.revenue),
      ctr: formatPercentForExport(campaign.ctr),
      cpc: formatCurrencyForExport(campaign.cpc),
      cpa: formatCurrencyForExport(campaign.cpa),
      roas: formatROAS(campaign.roas)
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
        { key: "roas", label: "ROAS" }
      ],
      `Laporan_Meta_Ads_${format(new Date(startDate), "dd-MM-yyyy")}_${format(new Date(endDate), "dd-MM-yyyy")}`
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
          <h1 className="text-3xl font-bold">Laporan Meta Ads (Facebook & Instagram)</h1>
          <p className="text-muted-foreground">Meta Ads Campaign Performance</p>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReport} disabled={loading} className="w-full">
                {loading ? "Memuat..." : "Tampilkan"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      ) : summary ? (
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
                    {data.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 text-xs">{format(new Date(item.date * 1000), "dd MMM yyyy")}</td>
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
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Pilih periode</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
