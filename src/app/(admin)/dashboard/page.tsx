"use client"

import { useEffect, useState } from "react"
import { ShoppingBag, Users, Wrench, HandCoins } from "lucide-react"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

type DashboardStats = {
  orders_this_month: number
  total_customers: number
  in_progress_treatments: number
  revenue_this_month: number
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

  const cards = [
    {
      title: "Total Pesanan",
      value: stats ? String(stats.orders_this_month) : "0",
      description: "Bulan ini",
      icon: ShoppingBag,
      badge: "Pesanan",
    },
    {
      title: "Pelanggan",
      value: stats ? String(stats.total_customers) : "0",
      description: "Total terdaftar",
      icon: Users,
      badge: "Pelanggan",
    },
    {
      title: "Dalam Pengerjaan",
      value: stats ? String(stats.in_progress_treatments) : "0",
      description: "Sedang diproses",
      icon: Wrench,
      badge: "Treatment",
    },
    {
      title: "Pendapatan",
      value: stats ? formatCurrency(stats.revenue_this_month) : formatCurrency(0),
      description: "Bulan ini",
      icon: HandCoins,
      badge: "Keuangan",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Selamat datang di Shoesfast Admin Panel.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <Badge variant="secondary" className="text-xs">{stat.badge}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
