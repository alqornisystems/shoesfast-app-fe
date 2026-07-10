"use client"

import { useEffect, useState } from "react"
import {
  ShoppingBag,
  Users,
  Wrench,
  HandCoins,
  TrendingUp,
  TrendingDown,
  Minus,
  Wallet,
  Receipt,
  Scale,
  CalendarDays,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

type DashboardStats = {
  orders: { this_month: number; last_month: number; today: number }
  revenue: { this_month: number; last_month: number; today: number }
  customers: { total: number; new_this_month: number; new_last_month: number }
  treatments: { in_progress: number }
  finance: {
    revenue_this_month: number
    expenses_this_month: number
    expenses_last_month: number
    gross_profit: number
    receivables: number
  }
  top_services: { name: string; count: number }[]
}

function growth(current: number, previous: number): { pct: number | null; dir: "up" | "down" | "flat" } {
  if (previous === 0) {
    if (current === 0) return { pct: 0, dir: "flat" }
    return { pct: null, dir: "up" } // new activity, no prior baseline
  }
  const pct = ((current - previous) / previous) * 100
  return { pct, dir: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat" }
}

function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  const { pct, dir } = growth(current, previous)
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus
  const color =
    dir === "up"
      ? "text-green-600 bg-green-500/10"
      : dir === "down"
        ? "text-red-600 bg-red-500/10"
        : "text-muted-foreground bg-muted"
  const label = pct === null ? "Baru" : `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await api.get<DashboardStats>("/api/dashboard")
        if (active) setStats(data)
      } catch {
        if (active) setStats(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const topCards = [
    {
      title: "Total Pesanan",
      value: stats ? String(stats.orders.this_month) : "0",
      description: "Bulan ini",
      icon: ShoppingBag,
      growth: stats ? { current: stats.orders.this_month, previous: stats.orders.last_month } : null,
    },
    {
      title: "Pendapatan",
      value: stats ? formatCurrency(stats.revenue.this_month) : formatCurrency(0),
      description: "Bulan ini",
      icon: HandCoins,
      growth: stats ? { current: stats.revenue.this_month, previous: stats.revenue.last_month } : null,
    },
    {
      title: "Pelanggan",
      value: stats ? String(stats.customers.total) : "0",
      description: stats ? `+${stats.customers.new_this_month} bulan ini` : "Total terdaftar",
      icon: Users,
      growth: stats ? { current: stats.customers.new_this_month, previous: stats.customers.new_last_month } : null,
    },
    {
      title: "Dalam Pengerjaan",
      value: stats ? String(stats.treatments.in_progress) : "0",
      description: "Sedang diproses",
      icon: Wrench,
      growth: null,
    },
  ]

  const financeCards = [
    { title: "Pendapatan", value: stats?.finance.revenue_this_month ?? 0, icon: Wallet, tone: "text-green-600" },
    { title: "Pengeluaran", value: stats?.finance.expenses_this_month ?? 0, icon: Receipt, tone: "text-red-600" },
    { title: "Laba Kotor", value: stats?.finance.gross_profit ?? 0, icon: Scale, tone: (stats?.finance.gross_profit ?? 0) >= 0 ? "text-green-600" : "text-red-600" },
    { title: "Piutang", value: stats?.finance.receivables ?? 0, icon: HandCoins, tone: "text-amber-600" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Selamat datang di Shoesfast Admin Panel.</p>
      </div>

      {/* Primary stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {topCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.growth && <GrowthBadge current={stat.growth.current} previous={stat.growth.previous} />}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Pesanan</p>
              {loading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-xl font-semibold">{stats?.orders.today ?? 0}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendapatan</p>
              {loading ? (
                <Skeleton className="h-7 w-28 mt-1" />
              ) : (
                <p className="text-xl font-semibold">{formatCurrency(stats?.revenue.today ?? 0)}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finance + Top services */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ringkasan Keuangan</CardTitle>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {financeCards.map((f) => (
                <div key={f.title} className="rounded-lg border p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <f.icon className="h-3.5 w-3.5" />
                    {f.title}
                  </div>
                  {loading ? (
                    <Skeleton className="h-6 w-20 mt-2" />
                  ) : (
                    <div className={`mt-1 text-lg font-bold ${f.tone}`}>{formatCurrency(f.value)}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Layanan Terlaris</CardTitle>
            <p className="text-xs text-muted-foreground">Bulan ini</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : stats && stats.top_services.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={stats.top_services}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value) => [`${value} pesanan`, "Jumlah"]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.top_services.map((_, i) => (
                      <Cell key={i} fill="var(--chart-1)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                Belum ada data layanan bulan ini.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
